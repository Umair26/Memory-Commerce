import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { engine } from "./conversation_engine.js";
import { plugins } from "./plugins/plugin_system.js";
import { costTrackerPlugin } from "./plugins/cost_tracker.js";
import { multimodalPlugin } from "./plugins/multimodal.js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import fs from "fs";
import multer from 'multer';
import { listingEnhancerPlugin } from './plugins/listing_enhancer.js';
import { CSVParser } from './utils/csv_parser.js';
import { productGeneratorPlugin } from './plugins/product_generator.js';


const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
  credentials: true
}));

app.use(express.json());

// Load world data
let worldData = {};
if (fs.existsSync("./game_world.json")) {
  worldData = JSON.parse(fs.readFileSync("./game_world.json", "utf-8"));
  console.log("✅ Game world data loaded");
} else {
  console.log("ℹ️ No game_world.json found, continuing without world data");
}

// Initialize

await engine.initialize(worldData);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString() 
  });
});

// API info endpoint
app.get("/api/info", (req, res) => {
  res.json({ 
    status: "ok",
    service: "Gemini Memory System API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      models: "/v1/models",
      chat: "/v1/chat/completions",
      compare: "/api/compare",
      benchmark: "/api/benchmark",
      stats: "/api/stats"
    }
  });
});

// OpenAI-compatible models endpoint
app.get("/v1/models", (req, res) => {
  res.json({
    object: "list",
    data: [
      {
        id: "gemini-memory-system",
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "your-company",
        permission: [{
          id: "modelperm-1",
          object: "model_permission",
          created: Math.floor(Date.now() / 1000),
          allow_create_engine: false,
          allow_sampling: true,
          allow_logprobs: true,
          allow_search_indices: false,
          allow_view: true,
          allow_fine_tuning: false,
          organization: "*",
          group: null,
          is_blocking: false
        }],
        root: "gemini-memory-system",
        parent: null
      }
    ]
  });
});

// OpenAI-compatible chat completions
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { messages, model } = req.body;
    
    if (!messages || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: "messages is required",
          type: "invalid_request_error",
          code: "missing_messages"
        }
      });
    }
    
    const lastMessage = messages[messages.length - 1].content;
    const sessionId = req.headers['x-session-id'] || 'lobechat-' + Date.now();
    
    console.log("📨 LobeChat Request:", lastMessage);
    
    const result = await engine.chat(lastMessage, sessionId);
    
    res.json({
      id: "chatcmpl-" + Date.now(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model || "gemini-memory-system",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: result.response
        },
        finish_reason: "stop"
      }],
      usage: {
        prompt_tokens: result.metadata?.memoryTokens || 0,
        completion_tokens: result.metadata?.tokens || 0,
        total_tokens: (result.metadata?.memoryTokens || 0) + (result.metadata?.tokens || 0)
      }
    });
    
  } catch (error) {
    console.error("LobeChat error:", error);
    res.status(500).json({ 
      error: { 
        message: error.message, 
        type: "server_error",
        code: "internal_error"
      } 
    });
  }
});

// Regular chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId = "default" } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    const result = await engine.chat(message, sessionId);
    res.json(result);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Comparison endpoint
app.post("/api/compare", async (req, res) => {
  try {
    const { message, sessionId = "default" } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    
    const withMemory = await engine.chat(message, sessionId);
    const standardGemini = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GOOGLE_API_KEY
    });
    const withoutMemory = await standardGemini.invoke(message);
    const stats = costTrackerPlugin.getStats();
    
    res.json({
      comparison: {
        withMemory: {
          response: withMemory.response,
          model: withMemory.model,
          hasContext: withMemory.metadata.memoryTokens > 0,
          features: ["Memory", "Context", "Cost Optimization", "Smart Routing"],
          tokensUsed: withMemory.metadata.tokens || 0
        },
        withoutMemory: {
          response: withoutMemory.content,
          model: "gemini-2.5-flash",
          hasContext: false,
          features: ["None"]
        }
      },
      stats: {
        totalQueries: stats.totalQueries || 0,
        cacheHitRate: stats.cacheHitRate || "0%",
        monthlyCost: stats.estimatedMonthlyCost || "$0.00"
      }
    });
  } catch (error) {
    console.error("Comparison error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Benchmark endpoint
app.post("/api/benchmark", async (req, res) => {
  try {
    const testCases = [
      { query: "What is AI?", expectMemory: false },
      { query: "My name is Sarah Johnson", expectMemory: false },
      { query: "What's my name?", expectMemory: true },
      { query: "I live in San Francisco", expectMemory: false },
      { query: "Where do I live?", expectMemory: true },
      { query: "My favorite color is blue", expectMemory: false },
      { query: "What's my favorite color?", expectMemory: true }
    ];
    
    const results = [];
    const sessionId = "benchmark-" + Date.now();
    
    for (const test of testCases) {
      console.log(`Testing: ${test.query}`);
      
      const withMemory = await engine.chat(test.query, sessionId);
      
      const standardGemini = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GOOGLE_API_KEY
      });
      const withoutMemory = await standardGemini.invoke(test.query);
      
      const winner = test.expectMemory && withMemory.metadata.memoryTokens > 0 
        ? "Your System" 
        : "Tie";
      
      results.push({
        query: test.query,
        expectMemory: test.expectMemory,
        withMemory: {
          response: withMemory.response,
          hasContext: withMemory.metadata.memoryTokens > 0
        },
        withoutMemory: {
          response: withoutMemory.content,
          hasContext: false
        },
        winner
      });
    }
    
    const stats = costTrackerPlugin.getStats();
    
    res.json({
      results,
      summary: {
        totalTests: results.length,
        yourSystemWins: results.filter(r => r.winner === "Your System").length,
        stats: {
          totalQueries: stats.totalQueries || 0,
          cacheHitRate: stats.cacheHitRate || "0%",
          estimatedMonthlyCost: stats.estimatedMonthlyCost || "$0.00"
        }
      }
    });
  } catch (error) {
    console.error("Benchmark error:", error);
    res.status(500).json({ error: error.message });
  }
});
// Upload and enhance listings
app.post("/api/upload-listings", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📤 Processing file:', req.file.originalname);
    
    // Determine file type
    const fileType = req.file.originalname.split('.').pop().toLowerCase();
    
    // Parse file
    const products = await CSVParser.parseFile(req.file.buffer, fileType);
    
    if (!products || products.length === 0) {
      return res.status(400).json({ error: 'No products found in file' });
    }

    console.log(`📊 Found ${products.length} products`);
    
    // Enhance listings
    const enhanced = await listingEnhancerPlugin.enhanceBatch(products);
    
    // Calculate stats
    const stats = {
      processed: enhanced.length,
      improvements: enhanced.reduce((sum, item) => sum + item.improvements.length, 0),
      timeSaved: Math.round(enhanced.length * 0.5) // Estimate 30 min per product manually
    };
    
    res.json({
      success: true,
      enhanced,
      stats
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stats endpoint
app.get("/api/stats", (req, res) => {
  try {
    const stats = costTrackerPlugin.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/generate-listing", async (req, res) => {
  try {
    const { title, category, features, priceRange, competitorUrl, image } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Product title is required' });
    }

    console.log('🎨 Generating listing for:', title);
    
    const listings = await productGeneratorPlugin.generateListing({
      title,
      category,
      features,
      priceRange,
      competitorUrl,
      image
    });
    
    res.json(listings);
    
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});
// STATIC FILES LAST (serves index.html at root)
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
✅ API Server running on http://localhost:${PORT}

Endpoints:
  GET    /                    - Home page
  GET    /api/health          - Health check
  GET    /api/info            - API info
  GET    /v1/models           - Model list (LobeChat)
  POST   /v1/chat/completions - Chat (LobeChat)
  POST   /api/chat            - Chat (direct)
  POST   /api/compare         - Comparison demo
  POST   /api/benchmark       - Run benchmark
  GET    /api/stats           - Cost statistics

Pages:
  /                   - Home (with menu)
  /upload.html        - Upload & enhance listings
  /chat.html          - Chat interface
  /comparison.html    - Live comparison
  /benchmark.html     - Automated benchmark
  /dashboard.html     - Admin dashboard
  /upload.html        - Upload & enhance listings
`);
});