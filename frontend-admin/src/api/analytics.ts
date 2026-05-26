import apiClient from "./client";

export interface DashboardSummary {
  visitors_today: number;
  questions_today: number;
  avg_satisfaction: number;
  active_documents: number;
}

export interface VisitorTrendItem {
  date: string;
  visitors: number;
}

export interface PopularQuestion {
  question: string;
  count: number;
}

export interface PeakTimeItem {
  hour: number;
  count: number;
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
    .get("/analytics/dashboard/summary", { params: { date_from: dateFrom, date_to: dateTo } })
    .then((res) => res.data);
}

export function getVisitorTrend(
  dateFrom?: string,
  dateTo?: string
): Promise<VisitorTrendItem[]> {
  return apiClient
    .get("/analytics/dashboard/visitor-trend", {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    .then((res) => res.data);
}

export function getPopularQuestions(
  dateFrom?: string,
  dateTo?: string,
  limit: number = 10
): Promise<PopularQuestion[]> {
  return apiClient
    .get("/analytics/dashboard/popular-questions", {
      params: { date_from: dateFrom, date_to: dateTo, limit },
    })
    .then((res) => res.data);
}

export function getPeakTimes(
  dateFrom?: string,
  dateTo?: string
): Promise<PeakTimeItem[]> {
  return apiClient
    .get("/analytics/dashboard/peak-times", {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    .then((res) => res.data);
}

export function getSentiment(
  dateFrom?: string,
  dateTo?: string
): Promise<any> {
  return apiClient
    .get("/analytics/dashboard/sentiment", {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    .then((res) => res.data);
}

export function getConversationVolume(
  dateFrom?: string,
  dateTo?: string
): Promise<ConversationVolumeItem[]> {
  return apiClient
    .get("/analytics/dashboard/conversation-volume", {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    .then((res) => res.data);
}
