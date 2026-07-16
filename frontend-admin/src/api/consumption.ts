import apiClient from "./client";

export interface RevenueSummary {
  total_visitors: number;
  total_revenue: number;
  ticket_revenue: number;
  food_revenue: number;
  shopping_revenue: number;
  transport_revenue: number;
  entertainment_revenue: number;
  avg_per_capita: number;
  avg_stay_duration: number;
  avg_satisfaction: number;
}

export interface RevenueTrendItem {
  period: string;
  visitors: number;
  total: number;
  ticket: number;
  food: number;
  shopping: number;
  entertainment: number;
  avg_spend: number;
}

export interface CategoryItem {
  name: string;
  value: number;
  pct: number;
}

export interface CategoryBreakdown {
  categories: CategoryItem[];
  total: number;
}

export interface GenderItem {
  gender: string;
  count: number;
  avg_spend: number;
  avg_satisfaction: number;
}

export interface AgeGroupItem {
  age_group: string;
  count: number;
  avg_spend: number;
  avg_satisfaction: number;
}

export interface GroupSizeItem {
  group_size: number;
  count: number;
  avg_spend: number;
  avg_stay: number;
}

export interface Demographics {
  by_gender: GenderItem[];
  by_age_group: AgeGroupItem[];
  by_group_size: GroupSizeItem[];
}

export interface AttractionTypeItem {
  attraction_type: string;
  visitors: number;
  revenue: number;
  avg_spend: number;
  avg_satisfaction: number;
}

export interface SatisfactionSpendingItem {
  satisfaction: number;
  count: number;
  avg_spend: number;
  avg_stay: number;
}

export interface TopAttraction {
  name: string;
  type: string;
  visitors: number;
  revenue: number;
  avg_spend: number;
  avg_satisfaction: number;
}

// 灵山胜境子景点（仅保留数据库中实际存在数据的11个）
export const LINGSHAN_SPOTS = [
  "佛足坛", "菩提大道", "九龙灌浴",
  "降魔浮雕", "阿育王柱", "百子戏弥勒", "祥符禅寺",
  "灵山大佛", "灵山梵宫", "五印坛城", "曼飞龙塔",
];

function params(dateFrom?: string, dateTo?: string, keyword?: string, contentKeywords?: string[]) {
  const p: Record<string, string> = {};
  if (dateFrom) p.date_from = dateFrom;
  if (dateTo) p.date_to = dateTo;
  if (keyword) p.keyword = keyword;
  if (contentKeywords && contentKeywords.length > 0) {
    p.content_keywords = contentKeywords.join(",");
  }
  return p;
}

export function getConsumptionSummary(
  dateFrom?: string,
  dateTo?: string,
  keyword?: string,
  contentKeywords?: string[],
): Promise<RevenueSummary> {
  return apiClient
    .get("/consumption/summary", { params: params(dateFrom, dateTo, keyword, contentKeywords) })
    .then((res) => res.data);
}

export function getConsumptionTrend(
  granularity: "month" | "day" = "month",
  dateFrom?: string,
  dateTo?: string,
  keyword?: string,
  contentKeywords?: string[],
): Promise<RevenueTrendItem[]> {
  return apiClient
    .get("/consumption/trend", {
      params: { granularity, ...params(dateFrom, dateTo, keyword, contentKeywords) },
    })
    .then((res) => res.data);
}

export function getCategoryBreakdown(
  dateFrom?: string,
  dateTo?: string,
  keyword?: string,
  contentKeywords?: string[],
): Promise<CategoryBreakdown> {
  return apiClient
    .get("/consumption/category-breakdown", { params: params(dateFrom, dateTo, keyword, contentKeywords) })
    .then((res) => res.data);
}

export function getConsumptionDemographics(
  dateFrom?: string,
  dateTo?: string,
  keyword?: string,
  contentKeywords?: string[],
): Promise<Demographics> {
  return apiClient
    .get("/consumption/demographics", { params: params(dateFrom, dateTo, keyword, contentKeywords) })
    .then((res) => res.data);
}

export function getByAttractionType(
  dateFrom?: string,
  dateTo?: string,
  keyword?: string,
  contentKeywords?: string[],
): Promise<AttractionTypeItem[]> {
  return apiClient
    .get("/consumption/by-attraction-type", { params: params(dateFrom, dateTo, keyword, contentKeywords) })
    .then((res) => res.data);
}

export function getSatisfactionSpending(
  dateFrom?: string,
  dateTo?: string,
  keyword?: string,
  contentKeywords?: string[],
): Promise<SatisfactionSpendingItem[]> {
  return apiClient
    .get("/consumption/satisfaction-spending", { params: params(dateFrom, dateTo, keyword, contentKeywords) })
    .then((res) => res.data);
}

export function getTopAttractions(
  dateFrom?: string,
  dateTo?: string,
  keyword?: string,
  contentKeywords?: string[],
  limit: number = 15,
): Promise<TopAttraction[]> {
  return apiClient
    .get("/consumption/top-attractions", {
      params: { ...params(dateFrom, dateTo, keyword, contentKeywords), limit },
    })
    .then((res) => res.data);
}

export interface SpotBreakdownItem {
  spot: string;
  visitors: number;
  revenue: number;
  avg_spend: number;
  avg_satisfaction: number;
}

// Combined dashboard response type — replaces 7 separate API calls
export interface ConsumptionDashboard {
  summary: RevenueSummary;
  trend: RevenueTrendItem[];
  category: CategoryBreakdown;
  demographics: Demographics;
  attraction_types: AttractionTypeItem[];
  satisfaction_spending: SatisfactionSpendingItem[];
  top_attractions: TopAttraction[];
  spot_breakdown?: SpotBreakdownItem[];
}

/** Single API call returning all consumption data at once. 7x fewer requests. */
export function getConsumptionDashboard(
  granularity: "month" | "day" = "month",
  dateFrom?: string,
  dateTo?: string,
  keyword?: string,
  contentKeywords?: string[],
): Promise<ConsumptionDashboard> {
  return apiClient
    .get("/consumption/dashboard", {
      params: { granularity, ...params(dateFrom, dateTo, keyword, contentKeywords) },
    })
    .then((res) => res.data);
}
