import apiClient from "./client";

export interface FeedbackData {
  rating: number;
  comment?: string;
  conversation_id?: string | null;
}

export function submitFeedback(data: FeedbackData) {
  return apiClient.post("/feedback", data).then((res) => res.data);
}

export interface ConversationSummary {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
}

export interface ConversationMessages {
  conversation_id: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    sources: any;
    created_at: string;
  }>;
}

export function getConversations(page = 1, pageSize = 20) {
  return apiClient
    .get("/chat/conversations", { params: { page, page_size: pageSize } })
    .then((res) => res.data);
}

export function getConversationMessages(convId: string): Promise<ConversationMessages> {
  return apiClient.get(`/chat/conversations/${convId}/messages`).then((res) => res.data);
}
