import { NextResponse } from 'next/server';

export const API_ERROR_CODES = [
  'invalid_json',
  'validation_error',
  'invalid_credentials',
  'auth_config_error',
  'unauthorized',
  'extraction_failed',
  'voice_service_unavailable',
  'payload_too_large',
  'not_found',
  'database_error',
  'internal_error',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorPayload {
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: unknown;
  };
}

export function createApiError(
  code: ApiErrorCode | string,
  message: string,
  details?: unknown
): ApiErrorPayload {
  const payload: ApiErrorPayload = {
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    payload.error.details = details;
  }

  return payload;
}

export function apiErrorResponse(
  code: ApiErrorCode | string,
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiErrorPayload> {
  const body = createApiError(code, message, details);
  return NextResponse.json(body, { status });
}
