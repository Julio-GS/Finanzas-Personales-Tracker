import { describe, it, expect } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  AUTH_COOKIE_NAME,
  DEFAULT_SESSION_MAX_AGE_SECONDS,
  getSessionCookieOptions,
  getClearSessionCookieOptions,
} from '@/lib/auth-core';

describe('lib/auth-core - Session Token and Cookie Management', () => {
  const testSecret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const wrongSecret = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

  it('exports expected auth cookie name and default session duration', () => {
    expect(AUTH_COOKIE_NAME).toBe('finance_session');
    expect(DEFAULT_SESSION_MAX_AGE_SECONDS).toBe(604800);
  });

  it('creates a token containing v, iat, exp, nonce with no user data or credentials', async () => {
    const token = await createSessionToken(testSecret);
    expect(typeof token).toBe('string');
    const parts = token.split('.');
    expect(parts.length).toBe(2);

    const verification = await verifySessionToken(token, testSecret);
    expect(verification.valid).toBe(true);
    if (verification.valid) {
      expect(verification.payload.v).toBe(1);
      expect(typeof verification.payload.iat).toBe('number');
      expect(typeof verification.payload.exp).toBe('number');
      expect(typeof verification.payload.nonce).toBe('string');
      expect(verification.payload.exp).toBeGreaterThan(verification.payload.iat);
      // Confirm no user credentials or data leaked in token
      expect((verification.payload as unknown as Record<string, unknown>).username).toBeUndefined();
      expect((verification.payload as unknown as Record<string, unknown>).password).toBeUndefined();
    }
  });

  it('accepts untampered, non-expired tokens signed with the correct secret', async () => {
    const token = await createSessionToken(testSecret, 3600);
    const verification = await verifySessionToken(token, testSecret);
    expect(verification.valid).toBe(true);
  });

  it('rejects token signed with a different secret', async () => {
    const token = await createSessionToken(testSecret);
    const verification = await verifySessionToken(token, wrongSecret);
    expect(verification.valid).toBe(false);
    if (!verification.valid) {
      expect(verification.reason).toBe('invalid_signature');
    }
  });

  it('rejects tampered payload', async () => {
    const token = await createSessionToken(testSecret);
    const [payloadPart, sigPart] = token.split('.');
    const tamperedPayload = payloadPart.slice(0, -2) + 'AA';
    const tamperedToken = `${tamperedPayload}.${sigPart}`;

    const verification = await verifySessionToken(tamperedToken, testSecret);
    expect(verification.valid).toBe(false);
  });

  it('rejects tampered signature', async () => {
    const token = await createSessionToken(testSecret);
    const [payloadPart, sigPart] = token.split('.');
    const tamperedSig = sigPart.slice(0, -2) + 'AA';
    const tamperedToken = `${payloadPart}.${tamperedSig}`;

    const verification = await verifySessionToken(tamperedToken, testSecret);
    expect(verification.valid).toBe(false);
  });

  it('rejects malformed token strings and bad separators', async () => {
    expect((await verifySessionToken('invalid-token', testSecret)).valid).toBe(false);
    expect((await verifySessionToken('', testSecret)).valid).toBe(false);
    expect((await verifySessionToken('part1.part2.part3', testSecret)).valid).toBe(false);
  });

  it('rejects expired tokens (now >= exp boundary)', async () => {
    const expiredToken = await createSessionToken(testSecret, -10);
    const verification = await verifySessionToken(expiredToken, testSecret);
    expect(verification.valid).toBe(false);
    if (!verification.valid) {
      expect(verification.reason).toBe('expired_token');
    }

    const immediateExpiryToken = await createSessionToken(testSecret, 0);
    const boundaryVerification = await verifySessionToken(immediateExpiryToken, testSecret);
    expect(boundaryVerification.valid).toBe(false);
    if (!boundaryVerification.valid) {
      expect(boundaryVerification.reason).toBe('expired_token');
    }
  });

  it('rejects tokens with unsupported version or invalid payload structure', async () => {
    // Custom payload with unsupported version v: 2 signed with testSecret
    const badPayload = JSON.stringify({ v: 2, iat: 1000, exp: 9999999999, nonce: 'abc' });
    const encoder = new TextEncoder();
    const payloadPart = btoa(badPayload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(testSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadPart));
    let binary = '';
    const bytes = new Uint8Array(sigBuffer);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const sigPart = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const token = `${payloadPart}.${sigPart}`;
    const verification = await verifySessionToken(token, testSecret);
    expect(verification.valid).toBe(false);
    if (!verification.valid) {
      expect(verification.reason).toBe('invalid_payload');
    }
  });

  describe('Cookie options helpers', () => {
    it('returns secure cookie options for session in production and non-production', () => {
      const prodOptions = getSessionCookieOptions({ maxAgeSeconds: 3600, isProduction: true });
      expect(prodOptions.httpOnly).toBe(true);
      expect(prodOptions.secure).toBe(true);
      expect(prodOptions.sameSite).toBe('strict');
      expect(prodOptions.path).toBe('/');
      expect(prodOptions.maxAge).toBe(3600);
      expect(prodOptions.expires.getTime()).toBeGreaterThan(Date.now());

      const devOptions = getSessionCookieOptions({ maxAgeSeconds: 3600, isProduction: false });
      expect(devOptions.secure).toBe(false);
    });

    it('returns clearing cookie options with maxAge 0 and epoch expiration', () => {
      const clearOptions = getClearSessionCookieOptions({ isProduction: true });
      expect(clearOptions.httpOnly).toBe(true);
      expect(clearOptions.secure).toBe(true);
      expect(clearOptions.sameSite).toBe('strict');
      expect(clearOptions.path).toBe('/');
      expect(clearOptions.maxAge).toBe(0);
      expect(clearOptions.expires.getTime()).toBe(0);
    });
  });
});
