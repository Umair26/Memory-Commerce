import { engine } from "./conversation_engine.js";
import { costTrackerPlugin } from "./plugins/cost_tracker.js";
import { plugins } from "./plugins/plugin_system.js";

plugins.registerPlugin("cost-tracker", costTrackerPlugin);
await engine.initialize({});

console.log("📊 Running performance benchmarks...\n");

const testQueries = [
  "Hello",
  "What is artificial intelligence?",
  "Tell me a long story about a dragon",
  "What's 25 * 47?",
  "Explain the theory of relativity"
];

console.time("Total Benchmark Time");

for (let i = 0; i < testQueries.length; i++) {
  const query = testQueries[i];
  console.log(`\n${i + 1}. "${query}"`);
  
  console.time(`  Query ${i + 1} time`);
  const result = await engine.chat(query, "benchmark");
  console.timeEnd(`  Query ${i + 1} time`);
  
  console.log(`  Model: ${result.model}`);
  console.log(`  Response length: ${result.response.length} chars`);
  console.log(`  Cached: ${result.metadata.cached ? "✅" : "❌"}`);
}

console.log("\n" + "=".repeat(60));
console.timeEnd("Total Benchmark Time");

const stats = costTrackerPlugin.getStats();
console.log("\n📈 BENCHMARK RESULTS:");
console.log(`  Total Queries: ${stats.totalQueries}`);
console.log(`  Cache Hit Rate: ${stats.cacheHitRate}`);
console.log(`  Avg Tokens/Query: ${stats.avgTokensPerQuery}`);
console.log(`  Est. Cost: ${stats.estimatedMonthlyCost}/month\n`);

process.exit(0);