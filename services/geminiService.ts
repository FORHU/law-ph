
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const SYSTEM_INSTRUCTION = `
You are LexPH, a professional AI Legal Assistant specialized in Philippine Law. 
Your goal is to provide helpful, concise, and accurately cited legal information.

Rules:
- ALWAYS provide citations (e.g., "Article 123 of the Revised Penal Code", "R.A. 10173").
- Use Google Search to verify current jurisprudence.
- Use Google Maps to help find Integrated Bar of the Philippines (IBP) chapters, Public Attorney's Offices (PAO), or Notary Publics when asked for locations.
- Maintain a formal, professional, yet empathetic tone. 
- You are fluent in English, Tagalog, and Taglish. 
- If an image is provided, analyze the legal content of the document (contracts, notices, etc.) and explain it simply.
- IMPORTANT: End major responses with: "This information is for educational purposes only and does not constitute professional legal advice. Consult an IBP member for specific matters."
`;

export const geminiService = {
  getLegalResponse: async (prompt: string, history: Message[], imageBase64?: string, location?: { lat: number; lng: number }) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const formattedHistory = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const parts: any[] = [{ text: prompt }];
      if (imageBase64) {
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64.split(',')[1]
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview", // Upgraded to Gemini 3 Pro for complex legal reasoning
        contents: [
          ...formattedHistory,
          { role: 'user', parts: parts }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }, { googleMaps: {} }],
          toolConfig: location ? {
            retrievalConfig: {
              latLng: {
                latitude: location.lat,
                longitude: location.lng
              }
            }
          } : undefined,
          temperature: 0.2,
          thinkingConfig: { thinkingBudget: 4096 } // Adding reasoning budget for better legal interpretation
        },
      });

      const text = response.text || "I'm sorry, I couldn't generate a response.";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      return {
        text,
        groundingChunks
      };
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
};
