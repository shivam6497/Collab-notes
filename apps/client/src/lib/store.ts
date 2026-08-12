import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  setAuth: (user: User) => void;
  clearAuth: () => void;
  /** Tracks whether the persisted store has been rehydrated from localStorage. */
  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
}

/**
 * Global authentication store backed by `localStorage`.
 *
 * `_hasHydrated` is used to gate SSR-unsafe reads: components should wait
 * for `_hasHydrated === true` before rendering auth-dependent UI to avoid
 * hydration mismatches in Next.js.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      _hasHydrated: false,
      setHasHydrated: (val) => set({ _hasHydrated: val }),
      setAuth: (user) => set({ user }),
      clearAuth: () => set({ user: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);