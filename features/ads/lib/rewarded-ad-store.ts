import { create } from 'zustand';

export type RewardedAdFreeSource = 'header' | 'sidebar';

export type RewardModalMode = 'reward' | 'status';

interface RewardedAdState {
  rewardedLoaded: boolean;
  canRequestAds: boolean;
  modalSource: RewardedAdFreeSource | null;
  modalMode: RewardModalMode | null;
  isRewardLoading: boolean;
  setRewardedLoaded: (loaded: boolean) => void;
  setCanRequestAds: (allowed: boolean) => void;
  openRewardModal: (source: RewardedAdFreeSource, mode: RewardModalMode) => void;
  closeRewardModal: () => void;
  setRewardLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useRewardedAdStore = create<RewardedAdState>((set) => ({
  rewardedLoaded: false,
  canRequestAds: false,
  modalSource: null,
  modalMode: null,
  isRewardLoading: false,
  setRewardedLoaded: (loaded) => set({ rewardedLoaded: loaded }),
  setCanRequestAds: (allowed) => set({ canRequestAds: allowed }),
  openRewardModal: (source, mode) => set({ modalSource: source, modalMode: mode }),
  closeRewardModal: () => set({ modalSource: null, modalMode: null, isRewardLoading: false }),
  setRewardLoading: (loading) => set({ isRewardLoading: loading }),
  reset: () =>
    set({
      rewardedLoaded: false,
      canRequestAds: false,
      modalSource: null,
      modalMode: null,
      isRewardLoading: false,
    }),
}));
