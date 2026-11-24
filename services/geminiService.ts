import type { StoryboardResponse } from "../types";

interface ApiErrorPayload {
  error?: string;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & ApiErrorPayload) | null;
  if (!response.ok) {
    const message =
      payload && typeof payload.error === "string" && payload.error.trim().length > 0
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  if (!payload) {
    throw new Error("Invalid response received from server.");
  }
  return payload;
}

export const generateStoryboard = async (): Promise<StoryboardResponse> => {
  const response = await fetch("/api/gemini/storyboard", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return parseJsonResponse<StoryboardResponse>(response);
};

export const generateSlideImage = async (prompt: string): Promise<string> => {
  const response = await fetch("/api/gemini/slide-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await parseJsonResponse<{ imageUrl?: string }>(response);
  if (typeof data.imageUrl !== "string" || !data.imageUrl.startsWith("data:image/")) {
    throw new Error("Invalid image data received from server.");
  }
  return data.imageUrl;
};