import { NextRequest, NextResponse } from 'next/server';
import { validateRequestAuth } from '@/lib/auth-server';
import {
  audioTransactionInputSchema,
  geminiExtractedTransactionSchema,
} from '@/lib/validation';
import {
  extractTransactionFromAudio,
  isAudioPayloadWithinLimit,
  MAX_AUDIO_PAYLOAD_BYTES,
  GeminiExtractionError,
  GeminiProviderError,
} from '@/lib/gemini';
import { insertTransaction } from '@/db/queries';
import { apiErrorResponse } from '@/lib/errors';
import { formatIsoDate } from '@/lib/dates';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await validateRequestAuth(request);
  if (!auth.authenticated) {
    return auth.response!;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse('invalid_json', 'Invalid JSON body', 400);
  }

  const payloadParse = audioTransactionInputSchema.safeParse(body);
  if (!payloadParse.success) {
    return apiErrorResponse(
      'validation_error',
      'Validation failed',
      422,
      payloadParse.error.format()
    );
  }

  const { audio, mimeType } = payloadParse.data;

  // Enforce conservative decoded audio payload limit (5MB)
  if (!isAudioPayloadWithinLimit(audio, MAX_AUDIO_PAYLOAD_BYTES)) {
    return apiErrorResponse(
      'payload_too_large',
      'Audio payload exceeds maximum allowed size (5MB)',
      413
    );
  }

  let extractedRaw: unknown;
  try {
    extractedRaw = await extractTransactionFromAudio(
      { audio, mimeType },
      { currentDate: formatIsoDate(new Date()) }
    );
  } catch (error) {
    if (error instanceof GeminiExtractionError) {
      return apiErrorResponse('extraction_failed', error.message, 422);
    }
    if (error instanceof GeminiProviderError) {
      return apiErrorResponse('voice_service_unavailable', error.message, 503);
    }
    return apiErrorResponse(
      'voice_service_unavailable',
      'Voice extraction service is temporarily unavailable',
      503
    );
  }

  const schemaValidation = geminiExtractedTransactionSchema.safeParse(extractedRaw);
  if (!schemaValidation.success) {
    return apiErrorResponse(
      'extraction_failed',
      'Extracted transaction failed validation',
      422,
      schemaValidation.error.format()
    );
  }

  try {
    const transaction = await insertTransaction(schemaValidation.data);
    return NextResponse.json({ transaction, source: 'voice' }, { status: 201 });
  } catch {
    return apiErrorResponse(
      'database_error',
      'Failed to save transaction',
      500
    );
  }
}
