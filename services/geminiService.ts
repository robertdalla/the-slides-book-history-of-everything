import { GoogleGenAI, Type } from "@google/genai";
import { StoryboardResponse } from "../types";

// Initialize Gemini Client
// CRITICAL: API Key must be from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const VIDEO_CONTEXT = `
This is likely "history of the entire world, i guess".
The style is: Neon colors, black background, crudely drawn ms-paint style icons, deadpan humor, fast pacing, jingles.
Topics often include: The sun is a deadly laser, technological advancements, war, weird maps, "knock knock it's the united states".
`;

export const generateStoryboard = async (): Promise<StoryboardResponse> => {
  const prompt = `
    ${VIDEO_CONTEXT}
    Create a structured storyboard for a funny mobile slide game summarizing this video's vibe.
    I need exactly 8 slides, plus a title and a conclusion text.
    
    Each slide needs:
    1. 'text': A very short, funny caption (max 10 words).
    2. 'imagePrompt': A description for an AI image generator to create a simple, neon-colored, crudely drawn cartoon on a black background representing the text.
    
    The tone should be chaotic, educational but silly, and very colorful.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A funny title for the game" },
          conclusion: { type: Type.STRING, description: "The final funny message on the last card" },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
              },
              required: ["text", "imagePrompt"],
            },
          },
        },
        required: ["title", "conclusion", "slides"],
      },
      systemInstruction: "You are a creative director for a chaotic, funny history game in the style of Bill Wurtz.",
    },
  });

  const jsonStr = response.text || "{}";
  return JSON.parse(jsonStr) as StoryboardResponse;
};

export const generateSlideImage = async (prompt: string): Promise<string> => {
  try {
    const fullPrompt = `A simple, neon-colored, crudely drawn digital cartoon on a solid black background. Minimalist, funny, internet meme style. ${prompt}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: fullPrompt,
      config: {
        // No responseMimeType for image generation models in generateContent usually, 
        // but let's stick to defaults.
      }
    });

    // Extract image from response parts
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    // Fallback if no image generated (shouldn't happen with correct model)
    return "https://picsum.photos/400/600?grayscale"; 
  } catch (error) {
    console.error("Image gen error", error);
    return "https://picsum.photos/400/600?blur=5";
  }
};