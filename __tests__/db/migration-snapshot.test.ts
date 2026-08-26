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

  it('verifies generated sql contains only transactions table and movement_type enum', () => {
    const files = fs.readdirSync(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith('.sql'));

    for (const sqlFile of sqlFiles) {
      const content = fs.readFileSync(path.join(migrationsDir, sqlFile), 'utf-8');

      // Must create movement_type enum and transactions table
      expect(content).toContain('CREATE TYPE "public"."movement_type"');
      expect(content).toContain('CREATE TABLE "transactions"');

      // Must have the three indexes
      expect(content).toContain('CREATE INDEX "idx_transactions_date"');
      expect(content).toContain('CREATE INDEX "idx_transactions_type"');
      expect(content).toContain('CREATE INDEX "idx_transactions_entity"');

      // Must NOT contain users, sessions, accounts, or auth tables
      const forbiddenPatterns = [
        /CREATE TABLE\s+"users"/i,
        /CREATE TABLE\s+"sessions"/i,
        /CREATE TABLE\s+"accounts"/i,
        /CREATE TABLE\s+"user"/i,
        /CREATE TABLE\s+"session"/i,
        /CREATE TABLE\s+"auth/i,
      ];

      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(content)).toBe(false);
      }
    }
  });
});
