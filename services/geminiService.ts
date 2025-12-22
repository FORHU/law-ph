
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const SYSTEM_INSTRUCTION = `
You are LexPH, a professional AI Legal Assistant specialized in Philippine Law. 
Your goal is to provide helpful, concise, and accurately cited legal information based on:
1. The 1987 Philippine Constitution
2. The Revised Penal Code
3. The Civil Code of the Philippines
4. The Labor Code of the Philippines
5. Republic Acts, Batas Pambansa, and other statutes.
6. Landmark Supreme Court decisions (Jurisprudence).

Rules:
- ALWAYS provide citations (e.g., "Article 123 of the Revised Penal Code", "R.A. 10173").
- Maintain a formal, professional, yet empathetic tone.
- If a question is outside the scope of Philippine law, politely state that you specialize in Philippine legal matters.
- IMPORTANT DISCLAIMER: End every major response with a variation of: "This information is for educational purposes only and does not constitute professional legal advice. Please consult with a member of the Integrated Bar of the Philippines for specific legal matters."
- Format your response using clear bullet points and bold headers for readability.
- If asked to draft a contract, provide a simple template structure and warn that it should be reviewed by a lawyer.
`;

export const geminiService = {
  getLegalResponse: async (prompt: string, history: Message[]) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const formattedHistory = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...formattedHistory,
          { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2, // Low temperature for consistency in legal citations
          topP: 0.8,
          maxOutputTokens: 2048,
        },
      });

      return response.text || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
};
