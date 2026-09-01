import { describe, it, expect } from 'vitest';
import * as schema from '@/db/schema';
import { getTableConfig } from 'drizzle-orm/pg-core';

describe('Database Schema: Transactions', () => {
  it('defines the transactions table', () => {
    expect(schema.transactions).toBeDefined();
  });

  it('defines movement_type enum with income, expense, investment values', () => {
    expect(schema.movementTypeEnum).toBeDefined();
    expect(schema.movementTypeEnum.enumValues).toEqual([
      'income',
      'expense',
      'investment',
      'transfer',
    ]);
  });

  it('defines required transaction columns with correct constraints', () => {
    const table = schema.transactions;
    expect(table.id).toBeDefined();
    expect(table.createdAt).toBeDefined();
    expect(table.date).toBeDefined();
    expect(table.type).toBeDefined();
    expect(table.amount).toBeDefined();
    expect(table.bankEntity).toBeDefined();
    expect(table.destinationBankEntity).toBeDefined();
    expect(table.category).toBeDefined();
    expect(table.description).toBeDefined();
    expect(table.rawAudioPrompt).toBeDefined();

    // Check column names mapped to DB snake_case
    expect(table.id.name).toBe('id');
    expect(table.createdAt.name).toBe('created_at');
    expect(table.date.name).toBe('date');
    expect(table.type.name).toBe('type');
    expect(table.amount.name).toBe('amount');
    expect(table.bankEntity.name).toBe('bank_entity');
    expect(table.destinationBankEntity.name).toBe('destination_bank_entity');
    expect(table.category.name).toBe('category');
    expect(table.description.name).toBe('description');
    expect(table.rawAudioPrompt.name).toBe('raw_audio_prompt');
  });

  it('has indexes on date, type, and bank_entity', () => {
    const tableConfig = getTableConfig(schema.transactions);
    const indexes = tableConfig.indexes;
    expect(indexes.length).toBeGreaterThanOrEqual(3);

    const indexNames = indexes.map((idx) => idx.config.name);
    expect(indexNames).toContain('idx_transactions_date');
    expect(indexNames).toContain('idx_transactions_type');
    expect(indexNames).toContain('idx_transactions_entity');
  });

  it('contains NO users, sessions, accounts, or auth tables', () => {
    const exportedKeys = Object.keys(schema);
    const forbiddenKeys = ['users', 'sessions', 'accounts', 'user', 'session', 'account', 'auth'];
    for (const key of forbiddenKeys) {
      expect(exportedKeys).not.toContain(key);
      expect((schema as Record<string, unknown>)[key]).toBeUndefined();
    }
  });
});
