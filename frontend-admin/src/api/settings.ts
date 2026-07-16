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

export interface ScenicAreaListResponse {
  items: ScenicSettings[];
  total: number;
}

export function getSettings(settingsId?: string): Promise<ScenicSettings> {
  return apiClient
    .get("/settings", { params: settingsId ? { settings_id: settingsId } : {} })
    .then((res) => res.data);
}

export function updateSettings(
  data: Partial<ScenicSettings & { changed_by: string }>,
  settingsId?: string,
): Promise<ScenicSettings> {
  return apiClient
    .put("/settings", data, { params: settingsId ? { settings_id: settingsId } : {} })
    .then((res) => res.data);
}

export function getSettingsHistory(
  page = 1,
  pageSize = 20,
  settingsId?: string,
): Promise<SettingsHistoryResponse> {
  return apiClient
    .get("/settings/history", {
      params: { page, page_size: pageSize, ...(settingsId ? { settings_id: settingsId } : {}) },
    })
    .then((res) => res.data);
}

export function revertSettings(historyId: string): Promise<ScenicSettings> {
  return apiClient
    .post("/settings/revert", null, { params: { history_id: historyId } })
    .then((res) => res.data);
}

export function deleteHistoryRecord(historyId: string): Promise<{ ok: boolean; deleted: string }> {
  return apiClient
    .delete(`/settings/history/${historyId}`)
    .then((res) => res.data);
}

export function expandKnowledge(
  scenicName: string,
  topic: string,
  mode: "auto" | "manual" = "auto",
  content?: string,
): Promise<{ ok: boolean; message: string; document_id: string; chunks_count: number }> {
  return apiClient
    .post("/settings/expand", { scenic_name: scenicName, topic, mode, content })
    .then((res) => res.data);
}

export function createScenicArea(data: {
  scenic_name: string;
  description?: string;
  contact_info?: string;
  logo_url?: string;
  changed_by?: string;
}): Promise<ScenicSettings> {
  return apiClient
    .post("/settings/scenic-areas", data)
    .then((res) => res.data);
}

export function listScenicAreas(): Promise<ScenicAreaListResponse> {
  return apiClient
    .get("/settings/scenic-areas")
    .then((res) => res.data);
}
