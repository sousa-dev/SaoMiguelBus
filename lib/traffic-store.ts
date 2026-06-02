import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { staticIslandConfig } from '@/config/island';

/**
 * Report ownership is pseudonymous (server keys on a session hash we can't
 * recompute client-side), so we track which report ids this device created to
 * decide whether to show the Delete affordance.
 */
interface TrafficState {
  myReportIds: number[];
  isMine: (reportId: number) => boolean;
  addReport: (reportId: number) => void;
  removeReport: (reportId: number) => void;
}

export const useTrafficStore = create<TrafficState>()(
  persist(
    (set, get) => ({
      myReportIds: [],
      isMine: (reportId) => get().myReportIds.includes(reportId),
      addReport: (reportId) =>
        set((state) =>
          state.myReportIds.includes(reportId)
            ? state
            : { myReportIds: [reportId, ...state.myReportIds] },
        ),
      removeReport: (reportId) =>
        set((state) => ({
          myReportIds: state.myReportIds.filter((id) => id !== reportId),
        })),
    }),
    {
      name: `azores_hub_traffic_${staticIslandConfig.islandKey}`,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
