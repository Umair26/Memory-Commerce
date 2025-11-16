import { ChromaClient } from "chromadb";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import dotenv from "dotenv";
dotenv.config();

async function testChroma() {
  try {
    console.log("🔌 Connecting to ChromaDB...");
    
    // Create embeddings function
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "text-embedding-004",
      apiKey: process.env.GOOGLE_API_KEY,
    });
    
    const client = new ChromaClient({
      path: process.env.CHROMA_URL || "https://api.trychroma.com",
      auth: {
        provider: "token",
        credentials: process.env.CHROMA_API_KEY
      },
      tenant: process.env.CHROMA_TENANT,
      database: process.env.CHROMA_DATABASE
    });

    console.log("✅ ChromaDB client created");
    
    // Get or create collection WITHOUT default embeddings
    const collection = await client.getOrCreateCollection({
      name: "test_collection",
      metadata: { description: "Test collection" },
      embeddingFunction: {
        generate: async (texts) => {
          const embedResult = await embeddings.embedDocuments(texts);
          return embedResult;
        }
      }
    });
    
    console.log("✅ Collection created/retrieved");
    
    // Add test data
    await collection.add({
      ids: ["test1"],
      documents: ["This is a test document"],
      metadatas: [{ source: "test" }]
    });
    
    console.log("✅ Test data added to ChromaDB!");
    
    // Query it back
    const results = await collection.query({
      queryTexts: ["test"],
      nResults: 1
    });
    
    console.log("✅ Query successful:", results);
    console.log("\n🎉 ChromaDB is working perfectly!");
    
  } catch (error) {
    console.error("❌ ChromaDB Error:", error.message);
    console.error("Full error:", error);
  }
}

testChroma();