// Central RBAC policy (Iteration: Governance Hardening Phase)
// Lightweight – string enums to avoid build complications.

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'ANALYST'
  | 'AUDITOR'
  | 'VIEWER'
  | 'CRM_MANAGER'
  | 'CRM';

// Canonical resource.action identifiers (stable contract for UI & server)
export type ResourceAction =
  | 'explain.history.view'
  | 'explain.session.meta.view'
  | 'explain.session.full.view'
  | 'explain.diff.view'
  | 'explain.lineage.view'
  | 'settings.manage'
  | 'users.manage'
  // Governance / Adaptive (R1 extension)
  | 'governance.alert.list'
  | 'governance.alert.analytics.view'
  | 'governance.alert.ack'
  | 'governance.alert.escalate'
  | 'governance.alert.suppression.metrics'
  | 'governance.adaptive.metrics'
  | 'governance.auto-policy.status';

export interface RolePolicy {
  role: Role;
  inherits?: Role[]; // simple single‑level inheritance (resolved at load)
  allow: ResourceAction[] | '*';
}

// Base role policies (minimal – extend as governance surface grows)
const ROLE_POLICIES: RolePolicy[] = [
  { role: 'SUPER_ADMIN', allow: '*' },
  { role: 'ADMIN', inherits: ['ANALYST','AUDITOR'], allow: [ 'settings.manage', 'users.manage' ] },
  { role: 'ANALYST', inherits: ['AUDITOR'], allow: [
      'explain.history.view',
      'explain.session.meta.view',
      'explain.session.full.view',
      'explain.diff.view',
    'explain.lineage.view',
    'governance.alert.list',
    'governance.alert.analytics.view',
    'governance.alert.ack',
    'governance.alert.escalate',
    'governance.alert.suppression.metrics',
    'governance.adaptive.metrics',
    'governance.auto-policy.status'
    ] },
  { role: 'AUDITOR', allow: [
      'explain.history.view',
      'explain.session.meta.view',
    'explain.session.full.view',
    'governance.alert.list',
    'governance.alert.analytics.view',
    'governance.alert.suppression.metrics',
    'governance.adaptive.metrics',
    'governance.auto-policy.status'
    ] },
  { role: 'VIEWER', allow: [
      'explain.history.view',
    'explain.session.meta.view',
    'governance.alert.list'
    ] },
  { role: 'CRM_MANAGER', inherits:['CRM'], allow: [
      'explain.history.view',
      'explain.session.meta.view',
    'explain.diff.view',
    'governance.alert.list'
    ] },
  { role: 'CRM', allow: [
      'explain.history.view'
    ] }
];

// Resolved permission map role -> Set<ResourceAction>|'*'
export const RESOLVED_ROLE_PERMISSIONS: Record<Role, Set<ResourceAction> | '*'> = (() => {
  const map: Partial<Record<Role, Set<ResourceAction> | '*'>> = {};
  const resolving = new Set<Role>();
  const resolve = (r: Role): Set<ResourceAction> | '*' => {
    if (map[r]) return map[r]!;
    const pol = ROLE_POLICIES.find(p=>p.role===r);
    if (!pol) { map[r] = new Set(); return map[r]!; }
    if (pol.allow === '*') { map[r] = '*'; return map[r]!; }
    if (resolving.has(r)) { // cycle guard
      map[r] = new Set(pol.allow); return map[r]!;
    }
    resolving.add(r);
    const set = new Set<ResourceAction>(pol.allow);
    (pol.inherits||[]).forEach(ir => {
      const inh = resolve(ir);
      if (inh === '*') { map[r] = '*'; return; }
      inh.forEach(a=> set.add(a));
    });
    if (!map[r]) map[r] = set;
    resolving.delete(r);
    return map[r]!;
  };
  ROLE_POLICIES.forEach(p=> resolve(p.role));
  return map as Record<Role, Set<ResourceAction>|'*'>;
})();

export function roleAllows(role: Role | undefined, action: ResourceAction): boolean {
  if (!role) return false;
  const perms = RESOLVED_ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms === '*') return true;
  return perms.has(action);
}

export function roleHasAny(role: Role | undefined, actions: ResourceAction[]): boolean {
  return actions.some(a=> roleAllows(role, a));
}

export const RBAC_VERSION = 1; // increment on contract change
