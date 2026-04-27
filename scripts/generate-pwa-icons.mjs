#!/usr/bin/env node
// PWA アイコン生成スクリプト。
// public/favicon.ico (実体は 1024x1024 PNG) を元画像として、
// 192/256/384/512 の通常アイコンと 512 maskable を生成する。
// sharp は Next.js が依存しているのでインストール不要。
//
// 使い方: `node scripts/generate-pwa-icons.mjs`

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'public', 'favicon.ico');
const OUT_DIR = join(__dirname, '..', 'public', 'icons');

// theme_color と揃えた背景色 (maskable の余白用)。
const MASKABLE_BG = { r: 10, g: 10, b: 10, alpha: 1 };
const SIZES = [192, 256, 384, 512];

mkdirSync(OUT_DIR, { recursive: true });

for (const size of SIZES) {
  const out = join(OUT_DIR, `icon-${size}.png`);
  await sharp(SRC).resize(size, size, { fit: 'cover' }).png().toFile(out);
  console.log(`wrote ${out} (${size}x${size})`);
}

// maskable: 80% safe area。内側 80% (410px) に画像を入れて、外側 20% を背景で埋める。
const inner = Math.round(512 * 0.8); // 410
const pad = Math.round((512 - inner) / 2); // 51
const maskableOut = join(OUT_DIR, 'icon-maskable-512.png');
await sharp(SRC)
  .resize(inner, inner, { fit: 'cover' })
  .extend({ top: pad, bottom: pad, left: pad, right: pad, background: MASKABLE_BG })
  .png()
  .toFile(maskableOut);
console.log(`wrote ${maskableOut} (512x512, maskable)`);
