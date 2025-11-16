const dotenv = require("dotenv");
dotenv.config();
const fs = require("fs");
const path = require("path");

// Debug: Check if .env loaded
console.log("Environment check:");
console.log("GOOGLE_API_KEY exists:", !!process.env.GOOGLE_API_KEY);
console.log("GOOGLE_API_KEY value:", process.env.GOOGLE_API_KEY ? "***" + process.env.GOOGLE_API_KEY.slice(-4) : "MISSING");
console.log("Current directory:", __dirname);
console.log("---");

const { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { BufferMemory } = require("@langchain/core/memory");
const { ChatPromptTemplate, MessagesPlaceholder } = require("@langchain/core/prompts");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");

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
  // Check if API key exists
  if (!process.env.GOOGLE_API_KEY) {
    console.error("❌ Error: GOOGLE_API_KEY not found in .env file");
    console.error("Please create a .env file with: GOOGLE_API_KEY=your_key_here");
    process.exit(1);
  }

  const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-2.5-flash",  // Updated to available model
    temperature: 0.7,
  });

  // Load chat history
  const past = loadChatHistory();
  
  // Convert chat history to messages
  const chatHistory = [];
  if (past.length > 0) {
    console.log(`\n🧠 Loaded ${past.length} previous messages.\n`);
    for (const msg of past) {
      chatHistory.push(new HumanMessage(msg.input));
      chatHistory.push(new AIMessage(msg.output));
    }
  }

  const userInput = process.argv.slice(2).join(" ") || "Hello, who are you?";
  
  // Create a simple prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are an assistant with long-term memory. Remember information from previous conversations."],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
  ]);

  // Create the chain
  const chain = prompt.pipe(llm);
  
  // Invoke the chain with chat history
  const response = await chain.invoke({
    input: userInput,
    chat_history: chatHistory,
  });

  const responseText = response.content;
  console.log("\nGemini:", responseText, "\n");

  // Save to history
  past.push({ input: userInput, output: responseText });
  saveChatHistory(past);
  console.log(`💾 Memory updated (${past.length} messages stored).`);
}

main().catch(console.error);