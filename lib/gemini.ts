import 'server-only';
import { GoogleGenAI } from '@google/genai';
import { formatIsoDate } from './dates';

export const MAX_AUDIO_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB conservative decoded limit
export const DEFAULT_GEMINI_MODEL = 'gemini-3.7-flash';

export class GeminiExtractionError extends Error {
  readonly code = 'extraction_failed' as const;
  readonly statusCode = 422;

  constructor(message: string) {
    super(message);
    this.name = 'GeminiExtractionError';
  }
}

export class GeminiProviderError extends Error {
  readonly code = 'voice_service_unavailable' as const;
  readonly statusCode = 503;

  constructor(message: string) {
    super(message);
    this.name = 'GeminiProviderError';
  }
}

/**
 * Computes the decoded byte length of a base64 string without allocating large buffers.
 */
export function getAudioDecodedByteLength(base64: string): number {
  if (!base64 || typeof base64 !== 'string') return 0;
  const clean = base64.trim();
  if (clean.length === 0) return 0;
  return Buffer.byteLength(clean, 'base64');
}

/**
 * Checks whether the decoded audio payload is within the allowed byte size limit.
 */
export function isAudioPayloadWithinLimit(
  base64: string,
  maxBytes: number = MAX_AUDIO_PAYLOAD_BYTES
): boolean {
  const byteLength = getAudioDecodedByteLength(base64);
  return byteLength > 0 && byteLength <= maxBytes;
}

export interface ExtractAudioInput {
  audio: string;
  mimeType: string;
}

export interface ExtractAudioOptions {
  currentDate?: string;
  apiKey?: string;
  model?: string;
}

export interface ExtractedTransactionRaw {
  type: 'income' | 'expense' | 'investment';
  amount: number | string;
  bankEntity?: string | null;
  category: string;
  date?: string | null;
  description?: string | null;
  rawAudioPrompt?: string | null;
}

interface InteractionErrorDetail {
  message?: string;
}

interface InteractionOutputItem {
  type?: string;
  text?: string;
}

interface InteractionResult {
  id?: string;
  status?: string;
  output_text?: string;
  outputs?: InteractionOutputItem[];
  errors?: InteractionErrorDetail[];
}

const transactionResponseSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['income', 'expense', 'investment'],
      description: 'The transaction movement type: income, expense, or investment.',
    },
    amount: {
      type: 'number',
      description: 'The positive numerical amount of the transaction.',
    },
    bankEntity: {
      type: 'string',
      description:
        'The bank entity, digital wallet, or payment method (e.g., Santander, Mercado Pago, Efectivo, Lemon). Default to "Efectivo" if not specified.',
    },
    category: {
      type: 'string',
      description:
        'The expense, income, or investment category (e.g., Supermercado, Alquiler, Salidas, Sueldo, CEDEARs, Dólar).',
    },
    date: {
      type: 'string',
      description:
        'The transaction date in ISO YYYY-MM-DD format. Default to the provided current date if not specified.',
    },
    description: {
      type: 'string',
      description: 'Brief details or description of the transaction, or null if omitted.',
    },
    rawAudioPrompt: {
      type: 'string',
      description: 'Short transcript or summary of the spoken audio note.',
    },
  },
  required: ['type', 'amount', 'category'],
};

function buildPrompt(currentDate: string): string {
  return `You are a voice transaction extraction engine for a personal finance tracker.
Analyze the provided voice audio recording and extract exactly one transaction into structured JSON.

Rules:
1. "type" MUST be one of: "income", "expense", or "investment".
2. "amount" MUST be a positive number representing the amount spent, received, or invested.
3. "bankEntity" MUST be the bank, digital wallet, or payment method mentioned (e.g., "Mercado Pago", "Santander", "Efectivo", "Lemon"). If none is mentioned, default to "Efectivo".
4. "category" MUST be a clear category (e.g., "Supermercado", "Restaurante", "Sueldo", "Servicios", "Inversiones", "Café").
5. "date" MUST be formatted as "YYYY-MM-DD". If the user did not specify a date or relative day (like "yesterday"), default to "${currentDate}".
6. "description" should capture any additional details or notes mentioned, or null.
7. "rawAudioPrompt" MUST be a brief verbatim transcription or concise summary of what was heard.
8. If the audio is completely silent, inaudible, unintelligible, or contains no financial transaction, do not guess; generate empty or minimal invalid fields.

Current date context: ${currentDate}`;
}

/**
 * Extracts structured financial transaction data from base64 audio using Gemini Flash Interactions API.
 * Server-only wrapper. Never persists raw audio.
 */
export async function extractTransactionFromAudio(
  input: ExtractAudioInput,
  options?: ExtractAudioOptions
): Promise<ExtractedTransactionRaw> {
  const apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new GeminiProviderError('GEMINI_API_KEY is not configured');
  }

  const model = options?.model ?? process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const currentDate = options?.currentDate ?? formatIsoDate(new Date());

  const ai = new GoogleGenAI({ apiKey });

  let interaction: InteractionResult;
  try {
    const rawInteraction = await ai.interactions.create({
      model,
      input: [
        {
          type: 'text',
          text: buildPrompt(currentDate),
        },
        {
          type: 'audio',
          data: input.audio,
          mime_type: input.mimeType as string,
        },
      ],
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: transactionResponseSchema,
      },
    });
    interaction = rawInteraction as InteractionResult;
  } catch (error: unknown) {
    if (error instanceof GeminiExtractionError || error instanceof GeminiProviderError) {
      throw error;
    }
    const errObj = error as { message?: string; status?: number } | undefined;
    const message = errObj?.message || (typeof error === 'string' ? error : 'Unknown provider error');
    // Classify rate limits, transient network/service errors, and HTTP status codes
    const isRateLimit =
      message.includes('429') ||
      message.includes('quota') ||
      message.includes('exhausted') ||
      errObj?.status === 429;
    const isUnavailable =
      message.includes('503') ||
      message.includes('500') ||
      message.includes('unavailable') ||
      message.includes('timeout') ||
      message.includes('ECONNRESET') ||
      message.includes('ETIMEDOUT') ||
      errObj?.status === 503;

    if (isRateLimit || isUnavailable) {
      throw new GeminiProviderError(`Voice service provider failure: ${message}`);
    }

    throw new GeminiProviderError(`Voice processing failed: ${message}`);
  }

  if (!interaction) {
    throw new GeminiExtractionError('No response returned from Gemini interaction');
  }

  if (interaction.status === 'failed' || interaction.status === 'cancelled') {
    const errorDetails = interaction.errors?.map((e) => e.message).filter(Boolean).join('; ') || 'Interaction failed';
    throw new GeminiExtractionError(`Gemini interaction did not complete successfully: ${errorDetails}`);
  }

  let outputText: string | undefined = interaction.output_text;
  if (!outputText && Array.isArray(interaction.outputs)) {
    const textOutput = interaction.outputs.find((o) => o.type === 'text');
    outputText = textOutput?.text;
  }

  if (!outputText || typeof outputText !== 'string' || outputText.trim().length === 0) {
    throw new GeminiExtractionError('Gemini returned an empty or silent extraction response');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText.trim());
  } catch {
    throw new GeminiExtractionError('Failed to parse Gemini structured JSON output');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new GeminiExtractionError('Gemini output is not a valid JSON object');
  }

  return parsed as ExtractedTransactionRaw;
}
