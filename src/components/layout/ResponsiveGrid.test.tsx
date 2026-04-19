import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ResponsiveGrid from './ResponsiveGrid';

describe('ResponsiveGrid', () => {
  it('applies grid with the specified base columns and gap', () => {
    const { container } = render(
      <ResponsiveGrid cols={2} gap={6}>
        <div>a</div>
        <div>b</div>
      </ResponsiveGrid>,
    );

    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain('grid');
    expect(grid.className).toContain('grid-cols-2');
    expect(grid.className).toContain('gap-6');
  });

  it('applies responsive column classes for each breakpoint', () => {
    const { container } = render(
      <ResponsiveGrid cols={1} smCols={2} mdCols={3} lgCols={4} xlCols={6}>
        <div>a</div>
      </ResponsiveGrid>,
    );

    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain('sm:grid-cols-2');
    expect(grid.className).toContain('md:grid-cols-3');
    expect(grid.className).toContain('lg:grid-cols-4');
    expect(grid.className).toContain('xl:grid-cols-6');
  });

  it('renders children and custom element', () => {
    const { container, getByText } = render(
      <ResponsiveGrid cols={1} as="section">
        <span>child</span>
      </ResponsiveGrid>,
    );

    expect(container.firstElementChild?.tagName).toBe('SECTION');
    expect(getByText('child')).toBeInTheDocument();
  });
});
