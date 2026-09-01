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
  const mockGenerateContent = vi.fn();
  const mockGoogleGenAI = vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  }));
  return {
    GoogleGenAI: mockGoogleGenAI,
  };
});

describe('lib/gemini - Gemini Voice Extraction Wrapper', () => {
  const mockGenerateContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-api-key');
    vi.stubEnv('GEMINI_MODEL', 'gemini-3.5-flash-lite');
    vi.mocked(GoogleGenAI).mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
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
    it('calls GoogleGenAI models.generateContent with model, inlineData audio content, and JSON responseSchema config', async () => {
      const mockResultData = {
        type: 'expense',
        amount: 2500.5,
        bankEntity: 'Mercado Pago',
        category: 'Supermercado',
        date: '2026-08-26',
        description: 'Compra semanal',
        rawAudioPrompt: 'Gasté 2500 pesos con 50 en el supermercado con Mercado Pago',
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockResultData),
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
          model: 'gemini-3.5-flash-lite',
        }
      );

      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-gemini-api-key' });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.model).toBe('gemini-3.5-flash-lite');
      expect(Array.isArray(callArgs.contents)).toBe(true);
      expect(callArgs.contents[0]).toContain('You are a voice transaction extraction engine');
      expect(callArgs.contents[1]).toEqual({
        inlineData: {
          data: audioBase64,
          mimeType: 'audio/webm',
        },
      });
      expect(callArgs.config).toEqual({
        responseMimeType: 'application/json',
        responseSchema: expect.objectContaining({
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

    it('defaults model to gemini-3.5-flash-lite if not provided in context', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          type: 'income',
          amount: 50000,
          bankEntity: 'Banco Galicia',
          category: 'Sueldo',
          date: '2026-08-26',
          description: null,
          rawAudioPrompt: 'Cobré el sueldo en Banco Galicia',
        }),
      });

      const audioBase64 = Buffer.from('audio').toString('base64');
      await extractTransactionFromAudio({
        audio: audioBase64,
        mimeType: 'audio/mp4',
      });

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.model).toBe('gemini-3.5-flash-lite');
    });

    it('constrains bankEntity in responseSchema and prompt to the 4 fixed accounts', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          type: 'expense',
          amount: 1500,
          bankEntity: 'Mercado Pago',
          category: 'Almuerzo',
        }),
      });

      await extractTransactionFromAudio({
        audio: Buffer.from('audio').toString('base64'),
        mimeType: 'audio/webm',
      });

      const callArgs = mockGenerateContent.mock.calls[0][0];
      const prompt = callArgs.contents[0];
      expect(prompt).toContain('Banco Galicia');
      expect(prompt).toContain('Mercado Pago');
      expect(prompt).toContain('Naranja X');
      expect(prompt).toContain('Efectivo');

      const schema = callArgs.config.responseSchema;
      expect(schema.properties.bankEntity.enum).toEqual([
        'Banco Galicia',
        'Mercado Pago',
        'Naranja X',
        'Efectivo',
      ]);
    });

    it('constrains movement type in responseSchema to income, expense, and investment (excluding transfer)', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          type: 'expense',
          amount: 1500,
          bankEntity: 'Mercado Pago',
          category: 'Almuerzo',
        }),
      });

      await extractTransactionFromAudio({
        audio: Buffer.from('audio').toString('base64'),
        mimeType: 'audio/webm',
      });

      const callArgs = mockGenerateContent.mock.calls[0][0];
      const schema = callArgs.config.responseSchema;
      expect(schema.properties.type.enum).toEqual(['income', 'expense', 'investment']);
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
      mockGenerateContent.mockResolvedValueOnce({
        text: '   ',
      });

      await expect(
        extractTransactionFromAudio({
          audio: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow(GeminiExtractionError);
    });

    it('throws GeminiExtractionError when output is invalid JSON', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '{ invalid json syntax',
      });

      await expect(
        extractTransactionFromAudio({
          audio: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow(GeminiExtractionError);
    });

    it('respects explicit model override options over environment variable', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          type: 'expense',
          amount: 100,
          category: 'Test',
        }),
      });

      await extractTransactionFromAudio(
        {
          audio: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm',
        },
        {
          model: 'custom-flash-model',
        }
      );

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.model).toBe('custom-flash-model');
    });

    it('throws GeminiExtractionError when response text is undefined', async () => {
      mockGenerateContent.mockResolvedValueOnce({});

      await expect(
        extractTransactionFromAudio({
          audio: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow(GeminiExtractionError);
    });

    it('throws GeminiExtractionError when output is valid JSON but not an object', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '"just a string"',
      });

      await expect(
        extractTransactionFromAudio({
          audio: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow(GeminiExtractionError);
    });

    it('throws GeminiProviderError when provider throws network or 503 error', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('503 Service Unavailable: High load'));

      await expect(
        extractTransactionFromAudio({
          audio: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow(GeminiProviderError);
    });

    it('throws GeminiProviderError on rate limit errors (429)', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('429 Resource has been exhausted (e.g. check quota)'));

      await expect(
        extractTransactionFromAudio({
          audio: Buffer.from('audio').toString('base64'),
          mimeType: 'audio/webm',
        })
      ).rejects.toThrow(GeminiProviderError);
    });
  });
});
