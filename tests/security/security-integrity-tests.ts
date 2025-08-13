// R1.5: Simple test for CSRF and Role Integrity
// Tests basic functionality without complex setup

import { signRoleIntegrity, verifyRoleIntegrity, generateCSRFToken, validateCSRFToken } from '../../server/services/security-integrity-service.ts';

console.log('🔐 Testing Role Integrity...');

// Test 1: Valid signature
const payload1 = {
  role: 'ANALYST',
  username: 'test_user',
  sessionId: 'sess_123',
  issuedAt: Date.now()
};

const signature1 = signRoleIntegrity(payload1);
const isValid1 = verifyRoleIntegrity(payload1, signature1);
console.log(`✅ Valid signature test: ${isValid1 ? 'PASS' : 'FAIL'}`);

// Test 2: Tampered role
const payload2 = { ...payload1, role: 'SUPER_ADMIN' }; // escalated role
const isValid2 = verifyRoleIntegrity(payload2, signature1); // using old signature
console.log(`✅ Tampered role test: ${!isValid2 ? 'PASS' : 'FAIL'}`);

// Test 3: CSRF token validation
console.log('\n🛡️  Testing CSRF...');
const token1 = generateCSRFToken();
const token2 = generateCSRFToken();
const sameTokenValid = validateCSRFToken(token1, token1);
const diffTokenInvalid = validateCSRFToken(token1, token2);
console.log(`✅ Same token validation: ${sameTokenValid ? 'PASS' : 'FAIL'}`);
console.log(`✅ Different token rejection: ${!diffTokenInvalid ? 'PASS' : 'FAIL'}`);

console.log('\n🎯 All security tests completed!');
