import apiClient from "./client";

export interface DashboardSummary {
  total_visitors: number;
  total_questions: number;
  avg_satisfaction: number;
  active_documents: number;
  today_visitors: number;
  today_questions: number;
  positive_rate: number;
  neutral_rate: number;
  negative_rate: number;
}

export interface VisitorTrendItem {
  date: string;
  count: number;
}

export interface PopularQuestion {
  question: string;
  count: number;
  rank: number;
}

export interface PeakTimeItem {
  day_of_week: number;
  hour: number;
  count: number;
  day_name: string;
}

export interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
}

export interface ConversationVolumeItem {
  date: string;
  count: number;
}

export function getDashboardSummary(
  dateFrom?: string,
  dateTo?: string
): Promise<DashboardSummary> {
  return apiClient
    .get("/analytics/dashboard-summary", { params: { date_from: dateFrom, date_to: dateTo } })
    .then((res) => res.data);
}

export function getVisitorTrend(
  dateFrom?: string,
  dateTo?: string,
  granularity: "day" | "week" | "month" = "day"
): Promise<VisitorTrendItem[]> {
  return apiClient
    .get("/analytics/visitor-trend", {
      params: { date_from: dateFrom, date_to: dateTo, granularity },
    })
    .then((res) => res.data);
}

export function getPopularQuestions(
  dateFrom?: string,
  dateTo?: string,
  limit: number = 10
): Promise<PopularQuestion[]> {
  return apiClient
    .get("/analytics/popular-questions", {
      params: { date_from: dateFrom, date_to: dateTo, limit },
    })
    .then((res) => res.data);
}

export function getPeakTimes(
  dateFrom?: string,
  dateTo?: string
): Promise<PeakTimeItem[]> {
  return apiClient
    .get("/analytics/peak-times", {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    .then((res) => res.data);
}

export function getSentiment(
  dateFrom?: string,
  dateTo?: string
): Promise<SentimentData> {
  return apiClient
    .get("/analytics/sentiment", {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    .then((res) => res.data);
}

export function getConversationVolume(
  dateFrom?: string,
  dateTo?: string
): Promise<ConversationVolumeItem[]> {
  return apiClient
    .get("/analytics/conversation-volume", {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    .then((res) => res.data);
}
