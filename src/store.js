// Version-Controlled Prompt Storage
const crypto = require('crypto');
const { estimateCosts } = require('./estimator');
const { extractVariables } = require('./diff');

class PromptStore {
  constructor() {
    this.prompts = new Map();
    this.initDefaults();
  }

  initDefaults() {
    this.createPrompt({
      title: 'Customer Support Assistant',
      description: 'System instruction for multi-turn customer support with tone guardrails',
      tags: ['support', 'customer-service', 'system-prompt'],
      initialContent: `You are an empathetic, concise customer support agent for {{company_name}}.
Always greet the customer politely.
Do not make promises regarding refunds without checking {{policy_url}}.
Context details:
{{customer_context}}`
    });

    this.createPrompt({
      title: 'Code Reviewer & Refactor Agent',
      description: 'Strict senior engineer code review prompt with security guidelines',
      tags: ['coding', 'review', 'security'],
      initialContent: `You are a Principal Software Architect conducting code reviews.
Analyze the following code for:
1. Algorithmic efficiency (time/space complexity)
2. Security vulnerabilities (OWASP Top 10)
3. Idiomatic design patterns
Code to review:
\`\`\`{{language}}
{{source_code}}
\`\`\``
    });
  }

  createPrompt(data) {
    const id = `prm-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const content = data.initialContent || '';
    const metrics = estimateCosts(content);
    const variables = extractVariables(content);

    const initialVersion = {
      version: 'v1.0.0',
      content,
      changelog: 'Initial version creation',
      timestamp,
      variables,
      charCount: metrics.charCount,
      estimatedTokens: metrics.estimates['gpt-4o'].tokens
    };

    const prompt = {
      id,
      title: data.title || 'Untitled Prompt',
      description: data.description || '',
      tags: data.tags || [],
      currentVersion: 'v1.0.0',
      activeContent: content,
      versions: [initialVersion],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.prompts.set(id, prompt);
    return prompt;
  }

  addVersion(id, newContent, changelog = 'Version update') {
    const prompt = this.prompts.get(id);
    if (!prompt) return null;

    const vNum = prompt.versions.length + 1;
    const versionTag = `v1.${vNum - 1}.0`;
    const timestamp = new Date().toISOString();
    const metrics = estimateCosts(newContent);
    const variables = extractVariables(newContent);

    const newVersion = {
      version: versionTag,
      content: newContent,
      changelog,
      timestamp,
      variables,
      charCount: metrics.charCount,
      estimatedTokens: metrics.estimates['gpt-4o'].tokens
    };

    prompt.versions.push(newVersion);
    prompt.currentVersion = versionTag;
    prompt.activeContent = newContent;
    prompt.updatedAt = timestamp;

    return prompt;
  }

  getAll() {
    return Array.from(this.prompts.values());
  }

  get(id) {
    return this.prompts.get(id);
  }

  delete(id) {
    return this.prompts.delete(id);
  }
}

module.exports = new PromptStore();
