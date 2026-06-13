import { create } from 'zustand';

const useScraperStore = create((set) => ({
  isRunning: false,

  progress: {
    scraped: 0,
    new: 0,
    duplicates: 0,
    percent: 0,
    source: '',
  },

  job: null,

  setProgress: (progressData) =>
    set((state) => ({
      progress: { ...state.progress, ...progressData },
    })),

  setJob: (job) => set({ job }),

  setRunning: (isRunning) => set({ isRunning }),

  resetProgress: () =>
    set({
      progress: {
        scraped: 0,
        new: 0,
        duplicates: 0,
        percent: 0,
        source: '',
      },
    }),
}));

export default useScraperStore;
