import apiClient from "./client";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return apiClient
    .post("/admin/login", { username, password })
    .then((res) => res.data);
}

export interface AdminUserOut {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string | null;
}

export function getAdminUsers(): Promise<{ items: AdminUserOut[] }> {
  return apiClient.get("/admin/users").then((res) => res.data);
}

export function createAdminUser(data: { username: string; password: string; role: string }) {
  return apiClient.post("/admin/users", data).then((res) => res.data);
}

export function deleteAdminUser(userId: string) {
  return apiClient.delete(`/admin/users/${userId}`).then((res) => res.data);
}

export function changeUserPassword(userId: string, password: string) {
  return apiClient.put(`/admin/users/${userId}/password`, { password }).then((res) => res.data);
}

export function toggleUserActive(userId: string) {
  return apiClient.put(`/admin/users/${userId}/toggle`).then((res) => res.data);
}
