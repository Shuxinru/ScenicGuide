import { useState, useRef, useCallback } from "react";
import type { Message } from "../types/chat";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string, conversationId: string | null, interests: string[] = []): Promise<{ content: string; sources?: any[]; conversationId: string; suggestedRouteId?: string } | null> => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { default: apiClient } = await import("../api/client");
      const res = await apiClient.post("/chat/send", {
        text,
        conversation_id: conversationId,
        interests,
      }, {
        signal: controller.signal,
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
      abortRef.current = null;

      return { content: data.message.content, sources: data.message.sources, conversationId: data.conversation_id, suggestedRouteId: data.message.suggested_route_id };
    } catch (err: any) {
      setIsThinking(false);
      abortRef.current = null;

      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || err?.name === "AbortError") {
        return null;
      }

      let errorText = "抱歉，我暂时无法回答这个问题。";
      if (err?.code === "ERR_NETWORK" || err?.message?.includes("Network")) {
        errorText = "无法连接到后端服务。请确保已启动 FastAPI 服务器：\n\n```bash\ncd backend && uvicorn app.main:app --reload --port 8000\n```";
      } else if (err?.response?.status === 500) {
        errorText = "服务器内部错误，请检查后端日志和数据库连接。";
      }
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: errorText,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      return null;
    }
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsThinking(false);
  }, []);

  const clearMessages = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsThinking(false);
    setMessages([]);
  }, []);

  return { messages, isThinking, sendMessage, stopGeneration, clearMessages, setMessages };
}
