
import { GoogleGenAI, Type } from "@google/genai";
import { LegalAnalysis } from "../types";

// Helper to get a fresh instance of GoogleGenAI using the environment API key directly
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractTextFromBlob = async (base64Data: string, mimeType: string): Promise<string> => {
  const ai = getAI();
  
  // Using gemini-3-flash-preview for the basic text extraction task
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        {
          text: `Extract all text from this document with extreme precision. 
          Preserve all formatting, legal numbering (e.g. 1.1, 2(a)), and signature blocks.
          Ensure that specialized titles and names (e.g. 'Pastor Dr.') are captured exactly as written.
          Return ONLY the raw extracted text.`
        }
      ]
    }
  });

  // response.text is a property getter, do not call it as a function
  return response.text || "";
};

export const analyzeDocuments = async (doc1: string, doc2: string): Promise<LegalAnalysis> => {
  const ai = getAI();
  
  const prompt = `You are an elite legal counsel. Compare these two versions of a contract:
  Document 1: ${doc1}
  Document 2: ${doc2}
  
  Focus on identifying changes in:
  1. Financial Obligations: Payment terms, late fees, increases.
  2. Liability & Indemnity: Caps on damages, hold harmless clauses.
  3. Termination: Notice periods, "for cause" vs "for convenience" changes.
  4. IP & Confidentiality: Scope of ownership or data usage rights.
  5. Governing Law: Jurisdiction shifts.

  Identify specifically what was added or removed and evaluate the risk shift.
  Return the analysis as JSON.`;

  // Using gemini-3-pro-preview for complex legal reasoning and analysis
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          contractType: { type: Type.STRING, description: "Type of contract detected (e.g. MSA, NDA, Employment)" },
          keyChanges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                clause: { type: Type.STRING },
                impact: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
                description: { type: Type.STRING },
                riskScore: { type: Type.INTEGER, description: "Risk level from 1 to 10" }
              },
              required: ["clause", "impact", "description", "riskScore"]
            }
          },
          riskAssessment: {
            type: Type.OBJECT,
            properties: {
              level: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
              explanation: { type: Type.STRING }
            },
            required: ["level", "explanation"]
          },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["summary", "keyChanges", "riskAssessment", "recommendations"]
      }
    }
  });

  try {
    const text = response.text;
    if (!text) {
      throw new Error("Received empty response from Gemini API");
    }
    return JSON.parse(text) as LegalAnalysis;
  } catch (error) {
    console.error("Failed to parse Gemini response as JSON", error);
    throw new Error("The legal analysis could not be parsed successfully.");
  }
};
