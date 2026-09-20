// PromptFlow-Hub v2.0.0 - Version-Controlled Prompt Registry & Store
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
      id: 'prm_customer_support',
      title: 'Customer Support Assistant',
      description: 'System instruction for multi-turn customer support with tone guardrails',
      tags: ['support', 'customer-service', 'guardrails'],
      initialContent: `You are an empathetic, concise customer support agent for {{company_name:Acme Cloud}}.
Always greet the customer politely.
Do not make promises regarding refunds without checking {{policy_url:https://help.example.com/refunds}}.
Context details:
{{customer_context:No previous tickets}}`
    });

    this.createPrompt({
      id: 'prm_code_reviewer',
      title: 'Senior Code Reviewer & Security Auditor',
      description: 'Principal engineer level code review prompt with OWASP Top 10 guidelines',
      tags: ['coding', 'review', 'security', 'ast'],
      initialContent: `You are a Principal Software Architect conducting critical code reviews.
Analyze the following {{language:javascript}} source code for:
1. Algorithmic efficiency (Time/Space Complexity O(N))
2. Security vulnerabilities (OWASP Top 10, Injection, Secret Leakage)
3. Idiomatic design patterns and type safety

Code to inspect:
\`\`\`{{language:javascript}}
{{source_code}}
\`\`\``
    });
  }

  computeHash(content) {
    return crypto.createHash('sha256').update(content || '', 'utf8').digest('hex').substring(0, 12);
  }

  createPrompt(data) {
    const id = data.id || `prm_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const content = data.initialContent || '';
    const metrics = estimateCosts(content);
    const variables = extractVariables(content);
    const commitHash = this.computeHash(content + timestamp);

    const initialVersion = {
      version: 'v1.0.0',
      commitHash,
      content,
      changelog: 'Initial version creation',
      timestamp,
      variables,
      charCount: metrics.charCount,
      estimatedTokens: metrics.estimates['gpt-4o'].tokens,
      metrics
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
    const commitHash = this.computeHash(newContent + timestamp);

    const newVersion = {
      version: versionTag,
      commitHash,
      content: newContent,
      changelog,
      timestamp,
      variables,
      charCount: metrics.charCount,
      estimatedTokens: metrics.estimates['gpt-4o'].tokens,
      metrics
    };

    prompt.versions.push(newVersion);
    prompt.currentVersion = versionTag;
    prompt.activeContent = newContent;
    prompt.updatedAt = timestamp;

    return prompt;
  }

  rollback(id, targetVersion) {
    const prompt = this.prompts.get(id);
    if (!prompt) return null;

    const versionObj = prompt.versions.find(v => v.version === targetVersion || v.commitHash === targetVersion);
    if (!versionObj) return null;

    // Rollback creates a new version referencing the target content
    return this.addVersion(id, versionObj.content, `Rollback to ${versionObj.version} (${versionObj.commitHash})`);
  }

  getAll() {
    return Array.from(this.prompts.values());
  }

  get(id) {
    return this.prompts.get(id) || null;
  }

  delete(id) {
    return this.prompts.delete(id);
  }
}

module.exports = {
  PromptStore,
  defaultStore: new PromptStore()
};
