import { engine } from "./conversation_engine.js";
import { plugins } from "./plugins/plugin_system.js";
import { costTrackerPlugin } from "./plugins/cost_tracker.js";
import { autoSummarizerPlugin } from "./plugins/auto_summarizer.js";
import { multimodalPlugin } from "./plugins/multimodal.js";
import { toolsPlugin } from "./plugins/tools.js";

async function testSystem() {
  console.log("🚀 Starting Gemini Memory System Test\n");

  // Register all plugins
  plugins.registerPlugin("costTracker", costTrackerPlugin);
  plugins.registerPlugin("autoSummarizer", autoSummarizerPlugin);
  plugins.registerPlugin("multimodal", multimodalPlugin);
  plugins.registerPlugin("tools", toolsPlugin);

  // Initialize engine
  await engine.initialize();

  console.log("\n" + "=".repeat(60));
  console.log("TEST 1: Basic Conversation");
  console.log("=".repeat(60));
  
  await engine.chat("Hello! My name is Umair.");
  await engine.chat("What's my name?");
  
  console.log("\n" + "=".repeat(60));
  console.log("TEST 2: Complex Query (should route to better model)");
  console.log("=".repeat(60));
  
  await engine.chat("Explain quantum entanglement in simple terms.");

  console.log("\n" + "=".repeat(60));
  console.log("TEST 3: Cost Tracking Stats");
  console.log("=".repeat(60));
  
  const stats = costTrackerPlugin.getStats();
  console.log(JSON.stringify(stats, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("TEST 4: Tool Usage");
  console.log("=".repeat(60));
  
  const time = toolsPlugin.executeTool("get_current_time", {});
  console.log("Current time:", time);
  
  const calc = toolsPlugin.executeTool("calculate", { expression: "5 * 8 + 2" });
  console.log("Calculation result:", calc);

  console.log("\n✅ All tests completed!\n");
}

testSystem().catch(console.error);