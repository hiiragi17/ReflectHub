import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import ReflectionDetailPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
}));

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock services
vi.mock('@/services/reflectionService', () => ({
  reflectionService: {
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/services/frameworkService', () => ({
  frameworkService: {
    getFrameworks: vi.fn(),
  },
}));

import { useAuth } from '@/hooks/useAuth';
import { reflectionService } from '@/services/reflectionService';
import { frameworkService } from '@/services/frameworkService';

describe('ReflectionDetailPage - Delete Feature', () => {
  const mockUserId = 'user-123';
  const mockReflectionId = 'reflection-456';
  const mockPush = vi.fn();
  const mockBack = vi.fn();

  const mockReflection = {
    id: mockReflectionId,
    user_id: mockUserId,
    framework_id: 'fw-789',
    content: { field1: 'value1', field2: 'value2' },
    reflection_date: '2025-11-15',
    created_at: '2025-11-15T10:00:00',
    updated_at: null,
  };

  const mockFramework = {
    id: 'fw-789',
    name: 'Test Framework',
    display_name: 'テストフレームワーク',
    icon: '🔍',
    color: '#3B82F6',
    schema: [
      { id: 'field1', label: 'Field 1', type: 'textarea' },
      { id: 'field2', label: 'Field 2', type: 'textarea' },
    ],
    is_active: true,
    created_at: '2025-01-01T00:00:00',
    sort_order: 1,
    updated_at: '2025-01-01T00:00:00',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    (useRouter as any).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });

    (useParams as any).mockReturnValue({
      id: mockReflectionId,
    });

    (useAuth as any).mockReturnValue({
      user: { id: mockUserId, name: 'Test User' },
      signOut: vi.fn(),
      isLoading: false,
    });

    (reflectionService.get as any).mockResolvedValue(mockReflection);
    (frameworkService.getFrameworks as any).mockResolvedValue([mockFramework]);
    (reflectionService.delete as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render delete button', async () => {
    render(<ReflectionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('削除')).toBeInTheDocument();
    });
  });

  it('should show delete confirm dialog when delete button is clicked', async () => {
    render(<ReflectionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('削除')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('削除');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('削除確認')).toBeInTheDocument();
    });
  });

  it('should display reflection date in delete confirmation', async () => {
    render(<ReflectionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('削除')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('削除');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(mockReflection.reflection_date)).toBeInTheDocument();
    });
  });

  it('should call delete service when confirmed', async () => {
    render(<ReflectionDetailPage />);

    await waitFor(() => {
      const buttons = screen.getAllByText('削除');
      expect(buttons.length).toBeGreaterThan(0);
    });

    // Click the first delete button (ReflectionDetail component)
    const deleteButtons = screen.getAllByText('削除');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('削除確認')).toBeInTheDocument();
    });

    // Click the delete button in the confirmation dialog (second occurrence)
    const confirmButtons = screen.getAllByRole('button', { name: /削除/ });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(reflectionService.delete).toHaveBeenCalledWith(mockReflectionId);
    });
  });

  it('should redirect to history page after deletion', async () => {
    render(<ReflectionDetailPage />);

    await waitFor(() => {
      const buttons = screen.getAllByText('削除');
      expect(buttons.length).toBeGreaterThan(0);
    });

    // Click the first delete button (ReflectionDetail component)
    const deleteButtons = screen.getAllByText('削除');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('削除確認')).toBeInTheDocument();
    });

    // Click the delete button in the confirmation dialog
    const confirmButtons = screen.getAllByRole('button', { name: /削除/ });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/history');
    });
  });

  it('should display error message when delete fails due to permission', async () => {
    const errorMessage = 'この振り返りデータの削除権限がありません。';
    (reflectionService.delete as any).mockRejectedValueOnce(
      new Error(errorMessage)
    );

    render(<ReflectionDetailPage />);

    await waitFor(() => {
      const buttons = screen.getAllByText('削除');
      expect(buttons.length).toBeGreaterThan(0);
    });

    // Click the first delete button (ReflectionDetail component)
    const deleteButtons = screen.getAllByText('削除');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('削除確認')).toBeInTheDocument();
    });

    // Click the delete button in the confirmation dialog
    const confirmButtons = screen.getAllByRole('button', { name: /削除/ });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should allow canceling deletion', async () => {
    render(<ReflectionDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('削除')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('削除');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('削除確認')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('削除確認')).not.toBeInTheDocument();
    });

    // Should not call delete service
    expect(reflectionService.delete).not.toHaveBeenCalled();
  });
});
