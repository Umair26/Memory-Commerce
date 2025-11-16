const dotenv = require("dotenv");
dotenv.config();

async function testAPI() {
  const apiKey = process.env.GOOGLE_API_KEY;
  console.log("Testing API key:", apiKey ? "***" + apiKey.slice(-4) : "MISSING");
  
  // Test with the Google Generative AI REST API directly
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log("\n✅ API Key is valid!\n");
      console.log("Available models:");
      data.models.forEach(model => {
        if (model.name.includes('gemini')) {
          console.log(`  - ${model.name}`);
        }
      });
    } else {
      console.error("\n❌ API Error:", data);
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

testAPI();