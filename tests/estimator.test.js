// Unit tests for estimator.js
const assert = require('assert');
const { estimateTokens, estimateCosts } = require('../src/estimator');

function runEstimatorTests() {
  console.log('Testing estimateTokens calculation...');
  assert.strictEqual(estimateTokens(''), 0);
  assert.strictEqual(estimateTokens('Hello world'), 3);

  console.log('Testing estimateCosts with 1000 characters...');
  const text = 'A'.repeat(1000);
  const result = estimateCosts(text);

  assert.strictEqual(result.charCount, 1000);
  assert.ok(result.estimates['gemini-2.0-flash'].tokens > 0);
  assert.ok(result.estimates['gpt-4o'].tokens > 0);
  assert.ok(result.estimates['claude-3.5-sonnet'].tokens > 0);

  // Gemini is cheaper than GPT-4o
  assert.ok(
    result.estimates['gemini-2.0-flash'].costPerThousandCalls <
    result.estimates['gpt-4o'].costPerThousandCalls
  );

  console.log('✅ estimator.test.js PASSED');
}

module.exports = runEstimatorTests;
