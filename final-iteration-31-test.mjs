import('./server/services/strategy-auto-policy-validation.ts').then(async m => {
  console.log('🚀 DA VINCI Iteration 31 Final Integration Test\n');
  
  const harness = new m.AutoPolicyValidationHarness();
  const results = await harness.runAllScenarios();
  
  console.log('\n📊 FINAL ITERATION 31 SUMMARY:');
  console.log(`✅ Total Scenarios: ${results.summary.total}`);
  console.log(`✅ PASSED: ${results.summary.passed}`);
  console.log(`❌ FAILED: ${results.summary.failed}`);
  console.log(`⚠️  PARTIAL: ${results.summary.partial}`);
  console.log(`🎯 Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  
  if (results.allPass) {
    console.log('\n🎉 DA VINCI Iteration 31 SUCCESSFULLY COMPLETED!');
    console.log('🤖 Auto-Policy Evolution Engine is ready for production');
    console.log('📈 System has evolved from adaptive → self-aware adaptive');
    console.log('🛡️ Safety rails and validation harnesses all operational');
    console.log('🔄 Ready for Iteration 32: Advanced Intelligence Features');
  } else {
    console.log('\n⚠️  Some scenarios need attention:');
    results.results.filter(r => r.status !== 'PASS').forEach(r => {
      console.log(`   ${r.scenario}: ${r.status} - ${r.details}`);
    });
  }
  
  // Cleanup test file
  try {
    await import('fs').then(fs => fs.unlinkSync('./test-auto-policy.mjs'));
  } catch(e) { /* ignore */ }
  
}).catch(console.error);
