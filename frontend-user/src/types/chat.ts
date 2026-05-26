export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ chunk_id: string; document_title: string; score: number }>;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
}
