import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// The API key is injected via Vite's define in vite.config.ts
const apiKey = process.env.GEMINI_API_KEY;

export const searchResearch = async (query: string) => {
  if (!apiKey) throw new Error("Gemini API Key is missing");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Research the following topic and provide a list of key findings with sources: ${query}`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  return { text, sources };
};

export const summarizeContent = async (content: string) => {
  if (!apiKey) throw new Error("Gemini API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Summarize the following content into: 1. Short summary, 2. Academic summary, 3. Key points. Content: ${content}`,
  });
  
  return response.text;
};

export const generateCitation = async (source: any, format: string) => {
  if (!apiKey) throw new Error("Gemini API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a citation in ${format} format for this source: ${JSON.stringify(source)}`,
  });
  
  return response.text;
};
