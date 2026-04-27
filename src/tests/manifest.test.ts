import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `public/manifest.json` のスキーマ的な妥当性を確認する。
 * Web App Manifest の必須要件を満たさないと PWA インストール条件を欠くため、
 * ビルド時に気づけるよう unit test として落とす。
 */
describe('public/manifest.json', () => {
  const path = join(process.cwd(), 'public', 'manifest.json');
  const json = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;

  it('has required identity fields', () => {
    expect(json.name).toEqual(expect.any(String));
    expect(json.short_name).toEqual(expect.any(String));
    expect(json.start_url).toEqual(expect.any(String));
    expect(json.display).toBe('standalone');
  });

  it('exposes a theme_color and background_color', () => {
    expect(json.theme_color).toMatch(/^#[0-9a-f]{3,8}$/i);
    expect(json.background_color).toMatch(/^#[0-9a-f]{3,8}$/i);
  });

  it('declares 192/512 PNG icons (Lighthouse PWA requirement)', () => {
    const icons = json.icons as Array<{ sizes: string; type: string; purpose?: string }>;
    expect(Array.isArray(icons)).toBe(true);
    const sizes = icons.map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    icons.forEach((icon) => {
      expect(icon.type).toBe('image/png');
    });
  });

  it('includes at least one maskable icon', () => {
    const icons = json.icons as Array<{ purpose?: string }>;
    expect(icons.some((i) => (i.purpose || '').includes('maskable'))).toBe(true);
  });
});
