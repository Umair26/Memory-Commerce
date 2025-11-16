import { engine } from "../conversation_engine.js";
import { costTrackerPlugin } from "../plugins/cost_tracker.js";
import { plugins } from "../plugins/plugin_system.js";
import assert from "assert";

plugins.registerPlugin("cost-tracker", costTrackerPlugin);
await engine.initialize({});

console.log("🧪 Running system tests...\n");

// Test 1: Basic conversation
console.log("Test 1: Basic Conversation");
const result1 = await engine.chat("Hello, how are you?", "test1");
assert(result1.response.length > 0, "Response should not be empty");
console.log("✅ PASSED\n");

// Test 2: Memory persistence
console.log("Test 2: Memory Persistence");
await engine.chat("My favorite color is blue", "test2");
const result2 = await engine.chat("What is my favorite color?", "test2");
assert(result2.response.toLowerCase().includes("blue"), "Should remember favorite color");
console.log("✅ PASSED\n");

// Test 3: Model routing
console.log("Test 3: Smart Model Routing");
const simple = await engine.chat("What is 2+2?", "test3");
assert(simple.model.includes("Flash"), "Simple query should use Flash model");

const complex = await engine.chat("Explain quantum entanglement in detail", "test3");
assert(
  complex.model.includes("Pro") || complex.model.includes("Thinking"), 
  "Complex query should use Pro/Thinking"
);
console.log("✅ PASSED\n");

// Test 4: Cost tracking
console.log("Test 4: Cost Tracking");
const stats = costTrackerPlugin.getStats();
assert(stats.totalQueries > 0, "Should track queries");
console.log(`  Total queries tracked: ${stats.totalQueries}`);
console.log("✅ PASSED\n");

console.log("🎉 All tests passed!");
process.exit(0);