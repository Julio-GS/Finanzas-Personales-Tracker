import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from './auth-core';
import { validateAuthEnv } from './env';
import { apiErrorResponse } from './errors';

export interface AuthValidationResult {
  authenticated: boolean;
  response?: NextResponse;
}

/**
 * Validates session cookie from a NextRequest for protected server route handlers.
 * Fails closed if session cookie is missing, tampered, expired, or if auth env is invalid.
 */
export async function validateRequestAuth(
  request: NextRequest
): Promise<AuthValidationResult> {
  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!sessionCookie) {
    return {
      authenticated: false,
      response: apiErrorResponse('unauthorized', 'Unauthorized', 401),
    };
  }

  let authEnv;
  try {
    authEnv = validateAuthEnv();
  } catch {
    return {
      authenticated: false,
      response: apiErrorResponse('unauthorized', 'Unauthorized', 401),
    };
  }

  const verification = await verifySessionToken(sessionCookie, authEnv.AUTH_SECRET);
  if (!verification.valid) {
    return {
      authenticated: false,
      response: apiErrorResponse('unauthorized', 'Unauthorized', 401),
    };
  }

  return { authenticated: true };
}
