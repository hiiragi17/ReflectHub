import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookOpen } from 'lucide-react';
import StatsCard from './StatsCard';

describe('StatsCard', () => {
  it('renders label and value', () => {
    render(<StatsCard label="総振り返り数" value={12} unit="件" />);
    expect(screen.getByText('総振り返り数')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('件')).toBeInTheDocument();
  });

  it('renders optional description and icon', () => {
    render(
      <StatsCard
        label="今月"
        value={3}
        description="比較用"
        icon={BookOpen}
      />,
    );
    expect(screen.getByText('比較用')).toBeInTheDocument();
  });
});
