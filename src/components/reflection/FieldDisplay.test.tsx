import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldDisplay } from './FieldDisplay';
import type { FrameworkField } from '@/types/framework';

const mockField: FrameworkField = {
  id: 'field-1',
  label: 'テスト質問',
  placeholder: 'ここに入力してください',
  description: 'これはテストです',
  required: true,
  max_length: 500,
};

describe('FieldDisplay', () => {
  it('should render field label', () => {
    render(
      <FieldDisplay
        field={mockField}
        value="テスト値"
      />
    );

    expect(screen.getByText('テスト質問')).toBeInTheDocument();
  });

  it('should render field value', () => {
    render(
      <FieldDisplay
        field={mockField}
        value="これは表示されるテキストです"
      />
    );

    expect(screen.getByText('これは表示されるテキストです')).toBeInTheDocument();
  });

  it('should render description if provided', () => {
    render(
      <FieldDisplay
        field={mockField}
        value="test"
      />
    );

    expect(screen.getByText('これはテストです')).toBeInTheDocument();
  });

  it('should render empty state when no value', () => {
    render(
      <FieldDisplay
        field={mockField}
        value=""
      />
    );

    expect(screen.getByText('（未入力）')).toBeInTheDocument();
  });

  it('should render icon if provided', () => {
    const fieldWithIcon = { ...mockField, icon: '📝' };

    render(
      <FieldDisplay
        field={fieldWithIcon}
        value="test"
        icon="📝"
      />
    );

    expect(screen.getByText('📝')).toBeInTheDocument();
  });

  it('should preserve line breaks in value', () => {
    const multilineValue = 'Line 1\nLine 2\nLine 3';

    render(
      <FieldDisplay
        field={mockField}
        value={multilineValue}
      />
    );

    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2')).toBeInTheDocument();
    expect(screen.getByText('Line 3')).toBeInTheDocument();
  });

  it('should not render description if not provided', () => {
    const fieldNoDesc: FrameworkField = {
      id: 'field-2',
      label: 'No description',
      placeholder: 'test',
    };

    const { container } = render(
      <FieldDisplay
        field={fieldNoDesc}
        value="test"
      />
    );

    const descElements = container.querySelectorAll('p.text-xs.text-gray-500');
    // Should not have description paragraph
    expect(descElements.length).toBe(0);
  });

  it('should have read-only display styling', () => {
    const { container } = render(
      <FieldDisplay
        field={mockField}
        value="test"
      />
    );

    const displayDiv = container.querySelector('div[id^="field-"]');
    expect(displayDiv).toHaveClass('bg-gray-50');
    expect(displayDiv).toHaveClass('border-gray-200');
    expect(displayDiv).toHaveClass('rounded-md');
  });
});
