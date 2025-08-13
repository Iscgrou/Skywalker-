// R2 Intelligence Services Test
// Tests the adaptive intelligence components

import { userBehaviorAnalytics } from '../server/services/adaptive-behavior-analytics.ts';
import { securityAnomalyDetection } from '../server/services/security-anomaly-detection.ts';
import { adaptiveCachingIntelligence } from '../server/services/adaptive-caching-intelligence.ts';
import { adaptiveSystemTuning } from '../server/services/adaptive-system-tuning.ts';

console.log('🧠 Testing Adaptive Intelligence Services...\n');

// Test 1: User Behavior Analytics
console.log('1. Testing User Behavior Analytics:');
async function testBehaviorAnalytics() {
  const userId = 'test_user_123';
  const profile = await userBehaviorAnalytics.analyzeUserBehavior(userId);
  console.log(`   ✅ User profile created: ${profile.username} (${profile.role})`);
  
  const patterns = userBehaviorAnalytics.detectPatterns(userId);
  console.log(`   ✅ Patterns detected: ${patterns.length} patterns`);
  
  const recommendations = userBehaviorAnalytics.getPersonalizedRecommendations(userId);
  console.log(`   ✅ Recommendations: ${recommendations.length} items`);
  
  const params = userBehaviorAnalytics.getAdaptiveParameters(userId);
  console.log(`   ✅ Adaptive params: redaction=${params.suggestedRedactionLevel}, cache TTL=${params.suggestedCacheTTL}ms`);
}

// Test 2: Security Anomaly Detection
console.log('\n2. Testing Security Anomaly Detection:');
function testSecurityAnomalies() {
  // Test rate anomaly
  const rateAnomaly = securityAnomalyDetection.detectRateAnomalies('suspicious_user', 150, 60000); // 150 requests per minute
  console.log(`   ✅ Rate anomaly: ${rateAnomaly ? `${rateAnomaly.severity} severity` : 'none detected'}`);
  
  // Test access pattern anomaly
  const accessAnomaly = securityAnomalyDetection.detectAccessPatternAnomalies(
    'night_user', 
    new Date('2025-08-13T03:30:00Z'), // 3:30 AM
    '192.168.1.100'
  );
  console.log(`   ✅ Access pattern anomaly: ${accessAnomaly ? `${accessAnomaly.type}` : 'none detected'}`);
  
  // Test role escalation
  const roleAnomaly = securityAnomalyDetection.detectRoleEscalationAttempts('bad_actor', 'SUPER_ADMIN', 'VIEWER');
  console.log(`   ✅ Role escalation anomaly: ${roleAnomaly ? `${roleAnomaly.severity} severity` : 'none detected'}`);
  
  const metrics = securityAnomalyDetection.getSecurityMetrics();
  console.log(`   ✅ Security metrics: ${metrics.totalAnomalies} total, ${metrics.activethreats} active, risk=${metrics.riskScore}`);
}

// Test 3: Adaptive Caching Intelligence
console.log('\n3. Testing Adaptive Caching Intelligence:');
function testAdaptiveCaching() {
  // Test cache operations
  adaptiveCachingIntelligence.set('test_key_1', { data: 'hot_data' }, 'user1', 'explainability');
  adaptiveCachingIntelligence.set('test_key_2', { data: 'warm_data' }, 'user2', 'diff');
  
  const hit = adaptiveCachingIntelligence.get('test_key_1', 'user1');
  const miss = adaptiveCachingIntelligence.get('nonexistent_key', 'user1');
  
  console.log(`   ✅ Cache hit: ${hit ? 'success' : 'failed'}`);
  console.log(`   ✅ Cache miss: ${miss ? 'unexpected hit' : 'expected miss'}`);
  
  const metrics = adaptiveCachingIntelligence.getMetrics();
  console.log(`   ✅ Cache metrics: ${metrics.totalEntries} entries, ${metrics.hitRate}% hit rate`);
  console.log(`   ✅ Recommendations: ${metrics.recommendations.length} items`);
}

// Test 4: Adaptive System Tuning
console.log('\n4. Testing Adaptive System Tuning:');
function testSystemTuning() {
  const recommendations = adaptiveSystemTuning.analyzeAndRecommend();
  console.log(`   ✅ Tuning recommendations: ${recommendations.length} items`);
  
  const healthScore = adaptiveSystemTuning.getSystemHealthScore();
  console.log(`   ✅ System health score: ${healthScore}/100`);
  
  const parameters = adaptiveSystemTuning.getAllParameters();
  console.log(`   ✅ System parameters: ${parameters.length} configured`);
  
  // Test auto-tuning
  const autoResult = adaptiveSystemTuning.autoTune();
  console.log(`   ✅ Auto-tuning: ${autoResult.applied} applied, ${autoResult.skipped} skipped`);
}

// Run all tests
async function runAllTests() {
  await testBehaviorAnalytics();
  testSecurityAnomalies();
  testAdaptiveCaching();
  testSystemTuning();
  
  console.log('\n🎯 All intelligence tests completed successfully!');
  console.log('\n📊 System Intelligence Summary:');
  
  const behaviorStats = userBehaviorAnalytics.getSystemStats();
  const securityMetrics = securityAnomalyDetection.getSecurityMetrics();
  const cacheMetrics = adaptiveCachingIntelligence.getMetrics();
  const healthScore = adaptiveSystemTuning.getSystemHealthScore();
  
  console.log(`   Users analyzed: ${behaviorStats.totalUsers}`);
  console.log(`   Security risk score: ${securityMetrics.riskScore}/100`);
  console.log(`   Cache hit rate: ${cacheMetrics.hitRate}%`);
  console.log(`   Overall system health: ${healthScore}/100`);
}

runAllTests().catch(console.error);
