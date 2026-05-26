import { useState, useEffect, useCallback } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  getDashboardSummary,
  getVisitorTrend,
  getPopularQuestions,
  getPeakTimes,
  getSentiment,
  getConversationVolume,
  DashboardSummary,
  VisitorTrendItem,
  PopularQuestion,
  PeakTimeItem,
  SentimentData,
  ConversationVolumeItem,
} from "../api/analytics";

export interface UseDashboardReturn {
  dateRange: [Dayjs, Dayjs] | null;
  setDateRange: (range: [Dayjs, Dayjs] | null) => void;

  summary: DashboardSummary | null;
  summaryLoading: boolean;

  visitorTrend: VisitorTrendItem[];
  visitorTrendLoading: boolean;

  popularQuestions: PopularQuestion[];
  popularQuestionsLoading: boolean;

  peakTimes: PeakTimeItem[];
  peakTimesLoading: boolean;

  sentiment: SentimentData | null;
  sentimentLoading: boolean;

  conversationVolume: ConversationVolumeItem[];
  conversationVolumeLoading: boolean;

  refresh: () => void;
}

export default function useDashboard(
  initialDays: number = 30
): UseDashboardReturn {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(() => [
    dayjs().subtract(initialDays, "day"),
    dayjs(),
  ]);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [visitorTrend, setVisitorTrend] = useState<VisitorTrendItem[]>([]);
  const [visitorTrendLoading, setVisitorTrendLoading] = useState(true);

  const [popularQuestions, setPopularQuestions] = useState<PopularQuestion[]>(
    []
  );
  const [popularQuestionsLoading, setPopularQuestionsLoading] =
    useState(true);

  const [peakTimes, setPeakTimes] = useState<PeakTimeItem[]>([]);
  const [peakTimesLoading, setPeakTimesLoading] = useState(true);

  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(true);

  const [conversationVolume, setConversationVolume] = useState<
    ConversationVolumeItem[]
  >([]);
  const [conversationVolumeLoading, setConversationVolumeLoading] =
    useState(true);

  const dateFrom = dateRange?.[0]?.format("YYYY-MM-DD");
  const dateTo = dateRange?.[1]?.format("YYYY-MM-DD");

  const fetchAll = useCallback(() => {
    // Fetch all dashboard data in parallel
    setSummaryLoading(true);
    setVisitorTrendLoading(true);
    setPopularQuestionsLoading(true);
    setPeakTimesLoading(true);
    setSentimentLoading(true);
    setConversationVolumeLoading(true);

    const summaryPromise = getDashboardSummary(dateFrom, dateTo)
      .then((data) => {
        setSummary(data);
        return data;
      })
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));

    const visitorTrendPromise = getVisitorTrend(dateFrom, dateTo, "day")
      .then((data) => setVisitorTrend(data))
      .catch(() => setVisitorTrend([]))
      .finally(() => setVisitorTrendLoading(false));

    const popularQuestionsPromise = getPopularQuestions(dateFrom, dateTo, 10)
      .then((data) => setPopularQuestions(data))
      .catch(() => setPopularQuestions([]))
      .finally(() => setPopularQuestionsLoading(false));

    const peakTimesPromise = getPeakTimes(dateFrom, dateTo)
      .then((data) => setPeakTimes(data))
      .catch(() => setPeakTimes([]))
      .finally(() => setPeakTimesLoading(false));

    const sentimentPromise = getSentiment(dateFrom, dateTo)
      .then((data) => setSentiment(data))
      .catch(() => setSentiment(null))
      .finally(() => setSentimentLoading(false));

    const conversationVolumePromise = getConversationVolume(dateFrom, dateTo)
      .then((data) => setConversationVolume(data))
      .catch(() => setConversationVolume([]))
      .finally(() => setConversationVolumeLoading(false));

    return Promise.allSettled([
      summaryPromise,
      visitorTrendPromise,
      popularQuestionsPromise,
      peakTimesPromise,
      sentimentPromise,
      conversationVolumePromise,
    ]);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    dateRange,
    setDateRange,

    summary,
    summaryLoading,

    visitorTrend,
    visitorTrendLoading,

    popularQuestions,
    popularQuestionsLoading,

    peakTimes,
    peakTimesLoading,

    sentiment,
    sentimentLoading,

    conversationVolume,
    conversationVolumeLoading,

    refresh: fetchAll,
  };
}
