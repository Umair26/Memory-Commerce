import { model, memory, vectorStore } from "./gemini_memory_system.js";
import { cacheManager } from "./gemini_caching.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import dotenv from "dotenv";
dotenv.config();

class MemoryOrchestrator {
    constructor() {
        this.qdrantClient = new QdrantClient({ 
            url: "http://localhost:6333" 
        });
        this.collectionName = "long_term_memory";
        this.embeddings = new GoogleGenerativeAIEmbeddings({
            model: "text-embedding-004",
            apiKey: process.env.GOOGLE_API_KEY
        });
    }

    async initialize() {
        // Create Qdrant collection for cold storage
        try {
            await this.qdrantClient.createCollection(this.collectionName, {
                vectors: {
                    size: 768, // text-embedding-004 dimension
                    distance: "Cosine"
                }
            });
            console.log("✅ Qdrant cold storage initialized");
        } catch (e) {
            console.log("ℹ️ Qdrant collection already exists");
        }
    }

    async processQuery(userQuery, sessionId) {
        console.log("\n🔍 Memory Retrieval Pipeline:");

        // TIER 1: Hot Memory (Recent conversation - in-memory)
        console.log("  ⚡ Checking hot memory (last 10 messages)...");
        const recentContext = await memory.loadMemoryVariables({});

        // TIER 2: Warm Memory (ChromaDB semantic search)
        console.log("  🔥 Searching warm memory (ChromaDB)...");
        let warmContext = "";
        try {
            const warmResults = await vectorStore.similaritySearch(userQuery, 3);
            warmContext = warmResults.map(r => r.pageContent).join("\n");
        } catch (error) {
            console.log("  ⚠️ ChromaDB not available");
        }

        // TIER 3: Cold Storage (Qdrant for historical data)
        console.log("  ❄️ Searching cold storage (Qdrant)...");
        let coldContext = "";
        try {
            const embedding = await this.embed(userQuery);
            const coldResults = await this.qdrantClient.search(this.collectionName, {
                vector: embedding,
                limit: 2,
                with_payload: true
            });
            coldContext = coldResults.map(r => r.payload.content).join("\n");
        } catch (error) {
            console.log("  ⚠️ Qdrant not available");
        }

        // Combine all memory tiers
        const combinedContext = `
RECENT CONVERSATION (Hot):
${recentContext.history || "No recent history"}

RELEVANT PAST CONVERSATIONS (Warm):
${warmContext || "No relevant past conversations"}

HISTORICAL KNOWLEDGE (Cold):
${coldContext || "No historical data"}
        `.trim();

        console.log(`✅ Retrieved context from 3 memory tiers\n`);

        return {
            context: combinedContext,
            tokenCount: Math.ceil(combinedContext.length / 4)
        };
    }

    async embed(text) {
        const vector = await this.embeddings.embedQuery(text);
        return vector;
    }

    async saveToLongTerm(content, metadata) {
        // Archive to Qdrant cold storage
        try {
            const embedding = await this.embed(content);
            await this.qdrantClient.upsert(this.collectionName, {
                points: [{
                    id: Date.now(),
                    vector: embedding,
                    payload: {
                        content,
                        ...metadata,
                        timestamp: Date.now()
                    }
                }]
            });
            console.log("💾 Saved to long-term storage");
        } catch (error) {
            console.log("⚠️ Could not save to long-term storage:", error.message);
        }
    }

    async chat(userQuery) {
        // Get context from all memory tiers
        const { context } = await this.processQuery(userQuery);
        
        // Use memory.chat which handles everything
        const response = await memory.chat(userQuery);
        
        return response;
    }
}

// Create and export instance
const memoryOrch = new MemoryOrchestrator();

export { MemoryOrchestrator, memoryOrch };