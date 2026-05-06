import { z } from 'zod';
import { isValidPushEndpoint } from '@/utils/urlValidation';

/**
 * 共通: 文字列を trim した上で長さチェックするユーティリティ。
 */
const trimmedString = (min: number, max: number) =>
  z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length >= min && v.length <= max, {
      message: `${min}〜${max} 文字で入力してください。`,
    });

const HHMM_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const BASE64URL_PATTERN = /^[A-Za-z0-9\-_]+=*$/;

// ───────────────────────────────────────────────────────────────────
// /api/preferences PUT
// ───────────────────────────────────────────────────────────────────

export const NotificationPreferencesPatchSchema = z
  .object({
    daily_reminder: z.boolean().optional(),
    weekly_summary: z.boolean().optional(),
    achievement_alerts: z.boolean().optional(),
    reminder_time: z
      .string()
      .regex(HHMM_PATTERN, {
        error: 'reminder_time は HH:MM 形式 (00:00〜23:59) である必要があります。',
      })
      .optional(),
  })
  .strict();

export const PreferencesUpdateSchema = z
  .object({
    pwa_install_dismissed: z.boolean().optional(),
    timezone: trimmedString(1, 100).optional(),
    notification_preferences: NotificationPreferencesPatchSchema.optional(),
  })
  .strict();

export type PreferencesUpdateInput = z.infer<typeof PreferencesUpdateSchema>;

// ───────────────────────────────────────────────────────────────────
// /api/push/subscribe POST
// ───────────────────────────────────────────────────────────────────

export const PushSubscribeSchema = z
  .object({
    endpoint: z
      .string()
      .min(1)
      .refine(isValidPushEndpoint, {
        message: 'endpoint は公開到達可能な HTTPS URL である必要があります。',
      }),
    p256dh: z
      .string()
      .min(1)
      .regex(BASE64URL_PATTERN, { error: 'p256dh は Base64url 文字列である必要があります。' }),
    auth: z
      .string()
      .min(1)
      .regex(BASE64URL_PATTERN, { error: 'auth は Base64url 文字列である必要があります。' }),
    user_agent: z.string().max(500).optional(),
    browser: z.string().max(100).optional(),
  })
  .strict();

export type PushSubscribeInput = z.infer<typeof PushSubscribeSchema>;

// ───────────────────────────────────────────────────────────────────
// /api/push/unsubscribe POST
// ───────────────────────────────────────────────────────────────────

export const PushUnsubscribeSchema = z
  .object({
    endpoint: z
      .string()
      .min(1)
      .refine(isValidPushEndpoint, {
        message: 'endpoint は公開到達可能な HTTPS URL である必要があります。',
      }),
  })
  .strict();

export type PushUnsubscribeInput = z.infer<typeof PushUnsubscribeSchema>;

// ───────────────────────────────────────────────────────────────────
// /api/auth/profile/[userId] PATCH
// ───────────────────────────────────────────────────────────────────

export const ProfileUpdateSchema = z
  .object({
    name: trimmedString(1, 100),
  })
  .strict();

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;

// ───────────────────────────────────────────────────────────────────
// /api/auth/session POST
// ───────────────────────────────────────────────────────────────────

export const SessionCreateSchema = z
  .object({
    access_token: z.string().min(1),
    refresh_token: z.string().min(1),
  })
  .strict();

export type SessionCreateInput = z.infer<typeof SessionCreateSchema>;

// ───────────────────────────────────────────────────────────────────
// /api/logs/errors POST
// ───────────────────────────────────────────────────────────────────

const ErrorLogContextSchema = z
  .object({
    page: z.string().max(2048).optional(),
    action: z.string().max(200).optional(),
    url: z.string().max(2048).optional(),
    userAgent: z.string().max(500).optional(),
    sessionId: z.string().max(100).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const ErrorLogEntrySchema = z
  .object({
    id: z.string().min(1).max(100),
    errorType: z.string().min(1).max(100),
    message: z.string().max(5000),
    stack: z.string().max(20000).optional(),
    statusCode: z.number().int().optional(),
    severity: z.string().min(1).max(50),
    createdAt: z.number(),
    context: ErrorLogContextSchema,
  })
  .passthrough();

export const ErrorLogsBatchSchema = z
  .object({
    logs: z.array(ErrorLogEntrySchema).min(1).max(50),
    sessionId: z.string().max(100).optional(),
    batchId: z.string().max(100).optional(),
    sentAt: z.number().optional(),
  })
  .strict();

export type ErrorLogsBatchInput = z.infer<typeof ErrorLogsBatchSchema>;
