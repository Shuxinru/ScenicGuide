import { create } from "zustand";
import type { AvatarConfig } from "../types/avatar";

interface AvatarState {
  config: AvatarConfig | null;
  setConfig: (config: AvatarConfig) => void;
}

export const avatarStore = create<AvatarState>((set) => ({
  config: null,
  setConfig: (config: AvatarConfig) => set({ config }),
}));
