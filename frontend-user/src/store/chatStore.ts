import { create } from "zustand";

interface ChatState {
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
}

export const chatStore = create<ChatState>((set) => ({
  conversationId: null,
  setConversationId: (id: string | null) => set({ conversationId: id }),
}));
