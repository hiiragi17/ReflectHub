import { describe, it, expect } from 'vitest';
import { safeEqual } from './safeEqual';

describe('safeEqual', () => {
  it('同じ文字列は true', () => {
    expect(safeEqual('Bearer secret', 'Bearer secret')).toBe(true);
  });

  it('違う文字列は false', () => {
    expect(safeEqual('Bearer secret', 'Bearer Secret')).toBe(false);
  });

  it('長さが違っても、例外にならず false', () => {
    expect(safeEqual('Bearer secret', 'Bearer secret-longer')).toBe(false);
    expect(safeEqual('', 'Bearer secret')).toBe(false);
  });

  it('空文字どうしは true', () => {
    expect(safeEqual('', '')).toBe(true);
  });
});
