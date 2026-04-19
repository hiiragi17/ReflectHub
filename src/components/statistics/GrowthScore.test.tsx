import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GrowthScore from './GrowthScore';

describe('GrowthScore', () => {
  it('renders the score', () => {
    render(<GrowthScore score={72} />);
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('/ 100')).toBeInTheDocument();
  });

  it('clamps values above 100', () => {
    render(<GrowthScore score={150} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('clamps values below 0', () => {
    render(<GrowthScore score={-10} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
