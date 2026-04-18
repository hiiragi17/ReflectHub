import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  it('renders default link pointing to #main-content', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'メインコンテンツへスキップ' });
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('uses the sr-only class so it is visually hidden until focused', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'メインコンテンツへスキップ' });
    expect(link.className).toContain('sr-only');
    expect(link.className).toContain('focus-visible:not-sr-only');
  });

  it('supports a custom href and children', () => {
    render(<SkipLink href="#content">本文へスキップ</SkipLink>);
    const link = screen.getByRole('link', { name: '本文へスキップ' });
    expect(link).toHaveAttribute('href', '#content');
  });

  it('merges a custom className', () => {
    render(<SkipLink className="custom-class" />);
    const link = screen.getByRole('link', { name: 'メインコンテンツへスキップ' });
    expect(link.className).toContain('custom-class');
  });
});
