import { router } from "./model_router.js";
import { memory, vectorStore } from "./gemini_memory_system.js";
import { memoryOrch } from "./memory_orchestrator.js";
import { cacheManager } from "./gemini_caching.js";
import { plugins } from "./plugins/plugin_system.js";
import { costTrackerPlugin } from "./plugins/cost_tracker.js";

class ConversationEngine {
  constructor() {
    this.initialized = false;
    this.sessionData = new Map();
  }

  async initialize(worldData) {
    await memoryOrch.initialize();
    plugins.registerPlugin("cost-tracker", costTrackerPlugin);
    // Create world cache if data provided (optional)
    if (worldData && Object.keys(worldData).length > 0) {
      try {
        await cacheManager.createWorldCache(worldData);
      } catch (error) {
        console.log("⚠️ Could not create world cache, continuing without it");
      }
    } else {
      console.log("ℹ️ No world data provided, skipping cache creation");
    }
    
    this.initialized = true;
    console.log("✅ Conversation engine initialized\n");
  }

  async chat(userMessage, sessionId = "default", options = {}) {
    if (!this.initialized) {
      throw new Error("Engine not initialized. Call initialize() first.");
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`💬 USER: ${userMessage}`);
    console.log(`${"=".repeat(60)}\n`);

    // PLUGIN HOOK: beforeQuery
    let processedMessage = await plugins.executeHook('beforeQuery', {
      message: userMessage,
      sessionId
    });

    const memoryResult = await memoryOrch.processQuery(
      processedMessage.message || userMessage, 
      sessionId
    );
    
    // PLUGIN HOOK: onModelRoute (before routing)
    const routeData = await plugins.executeHook('onModelRoute', {
      query: userMessage,
      context: memoryResult.context
    });
    
    const result = await router.routeQuery(
      routeData.query || userMessage, 
      routeData.context || memoryResult.context
    );
    
    // PLUGIN HOOK: afterQuery
    const enhancedResult = await plugins.executeHook('afterQuery', {
      ...result,
      metadata: {
        complexity: result.analysis.complexity,
        memoryTokens: memoryResult.tokenCount,
        cached: true,
        tokens: result.analysis.estimatedTokens
      }
    });
    
    // Save to memory
    const conversationText = `User: ${userMessage}\nAssistant: ${result.response}`;
    
    // PLUGIN HOOK: onMemorySave
    const memoryData = await plugins.executeHook('onMemorySave', conversationText);
    
    await memory.saveContext(
      { input: userMessage },
      { response: result.response }
    );

    if (result.analysis.requiresMemory) {
      await memoryOrch.saveToLongTerm(
        memoryData || conversationText,
        {
          sessionId,
          type: result.analysis.type,
          timestamp: Date.now()
        }
      );
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`🤖 ${result.model.toUpperCase()}: ${result.response}`);
    console.log(`${"=".repeat(60)}\n`);

    return enhancedResult;
  }

  async getSessionHistory(sessionId) {
    try {
      const results = await vectorStore.similaritySearch(`session:${sessionId}`, 50);
      return results.map(r => r.pageContent);
    } catch (error) {
      console.log("⚠️ Could not retrieve history:", error.message);
      return [];
    }
  }

  async clearSession(sessionId) {
    await memory.clear();
    console.log(`🗑️  Session ${sessionId} cleared from hot memory`);
  }
}

const engine = new ConversationEngine();

export { ConversationEngine, engine };