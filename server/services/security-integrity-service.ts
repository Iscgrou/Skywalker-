// R1.5: Security Integrity Service
// HMAC-based role integrity verification + CSRF token management

import crypto from 'crypto';

const ROLE_INTEGRITY_SECRET = process.env.ROLE_INTEGRITY_SECRET || 'dev-secret-change-in-production';
const CSRF_TOKEN_LENGTH = 32; // bytes

export interface RoleIntegrityPayload {
  role: string;
  username?: string;
  sessionId: string;
  issuedAt: number; // timestamp for potential rotation
}

export function signRoleIntegrity(payload: RoleIntegrityPayload): string {
  const canonicalPayload = `role=${payload.role};user=${payload.username || 'unknown'};sid=${payload.sessionId};issued=${payload.issuedAt}`;
  return crypto.createHmac('sha256', ROLE_INTEGRITY_SECRET).update(canonicalPayload).digest('hex');
}

export function verifyRoleIntegrity(payload: RoleIntegrityPayload, signature: string): boolean {
  const expectedSignature = signRoleIntegrity(payload);
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(signature, 'hex'));
}

export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('base64url');
}

export function validateCSRFToken(token1: string, token2: string): boolean {
  if (!token1 || !token2 || token1.length !== token2.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token1), Buffer.from(token2));
}

// Helper to add role signature to session after login/role change
export function addRoleIntegrityToSession(session: any): void {
  if (!session.role) return;
  const payload: RoleIntegrityPayload = {
    role: session.role,
    username: session.user?.username || session.crmUser?.username,
    sessionId: session.id || 'no-sid',
    issuedAt: Date.now()
  };
  session.roleIntegritySignature = signRoleIntegrity(payload);
  session.roleIntegrityIssuedAt = payload.issuedAt;
}

// Helper to verify session role integrity
export function verifySessionRoleIntegrity(session: any): boolean {
  if (!session.roleIntegritySignature) {
    // Legacy session - add signature lazily for migration
    addRoleIntegrityToSession(session);
    return true;
  }
  
  const payload: RoleIntegrityPayload = {
    role: session.role,
    username: session.user?.username || session.crmUser?.username,
    sessionId: session.id || 'no-sid',
    issuedAt: session.roleIntegrityIssuedAt || Date.now()
  };
  
  return verifyRoleIntegrity(payload, session.roleIntegritySignature);
}
