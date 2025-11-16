class PluginSystem {
  constructor() {
    this.plugins = new Map();
    this.hooks = {
      beforeQuery: [],
      afterQuery: [],
      onMemorySave: [],
      onModelRoute: []
    };
  }

  registerPlugin(name, plugin) {
    this.plugins.set(name, plugin);
    
    if (plugin.beforeQuery) this.hooks.beforeQuery.push(plugin.beforeQuery);
    if (plugin.afterQuery) this.hooks.afterQuery.push(plugin.afterQuery);
    if (plugin.onMemorySave) this.hooks.onMemorySave.push(plugin.onMemorySave);
    if (plugin.onModelRoute) this.hooks.onModelRoute.push(plugin.onModelRoute);
    
    console.log(`🔌 Plugin registered: ${name}`);
  }

  async executeHook(hookName, data) {
    const hooks = this.hooks[hookName] || [];
    let result = data;
    
    for (const hook of hooks) {
      result = await hook(result);
    }
    
    return result;
  }

  getPlugin(name) {
    return this.plugins.get(name);
  }

  listPlugins() {
    return Array.from(this.plugins.keys());
  }
}

const plugins = new PluginSystem();
export { PluginSystem, plugins };