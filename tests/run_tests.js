// Master test runner for PromptFlow-Hub
const runEstimatorTests = require('./estimator.test');
const runStoreTests = require('./store.test');

console.log('====================================================');
console.log('  PROMPTFLOW-HUB AUTOMATED TEST SUITE');
console.log('====================================================');

try {
  runEstimatorTests();
  runStoreTests();

  console.log('====================================================');
  console.log('  🎉 ALL AUTOMATED TESTS PASSED (100% SUCCESS)');
  console.log('====================================================');
  process.exit(0);
} catch (err) {
  console.error('\n❌ TEST FAILURE:', err.message);
  process.exit(1);
}
