export const toolsPlugin = {
  name: "Tools",
  
  tools: [
    {
      name: "get_current_time",
      description: "Get the current time and date",
      parameters: {},
      function: () => new Date().toISOString()
    },
    {
      name: "calculate",
      description: "Perform mathematical calculation",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "Math expression to evaluate" }
        }
      },
      function: (args) => {
        try {
          // Basic math operations only for safety
          const sanitized = args.expression.replace(/[^0-9+\-*/().]/g, '');
          return Function('"use strict"; return (' + sanitized + ')')();
        } catch (e) {
          return "Invalid expression";
        }
      }
    },
    {
      name: "web_search",
      description: "Search the web for information",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" }
        }
      },
      function: async (args) => {
        return `Search results for: ${args.query} (integrate with search API)`;
      }
    }
  ],

  getToolDefinitions() {
    return this.tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  },

  executeTool(name, args) {
    const tool = this.tools.find(t => t.name === name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    return tool.function(args);
  }
};