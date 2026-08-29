import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAuthEnv, validateAuthEnv } from '@/lib/env';

describe('lib/env - Auth Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const validEnv = {
    AUTH_USERNAME: 'admin',
    AUTH_PASSWORD: 'supersecretpassword123',
    AUTH_SECRET: 'a_very_secure_and_long_secret_key_at_least_32_chars_long',
    AUTH_SESSION_MAX_AGE_SECONDS: '604800',
  };

  it('accepts a valid auth environment configuration', () => {
    const result = validateAuthEnv(validEnv);
    expect(result.AUTH_USERNAME).toBe('admin');
    expect(result.AUTH_PASSWORD).toBe('supersecretpassword123');
    expect(result.AUTH_SECRET).toBe('a_very_secure_and_long_secret_key_at_least_32_chars_long');
    expect(result.AUTH_SESSION_MAX_AGE_SECONDS).toBe(604800);
  });

  it('defaults AUTH_SESSION_MAX_AGE_SECONDS to 604800 (7 days) when omitted', () => {
    const envWithoutMaxAge = {
      AUTH_USERNAME: 'admin',
      AUTH_PASSWORD: 'supersecretpassword123',
      AUTH_SECRET: 'a_very_secure_and_long_secret_key_at_least_32_chars_long',
    };
    const result = validateAuthEnv(envWithoutMaxAge);
    expect(result.AUTH_SESSION_MAX_AGE_SECONDS).toBe(604800);
  });

  it('fails closed when AUTH_USERNAME is missing or empty', () => {
    expect(() => validateAuthEnv({ ...validEnv, AUTH_USERNAME: '' })).toThrow();
    const withoutUsername = { ...validEnv };
    delete (withoutUsername as Record<string, unknown>).AUTH_USERNAME;
    expect(() => validateAuthEnv(withoutUsername)).toThrow();
  });

  it('fails closed when AUTH_PASSWORD is missing or empty', () => {
    expect(() => validateAuthEnv({ ...validEnv, AUTH_PASSWORD: '' })).toThrow();
    const withoutPassword = { ...validEnv };
    delete (withoutPassword as Record<string, unknown>).AUTH_PASSWORD;
    expect(() => validateAuthEnv(withoutPassword)).toThrow();
  });

  it('fails closed when AUTH_SECRET is missing or shorter than 32 characters', () => {
    expect(() => validateAuthEnv({ ...validEnv, AUTH_SECRET: 'too-short-secret' })).toThrow();
    expect(() => validateAuthEnv({ ...validEnv, AUTH_SECRET: '' })).toThrow();
    const withoutSecret = { ...validEnv };
    delete (withoutSecret as Record<string, unknown>).AUTH_SECRET;
    expect(() => validateAuthEnv(withoutSecret)).toThrow();
  });

  it('fails closed on invalid AUTH_SESSION_MAX_AGE_SECONDS values (non-positive or non-coercible)', () => {
    expect(() => validateAuthEnv({ ...validEnv, AUTH_SESSION_MAX_AGE_SECONDS: '0' })).toThrow();
    expect(() => validateAuthEnv({ ...validEnv, AUTH_SESSION_MAX_AGE_SECONDS: '-100' })).toThrow();
    expect(() => validateAuthEnv({ ...validEnv, AUTH_SESSION_MAX_AGE_SECONDS: 'not-a-number' })).toThrow();
  });

  it('getAuthEnv() successfully reads and validates environment from process.env', () => {
    process.env.AUTH_USERNAME = validEnv.AUTH_USERNAME;
    process.env.AUTH_PASSWORD = validEnv.AUTH_PASSWORD;
    process.env.AUTH_SECRET = validEnv.AUTH_SECRET;
    delete process.env.AUTH_SESSION_MAX_AGE_SECONDS;

    const result = getAuthEnv();
    expect(result.AUTH_USERNAME).toBe('admin');
    expect(result.AUTH_PASSWORD).toBe('supersecretpassword123');
    expect(result.AUTH_SESSION_MAX_AGE_SECONDS).toBe(604800);
  });
});
