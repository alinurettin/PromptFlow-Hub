// PromptFlow-Hub v2.0.0 - Multi-Model Token Economics & Context Budget Engine

// Model Specifications & Official Token Pricing (per 1,000,000 tokens in USD)
const MODEL_REGISTRY = {
  'gemini-2.0-flash': {
    name: 'Google Gemini 2.0 Flash',
    provider: 'Google',
    contextWindow: 1048576, // 1M tokens
    inputPerMillion: 0.10,
    outputPerMillion: 0.40,
    avgCharsPerToken: 3.9
  },
  'gemini-1.5-pro': {
    name: 'Google Gemini 1.5 Pro',
    provider: 'Google',
    contextWindow: 2097152, // 2M tokens
    inputPerMillion: 3.50,
    outputPerMillion: 10.50,
    avgCharsPerToken: 3.9
  },
  'gpt-4o': {
    name: 'OpenAI GPT-4o',
    provider: 'OpenAI',
    contextWindow: 128000,
    inputPerMillion: 2.50,
    outputPerMillion: 10.00,
    avgCharsPerToken: 3.8
  },
  'gpt-4o-mini': {
    name: 'OpenAI GPT-4o Mini',
    provider: 'OpenAI',
    contextWindow: 128000,
    inputPerMillion: 0.15,
    outputPerMillion: 0.60,
    avgCharsPerToken: 3.8
  },
  'claude-3.5-sonnet': {
    name: 'Anthropic Claude 3.5 Sonnet',
    provider: 'Anthropic',
    contextWindow: 200000,
    inputPerMillion: 3.00,
    outputPerMillion: 15.00,
    avgCharsPerToken: 3.7
  }
};

/**
 * Byte-Pair / Subword Token Estimation using language-adaptive heuristic
 */
function estimateTokens(text, avgCharsPerToken = 3.8) {
  if (!text || typeof text !== 'string' || text.length === 0) return 0;
  return Math.max(1, Math.ceil(text.length / avgCharsPerToken));
}

/**
 * Detailed multi-model financial projection & context window consumption
 */
function estimateCosts(text) {
  const charCount = text ? text.length : 0;
  const wordCount = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const lineCount = text ? text.split(/\r?\n/).length : 0;

  const estimates = {};

  for (const [modelKey, model] of Object.entries(MODEL_REGISTRY)) {
    const tokens = estimateTokens(text, model.avgCharsPerToken);
    const costPerCall = (tokens / 1000000) * model.inputPerMillion;
    const costPerThousandCalls = costPerCall * 1000;
    const costPerMillionCalls = costPerCall * 1000000;
    const contextBudgetPercent = parseFloat(((tokens / model.contextWindow) * 100).toFixed(4));

    estimates[modelKey] = {
      modelName: model.name,
      provider: model.provider,
      contextWindow: model.contextWindow,
      tokens,
      contextBudgetPercent,
      costPerCall: parseFloat(costPerCall.toFixed(6)),
      costPerThousandCalls: parseFloat(costPerThousandCalls.toFixed(4)),
      costPerMillionCalls: parseFloat(costPerMillionCalls.toFixed(2))
    };
  }

  return {
    charCount,
    wordCount,
    lineCount,
    estimates
  };
}

module.exports = {
  MODEL_REGISTRY,
  estimateTokens,
  estimateCosts
};
