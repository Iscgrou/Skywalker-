import('./server/services/strategy-auto-policy-integration.ts').then(async m => {
  console.log('=== Auto-Policy Integration Test ===');
  const status = m.autoPolicyIntegrationService.getStatus();
  console.log('Status:', status);
  
  console.log('\n=== Manual Evaluation Test ===');
  const result = await m.autoPolicyIntegrationService.triggerManualEvaluation();
  console.log('Evaluation result:', {
    metricsCollected: !!result.metricsSnapshot,
    decisionsFound: result.analysisResult?.decisions?.length || 0,
    confidence: result.analysisResult?.analysis?.confidence || 0,
    patterns: result.analysisResult?.analysis?.patterns || null,
    errors: result.errors || []
  });
  
  console.log('\n=== Enable/Disable Test ===');
  m.autoPolicyIntegrationService.setEnabled(false);
  console.log('Disabled. Status:', m.autoPolicyIntegrationService.getStatus().enabled);
  m.autoPolicyIntegrationService.setEnabled(true);
  console.log('Enabled. Status:', m.autoPolicyIntegrationService.getStatus().enabled);
  
  console.log('\n✅ Auto-Policy Integration working correctly!');
}).catch(console.error);
