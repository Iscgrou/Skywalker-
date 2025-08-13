// R1.5: CSRF Protection Middleware
// Double Submit Cookie pattern for CSRF protection

import { auditLogger } from '../services/audit-logger';
import { AuditEvents } from '../services/audit-events';
import { generateCSRFToken, validateCSRFToken } from '../services/security-integrity-service';
import type { Request, Response, NextFunction } from 'express';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Middleware to issue CSRF token if needed
export function csrfIssue(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  
  // Only issue for authenticated sessions
  if (!session || !session.authenticated) {
    return next();
  }
  
  // Check if CSRF token already exists in cookie
  const existingToken = req.cookies?.[CSRF_COOKIE_NAME];
  
  if (!existingToken) {
    // Generate new CSRF token
    const token = generateCSRFToken();
    
    // Set cookie with security flags
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Allow JS to read for header inclusion
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }
  
  next();
}

// List of paths that require CSRF protection (state-changing endpoints)
const CSRF_PROTECTED_PATHS = [
  '/api/governance/alerts/',
  '/api/settings/',
  '/api/workspace/',
  '/api/coupling/'
];

// Check if path requires CSRF protection
function requiresCSRFProtection(method: string, path: string): boolean {
  // Only protect state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    return false;
  }
  
  // Skip login endpoints
  if (path.includes('/login') || path.includes('/auth/login')) {
    return false;
  }
  
  // Check if path is in protected list
  return CSRF_PROTECTED_PATHS.some(protectedPath => path.startsWith(protectedPath));
}

// Middleware to verify CSRF token
export function csrfVerify(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  
  // Skip if not authenticated
  if (!session || !session.authenticated) {
    return next();
  }
  
  // Skip if not a protected path/method
  if (!requiresCSRFProtection(req.method, req.path)) {
    return next();
  }
  
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;
  
  // Both tokens must be present
  if (!cookieToken || !headerToken) {
    auditLogger.warning(AuditEvents.Security.CSRFBlocked, 'csrf token missing', {
      path: req.path,
      method: req.method,
      cookiePresent: !!cookieToken,
      headerPresent: !!headerToken,
      userAgent: req.headers['user-agent']
    }, req).catch(() => {});
    
    return res.status(403).json({
      ok: false,
      error: 'forbidden',
      reason: 'csrf_token_missing'
    });
  }
  
  // Tokens must match
  if (!validateCSRFToken(cookieToken, headerToken)) {
    auditLogger.warning(AuditEvents.Security.CSRFBlocked, 'csrf token mismatch', {
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent']
    }, req).catch(() => {});
    
    return res.status(403).json({
      ok: false,
      error: 'forbidden',
      reason: 'csrf_token_invalid'
    });
  }
  
  next();
}
