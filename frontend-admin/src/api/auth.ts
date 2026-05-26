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
