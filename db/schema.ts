import { pgTable, uuid, timestamp, date, numeric, text, pgEnum, index } from 'drizzle-orm/pg-core';

export const movementTypeEnum = pgEnum('movement_type', [
  'income',
  'expense',
  'investment',
]);

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    type: movementTypeEnum('type').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    bankEntity: text('bank_entity').notNull(),
    category: text('category').notNull(),
    description: text('description'),
    rawAudioPrompt: text('raw_audio_prompt'),
  },
  (table) => [
    index('idx_transactions_date').on(table.date.desc()),
    index('idx_transactions_type').on(table.type),
    index('idx_transactions_entity').on(table.bankEntity),
  ]
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type MovementType = (typeof movementTypeEnum.enumValues)[number];
