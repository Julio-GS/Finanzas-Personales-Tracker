import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateAuthEnv } from '@/lib/env';
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  validateCredentials,
  getSessionCookieOptions,
} from '@/lib/auth-core';

const loginPayloadSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'invalid_json',
          message: 'Invalid JSON body',
        },
      },
      { status: 400 }
    );
  }

  const parseResult = loginPayloadSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: {
          code: 'validation_error',
          message: 'Username and password are required',
        },
      },
      { status: 422 }
    );
  }

  let authEnv;
  try {
    authEnv = validateAuthEnv();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'auth_config_error',
          message: 'Authentication configuration error',
        },
      },
      { status: 500 }
    );
  }

  const { username, password } = parseResult.data;
  const credentialCheck = validateCredentials(
    { username, password },
    { username: authEnv.AUTH_USERNAME, password: authEnv.AUTH_PASSWORD }
  );

  if (!credentialCheck.success) {
    return NextResponse.json(
      {
        error: {
          code: 'invalid_credentials',
          message: 'Invalid credentials',
        },
      },
      { status: 401 }
    );
  }

  const token = await createSessionToken(
    authEnv.AUTH_SECRET,
    authEnv.AUTH_SESSION_MAX_AGE_SECONDS
  );

  const response = NextResponse.json({ success: true }, { status: 200 });

  const cookieOptions = getSessionCookieOptions({
    maxAgeSeconds: authEnv.AUTH_SESSION_MAX_AGE_SECONDS,
    isProduction: process.env.NODE_ENV === 'production',
  });

  response.cookies.set(AUTH_COOKIE_NAME, token, cookieOptions);

  return response;
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: {
        code: 'method_not_allowed',
        message: 'Method not allowed',
      },
    },
    { status: 405 }
  );
}
