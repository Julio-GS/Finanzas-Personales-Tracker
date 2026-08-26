import { defineConfig } from 'drizzle-kit';

const directUrl = process.env.DATABASE_URL_UNPOOLED?.trim();

if (!directUrl) {
  throw new Error(
    'DATABASE_URL_UNPOOLED environment variable is required and must not be empty for Drizzle migrations/schema management.'
  );
}

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: directUrl,
  },
});
