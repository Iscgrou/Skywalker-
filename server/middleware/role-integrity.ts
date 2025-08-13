// R1.5: Role Integrity Middleware
// Verifies HMAC signature of role in session to prevent role escalation attacks

import { auditLogger } from '../services/audit-logger';
import { AuditEvents } from '../services/audit-events';
import { verifySessionRoleIntegrity } from '../services/security-integrity-service';
import type { Request, Response, NextFunction } from 'express';

export function roleIntegrityGuard(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  
  // Skip if no session or no role
  if (!session || !session.role) {
    return next();
  }
  
  try {
    const isValid = verifySessionRoleIntegrity(session);
    
    if (!isValid) {
      // Role tamper detected
      auditLogger.error(AuditEvents.Security.RoleTamper, 'role integrity verification failed', {
        role: session.role,
        username: session.user?.username || session.crmUser?.username,
        sessionId: session.id
      }, req).catch(() => {});
      
      // Invalidate session and reject
      if (session.destroy) {
        session.destroy((err: any) => {
          if (err) console.error('Session destroy error:', err);
        });
      }
      
      return res.status(403).json({
        ok: false,
        error: 'forbidden',
        reason: 'role_integrity_violation'
      });
    }
    
    next();
  } catch (error) {
    console.error('Role integrity check error:', error);
    
    auditLogger.error(AuditEvents.Security.RoleTamper, 'role integrity check failed', {
      error: error instanceof Error ? error.message : String(error),
      role: session.role
    }, req).catch(() => {});
    
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      reason: 'role_integrity_check_failed'
    });
  }
}
