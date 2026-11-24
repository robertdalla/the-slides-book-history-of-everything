import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type { StoryboardResponse } from "../types.ts";

const VIDEO_CONTEXT = `
This is likely "history of the entire world, i guess".
The style is: Neon colors, black background, crudely drawn ms-paint style icons, deadpan humor, fast pacing, jingles.
Topics often include: The sun is a deadly laser, technological advancements, war, weird maps, "knock knock it's the united states".
`;

const SAFE_IMAGE_MIME_REGEX = /^image\/[a-zA-Z0-9.+-]+$/;

let cachedApiKey: string | undefined;
let cachedClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "PLACEHOLDER_API_KEY") {
    const err = new Error(
      "GEMINI_API_KEY is not configured. Please check Settings > Secrets."
    ) as Error & { status?: number };
    err.status = 500;
    throw err;
  }

  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedApiKey = apiKey;
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  return cachedClient;
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null) {
    const errObj = error as { status?: unknown; code?: unknown };
    if (typeof errObj.status === "number") return errObj.status;
    if (typeof errObj.code === "number") return errObj.code;
  }
  return undefined;
}

function isRetryableError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !isRetryableError(error)) {
        throw error;
      }
      const delayMs = 400 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export async function generateStoryboardServer(): Promise<StoryboardResponse> {
  const ai = getGeminiClient();

  const prompt = `
    ${VIDEO_CONTEXT}
    Create a structured storyboard for a funny mobile slide game summarizing this video's vibe.
    I need exactly 8 slides, plus a title and a conclusion text.
    
    Each slide needs:
    1. 'text': A very short, funny caption (max 10 words).
    2. 'imagePrompt': A description for an AI image generator to create a simple, playful, family-friendly, neon-colored, crudely drawn cartoon doodle on a black background representing the text. Keep visuals goofy and non-violent (silly stick figures, smiling planets, neon boats, goofy maps, glowing shapes—no weapons, gore, or real people).
    
    The tone should be chaotic, educational but silly, and very colorful.
  `;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A short, funny title for the game" },
            conclusion: {
              type: Type.STRING,
              description: "The final funny message on the last card",
            },
            slides: {
              type: Type.ARRAY,
              description: "Exactly 8 chronological humorous history slides",
              items: {
                type: Type.OBJECT,
                properties: {
                  text: {
                    type: Type.STRING,
                    description: "A very short funny caption (max 10 words)",
                  },
                  imagePrompt: {
                    type: Type.STRING,
                    description:
                      "Playful, family-friendly visual description for a minimalist neon cartoon doodle on black background",
                  },
                },
                required: ["text", "imagePrompt"],
              },
            },
          },
          required: ["title", "conclusion", "slides"],
        },
        systemInstruction:
          "You are a creative director for a chaotic, funny history game in the style of Bill Wurtz.",
      },
    })
  );

  const jsonStr = (response.text ?? "").trim();
  if (!jsonStr) {
    throw new Error("Empty storyboard response from Gemini.");
  }

  const parsed = JSON.parse(jsonStr) as StoryboardResponse;
  if (
    !parsed ||
    typeof parsed.title !== "string" ||
    typeof parsed.conclusion !== "string" ||
    !Array.isArray(parsed.slides) ||
    parsed.slides.length === 0
  ) {
    throw new Error("Invalid storyboard format received from Gemini.");
  }

  return parsed;
}

function extractImageDataUrl(
  response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>
): string | null {
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const rawMime = part.inlineData.mimeType ?? "image/png";
        const safeMime = SAFE_IMAGE_MIME_REGEX.test(rawMime) ? rawMime : "image/png";
        return `data:${safeMime};base64,${part.inlineData.data}`;
      }
    }
  }
  return null;
}

export async function generateSlideImageServer(prompt: string): Promise<string> {
  const ai = getGeminiClient();

  const candidatePrompts = [
    `Generate a single cartoon illustration: A simple, neon-colored, crudely drawn digital cartoon on a solid black background. Minimalist, funny, playful internet meme doodle style. Scene: ${prompt}`,
    `Draw a cute, goofy, family-friendly neon MS-Paint style doodle on a solid black background playfully depicting: ${prompt}`,
    `Draw a funny, minimalist neon-colored retro MS-Paint cartoon doodle on a solid black background with glowing stars, wavy lines, and goofy stick figures celebrating a quirky moment in history.`,
  ];

  for (const fullPrompt of candidatePrompts) {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: fullPrompt,
        config: {
          responseModalities: ["IMAGE"],
        },
      })
    );

    const imageDataUrl = extractImageDataUrl(response);
    if (imageDataUrl) {
      return imageDataUrl;
    }
  }

  throw new Error("No image was generated for this slide.");
}
