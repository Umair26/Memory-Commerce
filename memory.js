import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings
} from "@langchain/google-genai";

import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Environment check:");
console.log("GOOGLE_API_KEY exists:", !!process.env.GOOGLE_API_KEY);
console.log(
  "GOOGLE_API_KEY value:",
  process.env.GOOGLE_API_KEY ? "***" + process.env.GOOGLE_API_KEY.slice(-4) : "MISSING"
);
console.log("Current directory:", __dirname);
console.log("---");

const MEMORY_PATH = path.join(__dirname, "persistent_memory");
const CHAT_LOG_FILE = path.join(MEMORY_PATH, "chat_history.json");

if (!fs.existsSync(MEMORY_PATH)) fs.mkdirSync(MEMORY_PATH);

function loadChatHistory() {
  if (!fs.existsSync(CHAT_LOG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(CHAT_LOG_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveChatHistory(chatHistory) {
  fs.writeFileSync(CHAT_LOG_FILE, JSON.stringify(chatHistory, null, 2));
}

async function main() {
  if (!process.env.GOOGLE_API_KEY) {
    console.error("❌ Error: GOOGLE_API_KEY not found in .env file");
    process.exit(1);
  }

  const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-2.5-flash",
    temperature: 0.7,
  });

  const past = loadChatHistory();
  const chatHistory = [];

  if (past.length > 0) {
    console.log(`🧠 Loaded ${past.length} previous messages.\n`);
    for (const msg of past) {
      chatHistory.push(new HumanMessage(msg.input));
      chatHistory.push(new AIMessage(msg.output));
    }
  }

  const userInput = process.argv.slice(2).join(" ") || "Hello, who are you?";

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are an assistant with long-term memory."],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  const chain = prompt.pipe(llm);

  const response = await chain.invoke({
    input: userInput,
    chat_history: chatHistory,
  });

  const responseText = response.content;
  console.log("\nGemini:", responseText, "\n");

  past.push({ input: userInput, output: responseText });
  saveChatHistory(past);

  console.log(`💾 Memory updated (${past.length} messages stored).`);
}

main().catch(console.error);
