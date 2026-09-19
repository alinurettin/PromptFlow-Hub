// Token & Cost Estimation Engine for AI Models

// Pricing per 1,000,000 input tokens in USD
const PRICING = {
  'gemini-2.0-flash': {
    name: 'Google Gemini 2.0 Flash',
    inputPerMillion: 0.10,
    outputPerMillion: 0.40,
    avgCharsPerToken: 3.9
  },
  'gpt-4o': {
    name: 'OpenAI GPT-4o',
    inputPerMillion: 2.50,
    outputPerMillion: 10.00,
    avgCharsPerToken: 3.8
  },
  'claude-3.5-sonnet': {
    name: 'Anthropic Claude 3.5 Sonnet',
    inputPerMillion: 3.00,
    outputPerMillion: 15.00,
    avgCharsPerToken: 3.7
  }
};

function estimateTokens(text, avgCharsPerToken = 3.8) {
  if (!text || text.length === 0) return 0;
  return Math.max(1, Math.ceil(text.length / avgCharsPerToken));
}

function estimateCosts(text) {
  const charCount = text ? text.length : 0;
  const wordCount = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const estimates = {};

  for (const [modelKey, model] of Object.entries(PRICING)) {
    const tokens = estimateTokens(text, model.avgCharsPerToken);
    const costPerCall = (tokens / 1000000) * model.inputPerMillion;
    const costPerThousandCalls = costPerCall * 1000;
    const costPerMillionCalls = costPerCall * 1000000;

    estimates[modelKey] = {
      modelName: model.name,
      tokens,
      costPerCall: parseFloat(costPerCall.toFixed(6)),
      costPerThousandCalls: parseFloat(costPerThousandCalls.toFixed(3)),
      costPerMillionCalls: parseFloat(costPerMillionCalls.toFixed(2))
    };
  }

  return {
    charCount,
    wordCount,
    estimates
  };
}

module.exports = {
  PRICING,
  estimateTokens,
  estimateCosts
};
