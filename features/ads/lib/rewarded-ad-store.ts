import { create } from 'zustand';

interface RewardedAdState {
  rewardedLoaded: boolean;
  canRequestAds: boolean;
  setRewardedLoaded: (loaded: boolean) => void;
  setCanRequestAds: (allowed: boolean) => void;
  reset: () => void;
}

export const useRewardedAdStore = create<RewardedAdState>((set) => ({
  rewardedLoaded: false,
  canRequestAds: false,
  setRewardedLoaded: (loaded) => set({ rewardedLoaded: loaded }),
  setCanRequestAds: (allowed) => set({ canRequestAds: allowed }),
  reset: () => set({ rewardedLoaded: false, canRequestAds: false }),
}));
