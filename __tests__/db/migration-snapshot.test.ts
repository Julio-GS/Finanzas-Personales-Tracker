import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Migration SQL Snapshot Integrity', () => {
  const repoRoot = path.resolve(__dirname, '../../');
  const migrationsDir = path.join(repoRoot, 'db/migrations');

  it('verifies migration directory exists with generated sql migration', () => {
    expect(fs.existsSync(migrationsDir)).toBe(true);
    const files = fs.readdirSync(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith('.sql'));
    expect(sqlFiles.length).toBeGreaterThanOrEqual(1);
  });

  it('keeps the initial transaction schema in the baseline migration', () => {
    const baseline = fs.readFileSync(
      path.join(migrationsDir, '0000_puzzling_iceman.sql'),
      'utf-8'
    );

    expect(baseline).toContain('CREATE TYPE "public"."movement_type"');
    expect(baseline).toContain('CREATE TABLE "transactions"');
    expect(baseline).toContain('CREATE INDEX "idx_transactions_date"');
    expect(baseline).toContain('CREATE INDEX "idx_transactions_type"');
    expect(baseline).toContain('CREATE INDEX "idx_transactions_entity"');
  });

  it('keeps every migration free of auth tables', () => {
    const files = fs.readdirSync(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith('.sql'));
    const forbiddenPatterns = [
      /CREATE TABLE\s+"users"/i,
      /CREATE TABLE\s+"sessions"/i,
      /CREATE TABLE\s+"accounts"/i,
      /CREATE TABLE\s+"user"/i,
      /CREATE TABLE\s+"session"/i,
      /CREATE TABLE\s+"auth/i,
    ];

    for (const sqlFile of sqlFiles) {
      const content = fs.readFileSync(path.join(migrationsDir, sqlFile), 'utf-8');

      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(content)).toBe(false);
      }
    }
  });
});
