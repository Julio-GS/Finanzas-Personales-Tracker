import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractTransactionFromAudio,
  MAX_AUDIO_PAYLOAD_BYTES,
  getAudioDecodedByteLength,
  isAudioPayloadWithinLimit,
  GeminiExtractionError,
  GeminiProviderError,
} from '@/lib/gemini';
import { GoogleGenAI } from '@google/genai';

vi.mock('@google/genai', () => {
  const mockCreate = vi.fn();
  const mockGoogleGenAI = vi.fn().mockImplementation(() => ({
    interactions: {
      create: mockCreate,
    },
  }));
  return {
    GoogleGenAI: mockGoogleGenAI,
  };
});

describe('lib/gemini - Gemini Voice Extraction Wrapper', () => {
  const mockCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-api-key');
    vi.stubEnv('GEMINI_MODEL', 'gemini-3.7-flash');
    vi.mocked(GoogleGenAI).mockImplementation(() => ({
      interactions: {
        create: mockCreate,
      },
    } as any));
  });

  describe('Payload size utilities', () => {
    it('calculates decoded byte length from base64 string accurately', () => {
      // 4 base64 chars = 3 bytes
      const b64 = Buffer.from('hello world').toString('base64');
      expect(getAudioDecodedByteLength(b64)).toBe(11);
      expect(getAudioDecodedByteLength('')).toBe(0);
      expect(getAudioDecodedByteLength('   ')).toBe(0);
      expect(getAudioDecodedByteLength(null as any)).toBe(0);
    });

    it('validates audio payload within limit', () => {
      const smallB64 = Buffer.from('short audio data').toString('base64');
      expect(isAudioPayloadWithinLimit(smallB64, 1000)).toBe(true);
      expect(isAudioPayloadWithinLimit(smallB64, 5)).toBe(false);
      expect(isAudioPayloadWithinLimit('')).toBe(false);
      expect(MAX_AUDIO_PAYLOAD_BYTES).toBe(5 * 1024 * 1024);

      // 5MB exact boundary
      const exact5MB = Buffer.alloc(5 * 1024 * 1024).toString('base64');
      expect(isAudioPayloadWithinLimit(exact5MB, 5 * 1024 * 1024)).toBe(true);

      const over5MB = Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64');
      expect(isAudioPayloadWithinLimit(over5MB, 5 * 1024 * 1024)).toBe(false);
    });
  });

  describe('extractTransactionFromAudio', () => {
    it('calls GoogleGenAI interactions.create with model, audio input, and structured response_format', async () => {
      const mockResultData = {
        type: 'expense',
        amount: 2500.5,
        bankEntity: 'Mercado Pago',
        category: 'Supermercado',
        date: '2026-08-26',
        description: 'Compra semanal',
        rawAudioPrompt: 'Gasté 2500 pesos con 50 en el supermercado con Mercado Pago',
      };

      mockCreate.mockResolvedValueOnce({
        status: 'completed',
        output_text: JSON.stringify(mockResultData),
      });

      const audioBase64 = Buffer.from('fake-audio-bytes').toString('base64');
      const result = await extractTransactionFromAudio(
        {
          audio: audioBase64,
          mimeType: 'audio/webm',
        },
        {
          currentDate: '2026-08-26',
          apiKey: 'test-gemini-api-key',
          model: 'gemini-3.7-flash',
        }
      );

      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-gemini-api-key' });
      expect(mockCreate).toHaveBeenCalledTimes(1);

      const createArgs = mockCreate.mock.calls[0][0];
      expect(createArgs.model).toBe('gemini-3.7-flash');
      expect(Array.isArray(createArgs.input)).toBe(true);
      expect(createArgs.input[1]).toEqual({
        type: 'audio',
        data: audioBase64,
        mime_type: 'audio/webm',
      });
      expect(createArgs.response_format).toEqual({
        type: 'text',
        mime_type: 'application/json',
        schema: expect.objectContaining({
          type: 'object',
          properties: expect.objectContaining({
            type: expect.any(Object),
            amount: expect.any(Object),
            bankEntity: expect.any(Object),
            category: expect.any(Object),
            date: expect.any(Object),
            description: expect.any(Object),
            rawAudioPrompt: expect.any(Object),
          }),
        }),
      });

      expect(result).toEqual(mockResultData);
      expect((result as any).audio).toBeUndefined(); // never returns raw audio
    });

    it('defaults model to gemini-3.7-flash if not provided in context', async () => {
      mockCreate.mockResolvedValueOnce({
        status: 'completed',
        output_text: JSON.stringify({
          type: 'income',
          amount: 50000,
          bankEntity: 'Santander',
          category: 'Sueldo',
          date: '2026-08-26',
          description: null,
          rawAudioPrompt: 'Cobré el sueldo en Santander',
        }),
      });

      const audioBase64 = Buffer.from('audio').toString('base64');
      await extractTransactionFromAudio({
        audio: audioBase64,
        mimeType: 'audio/mp4',
      });

      const createArgs = mockCreate.mock.calls[0][0];
      expect(createArgs.model).toBe('gemini-3.7-flash');
    });

    it('extracts from outputs array if output_text is not directly on interaction', async () => {
      const mockResultData = {
        type: 'investment',
        amount: 15000,
        bankEntity: 'Lemon',
        category: 'Crypto',
        date: '2026-08-26',
        description: 'Compra de ETH',
        rawAudioPrompt: 'Invertí 15000 en Lemon para crypto',
      };

      mockCreate.mockResolvedValueOnce({
        status: 'completed',
        outputs: [
          {
            type: 'text',
            text: JSON.stringify(mockResultData),
          },
        ],
      });

      const result = await extractTransactionFromAudio({
        audio: Buffer.from('audio').toString('base64'),
        mimeType: 'audio/wav',
      });

      expect(result).toEqual(mockResultData);
    });

    it('throws GeminiProviderError when GEMINI_API_KEY is not configured', async () => {
      vi.stubEnv('GEMINI_API_KEY', '');

      await expect(
        extractTransactionFromAudio({
          audio: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow(GeminiProviderError);
    });

    it('throws GeminiExtractionError when output is empty string or whitespace', async () => {
      mockCreate.mockResolvedValueOnce({
        status: 'completed',
        output_text: '   ',
      });

      await expect(
        extractTransactionFromAudio({
          audio: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow(GeminiExtractionError);
    });

    it('throws GeminiExtractionError when output is valid JSON but not an object', async () => {
      mockCreate.mockResolvedValueOnce({
        status: 'completed',
        output_text: '"just a string"',
      });

      await expect(
        extractTransactionFromAudio({
          audio: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow(GeminiExtractionError);
    });

    it('throws GeminiExtractionError when interaction status is failed or cancelled', async () => {
      mockCreate.mockResolvedValueOnce({
        status: 'failed',
        errors: [{ message: 'Model refused or silent audio' }],
      });

      await expect(
        extractTransactionFromAudio({
          audio: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow(GeminiExtractionError);
    });

    it('throws GeminiProviderError when provider throws network or 503 error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('503 Service Unavailable: High load'));

      await expect(
        extractTransactionFromAudio({
          audio: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow(GeminiProviderError);
    });

    it('throws GeminiProviderError on rate limit errors (429)', async () => {
      mockCreate.mockRejectedValueOnce(new Error('429 Resource has been exhausted (e.g. check quota)'));

      await expect(
        extractTransactionFromAudio({
          audio: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow(GeminiProviderError);
    });
  });
});
