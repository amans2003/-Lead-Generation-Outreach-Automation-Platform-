import { create } from 'zustand';

let idCounter = 0;

export const useToastStore = create((set) => ({
  toasts: [],

  toast: ({ title, description, type = 'info' }) => {
    const id = ++idCounter;
    set((state) => ({
      toasts: [...state.toasts, { id, title, description, type }],
    }));
    // Auto-dismiss after 4 s
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
    return id;
  },

  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  dismissAll: () => set({ toasts: [] }),
}));

/** Convenience helpers */
export const toast = {
  success: (title, description) =>
    useToastStore.getState().toast({ title, description, type: 'success' }),
  error: (title, description) =>
    useToastStore.getState().toast({ title, description, type: 'error' }),
  info: (title, description) =>
    useToastStore.getState().toast({ title, description, type: 'info' }),
  warning: (title, description) =>
    useToastStore.getState().toast({ title, description, type: 'warning' }),
};
