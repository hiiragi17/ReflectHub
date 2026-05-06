import { describe, it, expect } from 'vitest';
import {
  PreferencesUpdateSchema,
  PushSubscribeSchema,
  PushUnsubscribeSchema,
  ProfileUpdateSchema,
  SessionCreateSchema,
  ErrorLogsBatchSchema,
} from './schemas';

describe('PreferencesUpdateSchema', () => {
  it('accepts an empty patch', () => {
    expect(PreferencesUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a valid full payload', () => {
    const result = PreferencesUpdateSchema.safeParse({
      pwa_install_dismissed: true,
      timezone: 'Asia/Tokyo',
      notification_preferences: {
        daily_reminder: true,
        reminder_time: '20:30',
        weekly_summary: false,
        achievement_alerts: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown top-level keys', () => {
    expect(
      PreferencesUpdateSchema.safeParse({ unknown_field: true }).success,
    ).toBe(false);
  });

  it('rejects unknown notification_preferences keys', () => {
    expect(
      PreferencesUpdateSchema.safeParse({
        notification_preferences: { evil_field: true },
      }).success,
    ).toBe(false);
  });

  it('rejects invalid reminder_time format', () => {
    expect(
      PreferencesUpdateSchema.safeParse({
        notification_preferences: { reminder_time: '25:00' },
      }).success,
    ).toBe(false);
    expect(
      PreferencesUpdateSchema.safeParse({
        notification_preferences: { reminder_time: '9:00' },
      }).success,
    ).toBe(false);
  });

  it('rejects non-boolean booleans', () => {
    expect(
      PreferencesUpdateSchema.safeParse({ pwa_install_dismissed: 'true' }).success,
    ).toBe(false);
  });

  it('trims timezone string', () => {
    const result = PreferencesUpdateSchema.parse({ timezone: '  Asia/Tokyo  ' });
    expect(result.timezone).toBe('Asia/Tokyo');
  });
});

describe('PushSubscribeSchema', () => {
  const valid = {
    endpoint: 'https://fcm.googleapis.com/wp/abc',
    p256dh: 'ABCDEFGabc-_1234',
    auth: 'XYZ_-abc12==',
  };

  it('accepts a valid payload', () => {
    expect(PushSubscribeSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects http endpoint', () => {
    expect(
      PushSubscribeSchema.safeParse({ ...valid, endpoint: 'http://example.com/x' }).success,
    ).toBe(false);
  });

  it('rejects internal endpoint', () => {
    expect(
      PushSubscribeSchema.safeParse({ ...valid, endpoint: 'https://localhost/x' }).success,
    ).toBe(false);
  });

  it('rejects non-base64url auth', () => {
    expect(
      PushSubscribeSchema.safeParse({ ...valid, auth: 'has spaces!' }).success,
    ).toBe(false);
  });

  it('rejects extra keys', () => {
    expect(
      PushSubscribeSchema.safeParse({ ...valid, evil: true }).success,
    ).toBe(false);
  });
});

describe('PushUnsubscribeSchema', () => {
  it('accepts a valid endpoint', () => {
    expect(
      PushUnsubscribeSchema.safeParse({ endpoint: 'https://fcm.googleapis.com/wp/abc' }).success,
    ).toBe(true);
  });

  it('rejects empty endpoint', () => {
    expect(PushUnsubscribeSchema.safeParse({ endpoint: '' }).success).toBe(false);
  });
});

describe('ProfileUpdateSchema', () => {
  it('accepts a valid name', () => {
    expect(ProfileUpdateSchema.safeParse({ name: '太郎' }).success).toBe(true);
  });

  it('trims and validates length', () => {
    const result = ProfileUpdateSchema.parse({ name: '   太郎   ' });
    expect(result.name).toBe('太郎');
  });

  it('rejects empty name after trim', () => {
    expect(ProfileUpdateSchema.safeParse({ name: '   ' }).success).toBe(false);
  });

  it('rejects names over 100 chars', () => {
    expect(
      ProfileUpdateSchema.safeParse({ name: 'a'.repeat(101) }).success,
    ).toBe(false);
  });
});

describe('SessionCreateSchema', () => {
  it('accepts valid tokens', () => {
    expect(
      SessionCreateSchema.safeParse({
        access_token: 'aaa',
        refresh_token: 'bbb',
      }).success,
    ).toBe(true);
  });

  it('rejects missing tokens', () => {
    expect(
      SessionCreateSchema.safeParse({ access_token: 'aaa' }).success,
    ).toBe(false);
    expect(
      SessionCreateSchema.safeParse({ access_token: '', refresh_token: 'b' }).success,
    ).toBe(false);
  });
});

describe('ErrorLogsBatchSchema', () => {
  const validLog = {
    id: 'l_1',
    errorType: 'network',
    message: 'failed',
    severity: 'error',
    createdAt: Date.now(),
    context: { page: '/dashboard' },
  };

  it('accepts a valid batch', () => {
    expect(
      ErrorLogsBatchSchema.safeParse({ logs: [validLog], sessionId: 's' }).success,
    ).toBe(true);
  });

  it('rejects empty logs array', () => {
    expect(ErrorLogsBatchSchema.safeParse({ logs: [] }).success).toBe(false);
  });

  it('rejects too-large batches', () => {
    const big = Array.from({ length: 51 }, () => validLog);
    expect(ErrorLogsBatchSchema.safeParse({ logs: big }).success).toBe(false);
  });

  it('rejects entries missing required fields', () => {
    expect(
      ErrorLogsBatchSchema.safeParse({
        logs: [{ ...validLog, id: undefined }],
      }).success,
    ).toBe(false);
  });
});
