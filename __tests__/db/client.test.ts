import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('db/client.ts - Database Client & Fail-Closed Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('contains no hardcoded mock or fallback URLs in source code', () => {
    const clientPath = path.resolve(__dirname, '../../db/client.ts');
    const source = fs.readFileSync(clientPath, 'utf-8');

    expect(source).not.toMatch(/mock_user/i);
    expect(source).not.toMatch(/mock_password/i);
    expect(source).not.toMatch(/ep-sample/i);
    expect(source).not.toMatch(/fallback connection string/i);
  });

  it('does not throw upon module import when DATABASE_URL is absent', async () => {
    delete process.env.DATABASE_URL;
    const mod = await import('../../db/client');
    expect(mod).toBeDefined();
    expect(typeof mod.getDb).toBe('function');
  });

  it('fails closed with a configuration error when getDb() is called without DATABASE_URL', async () => {
    delete process.env.DATABASE_URL;
    const { getDb } = await import('../../db/client');

    expect(() => getDb()).toThrow(/DATABASE_URL.*required/i);
  });

  it('fails closed when DATABASE_URL is empty or whitespace', async () => {
    process.env.DATABASE_URL = '   \t\n  ';
    const { getDb } = await import('../../db/client');

    expect(() => getDb()).toThrow(/DATABASE_URL.*required/i);
  });

  it('returns a Drizzle database instance when valid DATABASE_URL is configured', async () => {
    process.env.DATABASE_URL =
      'postgresql://test_user:test_pass@ep-valid-pooler.us-east-2.neon.tech/neondb?sslmode=require';
    const { getDb } = await import('../../db/client');

    const db = getDb();
    expect(db).toBeDefined();
    expect(typeof db.select).toBe('function');
    expect(typeof db.insert).toBe('function');
    expect(typeof db.delete).toBe('function');
  });

  it('caches and reuses the database client for identical DATABASE_URL', async () => {
    process.env.DATABASE_URL =
      'postgresql://test_user:test_pass@ep-valid-pooler.us-east-2.neon.tech/neondb?sslmode=require';
    const { getDb } = await import('../../db/client');

    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });

  it('accepts an explicit databaseUrl parameter and returns a valid client', async () => {
    const { getDb } = await import('../../db/client');
    const customUrl =
      'postgresql://custom_user:custom_pass@ep-custom-pooler.us-east-2.neon.tech/neondb?sslmode=require';

    const db = getDb(customUrl);
    expect(db).toBeDefined();
    expect(typeof db.select).toBe('function');
  });

  it('re-initializes client when process.env.DATABASE_URL changes', async () => {
    process.env.DATABASE_URL =
      'postgresql://user1:pass1@ep-branch1-pooler.us-east-2.neon.tech/neondb?sslmode=require';
    const { getDb } = await import('../../db/client');

    const db1 = getDb();

    process.env.DATABASE_URL =
      'postgresql://user2:pass2@ep-branch2-pooler.us-east-2.neon.tech/neondb?sslmode=require';
    const db2 = getDb();

    expect(db1).not.toBe(db2);
  });

  it('fails closed in any NODE_ENV environment when DATABASE_URL is missing', async () => {
    const { getDb } = await import('../../db/client');

    for (const env of ['production', 'development', 'test', 'staging']) {
      vi.stubEnv('NODE_ENV', env);
      delete process.env.DATABASE_URL;
      expect(() => getDb()).toThrow(/DATABASE_URL.*required/i);
    }
  });
});
