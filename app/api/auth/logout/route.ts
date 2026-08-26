import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  getClearSessionCookieOptions,
} from '@/lib/auth-core';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true }, { status: 200 });

  const clearOptions = getClearSessionCookieOptions({
    isProduction: process.env.NODE_ENV === 'production',
  });

  response.cookies.set(AUTH_COOKIE_NAME, '', clearOptions);

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
