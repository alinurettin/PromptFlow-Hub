// Unit tests for PromptStore in PromptFlow-Hub
const assert = require('assert');
const store = require('../src/store');

function runStoreTests() {
  console.log('Testing PromptStore creation & versioning...');
  const prompt = store.createPrompt({
    title: 'Unit Test Prompt',
    description: 'Testing version control',
    initialContent: 'Initial content v1'
  });

  assert.ok(prompt.id);
  assert.strictEqual(prompt.currentVersion, 'v1.0.0');
  assert.strictEqual(prompt.versions.length, 1);

  console.log('Testing adding new version...');
  const updated = store.addVersion(prompt.id, 'Updated content v2', 'Added extra guidelines');
  assert.strictEqual(updated.currentVersion, 'v1.1.0');
  assert.strictEqual(updated.versions.length, 2);
  assert.strictEqual(updated.activeContent, 'Updated content v2');

  // Cleanup
  store.delete(prompt.id);
  assert.strictEqual(store.get(prompt.id), undefined);

  console.log('✅ store.test.js PASSED');
}

module.exports = runStoreTests;
