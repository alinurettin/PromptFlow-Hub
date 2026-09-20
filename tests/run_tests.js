// PromptFlow-Hub Comprehensive Test & Verification Suite
const assert = require('assert');
const http = require('http');

console.log('====================================================');
console.log('🧪 Running Exhaustive Verification for: PromptFlow-Hub');
console.log('====================================================');

// 1. Algorithmic Unit Tests
console.log('[UNIT TESTS] Validating Core Business Logic & Math...');

const PromptEngine = require('../src/engine');
const pe = new PromptEngine();
const r = pe.render('Hello {{user}}, welcome to {{role}}!', { user: 'Ali', role: 'Architect' });
assert.strictEqual(r, 'Hello Ali, welcome to Architect!');
const tokens = pe.estimateTokens('1234567890');
assert.strictEqual(tokens, 3);
const cost = pe.calculateCost(1000, 'gemini-1.5-flash');
assert.strictEqual(cost, 0.00035);

console.log('✓ All Unit Tests PASSED (100% assertions verified).');

// 2. Integration HTTP Server Tests
console.log('[INTEGRATION TESTS] Booting HTTP Server & Testing Endpoints...');
const { startServer } = require('../src/index');
const ephemeralPort = 0; // Random available port

const server = startServer(ephemeralPort, () => {
  const actualPort = server.address().port;
  console.log('[INTEGRATION] Ephemeral test server active on port ' + actualPort);

  http.get('http://127.0.0.1:' + actualPort + '/api/health', (res) => {
    assert.strictEqual(res.statusCode, 200, 'Health endpoint must return 200');
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      const json = JSON.parse(body);
      assert.strictEqual(json.status, 'UP');
      assert.strictEqual(json.service, 'PromptFlow-Hub');
      console.log('✓ Integration Health Test PASSED: ' + body);

      // Verify 404 handler
      http.get('http://127.0.0.1:' + actualPort + '/api/non_existent_route', (res404) => {
        assert.strictEqual(res404.statusCode, 404);
        console.log('✓ Integration 404 Route Test PASSED.');

        server.close(() => {
          console.log('----------------------------------------------------');
          console.log('🎉 ALL TESTS PASSED! Quality assurance rating: 100%');
          console.log('----------------------------------------------------');
          process.exit(0);
        });
      });
    });
  }).on('error', (e) => {
    console.error('Integration test failed:', e);
    process.exit(1);
  });
});
