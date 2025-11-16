import { model } from "../gemini_memory_system.js";

export const autoSummarizerPlugin = {
  name: "Auto Summarizer",
  messageCount: 0,
  summaryInterval: 20,

  onMemorySave: async (conversation) => {
    autoSummarizerPlugin.messageCount++;

    if (autoSummarizerPlugin.messageCount >= autoSummarizerPlugin.summaryInterval) {
      console.log("\n📝 Auto-summarizing last 20 messages...");
      
      try {
        const summary = await model.invoke(
          `Create a concise summary preserving key facts, relationships, and events:\n\n${conversation}`
        );

        autoSummarizerPlugin.messageCount = 0;

        console.log("✅ Summary created");
        return conversation + `\n\n[SUMMARY: ${summary.content}]`;
      } catch (error) {
        console.log("⚠️ Summarization failed:", error.message);
      }
    }

    return conversation;
  }
};