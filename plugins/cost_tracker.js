export const costTrackerPlugin = {
  name: "Cost Tracker",
  costs: [],

  afterQuery: async (result) => {
    costTrackerPlugin.costs.push({
      timestamp: Date.now(),
      model: result.model,
      tokens: result.metadata?.tokens || 0,
      cached: result.metadata?.cached || false
    });

    return result;
  },

  getStats: () => {
    const total = costTrackerPlugin.costs.length;
    if (total === 0) {
      return {
        totalQueries: 0,
        cacheHitRate: "0%",
        avgTokensPerQuery: 0,
        estimatedMonthlyCost: "$0.00"
      };
    }

    const cached = costTrackerPlugin.costs.filter(c => c.cached).length;
    const avgTokens = costTrackerPlugin.costs.reduce((sum, c) => sum + c.tokens, 0) / total;

    return {
      totalQueries: total,
      cacheHitRate: `${((cached / total) * 100).toFixed(1)}%`,
      avgTokensPerQuery: Math.round(avgTokens),
      estimatedMonthlyCost: `$${((total * 0.00075) * 30).toFixed(2)}`
    };
  }
};