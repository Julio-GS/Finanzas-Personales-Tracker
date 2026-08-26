export const AUTH_COOKIE_NAME = 'finance_session';
export const DEFAULT_SESSION_MAX_AGE_SECONDS = 604800; // 7 days

export interface SessionPayload {
  v: 1;
  iat: number;
  exp: number;
  nonce: string;
}

export type VerifySessionResult =
  | { valid: true; payload: SessionPayload }
  | { valid: false; reason: string };

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number;
  expires: Date;
}

export interface CredentialValidationResult {
  success: boolean;
  error?: {
    code: 'invalid_credentials';
    message: string;
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  if (aBytes.length !== bBytes.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

function constantTimeByteEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function createSessionToken(
  secret: string,
  maxAgeSeconds: number = DEFAULT_SESSION_MAX_AGE_SECONDS
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = bytesToBase64Url(nonceBytes);

  const payload: SessionPayload = {
    v: 1,
    iat: now,
    exp: now + maxAgeSeconds,
    nonce,
  };

  const payloadJson = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);
  const payloadPart = bytesToBase64Url(payloadBytes);

  const key = await getHmacKey(secret);
  const sigBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadPart)
  );
  const sigPart = bytesToBase64Url(new Uint8Array(sigBuffer));

  return `${payloadPart}.${sigPart}`;
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<VerifySessionResult> {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'malformed_token' };
  }

  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: 'malformed_token' };
  }

  try {
    const [payloadPart, sigPart] = parts;
    const key = await getHmacKey(secret);
    const expectedSigBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(payloadPart)
    );
    const expectedSigBytes = new Uint8Array(expectedSigBuffer);
    const providedSigBytes = base64UrlToBytes(sigPart);

    if (!constantTimeByteEqual(expectedSigBytes, providedSigBytes)) {
      return { valid: false, reason: 'invalid_signature' };
    }

    const payloadJson = new TextDecoder().decode(base64UrlToBytes(payloadPart));
    const payload = JSON.parse(payloadJson) as SessionPayload;

    if (
      payload.v !== 1 ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number' ||
      typeof payload.nonce !== 'string'
    ) {
      return { valid: false, reason: 'invalid_payload' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= payload.exp) {
      return { valid: false, reason: 'expired_token' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'verification_failed' };
  }
}

export function validateCredentials(
  input: { username?: string; password?: string },
  configured: { username: string; password: string }
): CredentialValidationResult {
  const usernameMatch = constantTimeEqual(input.username ?? '', configured.username);
  const passwordMatch = constantTimeEqual(input.password ?? '', configured.password);

  if (usernameMatch && passwordMatch && Boolean(input.username) && Boolean(input.password)) {
    return { success: true };
  }

  return {
    success: false,
    error: {
      code: 'invalid_credentials',
      message: 'Invalid credentials',
    },
  };
}

export function getSessionCookieOptions(options?: {
  maxAgeSeconds?: number;
  isProduction?: boolean;
}): CookieOptions {
  const maxAge = options?.maxAgeSeconds ?? DEFAULT_SESSION_MAX_AGE_SECONDS;
  const isProd = options?.isProduction ?? (process.env.NODE_ENV === 'production');

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
  };
}

export function getClearSessionCookieOptions(options?: {
  isProduction?: boolean;
}): CookieOptions {
  const isProd = options?.isProduction ?? (process.env.NODE_ENV === 'production');

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  };
}
