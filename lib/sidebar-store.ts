import { create } from 'zustand';

interface SidebarState {
  open: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  open: false,

  openSidebar: () => set({ open: true }),

  closeSidebar: () => {
    if (!get().open) {
      return;
    }
    set({ open: false });
  },

  toggleSidebar: () => set({ open: !get().open }),
}));
