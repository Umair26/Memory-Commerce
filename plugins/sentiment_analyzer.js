// plugins/sentiment_analyzer.js
export const sentimentPlugin = {
  name: "Sentiment Analyzer",
  
  afterQuery: async (result) => {
    // Analyze sentiment of response
    const sentiment = analyzeSentiment(result.response);
    return {
      ...result,
      sentiment
    };
  }
};