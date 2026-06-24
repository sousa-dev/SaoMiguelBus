import { create } from 'zustand';

interface SplashDevState {
  previewRequestId: number;
  requestPreview: () => void;
}

export const useSplashDevStore = create<SplashDevState>((set) => ({
  previewRequestId: 0,
  requestPreview: () => set((state) => ({ previewRequestId: state.previewRequestId + 1 })),
}));
