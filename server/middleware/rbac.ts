import { roleAllows, Role, ResourceAction } from '../../shared/rbac';
import { auditLogger } from '../services/audit-logger';
import { AuditEvents } from '../services/audit-events';
import type { Request, Response, NextFunction } from 'express';

export interface RbacCheckOptions {
  anyOf?: ResourceAction[]; // pass if user has ANY
  allOf?: ResourceAction[]; // pass if user has ALL
  allowRoles?: Role[];      // shortcut: allow if role in list (bypass action)
}

function extractRole(req: any): Role | undefined {
  // Priority: explicit session role, crm session user, legacy fields
  const r: string | undefined = req.session?.role || req.session?.crmUser?.role || req.crmUser?.role;
  if (!r) return undefined;
  return r as Role; // trust upstream assignment
}

export function rbac(options: RbacCheckOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = extractRole(req);
    if (!role) {
      auditLogger.warning(AuditEvents.Security.RBACDenied, 'rbac missing identity', { path:req.path }, req).catch(()=>{});
      return res.status(401).json({ ok:false, error:'unauthorized', reason:'rbac_missing_identity' });
    }
    if (options.allowRoles && options.allowRoles.includes(role)) {
      return next();
    }
    // Action evaluation
    const { anyOf, allOf } = options;
    let allowed = false;
    if (anyOf && anyOf.length) {
      allowed = anyOf.some(a=> roleAllows(role, a));
    }
    if (!allowed && allOf && allOf.length) {
      allowed = allOf.every(a=> roleAllows(role, a));
    }
    if (!anyOf && !allOf && !options.allowRoles) {
      // Misconfiguration – default deny for safety
      return res.status(500).json({ ok:false, error:'rbac_misconfigured' });
    }
    if (!allowed) {
      auditLogger.warning(AuditEvents.Security.RBACDenied, 'rbac denied', { path:req.path, role, anyOf, allOf, allowRoles: options.allowRoles }, req).catch(()=>{});
      return res.status(403).json({ ok:false, error:'forbidden', reason:'rbac_denied', role });
    }
    next();
  };
}

export function requireRoles(roles: Role[]) { return rbac({ allowRoles: roles }); }
