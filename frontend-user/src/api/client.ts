import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api/v1",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

const deviceId = (() => {
  const stored = localStorage.getItem("device_id");
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem("device_id", id);
  return id;
})();

apiClient.interceptors.request.use((config) => {
  config.headers["X-Device-ID"] = deviceId;
  return config;
});

export default apiClient;
