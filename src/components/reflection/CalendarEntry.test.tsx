import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarEntry } from './CalendarEntry';
import type { Reflection } from '@/types/reflection';
import type { Framework } from '@/types/framework';

describe('CalendarEntry', () => {
  const mockFrameworks: Framework[] = [
    {
      id: 'kpt',
      name: 'KPT',
      display_name: 'KPT',
      icon: '🔄',
      color: '#3B82F6',
      schema: [],
      is_active: true,
      created_at: '2025-01-01',
    },
    {
      id: 'ywtl',
      name: 'YWTL',
      display_name: 'YWTL',
      icon: '📝',
      color: '#10B981',
      schema: [],
      is_active: true,
      created_at: '2025-01-01',
    },
  ];

  const mockReflections: Reflection[] = [
    {
      id: 'ref-1',
      user_id: 'user-1',
      framework_id: 'kpt',
      content: { keep: 'test' },
      reflection_date: '2025-11-13',
      created_at: '2025-11-13T10:00:00Z',
      updated_at: '2025-11-13T10:00:00Z',
    },
  ];

  const mockOnClick = vi.fn();
  const testDate = new Date('2025-11-13');

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render date number', () => {
      render(
        <CalendarEntry
          date={testDate}
          reflections={[]}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('13')).toBeInTheDocument();
    });

    it('should apply current month styles', () => {
      const { container } = render(
        <CalendarEntry
          date={testDate}
          reflections={[]}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      const entry = container.firstChild as HTMLElement;
      expect(entry).toHaveClass('bg-white');
      expect(entry).not.toHaveClass('bg-gray-50');
    });

    it('should apply non-current month styles', () => {
      const { container } = render(
        <CalendarEntry
          date={testDate}
          reflections={[]}
          frameworks={mockFrameworks}
          isCurrentMonth={false}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      const entry = container.firstChild as HTMLElement;
      expect(entry).toHaveClass('bg-gray-50');
    });

    it('should highlight today', () => {
      const { container } = render(
        <CalendarEntry
          date={testDate}
          reflections={[]}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={true}
          onClick={mockOnClick}
        />
      );

      const entry = container.firstChild as HTMLElement;
      expect(entry).toHaveClass('ring-2', 'ring-blue-500');
    });

    it('should display reflection indicators', () => {
      render(
        <CalendarEntry
          date={testDate}
          reflections={mockReflections}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText(/KPT/)).toBeInTheDocument();
      expect(screen.getByText(/🔄/)).toBeInTheDocument();
    });

    it('should show count when more than 2 reflections', () => {
      const multipleReflections: Reflection[] = [
        ...mockReflections,
        { ...mockReflections[0], id: 'ref-2' },
        { ...mockReflections[0], id: 'ref-3' },
      ];

      render(
        <CalendarEntry
          date={testDate}
          reflections={multipleReflections}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('+1件')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('should call onClick when clicked with reflections', async () => {
      const user = userEvent.setup();
      render(
        <CalendarEntry
          date={testDate}
          reflections={mockReflections}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      const entry = screen.getByRole('button');
      await user.click(entry);

      expect(mockOnClick).toHaveBeenCalledWith(testDate, mockReflections);
    });

    it('should not call onClick when clicked without reflections', async () => {
      const user = userEvent.setup();
      render(
        <CalendarEntry
          date={testDate}
          reflections={[]}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      const entry = screen.getByRole('cell');
      await user.click(entry);

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should handle keyboard Enter key', async () => {
      const user = userEvent.setup();
      render(
        <CalendarEntry
          date={testDate}
          reflections={mockReflections}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      const entry = screen.getByRole('button');
      entry.focus();
      await user.keyboard('{Enter}');

      expect(mockOnClick).toHaveBeenCalledWith(testDate, mockReflections);
    });

    it('should handle keyboard Space key', async () => {
      const user = userEvent.setup();
      render(
        <CalendarEntry
          date={testDate}
          reflections={mockReflections}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      const entry = screen.getByRole('button');
      entry.focus();
      await user.keyboard(' ');

      expect(mockOnClick).toHaveBeenCalledWith(testDate, mockReflections);
    });
  });

  describe('accessibility', () => {
    it('should have button role when has reflections', () => {
      render(
        <CalendarEntry
          date={testDate}
          reflections={mockReflections}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have cell role when no reflections', () => {
      render(
        <CalendarEntry
          date={testDate}
          reflections={[]}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByRole('cell')).toBeInTheDocument();
    });

    it('should have accessible label with reflections', () => {
      render(
        <CalendarEntry
          date={testDate}
          reflections={mockReflections}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByLabelText('13日 - 1件の振り返り')).toBeInTheDocument();
    });

    it('should have accessible label without reflections', () => {
      render(
        <CalendarEntry
          date={testDate}
          reflections={[]}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByLabelText('13日')).toBeInTheDocument();
    });

    it('should be keyboard focusable when has reflections', () => {
      render(
        <CalendarEntry
          date={testDate}
          reflections={mockReflections}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      const entry = screen.getByRole('button');
      expect(entry).toHaveAttribute('tabIndex', '0');
    });

    it('should not be keyboard focusable when no reflections', () => {
      render(
        <CalendarEntry
          date={testDate}
          reflections={[]}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      const entry = screen.getByRole('cell');
      expect(entry).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('framework colors', () => {
    it('should apply framework color to reflection indicator', () => {
      render(
        <CalendarEntry
          date={testDate}
          reflections={mockReflections}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      const indicator = screen.getByText(/KPT/).closest('div');
      expect(indicator).toHaveStyle({
        backgroundColor: '#3B82F620',
        borderLeft: '3px solid #3B82F6',
      });
    });

    it('should use default color for unknown framework', () => {
      const unknownReflection: Reflection = {
        ...mockReflections[0],
        framework_id: 'unknown',
      };

      render(
        <CalendarEntry
          date={testDate}
          reflections={[unknownReflection]}
          frameworks={mockFrameworks}
          isCurrentMonth={true}
          isToday={false}
          onClick={mockOnClick}
        />
      );

      const indicator = screen.getByText(/振り返り/).closest('div');
      expect(indicator).toHaveStyle({
        backgroundColor: '#6B728020',
        borderLeft: '3px solid #6B7280',
      });
    });
  });
});
