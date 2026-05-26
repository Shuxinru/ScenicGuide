import apiClient from "./client";

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

export function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  return apiClient
    .post("/auth/login", { username, password })
    .then((res) => res.data);
}
