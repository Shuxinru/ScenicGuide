import apiClient from "./client";

export interface ScenicSettings {
  id: string;
  scenic_name: string;
  description: string | null;
  contact_info: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettingsHistoryItem {
  id: string;
  settings_id: string;
  changed_by: string;
  changes: Record<string, { old: string; new: string }>;
  created_at: string;
}

export interface SettingsHistoryResponse {
  items: SettingsHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export function getSettings(): Promise<ScenicSettings> {
  return apiClient.get("/settings").then((res) => res.data);
}

export function updateSettings(data: Partial<ScenicSettings & { changed_by: string }>): Promise<ScenicSettings> {
  return apiClient.put("/settings", data).then((res) => res.data);
}

export function getSettingsHistory(page = 1, pageSize = 20): Promise<SettingsHistoryResponse> {
  return apiClient
    .get("/settings/history", { params: { page, page_size: pageSize } })
    .then((res) => res.data);
}

export function revertSettings(historyId: string): Promise<ScenicSettings> {
  return apiClient
    .post("/settings/revert", null, { params: { history_id: historyId } })
    .then((res) => res.data);
}
