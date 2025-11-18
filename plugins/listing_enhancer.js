import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

class ListingEnhancerPlugin {
  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      temperature: 0.7,
      apiKey: process.env.GOOGLE_API_KEY,
    });
  }

  async enhanceListing(product) {
    const prompt = `You are an expert e-commerce copywriter. Enhance this product listing:

ORIGINAL LISTING:
Title: ${product.title || 'N/A'}
Description: ${product.description || 'N/A'}
Price: ${product.price || 'N/A'}
Category: ${product.category || 'N/A'}

TASK:
1. Create a compelling, SEO-optimized title (max 150 characters)
2. Write a detailed, persuasive description (150-300 words)
3. Generate 10 relevant SEO keywords
4. Suggest optimal price range
5. Recommend best category
6. List 5 key features/benefits

Return ONLY a JSON object with this structure:
{
  "title": "enhanced title",
  "description": "enhanced description",
  "keywords": ["keyword1", "keyword2", ...],
  "suggestedPrice": "price range",
  "category": "best category",
  "features": ["feature1", "feature2", ...]
}`;

    try {
      const response = await this.model.invoke(prompt);
      let content = response.content.trim();
      
      // Remove markdown code blocks if present
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const enhanced = JSON.parse(content);
      
      return {
        enhanced,
        improvements: this.detectImprovements(product, enhanced)
      };
    } catch (error) {
      console.error('Enhancement error:', error);
      throw new Error('Failed to enhance listing: ' + error.message);
    }
  }

  detectImprovements(original, enhanced) {
    const improvements = [];
    
    if (enhanced.title && enhanced.title !== original.title) {
      improvements.push('Better Title');
    }
    if (enhanced.description && enhanced.description.length > (original.description?.length || 0)) {
      improvements.push('Enhanced Description');
    }
    if (enhanced.keywords && enhanced.keywords.length > 0) {
      improvements.push('SEO Keywords');
    }
    if (enhanced.features && enhanced.features.length > 0) {
      improvements.push('Features Added');
    }
    if (enhanced.suggestedPrice) {
      improvements.push('Price Optimized');
    }
    
    return improvements;
  }

  async enhanceBatch(products) {
    const results = [];
    
    for (let i = 0; i < products.length; i++) {
      console.log(`Enhancing product ${i + 1}/${products.length}...`);
      
      try {
        const result = await this.enhanceListing(products[i]);
        results.push({
          original: products[i],
          ...result
        });
      } catch (error) {
        console.error(`Error enhancing product ${i + 1}:`, error);
        results.push({
          original: products[i],
          enhanced: products[i],
          improvements: [],
          error: error.message
        });
      }
    }
    
    return results;
  }
}

export const listingEnhancerPlugin = new ListingEnhancerPlugin();