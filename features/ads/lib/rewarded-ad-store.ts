import { create } from 'zustand';

export type RewardedAdFreeSource = 'header' | 'sidebar';

interface RewardedAdState {
  rewardedLoaded: boolean;
  canRequestAds: boolean;
  modalSource: RewardedAdFreeSource | null;
  isRewardLoading: boolean;
  setRewardedLoaded: (loaded: boolean) => void;
  setCanRequestAds: (allowed: boolean) => void;
  openRewardModal: (source: RewardedAdFreeSource) => void;
  closeRewardModal: () => void;
  setRewardLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useRewardedAdStore = create<RewardedAdState>((set) => ({
  rewardedLoaded: false,
  canRequestAds: false,
  modalSource: null,
  isRewardLoading: false,
  setRewardedLoaded: (loaded) => set({ rewardedLoaded: loaded }),
  setCanRequestAds: (allowed) => set({ canRequestAds: allowed }),
  openRewardModal: (source) => set({ modalSource: source }),
  closeRewardModal: () => set({ modalSource: null, isRewardLoading: false }),
  setRewardLoading: (loading) => set({ isRewardLoading: loading }),
  reset: () =>
    set({
      rewardedLoaded: false,
      canRequestAds: false,
      modalSource: null,
      isRewardLoading: false,
    }),
}));
