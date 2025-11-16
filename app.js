import { engine } from "./conversation_engine.js";
import { plugins } from "./plugins/plugin_system.js";
import { costTrackerPlugin } from "./plugins/cost_tracker.js";
import { autoSummarizerPlugin } from "./plugins/auto_summarizer.js";
import { multimodalPlugin } from "./plugins/multimodal.js";
import { toolsPlugin } from "./plugins/tools.js";
import readline from "readline";
import fs from "fs";

// Load game world data (if exists)
let worldData = {};
if (fs.existsSync("./game_world.json")) {
  worldData = JSON.parse(fs.readFileSync("./game_world.json", "utf-8"));
}

// Register plugins
plugins.registerPlugin("cost-tracker", costTrackerPlugin);
plugins.registerPlugin("auto-summarizer", autoSummarizerPlugin);
plugins.registerPlugin("multimodal", multimodalPlugin);
plugins.registerPlugin("tools", toolsPlugin);

// Initialize engine
await engine.initialize(worldData);

// Create CLI interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
╔════════════════════════════════════════════════════════════════╗
║          GEMINI-POWERED AI PLATFORM - READY 🚀                 ║
║                                                                ║
║  Features:                                                     ║
║  ✅ 3-Tier Persistent Memory (Hot/Warm/Cold)                  ║
║  ✅ Implicit Caching (75% cost savings)                       ║
║  ✅ Smart Model Routing (Flash/Pro/Thinking)                  ║
║  ✅ Multimodal Support (Images, Audio, Video)                 ║
║  ✅ Function Calling & Tools                                  ║
║  ✅ Auto-Summarization                                        ║
║                                                                ║
║  Commands:                                                     ║
║  - Type your message to chat                                   ║
║  - /image <path> - Analyze image                              ║
║  - /audio <path> - Transcribe audio                           ║
║  - /stats - View cost statistics                              ║
║  - /history - View session history                            ║
║  - /clear - Clear session                                     ║
║  - /exit - Quit                                               ║
╚════════════════════════════════════════════════════════════════╝
`);

const prompt = () => {
  rl.question("\n💬 You: ", async (input) => {
    input = input.trim();
    
    if (!input) {
      prompt();
      return;
    }

    // Handle commands
    if (input.startsWith("/")) {
      const [cmd, ...args] = input.split(" ");
      
      switch (cmd) {
        case "/image":
          if (!args[0]) {
            console.log("❌ Please provide image path: /image <path>");
          } else {
            try {
              const imageResult = await multimodalPlugin.processImage(
                args[0], 
                "Describe this image"
              );
              console.log(`\n🤖 GEMINI: ${imageResult}\n`);
            } catch (error) {
              console.log(`❌ Error: ${error.message}`);
            }
          }
          break;

        case "/audio":
          if (!args[0]) {
            console.log("❌ Please provide audio path: /audio <path>");
          } else {
            try {
              const audioResult = await multimodalPlugin.processAudio(args[0]);
              console.log(`\n🤖 GEMINI: ${audioResult}\n`);
            } catch (error) {
              console.log(`❌ Error: ${error.message}`);
            }
          }
          break;

        case "/stats":
          const stats = costTrackerPlugin.getStats();
          console.log("\n📊 COST STATISTICS:");
          console.log(`  Total Queries: ${stats.totalQueries}`);
          console.log(`  Cache Hit Rate: ${stats.cacheHitRate}`);
          console.log(`  Avg Tokens/Query: ${stats.avgTokensPerQuery}`);
          console.log(`  Est. Monthly Cost: ${stats.estimatedMonthlyCost}\n`);
          break;

        case "/history":
          const history = await engine.getSessionHistory("default");
          console.log("\n📜 SESSION HISTORY:");
          history.forEach((msg, i) => console.log(`${i + 1}. ${msg}`));
          console.log();
          break;

        case "/clear":
          await engine.clearSession("default");
          break;

        case "/exit":
          console.log("\n👋 Goodbye!\n");
          process.exit(0);

        default:
          console.log("❌ Unknown command");
      }
      
      prompt();
      return;
    }

    // Regular chat
    try {
      await engine.chat(input, "default");
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}\n`);
    }

    prompt();
  });
};

// Start conversation loop
prompt();