// plugins/analytics.js
export const analyticsPlugin = {
  name: "Analytics",
  stats: {
    totalMessages: 0,
    avgResponseTime: 0,
    popularTopics: []
  },
  
  afterQuery: async (result) => {
    analyticsPlugin.stats.totalMessages++;
    // Track topics, response times, etc.
    return result;
  }
};