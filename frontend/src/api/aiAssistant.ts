import apiClient from "./client";

export interface ChatMessagePayload {
  role: "user" | "assistant";
  content: string;
}

export interface AskResponse {
  answer: string;
  tools_used: string[];
}

export async function askAssistant(
  question: string,
  history: ChatMessagePayload[]
): Promise<AskResponse> {
  const response = await apiClient.post<AskResponse>("/api/v1/ai-assistant/ask", {
    question,
    history,
  });
  return response.data;
}