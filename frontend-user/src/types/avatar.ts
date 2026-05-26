export interface AvatarConfig {
  style: string;
  greeting_msg: string;
  persona_prompt: string;
  tone: "friendly" | "professional" | "humorous";
  language: string;
  voice_name: string;
  voice_speed: number;
  voice_pitch: number;
}
