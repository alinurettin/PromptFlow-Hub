class PromptEngine {
  render(template, vars = {}) {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      return vars[key] !== undefined ? vars[key] : match;
    });
  }
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }
  calculateCost(tokens, model = 'gpt-4o') {
    const rates = {
      'gpt-4o': 0.005 / 1000,
      'gemini-1.5-pro': 0.0035 / 1000,
      'gemini-1.5-flash': 0.00035 / 1000,
      'claude-3-5-sonnet': 0.003 / 1000
    };
    const rate = rates[model] || rates['gpt-4o'];
    return parseFloat((tokens * rate).toFixed(6));
  }
}
module.exports = PromptEngine;