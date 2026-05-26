import apiClient from "./client";

export interface AvatarConfig {
  id: string;
  style: string;
  model_path: string | null;
  greeting_msg: string;
  persona_prompt: string;
  tone: "friendly" | "professional" | "humorous";
  voice_name: string;
  voice_speed: number;
  voice_pitch: number;
  created_at: string;
  updated_at: string;
}

export function getAvatarConfig(): Promise<AvatarConfig> {
  return apiClient.get("/avatar/config").then((res) => res.data);
}

export function updateAvatarConfig(
  data: Partial<Omit<AvatarConfig, "id" | "created_at" | "updated_at">>
): Promise<AvatarConfig> {
  return apiClient.put("/avatar/config", data).then((res) => res.data);
}
