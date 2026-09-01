import { z } from 'zod';
import { isValidIsoDate, formatIsoDate } from './dates';
import { accountOptionSchema } from './accounts';

export const MOVEMENT_TYPES = [
  'income',
  'expense',
  'investment',
  'transfer',
] as const;
export const movementTypeSchema = z.enum(MOVEMENT_TYPES);
export type MovementType = z.infer<typeof movementTypeSchema>;

export const VOICE_MOVEMENT_TYPES = [
  'income',
  'expense',
  'investment',
] as const;
export const voiceMovementTypeSchema = z.enum(VOICE_MOVEMENT_TYPES);
export type VoiceMovementType = z.infer<typeof voiceMovementTypeSchema>;

export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/m4a',
  'audio/ogg',
] as const;

export const audioMimeTypeSchema = z.enum(ALLOWED_AUDIO_MIME_TYPES);

const amountSchema = z
  .union([z.number(), z.string()])
  .refine(
    (val) => {
      const str = String(val).trim();
      if (!/^\d+(\.\d{1,2})?$/.test(str)) return false;
      const num = Number.parseFloat(str);
      return !Number.isNaN(num) && num > 0;
    },
    { message: 'Amount must be a positive number with at most 2 decimal places' }
  )
  .transform((val) => {
    const num = Number.parseFloat(String(val));
    return num.toFixed(2);
  });

export const manualTransactionInputSchema = z
  .object({
    type: movementTypeSchema,
    amount: amountSchema,
    bankEntity: accountOptionSchema,
    destinationBankEntity: accountOptionSchema.nullish(),
    category: z.string().trim().optional(),
    date: z.string().refine(isValidIsoDate, {
      message: 'Date must be a valid YYYY-MM-DD string',
    }),
    description: z
      .string()
      .nullish()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'transfer') {
      if (!data.destinationBankEntity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Destination account is required for transfers',
          path: ['destinationBankEntity'],
        });
      } else if (data.destinationBankEntity === data.bankEntity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Source and destination accounts must be different',
          path: ['destinationBankEntity'],
        });
      }
    } else {
      if (!data.category || data.category.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Category is required and must not be empty',
          path: ['category'],
        });
      }
    }
  })
  .transform((data) => {
    if (data.type === 'transfer') {
      return {
        ...data,
        category:
          data.category && data.category.trim().length > 0
            ? data.category.trim()
            : 'Transferencia',
        destinationBankEntity: data.destinationBankEntity ?? null,
      };
    }
    return {
      ...data,
      category: data.category!.trim(),
      destinationBankEntity: null,
    };
  });

export type ManualTransactionInput = z.infer<typeof manualTransactionInputSchema>;

export const audioTransactionInputSchema = z.object({
  audio: z.string().min(1, 'Audio base64 data is required'),
  mimeType: audioMimeTypeSchema,
});

export type AudioTransactionInput = z.infer<typeof audioTransactionInputSchema>;

export const geminiExtractedTransactionSchema = z.object({
  type: voiceMovementTypeSchema,
  amount: amountSchema,
  bankEntity: z
    .string()
    .trim()
    .nullish()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : 'Efectivo'))
    .pipe(accountOptionSchema)
    .default('Efectivo'),
  category: z.string().trim().min(1, 'Category is required and must not be empty'),
  date: z
    .string()
    .nullish()
    .transform((val) => (val && isValidIsoDate(val) ? val : formatIsoDate(new Date())))
    .default(() => formatIsoDate(new Date())),
  description: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null))
    .default(null),
  rawAudioPrompt: z.string().nullish().default(null),
});

export type GeminiExtractedTransaction = z.infer<
  typeof geminiExtractedTransactionSchema
>;

export const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type MonthQuery = z.infer<typeof monthQuerySchema>;

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(12).default(6),
});

export type HistoryQuery = z.infer<typeof historyQuerySchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
