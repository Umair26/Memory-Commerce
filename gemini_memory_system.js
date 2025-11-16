import dotenv from "dotenv";
dotenv.config();
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { ChromaClient } from "chromadb";  // ✅ Only import once!
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

// ✅ FIX 1: Use 'new ChromaClient' with updated config
const chromaClient = new ChromaClient({
  path: process.env.CHROMA_URL || "https://api.trychroma.com",
  auth: {
    provider: "token",
    credentials: process.env.CHROMA_API_KEY
  },
  tenant: process.env.CHROMA_TENANT,
  database: process.env.CHROMA_DATABASE
});

// Initialize Gemini with implicit caching (automatic 75% savings!)
const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash-exp",  // ✅ Updated to latest model
    temperature: 0.7,
    maxOutputTokens: 8192,
    apiKey: process.env.GOOGLE_API_KEY,
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
  apiKey: process.env.GOOGLE_API_KEY,
});

let vectorStore;
try {
  // Try to connect to existing collection
  vectorStore = await Chroma.fromExistingCollection(embeddings, {
    collectionName: "conversation_memory",
    client: chromaClient,
  });
  console.log("✅ Connected to existing ChromaDB collection");
} catch (error) {
  console.log("📦 Creating new ChromaDB collection...");
  vectorStore = await Chroma.fromDocuments([], embeddings, {
    collectionName: "conversation_memory",
    client: chromaClient,
  });
  console.log("✅ ChromaDB collection created");
}


// Enhanced memory system with summarization
class EnhancedMemory {
    constructor() {
        this.maxTokens = 100000;
        this.currentTokens = 0;
        this.messages = [];
        this.chatHistory = [];
    }

    async saveContext(inputValues, outputValues) {
        // Store messages
        this.messages.push(new HumanMessage(inputValues.input));
        this.messages.push(new AIMessage(outputValues.response));
        
        // Store in chat history
        this.chatHistory.push({
            input: inputValues.input,
            output: outputValues.response,
            timestamp: Date.now()
        });
        
        // Save to vector store for long-term retrieval
        try {
            const conversation = `Human: ${inputValues.input}\nAI: ${outputValues.response}`;
            await vectorStore.addDocuments([
                {
                    pageContent: conversation,
                    metadata: {
                        timestamp: Date.now(),
                        type: "conversation"
                    }
                }
            ]);
        } catch (error) {
            console.log("⚠️ Could not save to vector store:", error.message);
        }

        // Auto-summarize if approaching token limit
        this.currentTokens += (inputValues.input.length + outputValues.response.length) / 4;
        if (this.currentTokens > 80000) {
            await this.summarizeHistory();
        }
    }

    async loadMemoryVariables() {
        const history = this.chatHistory
            .map(item => `Human: ${item.input}\nAI: ${item.output}`)
            .join('\n\n');
        
        return { history };
    }

    async summarizeHistory() {
        console.log("📝 Summarizing conversation history...");
        const { history } = await this.loadMemoryVariables();
        
        if (!history) {
            console.log("⚠️ No history to summarize");
            return;
        }

        const summary = await model.invoke(
            `Summarize the following conversation, preserving all important facts, relationships, and events:\n\n${history}`
        );

        // Replace history with summary + recent messages
        this.messages = [
            new SystemMessage(`CONVERSATION SUMMARY: ${summary.content}`),
            ...this.messages.slice(-10)
        ];
        
        // Keep only recent chat history
        this.chatHistory = [
            { input: "SUMMARY", output: summary.content, timestamp: Date.now() },
            ...this.chatHistory.slice(-5)
        ];
        
        this.currentTokens = summary.content.length / 4;
        console.log("✅ History summarized - token reduction achieved");
    }

    async retrieveRelevantContext(query) {
        try {
            const results = await vectorStore.similaritySearch(query, 5);
            if (results && results.length > 0) {
                return results.map(doc => doc.pageContent).join("\n\n");
            }
            return "";
        } catch (error) {
            console.log("⚠️ Could not retrieve context:", error.message);
            return "";
        }
    }

    getMessages() {
        return this.messages;
    }

    async chat(input) {
        console.log("\n💬 User:", input);
        
        // Get relevant context from vector store
        const context = await this.retrieveRelevantContext(input);
        
        // Build message array with context
        const messages = [];
        
        if (context) {
            messages.push(new SystemMessage(`Relevant context from previous conversations:\n${context}`));
        }
        
        messages.push(...this.messages);
        messages.push(new HumanMessage(input));

        // Get response
        const response = await model.invoke(messages);
        
        console.log("🤖 AI:", response.content);
        
        // Save to memory
        await this.saveContext({ input }, { response: response.content });
        
        return response.content;
    }

    clear() {
        this.messages = [];
        this.chatHistory = [];
        this.currentTokens = 0;
        console.log("🗑️ Memory cleared");
    }
}

// Initialize enhanced memory
const memory = new EnhancedMemory();

export { model, memory, vectorStore, chromaClient };