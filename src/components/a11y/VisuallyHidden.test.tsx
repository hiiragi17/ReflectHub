import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('renders children inside a span with sr-only by default', () => {
    render(<VisuallyHidden>保存しました</VisuallyHidden>);
    const el = screen.getByText('保存しました');
    expect(el.tagName.toLowerCase()).toBe('span');
    expect(el.className).toContain('sr-only');
  });

  it('renders as a custom element when `as` is provided', () => {
    render(<VisuallyHidden as="p">説明テキスト</VisuallyHidden>);
    const el = screen.getByText('説明テキスト');
    expect(el.tagName.toLowerCase()).toBe('p');
    expect(el.className).toContain('sr-only');
  });

  it('merges a custom className', () => {
    render(<VisuallyHidden className="extra">ラベル</VisuallyHidden>);
    const el = screen.getByText('ラベル');
    expect(el.className).toContain('sr-only');
    expect(el.className).toContain('extra');
  });
});
