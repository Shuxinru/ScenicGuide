import { useState, useCallback } from "react";
import type { Message } from "../types/chat";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const sendMessage = useCallback(async (text: string, conversationId: string | null): Promise<{ content: string; sources?: any[]; conversationId: string } | null> => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const { default: apiClient } = await import("../api/client");
      const res = await apiClient.post("/chat/send", {
        text,
        conversation_id: conversationId,
      });
      const data = res.data;

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message.content,
        sources: data.message.sources,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsThinking(false);

      return { content: data.message.content, sources: data.message.sources, conversationId: data.conversation_id };
    } catch {
      setIsThinking(false);
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "抱歉，我暂时无法回答这个问题，请稍后再试。",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      return null;
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isThinking, sendMessage, clearMessages };
}
