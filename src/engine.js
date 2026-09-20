// PromptFlow-Hub v2.0.0 - Core LLMOps & Prompt Orchestration Engine
const { extractVariables, interpolateVariables, computeLineDiff, computeLCS } = require('./diff');
const { MODEL_REGISTRY, estimateTokens, estimateCosts } = require('./estimator');
const { PromptStore, defaultStore } = require('./store');

class PromptEngine {
  constructor(store = defaultStore) {
    this.store = store;
  }

  render(template, vars = {}) {
    return interpolateVariables(template, vars);
  }

  extractVars(text) {
    return extractVariables(text);
  }

  estimateTokens(text, model = 'gpt-4o') {
    const config = MODEL_REGISTRY[model];
    const avgChars = config ? config.avgCharsPerToken : 3.8;
    return estimateTokens(text, avgChars);
  }

  calculateCost(tokens, model = 'gpt-4o') {
    const config = MODEL_REGISTRY[model] || MODEL_REGISTRY['gpt-4o'];
    const rate = config.inputPerMillion / 1000000;
    return parseFloat((tokens * rate).toFixed(6));
  }

  estimateAllCosts(text) {
    return estimateCosts(text);
  }

  diff(oldText, newText) {
    return computeLineDiff(oldText, newText);
  }
}

module.exports = PromptEngine;