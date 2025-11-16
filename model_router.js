import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dotenv from "dotenv";
dotenv.config();

class GeminiRouter {
  constructor() {
   this.models = {
  fast: new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",  // ✅ Stable
    temperature: 0.7,
    maxOutputTokens: 8192,
    apiKey: process.env.GOOGLE_API_KEY
  }),
  pro: new ChatGoogleGenerativeAI({
    model: "gemini-2.5-pro",  // ✅ Stable, highest quality
    temperature: 0.7,
    maxOutputTokens: 8192,
    apiKey: process.env.GOOGLE_API_KEY
  }),
  thinking: new ChatGoogleGenerativeAI({
    model: "gemini-2.5-pro",  // ✅ Use pro for complex thinking
    temperature: 0.3,
    maxOutputTokens: 32768,
    apiKey: process.env.GOOGLE_API_KEY
  })
};
  }

  async analyzeQuery(query) {
    const classifier = this.models.fast;
    
    const analysis = await classifier.invoke(
      `Analyze this query and return ONLY JSON (no markdown, no backticks):
{
  "complexity": "simple|medium|complex",
  "type": "dialogue|creative|technical|retrieval",
  "requiresMemory": true|false,
  "estimatedTokens": number
}

Query: ${query}`
    );

    try {
      const cleaned = analysis.content.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return {
        complexity: "medium",
        type: "dialogue",
        requiresMemory: true,
        estimatedTokens: 500
      };
    }
  }

  async routeQuery(query, context = "") {
    const analysis = await this.analyzeQuery(query);
    let chosenModel;
    let modelName;

    if (analysis.complexity === "simple" && analysis.estimatedTokens < 1000) {
      chosenModel = this.models.fast;
      modelName = "Gemini Flash";
      console.log(`📱 Routing to: ${modelName} (fastest, cheapest)`);
    } else if (analysis.type === "technical" || analysis.complexity === "complex") {
      chosenModel = this.models.thinking;
      modelName = "Gemini Thinking";
      console.log(`🧠 Routing to: ${modelName} (deep reasoning)`);
    } else {
      chosenModel = this.models.pro;
      modelName = "Gemini Pro";
      console.log(`⭐ Routing to: ${modelName} (best quality)`);
    }

    const fullPrompt = context 
      ? `CONTEXT:\n${context}\n\nUSER QUERY: ${query}`
      : query;

    const response = await chosenModel.invoke(fullPrompt);
    
    return {
      response: response.content,
      model: modelName,
      analysis
    };
  }
}

const router = new GeminiRouter();
export { GeminiRouter, router };