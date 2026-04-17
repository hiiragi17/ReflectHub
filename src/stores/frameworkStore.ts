import { create } from "zustand";
import { Framework } from "@/types/framework";

interface FrameworkStore {
  frameworks: Framework[];
  selectedFrameworkId: string | null;
  isLoading: boolean;
  error: string | null;
  selectedFramework: Framework | undefined;

  setFrameworks: (frameworks: Framework[]) => void;
  setSelectedFramework: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getSelectedFramework: () => Framework | undefined;
}

export const useFrameworkStore = create<FrameworkStore>((set, get) => ({
  frameworks: [],
  selectedFrameworkId: null,
  isLoading: false,
  error: null,
  selectedFramework: undefined,

  setFrameworks: (frameworks) => {
    set((state) => ({
      frameworks,
      selectedFramework: frameworks.find((f) => f.id === state.selectedFrameworkId),
    }));
  },

  setSelectedFramework: (id) => {
    set((state) => ({
      selectedFrameworkId: id,
      selectedFramework: state.frameworks.find((f) => f.id === id),
    }));

    // LocalStorageに最後に使用したフレームワークIDを保存
    try {
      localStorage.setItem('lastUsedFrameworkId', id);
    } catch (error) {
      // LocalStorageが使えない環境でもエラーにならないようにする
      console.warn('Failed to save framework selection to localStorage:', error);
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  getSelectedFramework: () => {
    const { frameworks, selectedFrameworkId } = get();
    return frameworks.find((f) => f.id === selectedFrameworkId);
  },
}));