import apiClient from "./client";

export interface FeedbackItem {
  id: string;
  rating: number | null;
  comment: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  sentiment_score: number | null;
  keywords: string[];
  created_at: string;
  visitor_id?: string;
}

export interface FeedbackListResponse {
  items: FeedbackItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface FeedbackReport {
  total_feedback: number;
  avg_rating: number;
  positive_rate: number;
  neutral_rate: number;
  negative_rate: number;
  rating_distribution: { rating: number; count: number }[];
  top_keywords: string[];
  insights: string;
  sentiment_trend: { date: string; sentiment: string; count: number }[];
  improvement_suggestions: string[];
  date_from: string;
  date_to: string;
  generated_at: string;
}

export interface FeedbackListParams {
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
  sentiment?: string;
}

export interface SubmitFeedbackData {
  rating: number;
  comment?: string;
  conversation_id?: string;
  visitor_id?: string;
}

export function submitFeedback(data: SubmitFeedbackData): Promise<FeedbackItem> {
  return apiClient.post("/feedback", data).then((res) => res.data);
}

export function getFeedbackList(
  params: FeedbackListParams
): Promise<FeedbackListResponse> {
  return apiClient.get("/feedback", { params }).then((res) => res.data);
}

export function getFeedbackReport(
  dateFrom: string,
  dateTo: string
): Promise<FeedbackReport> {
  return apiClient
    .get("/feedback/report", { params: { date_from: dateFrom, date_to: dateTo } })
    .then((res) => res.data);
}
