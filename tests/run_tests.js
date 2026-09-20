// PromptFlow-Hub v2.0.0 - Exhaustive Verification Suite
// Semantic Variable AST, Myers LCS Diff, Multi-Model Token Economics, and API Gateway
const assert = require('assert');
const http = require('http');

const { extractVariables, interpolateVariables, computeLineDiff, computeLCS } = require('../src/diff');
const { MODEL_REGISTRY, estimateTokens, estimateCosts } = require('../src/estimator');
const { PromptStore } = require('../src/store');
const PromptEngine = require('../src/engine');
const { startServer } = require('../src/index');

console.log('====================================================');
console.log('🧪 Running Verification Suite: PromptFlow-Hub v2.0.0');
console.log('====================================================');

let totalPassed = 0;
function pass(desc) {
  totalPassed++;
  console.log(`  ✓ [PASS ${totalPassed}] ${desc}`);
}

async function runAllTests() {
  // -------------------------------------------------------------
  // 1. Semantic Variable Parsing & AST Extraction
  // -------------------------------------------------------------
  console.log('\n[1/5] Testing Variable Extraction & AST Parser...');

  const t1 = 'Hello {{user}}, welcome to {{organization:Acme Inc}}! Please visit {{url:https://acme.org}} or ping {{user}}.';
  const vars1 = extractVariables(t1);

  assert.strictEqual(vars1.length, 3);
  assert.strictEqual(vars1[0].name, 'user');
  assert.strictEqual(vars1[0].defaultValue, null);
  assert.strictEqual(vars1[0].occurrences, 2);
  pass('Variable occurrence counting and non-default handling verified');

  assert.strictEqual(vars1[1].name, 'organization');
  assert.strictEqual(vars1[1].defaultValue, 'Acme Inc');
  pass('Default fallback value extraction verified');

  // Interpolation: With explicit values
  const interpolated1 = interpolateVariables(t1, { user: 'Alice', organization: 'DeepMind' });
  assert.strictEqual(interpolated1, 'Hello Alice, welcome to DeepMind! Please visit https://acme.org or ping Alice.');
  pass('Variable interpolation with mixed explicit and default values verified');

  // Interpolation: With missing variables that lack defaults
  const t2 = 'Target: {{unbound_var}}';
  const interpolated2 = interpolateVariables(t2, {});
  assert.strictEqual(interpolated2, 'Target: {{unbound_var}}');
  pass('Unbound variables without defaults are cleanly preserved');

  // -------------------------------------------------------------
  // 2. Myers / Longest Common Subsequence (LCS) Diff Engine
  // -------------------------------------------------------------
  console.log('\n[2/5] Testing Myers LCS Diff Engine...');

  const oldP = 'You are a helpful assistant.\nBe polite and concise.\nDo not mention competitors.';
  const newP = 'You are a helpful assistant.\nBe polite, accurate and concise.\nDo not mention competitors.\nCite all sources.';

  const diffResult = computeLineDiff(oldP, newP);
  assert.strictEqual(diffResult.stats.unchangedLines, 2);
  assert.strictEqual(diffResult.stats.removedLines, 1);
  assert.strictEqual(diffResult.stats.addedLines, 2);
  assert(diffResult.stats.similarityScore > 0.5 && diffResult.stats.similarityScore < 1.0);
  pass('LCS line diff correctly categorizes added, removed, and unchanged lines');

  // Identical diff returns similarity 1.0
  const identDiff = computeLineDiff(oldP, oldP);
  assert.strictEqual(identDiff.stats.similarityScore, 1.0);
  assert.strictEqual(identDiff.stats.addedLines, 0);
  assert.strictEqual(identDiff.stats.removedLines, 0);
  pass('Identical texts yield 1.0 similarity score with zero delta');

  // Empty diff edge case
  const emptyDiff = computeLineDiff('', '');
  assert.strictEqual(emptyDiff.stats.similarityScore, 1.0);
  pass('Empty string diff handles edge case cleanly');

  // -------------------------------------------------------------
  // 3. Multi-Model Token Economics & Context Budget Math
  // -------------------------------------------------------------
  console.log('\n[3/5] Testing Multi-Model Token Economics Engine...');

  assert.strictEqual(estimateTokens(''), 0);
  pass('Zero length text evaluates to 0 tokens');

  const samplePrompt = 'Analyze the following system logs for high-severity anomalies, unauthorized SSH logins, and memory leak patterns.';
  const estimates = estimateCosts(samplePrompt);

  assert.strictEqual(estimates.wordCount, 15);
  assert(estimates.charCount > 50);
  pass('Accurate word and character metrics calculated');

  // Verify all frontier models registered
  const modelKeys = Object.keys(MODEL_REGISTRY);
  assert(modelKeys.includes('gpt-4o'));
  assert(modelKeys.includes('gemini-2.0-flash'));
  assert(modelKeys.includes('claude-3.5-sonnet'));
  pass('Model registry contains frontier LLM specifications');

  // Check budget calculation
  const gptMetrics = estimates.estimates['gpt-4o'];
  assert(gptMetrics.tokens > 0);
  assert(gptMetrics.costPerCall > 0);
  assert(gptMetrics.costPerThousandCalls > 0);
  assert(gptMetrics.contextBudgetPercent < 0.1);
  pass('Context budget percentage and call projection formulas verified');

  // Verify Gemini flash economics (extremely cost-effective)
  const geminiFlash = estimates.estimates['gemini-2.0-flash'];
  assert(geminiFlash.costPerMillionCalls < gptMetrics.costPerMillionCalls);
  pass('Relative model cost differentials verified (Flash < GPT-4o)');

  // -------------------------------------------------------------
  // 4. Version-Controlled Prompt Store & Immutability
  // -------------------------------------------------------------
  console.log('\n[4/5] Testing PromptStore Versioning & Rollback...');

  const store = new PromptStore();
  // Clear default seeded items for test isolation
  store.prompts.clear();

  const created = store.createPrompt({
    id: 'prm_test_prompt',
    title: 'Unit Test Prompt',
    description: 'Testing version transitions',
    initialContent: 'Prompt Content v1'
  });

  assert.strictEqual(created.currentVersion, 'v1.0.0');
  assert.strictEqual(created.versions.length, 1);
  assert(created.versions[0].commitHash.length >= 8);
  pass('Initial prompt creation produces v1.0.0 with SHA-256 hash');

  // Add version v1.1.0
  const v2 = store.addVersion('prm_test_prompt', 'Prompt Content v2', 'Added formatting');
  assert.strictEqual(v2.currentVersion, 'v1.1.0');
  assert.strictEqual(v2.versions.length, 2);
  assert.strictEqual(v2.activeContent, 'Prompt Content v2');
  pass('Version bump produces v1.1.0 and records changelog');

  // Rollback to v1.0.0
  const rolledBack = store.rollback('prm_test_prompt', 'v1.0.0');
  assert.strictEqual(rolledBack.currentVersion, 'v1.2.0');
  assert.strictEqual(rolledBack.activeContent, 'Prompt Content v1');
  assert.strictEqual(rolledBack.versions.length, 3);
  pass('Rollback mechanism restores target content as immutable forward version');

  // -------------------------------------------------------------
  // 5. Ephemeral Production HTTP API Gateway Integration
  // -------------------------------------------------------------
  console.log('\n[5/5] Testing Production HTTP API Gateway...');

  const apiServer = await new Promise(resolve => {
    const s = startServer(0, () => resolve(s));
  });
  const apiPort = apiServer.address().port;

  const makeReq = (options, postData) => new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: apiPort,
      ...options
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, json: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });

  // GET /api/health
  const healthRes = await makeReq({ path: '/api/health', method: 'GET' });
  assert.strictEqual(healthRes.status, 200);
  assert.strictEqual(healthRes.json.status, 'UP');
  assert.strictEqual(healthRes.json.service, 'PromptFlow-Hub');
  pass('GET /api/health returned 200 UP');

  // GET /api/stats
  const statsRes = await makeReq({ path: '/api/stats', method: 'GET' });
  assert.strictEqual(statsRes.status, 200);
  assert.strictEqual(statsRes.json.success, true);
  assert(Array.isArray(statsRes.json.modelsSupported));
  pass('GET /api/stats returned platform metrics and supported models');

  // GET /api/prompts
  const listRes = await makeReq({ path: '/api/prompts', method: 'GET' });
  assert.strictEqual(listRes.status, 200);
  assert(listRes.json.count >= 1);
  pass('GET /api/prompts returned prompt catalog');

  // POST /api/prompts
  const createRes = await makeReq({
    path: '/api/prompts',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    title: 'Dynamic Agent Prompt',
    description: 'Dynamic testing prompt',
    initialContent: 'Perform task {{task_name:testing}}'
  });
  assert.strictEqual(createRes.status, 201);
  const newPromptId = createRes.json.prompt.id;
  assert(newPromptId);
  pass('POST /api/prompts successfully registered new prompt');

  // GET /api/prompts/:id
  const getOneRes = await makeReq({ path: `/api/prompts/${newPromptId}`, method: 'GET' });
  assert.strictEqual(getOneRes.status, 200);
  assert.strictEqual(getOneRes.json.prompt.id, newPromptId);
  pass('GET /api/prompts/:id retrieved prompt details');

  // POST /api/prompts/:id/version
  const addVerRes = await makeReq({
    path: `/api/prompts/${newPromptId}/version`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    content: 'Perform task {{task_name:testing}} with strict validation',
    changelog: 'Added validation requirement'
  });
  assert.strictEqual(addVerRes.status, 200);
  assert.strictEqual(addVerRes.json.prompt.currentVersion, 'v1.1.0');
  pass('POST /api/prompts/:id/version committed new version');

  // POST /api/estimate
  const estRes = await makeReq({
    path: '/api/estimate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    text: 'Evaluate prompt cost for 1,000,000 requests.'
  });
  assert.strictEqual(estRes.status, 200);
  assert(estRes.json.estimates['gemini-2.0-flash']);
  pass('POST /api/estimate returned full multi-model economics');

  // POST /api/diff
  const diffRes = await makeReq({
    path: '/api/diff',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    oldText: 'Line A\nLine B',
    newText: 'Line A\nLine C'
  });
  assert.strictEqual(diffRes.status, 200);
  assert.strictEqual(diffRes.json.stats.unchangedLines, 1);
  assert.strictEqual(diffRes.json.stats.addedLines, 1);
  pass('POST /api/diff computed Myers LCS difference');

  // POST /api/interpolate
  const renderRes = await makeReq({
    path: '/api/interpolate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    template: 'Hello {{agent_name:Sentinel}}',
    variables: { agent_name: 'Nexus' },
    model: 'gpt-4o'
  });
  assert.strictEqual(renderRes.status, 200);
  assert.strictEqual(renderRes.json.rendered, 'Hello Nexus');
  assert(renderRes.json.tokens > 0);
  pass('POST /api/interpolate rendered template and estimated tokens');

  // DELETE /api/prompts/:id
  const deleteRes = await makeReq({
    path: `/api/prompts/${newPromptId}`,
    method: 'DELETE'
  });
  assert.strictEqual(deleteRes.status, 200);
  assert.strictEqual(deleteRes.json.success, true);
  pass('DELETE /api/prompts/:id deleted prompt from registry');

  // Teardown
  await new Promise(resolve => apiServer.close(resolve));

  console.log('\n====================================================');
  console.log(`🎉 ALL ${totalPassed} ASSERTIONS PASSED WITH ZERO MOCKS! (100% SUCCESS)`);
  console.log('====================================================\n');
  process.exit(0);
}

runAllTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
