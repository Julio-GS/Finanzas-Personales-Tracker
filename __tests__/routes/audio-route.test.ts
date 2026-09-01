import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postAudioTransaction } from '@/app/api/transactions/audio/route';
import { AUTH_COOKIE_NAME, createSessionToken } from '@/lib/auth-core';
import * as gemini from '@/lib/gemini';
import * as queries from '@/db/queries';

const TEST_SECRET = 'test_secret_for_auth_32_characters_long!';

async function makeAuthCookie(): Promise<string> {
  return await createSessionToken(TEST_SECRET, 604800);
}

describe('POST /api/transactions/audio - Voice Audio Extraction Route', () => {
  let validCookie: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('AUTH_USERNAME', 'admin');
    vi.stubEnv('AUTH_PASSWORD', 'secret123');
    vi.stubEnv('AUTH_SECRET', TEST_SECRET);
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-api-key');
    vi.stubEnv('NODE_ENV', 'test');
    validCookie = await makeAuthCookie();
  });

  it('returns 401 JSON when unauthenticated (missing session cookie)', async () => {
    const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: 'dGVzdA==',
        mimeType: 'audio/webm',
      }),
    });

    const res = await postAudioTransaction(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('unauthorized');
  });

  it('returns 400 when body is invalid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
      },
      body: 'invalid-json{{{',
    });

    const res = await postAudioTransaction(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_json');
  });

  it('returns 422 validation_error when audio payload is missing or mimeType is invalid', async () => {
    const geminiSpy = vi.spyOn(gemini, 'extractTransactionFromAudio');

    const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
      },
      body: JSON.stringify({
        audio: '',
        mimeType: 'video/mp4', // disallowed mime
      }),
    });

    const res = await postAudioTransaction(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('validation_error');
    expect(geminiSpy).not.toHaveBeenCalled();
  });

  it('accepts all approved audio MIME types', async () => {
    const approvedMimes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/m4a',
      'audio/ogg',
    ];

    const mockCreated = {
      id: '12345678-1234-1234-1234-123456789012',
      createdAt: new Date('2026-08-26T12:00:00Z'),
      date: '2026-08-26',
      type: 'expense' as const,
      amount: '500.00',
      bankEntity: 'Efectivo',
      category: 'Café',
      description: null,
      rawAudioPrompt: 'Café quinientos pesos',
    };

    for (const mime of approvedMimes) {
      vi.spyOn(gemini, 'extractTransactionFromAudio').mockResolvedValueOnce({
        type: 'expense',
        amount: '500.00',
        bankEntity: 'Efectivo',
        category: 'Café',
        date: '2026-08-26',
        description: null,
        rawAudioPrompt: 'Café quinientos pesos',
      });
      vi.spyOn(queries, 'insertTransaction').mockResolvedValueOnce(mockCreated as any);

      const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
        body: JSON.stringify({
          audio: Buffer.from('audio-chunk').toString('base64'),
          mimeType: mime,
        }),
      });

      const res = await postAudioTransaction(req);
      expect(res.status).toBe(201);
    }
  });

  it('rejects disallowed MIME types with 422', async () => {
    const disallowedMimes = ['audio/flac', 'video/mp4', 'text/plain', 'application/json', 'audio/aac'];

    for (const mime of disallowedMimes) {
      const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
        },
        body: JSON.stringify({
          audio: Buffer.from('audio-chunk').toString('base64'),
          mimeType: mime,
        }),
      });

      const res = await postAudioTransaction(req);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe('validation_error');
    }
  });

  it('returns 413 payload_too_large when decoded audio exceeds maximum payload limit', async () => {
    const geminiSpy = vi.spyOn(gemini, 'extractTransactionFromAudio');

    // Create a payload larger than 5MB
    const oversizedBase64 = Buffer.alloc(6 * 1024 * 1024).toString('base64');

    const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
      },
      body: JSON.stringify({
        audio: oversizedBase64,
        mimeType: 'audio/webm',
      }),
    });

    const res = await postAudioTransaction(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error.code).toBe('payload_too_large');
    expect(geminiSpy).not.toHaveBeenCalled();
  });

  it('extracts audio via Gemini, validates result, inserts into DB, and returns 201 with source voice', async () => {
    const mockExtracted = {
      type: 'expense' as const,
      amount: '3500.00',
      bankEntity: 'Banco Galicia',
      category: 'Restaurante',
      date: '2026-08-26',
      description: 'Cena con amigos',
      rawAudioPrompt: 'Gasté 3500 pesos con tarjeta Galicia en un restaurante',
    };

    const mockInserted = {
      id: '99999999-9999-9999-9999-999999999999',
      createdAt: new Date('2026-08-26T20:00:00Z'),
      date: '2026-08-26',
      type: 'expense' as const,
      amount: '3500.00',
      bankEntity: 'Banco Galicia',
      category: 'Restaurante',
      description: 'Cena con amigos',
      rawAudioPrompt: 'Gasté 3500 pesos con tarjeta Galicia en un restaurante',
    };

    vi.spyOn(gemini, 'extractTransactionFromAudio').mockResolvedValueOnce(mockExtracted);
    const insertSpy = vi.spyOn(queries, 'insertTransaction').mockResolvedValueOnce(mockInserted as any);

    const validBase64 = Buffer.from('short voice recording audio bytes').toString('base64');

    const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
      },
      body: JSON.stringify({
        audio: validBase64,
        mimeType: 'audio/webm',
      }),
    });

    const res = await postAudioTransaction(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.source).toBe('voice');
    expect(body.transaction).toEqual({
      ...mockInserted,
      createdAt: mockInserted.createdAt.toISOString(),
    });

    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'expense',
      amount: '3500.00',
      bankEntity: 'Banco Galicia',
      category: 'Restaurante',
      date: '2026-08-26',
      description: 'Cena con amigos',
      rawAudioPrompt: 'Gasté 3500 pesos con tarjeta Galicia en un restaurante',
    }));
    // Check that raw audio is NEVER passed to DB
    expect((insertSpy.mock.calls[0][0] as any).audio).toBeUndefined();
  });

  it('returns 422 extraction_failed when Gemini extracts an account outside the 4 allowed accounts', async () => {
    const insertSpy = vi.spyOn(queries, 'insertTransaction');
    vi.spyOn(gemini, 'extractTransactionFromAudio').mockResolvedValueOnce({
      type: 'expense',
      amount: 1500,
      bankEntity: 'Santander Rio', // outside 4 allowed accounts
      category: 'Comida',
      date: '2026-08-26',
    });

    const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
      },
      body: JSON.stringify({
        audio: Buffer.from('audio').toString('base64'),
        mimeType: 'audio/webm',
      }),
    });

    const res = await postAudioTransaction(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('extraction_failed');
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('returns 422 extraction_failed and does NOT insert when Gemini output fails Zod schema validation', async () => {
    const insertSpy = vi.spyOn(queries, 'insertTransaction');
    vi.spyOn(gemini, 'extractTransactionFromAudio').mockResolvedValueOnce({
      type: 'invalid-movement' as any,
      amount: -100 as any,
      category: '',
    });

    const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
      },
      body: JSON.stringify({
        audio: Buffer.from('audio').toString('base64'),
        mimeType: 'audio/webm',
      }),
    });

    const res = await postAudioTransaction(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('extraction_failed');
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('returns 422 extraction_failed when Gemini returns empty extraction object', async () => {
    const insertSpy = vi.spyOn(queries, 'insertTransaction');
    vi.spyOn(gemini, 'extractTransactionFromAudio').mockResolvedValueOnce({} as any);

    const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
      },
      body: JSON.stringify({
        audio: Buffer.from('audio').toString('base64'),
        mimeType: 'audio/webm',
      }),
    });

    const res = await postAudioTransaction(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('extraction_failed');
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('returns 422 extraction_failed when Gemini throws GeminiExtractionError (silent/inaudible/malformed)', async () => {
    const insertSpy = vi.spyOn(queries, 'insertTransaction');
    vi.spyOn(gemini, 'extractTransactionFromAudio').mockRejectedValueOnce(
      new gemini.GeminiExtractionError('Silent or inaudible audio; no transaction detected')
    );

    const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
      },
      body: JSON.stringify({
        audio: Buffer.from('silent audio').toString('base64'),
        mimeType: 'audio/webm',
      }),
    });

    const res = await postAudioTransaction(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('extraction_failed');
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('returns 503 voice_service_unavailable when Gemini throws GeminiProviderError (rate limit or outage)', async () => {
    const insertSpy = vi.spyOn(queries, 'insertTransaction');
    vi.spyOn(gemini, 'extractTransactionFromAudio').mockRejectedValueOnce(
      new gemini.GeminiProviderError('503 Service Unavailable: High load')
    );

    const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
      },
      body: JSON.stringify({
        audio: Buffer.from('audio bytes').toString('base64'),
        mimeType: 'audio/webm',
      }),
    });

    const res = await postAudioTransaction(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe('voice_service_unavailable');
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('returns 500 database_error when DB insert throws after successful extraction', async () => {
    const mockExtracted = {
      type: 'expense' as const,
      amount: '1000.00',
      bankEntity: 'Efectivo',
      category: 'Kiosco',
      date: '2026-08-26',
      description: null,
      rawAudioPrompt: 'Mil pesos en el kiosco',
    };

    vi.spyOn(gemini, 'extractTransactionFromAudio').mockResolvedValueOnce(mockExtracted);
    vi.spyOn(queries, 'insertTransaction').mockRejectedValueOnce(new Error('DB connection reset'));

    const req = new NextRequest('http://localhost:3000/api/transactions/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${AUTH_COOKIE_NAME}=${validCookie}`,
      },
      body: JSON.stringify({
        audio: Buffer.from('audio bytes').toString('base64'),
        mimeType: 'audio/webm',
      }),
    });

    const res = await postAudioTransaction(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('database_error');
  });
});
