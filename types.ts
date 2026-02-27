export interface SlideData {
  id: number;
  text: string;
  imagePrompt: string;
  imageUrl?: string; // Populated after generation
}

export enum GameState {
  HOME,
  LOADING,
  PLAYING,
  CONCLUSION
}

export interface StoryboardResponse {
  slides: {
    text: string;
    imagePrompt: string;
  }[];
  title: string;
  conclusion: string;
}
