
import { GoogleGenAI, Type } from "@google/genai";
import { LegalAnalysis, AlignedRow } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractTextFromBlob = async (base64Data: string, mimeType: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: mimeType } },
        { text: `Extract text precisely. Preserve formatting and legal numbering. Return ONLY extracted text.` }
      ]
    }
  });
  return response.text || "";
};

export const getSmartExplanations = async (rows: AlignedRow[]): Promise<Record<number, string>> => {
  const ai = getAI();
  
  // Extract segments that actually contain changes to minimize tokens and focus intelligence
  const relevantChanges = rows
    .map((row, index) => ({ 
      index, 
      left: row.left?.value, 
      right: row.right?.value,
      isChange: row.left?.type !== 'unchanged' || row.right?.type !== 'unchanged'
    }))
    .filter(c => c.isChange && (c.left?.trim() || c.right?.trim()))
    .slice(0, 40); // Process up to 40 change clusters for balance between depth and speed

  if (relevantChanges.length === 0) return {};

  const prompt = `You are a high-level legal consultant. Analyze these specific textual differences between two versions of a document.
  For each segment, provide a concise, 1-sentence explanation of why this change matters legally or commercially.
  
  DIFFERENCES TO ANALYZE:
  ${relevantChanges.map(c => `[ID ${c.index}] Version A: "${c.left || '(None/Deleted)'}" -> Version B: "${c.right || '(None/Added)'}"`).join('\n')}

  Return a JSON array of objects, each containing an "id" (the ID integer from the input list) and an "insight" (your explanation string).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER, description: "The index ID provided in the prompt cluster." },
              insight: { type: Type.STRING, description: "The concise legal explanation of the difference." }
            },
            required: ["id", "insight"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return {};
    
    // Parse array and map back to record
    const parsed: Array<{id: number, insight: string}> = JSON.parse(text);
    const result: Record<number, string> = {};
    parsed.forEach(item => {
      result[item.id] = item.insight;
    });
    
    return result;
  } catch (error) {
    console.error("AI Intelligence Error:", error);
    // Return empty instead of throwing to maintain app stability
    return {};
  }
};

export const analyzeDocuments = async (doc1: string, doc2: string): Promise<LegalAnalysis> => {
  const ai = getAI();
  const prompt = `Elite legal counsel analysis of version shifts:
  Document 1: ${doc1}
  Document 2: ${doc2}
  Return JSON report covering Financial, Liability, Termination, IP, and Law shifts.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          contractType: { type: Type.STRING },
          keyChanges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                clause: { type: Type.STRING },
                impact: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
                description: { type: Type.STRING },
                riskScore: { type: Type.INTEGER }
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
    return JSON.parse(response.text || "{}") as LegalAnalysis;
  } catch (error) {
    throw new Error("The legal analysis could not be parsed successfully.");
  }
};
