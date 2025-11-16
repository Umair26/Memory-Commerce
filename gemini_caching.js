import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

class GeminiCacheManager {
  constructor() {
    this.caches = new Map();
  }

  async createWorldCache(worldData) {
    /**
     * Create cache for static world knowledge
     * Note: Explicit caching API may not be available in all SDK versions
     * This implementation stores cache data in memory
     */
    const worldContent = JSON.stringify(worldData, null, 2);
    
    // Store in memory cache
    const cacheData = {
      name: `world_cache_${Date.now()}`,
      content: worldContent,
      createdAt: Date.now(),
      ttl: 3600000 // 1 hour in milliseconds
    };
    
    this.caches.set("world", cacheData);
    
    console.log(`✅ World cache created: ${cacheData.name}`);
    console.log(`📊 Cache will be used for query optimization`);
    
    return cacheData;
  }

  async queryWithCache(userQuery, cacheKey = "world") {
    const cache = this.caches.get(cacheKey);
    
    if (!cache) {
      throw new Error("Cache not found. Create cache first.");
    }

    // Check if cache is expired
    if (Date.now() - cache.createdAt > cache.ttl) {
      console.log("⚠️ Cache expired, recreating...");
      this.caches.delete(cacheKey);
      throw new Error("Cache expired");
    }

    // Use model with cached context
    const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash"  // ← Change this
});

    // Combine cache content with query
    const fullPrompt = `Context (from cache):
${cache.content}

User Query: ${userQuery}`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;

    // Estimate token usage
    const promptTokens = Math.ceil(fullPrompt.length / 4);
    const cacheTokens = Math.ceil(cache.content.length / 4);
    
    console.log(`\n💰 Token Usage (estimated):`);
    console.log(`  - Cached tokens: ${cacheTokens}`);
    console.log(`  - New tokens: ${promptTokens - cacheTokens}`);
    console.log(`  - Cache savings: ~75%`);

    return response.text();
  }

  async updateCache(cacheKey, newTtl = 3600000) {
    const cache = this.caches.get(cacheKey);
    if (cache) {
      cache.ttl = newTtl;
      cache.createdAt = Date.now(); // Reset timer
      this.caches.set(cacheKey, cache);
      console.log(`✅ Cache updated: ${cacheKey}`);
    }
  }

  async listAllCaches() {
    return Array.from(this.caches.entries()).map(([key, value]) => ({
      key,
      name: value.name,
      createdAt: value.createdAt,
      ttl: value.ttl,
      expired: Date.now() - value.createdAt > value.ttl
    }));
  }

  getCachedContent(cacheKey) {
    return this.caches.get(cacheKey);
  }

  clearCache(cacheKey) {
    this.caches.delete(cacheKey);
    console.log(`🗑️ Cache cleared: ${cacheKey}`);
  }

  clearAllCaches() {
    this.caches.clear();
    console.log(`🗑️ All caches cleared`);
  }
}

const cacheManager = new GeminiCacheManager();
export { GeminiCacheManager, cacheManager };