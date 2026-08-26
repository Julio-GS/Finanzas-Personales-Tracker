import 'server-only';
import { z } from 'zod';

export const authEnvSchema = z.object({
  AUTH_USERNAME: z.string().min(1, 'AUTH_USERNAME is required and must not be empty'),
  AUTH_PASSWORD: z.string().min(1, 'AUTH_PASSWORD is required and must not be empty'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET is required and must be at least 32 characters'),
  AUTH_SESSION_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(604800),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export function validateAuthEnv(env: Record<string, string | undefined> = process.env): AuthEnv {
  return authEnvSchema.parse(env);
}

export function getAuthEnv(): AuthEnv {
  return validateAuthEnv(process.env);
}

export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required and must not be empty'),
  DATABASE_URL_UNPOOLED: z
    .string()
    .min(1, 'DATABASE_URL_UNPOOLED is required and must not be empty'),
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

export function validateDatabaseEnv(
  env: Record<string, string | undefined> = process.env
): DatabaseEnv {
  return databaseEnvSchema.parse(env);
}

export function getDatabaseEnv(): DatabaseEnv {
  return validateDatabaseEnv(process.env);
}

export const serverEnvSchema = authEnvSchema.extend({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required and must not be empty'),
  DATABASE_URL_UNPOOLED: z
    .string()
    .min(1, 'DATABASE_URL_UNPOOLED is required and must not be empty'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required and must not be empty'),
  GEMINI_MODEL: z.string().default('gemini-3.7-flash'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function validateServerEnv(
  env: Record<string, string | undefined> = process.env
): ServerEnv {
  return serverEnvSchema.parse(env);
}

export function getServerEnv(): ServerEnv {
  return validateServerEnv(process.env);
}
