import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export const multimodalPlugin = {
  name: "Multimodal",

  async processImage(imagePath, prompt) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});
    
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString("base64");

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      },
      prompt
    ]);

    return result.response.text();
  },

  async processAudio(audioPath, prompt) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const audioData = fs.readFileSync(audioPath);
    const base64Audio = audioData.toString("base64");

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "audio/mp3",
          data: base64Audio
        }
      },
      prompt || "Transcribe this audio"
    ]);

    return result.response.text();
  }
};