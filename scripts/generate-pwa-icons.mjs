#!/usr/bin/env node
// PWA アイコン生成スクリプト。
// pure Node.js (zlib) で PNG を組み立てるので追加依存は不要。
// public/icons/ に 192/256/384/512 の通常アイコンと 512 maskable を出力する。
//
// 使い方: `node scripts/generate-pwa-icons.mjs`

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');

const BG = [10, 10, 10, 255]; // theme #0a0a0a
const FG = [255, 255, 255, 255];

// 7x9 pixel font for "R" - 1=foreground, 0=background.
const GLYPH_R = [
  [1, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 0, 0],
  [1, 1, 0, 1, 1, 0, 0],
  [1, 1, 0, 0, 1, 1, 0],
  [1, 1, 0, 0, 0, 1, 1],
];

const GLYPH_W = GLYPH_R[0].length;
const GLYPH_H = GLYPH_R.length;

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function setPixel(raw, w, x, y, color) {
  if (x < 0 || y < 0 || x >= w || y >= w) return;
  const stride = w * 4 + 1;
  const offset = y * stride + 1 + x * 4;
  raw[offset] = color[0];
  raw[offset + 1] = color[1];
  raw[offset + 2] = color[2];
  raw[offset + 3] = color[3];
}

function fillRect(raw, w, x0, y0, x1, y1, color) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      setPixel(raw, w, x, y, color);
    }
  }
}

function fillCircle(raw, w, cx, cy, r, color) {
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(w, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(w, Math.ceil(cy + r));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) setPixel(raw, w, x, y, color);
    }
  }
}

function drawGlyph(raw, w, glyph, originX, originY, scale, color) {
  for (let gy = 0; gy < GLYPH_H; gy++) {
    for (let gx = 0; gx < GLYPH_W; gx++) {
      if (!glyph[gy][gx]) continue;
      fillRect(
        raw,
        w,
        originX + gx * scale,
        originY + gy * scale,
        originX + (gx + 1) * scale,
        originY + (gy + 1) * scale,
        color,
      );
    }
  }
}

function buildPNG(size, { maskable = false } = {}) {
  // RGBA scanlines with filter byte (0) prepended per row.
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);

  // Background. For maskable we fill the entire square (safe area is the inner
  // 80% per Web App Manifest spec); for "any" we draw a rounded square via a
  // filled circle approximation so that it looks fine on platforms that don't
  // mask.
  if (maskable) {
    fillRect(raw, size, 0, 0, size, size, BG);
  } else {
    // Slight inset disk so the edges look softened on platforms rendering as-is.
    fillCircle(raw, size, size / 2, size / 2, size / 2 - 1, BG);
  }

  // Glyph sized to fit safe area. For maskable, keep at ~50% so it fits the
  // 80% safe zone. For any, use ~60%.
  const targetGlyphHeight = Math.round(size * (maskable ? 0.5 : 0.6));
  const scale = Math.max(1, Math.floor(targetGlyphHeight / GLYPH_H));
  const glyphPxW = GLYPH_W * scale;
  const glyphPxH = GLYPH_H * scale;
  const originX = Math.round((size - glyphPxW) / 2);
  const originY = Math.round((size - glyphPxH) / 2);
  drawGlyph(raw, size, GLYPH_R, originX, originY, scale, FG);

  // PNG signature.
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR.
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT.
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function writeIcon(filename, size, opts) {
  const png = buildPNG(size, opts);
  const out = join(OUT_DIR, filename);
  writeFileSync(out, png);
  console.log(`wrote ${out} (${png.length} bytes, ${size}x${size}${opts?.maskable ? ', maskable' : ''})`);
}

mkdirSync(OUT_DIR, { recursive: true });
[192, 256, 384, 512].forEach((s) => writeIcon(`icon-${s}.png`, s));
writeIcon('icon-maskable-512.png', 512, { maskable: true });
