import { describe, it, expect } from 'vitest';
import {
  createApiError,
  apiErrorResponse,
  API_ERROR_CODES,
  type ApiErrorCode,
} from '@/lib/errors';

describe('Error Helpers', () => {
  it('creates typed api error object', () => {
    const error = createApiError('validation_error', 'Invalid input data', { field: 'amount' });
    expect(error).toEqual({
      error: {
        code: 'validation_error',
        message: 'Invalid input data',
        details: { field: 'amount' },
      },
    });
  });

  it('builds a JSON Response with correct status and error shape', async () => {
    const response = apiErrorResponse('unauthorized', 'Unauthorized access', 401);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body).toEqual({
      error: {
        code: 'unauthorized',
        message: 'Unauthorized access',
      },
    });
  });

  it('defines all required standard error codes', () => {
    const expectedCodes: ApiErrorCode[] = [
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
    ];

    for (const code of expectedCodes) {
      expect(API_ERROR_CODES).toContain(code);
    }
  });
});
