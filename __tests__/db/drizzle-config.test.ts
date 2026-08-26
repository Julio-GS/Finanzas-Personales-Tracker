import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('drizzle.config.ts - Direct Migration URL Validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.DATABASE_URL_UNPOOLED;
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function loadConfig() {
    return (await import('../../drizzle.config')).default;
  }

  it('fails closed when DATABASE_URL_UNPOOLED is missing', async () => {
    delete process.env.DATABASE_URL_UNPOOLED;
    delete process.env.DATABASE_URL;

    await expect(loadConfig()).rejects.toThrow(/DATABASE_URL_UNPOOLED/i);
  });

  it('fails closed when only DATABASE_URL (pooled) is present', async () => {
    process.env.DATABASE_URL =
      'postgresql://user:pass@ep-sample-pooler.us-east-2.neon.tech/neondb?sslmode=require';
    delete process.env.DATABASE_URL_UNPOOLED;

    await expect(loadConfig()).rejects.toThrow(/DATABASE_URL_UNPOOLED/i);
  });

  it('fails closed when DATABASE_URL_UNPOOLED is empty or whitespace', async () => {
    process.env.DATABASE_URL_UNPOOLED = '   \t\n  ';
    await expect(loadConfig()).rejects.toThrow(/DATABASE_URL_UNPOOLED/i);
  });

  it('fails closed even when DATABASE_URL is set alongside empty DATABASE_URL_UNPOOLED', async () => {
    process.env.DATABASE_URL =
      'postgresql://user:pass@ep-sample-pooler.us-east-2.neon.tech/neondb?sslmode=require';
    process.env.DATABASE_URL_UNPOOLED = '';
    await expect(loadConfig()).rejects.toThrow(/DATABASE_URL_UNPOOLED/i);
  });

  it('loads valid configuration using direct unpooled URL when DATABASE_URL_UNPOOLED is provided', async () => {
    const directUrl =
      'postgresql://user:pass@ep-sample.us-east-2.neon.tech/neondb?sslmode=require';
    process.env.DATABASE_URL_UNPOOLED = `  ${directUrl}  `;
    process.env.DATABASE_URL =
      'postgresql://user:pass@ep-sample-pooler.us-east-2.neon.tech/neondb?sslmode=require';

    const config = await loadConfig();
    expect(config.schema).toBe('./db/schema.ts');
    expect(config.out).toBe('./db/migrations');
    expect(config.dialect).toBe('postgresql');

    const creds = (config as { dbCredentials: { url: string } }).dbCredentials;
    expect(creds.url).toBe(directUrl);
    expect(creds.url).not.toContain('mock');
    expect(creds.url).not.toContain('-pooler');
  });
});
