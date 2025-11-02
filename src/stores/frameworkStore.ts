import { create } from "zustand";
import { Framework } from "@/types/framework";

interface FrameworkStore {
  frameworks: Framework[];
  selectedFrameworkId: string | null;
  isLoading: boolean;
  error: string | null;

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

  setFrameworks: (frameworks) => set({ frameworks }),
  setSelectedFramework: (id) => set({ selectedFrameworkId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  getSelectedFramework: () => {
    const { frameworks, selectedFrameworkId } = get();
    return frameworks.find((f) => f.id === selectedFrameworkId);
  },
}));
