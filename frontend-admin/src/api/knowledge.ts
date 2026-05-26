import apiClient from "./client";

export interface DocumentItem {
  id: number;
  title: string;
  file_type: string;
  file_name: string;
  file_size: number;
  status: "processing" | "completed" | "failed";
  chunk_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  items: DocumentItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface QAPair {
  id: number;
  question: string;
  answer: string;
  tags: string[];
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QAPairListResponse {
  items: QAPair[];
  total: number;
  page: number;
  page_size: number;
}

export function uploadDocument(
  file: File,
  title: string,
  tags: string[]
): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  formData.append("tags", JSON.stringify(tags));
  return apiClient
    .post("/knowledge/documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((res) => res.data);
}

export function getDocuments(
  page: number = 1,
  pageSize: number = 10,
  search: string = ""
): Promise<DocumentListResponse> {
  return apiClient
    .get("/knowledge/documents", { params: { page, page_size: pageSize, search } })
    .then((res) => res.data);
}

export function getDocument(id: number): Promise<DocumentItem> {
  return apiClient.get(`/knowledge/documents/${id}`).then((res) => res.data);
}

export function deleteDocument(id: number): Promise<void> {
  return apiClient.delete(`/knowledge/documents/${id}`).then((res) => res.data);
}

export function getQAPairs(
  page: number = 1,
  pageSize: number = 10,
  search: string = ""
): Promise<QAPairListResponse> {
  return apiClient
    .get("/knowledge/qa-pairs", { params: { page, page_size: pageSize, search } })
    .then((res) => res.data);
}

export function createQAPair(
  question: string,
  answer: string,
  tags: string[]
): Promise<QAPair> {
  return apiClient
    .post("/knowledge/qa-pairs", { question, answer, tags })
    .then((res) => res.data);
}

export function updateQAPair(
  id: number,
  data: Partial<Pick<QAPair, "question" | "answer" | "tags" | "is_active">>
): Promise<QAPair> {
  return apiClient.put(`/knowledge/qa-pairs/${id}`, data).then((res) => res.data);
}

export function deleteQAPair(id: number): Promise<void> {
  return apiClient.delete(`/knowledge/qa-pairs/${id}`).then((res) => res.data);
}
