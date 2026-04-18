import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SidebarLayout from './SidebarLayout';

describe('SidebarLayout', () => {
  it('renders sidebar, main content, and optional right panel', () => {
    render(
      <SidebarLayout
        sidebar={<div>sidebar-content</div>}
        rightPanel={<div>right-panel</div>}
      >
        <div>main-content</div>
      </SidebarLayout>,
    );

    expect(screen.getByText('sidebar-content')).toBeInTheDocument();
    expect(screen.getByText('main-content')).toBeInTheDocument();
    expect(screen.getByText('right-panel')).toBeInTheDocument();
  });

  it('omits right panel when not provided', () => {
    const { container } = render(
      <SidebarLayout sidebar={<div>sidebar</div>}>
        <div>main</div>
      </SidebarLayout>,
    );

    const asides = container.querySelectorAll('aside');
    expect(asides).toHaveLength(1);
  });

  it('uses semantic main and aside landmarks', () => {
    render(
      <SidebarLayout sidebar={<div>s</div>}>
        <div>m</div>
      </SidebarLayout>,
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('applies the sidebarWidth variant', () => {
    const { container } = render(
      <SidebarLayout sidebar={<div>s</div>} sidebarWidth="lg">
        <div>m</div>
      </SidebarLayout>,
    );

    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('md:w-72');
  });
});
