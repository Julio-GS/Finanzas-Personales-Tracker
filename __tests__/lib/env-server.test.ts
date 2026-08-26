import { describe, it, expect } from 'vitest';
import {
  validateDatabaseEnv,
  validateServerEnv,
  databaseEnvSchema,
  serverEnvSchema,
} from '@/lib/env';

describe('lib/env - Database & Server Env Validation', () => {
  const validDbEnv = {
    DATABASE_URL:
      'postgresql://user:pass@ep-sample-pooler.us-east-2.neon.tech/neondb?sslmode=require',
    DATABASE_URL_UNPOOLED:
      'postgresql://user:pass@ep-sample.us-east-2.neon.tech/neondb?sslmode=require',
  };

  const validFullEnv = {
    AUTH_USERNAME: 'admin',
    AUTH_PASSWORD: 'supersecretpassword123',
    AUTH_SECRET: 'a_very_secure_and_long_secret_key_at_least_32_chars_long',
    AUTH_SESSION_MAX_AGE_SECONDS: '604800',
    DATABASE_URL:
      'postgresql://user:pass@ep-sample-pooler.us-east-2.neon.tech/neondb?sslmode=require',
    DATABASE_URL_UNPOOLED:
      'postgresql://user:pass@ep-sample.us-east-2.neon.tech/neondb?sslmode=require',
    GEMINI_API_KEY: 'mock-gemini-key',
    GEMINI_MODEL: 'gemini-3.7-flash',
  };

  it('validates database environment with pooled and unpooled URLs', () => {
    const result = validateDatabaseEnv(validDbEnv);
    expect(result.DATABASE_URL).toBe(validDbEnv.DATABASE_URL);
    expect(result.DATABASE_URL_UNPOOLED).toBe(validDbEnv.DATABASE_URL_UNPOOLED);
  });

  it('fails closed when DATABASE_URL or DATABASE_URL_UNPOOLED is missing or empty', () => {
    expect(() => validateDatabaseEnv({ ...validDbEnv, DATABASE_URL: '' })).toThrow();
    expect(() =>
      validateDatabaseEnv({ ...validDbEnv, DATABASE_URL_UNPOOLED: '' })
    ).toThrow();

    const { DATABASE_URL, ...withoutPool } = validDbEnv;
    expect(() => validateDatabaseEnv(withoutPool)).toThrow();

    const { DATABASE_URL_UNPOOLED, ...withoutUnpool } = validDbEnv;
    expect(() => validateDatabaseEnv(withoutUnpool)).toThrow();
  });

  it('validates full server environment with auth, database, and gemini config', () => {
    const result = validateServerEnv(validFullEnv);
    expect(result.AUTH_USERNAME).toBe('admin');
    expect(result.DATABASE_URL).toBe(validFullEnv.DATABASE_URL);
    expect(result.GEMINI_API_KEY).toBe('mock-gemini-key');
    expect(result.GEMINI_MODEL).toBe('gemini-3.7-flash');
  });

  it('defaults GEMINI_MODEL to gemini-3.7-flash when omitted', () => {
    const { GEMINI_MODEL, ...withoutModel } = validFullEnv;
    const result = validateServerEnv(withoutModel);
    expect(result.GEMINI_MODEL).toBe('gemini-3.7-flash');
  });

  it('fails closed when GEMINI_API_KEY is missing or empty', () => {
    expect(() =>
      validateServerEnv({ ...validFullEnv, GEMINI_API_KEY: '' })
    ).toThrow();
    const { GEMINI_API_KEY, ...withoutGemini } = validFullEnv;
    expect(() => validateServerEnv(withoutGemini)).toThrow();
  });
});
