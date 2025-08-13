// Lightweight RBAC simulation script (manual run) – no testing framework dependency
// Execute with: node --loader ts-node/esm tests/rbac/rbac-simulated-cases.ts

import { RESOLVED_ROLE_PERMISSIONS, roleAllows, Role, ResourceAction } from '../../shared/rbac';

const actions: ResourceAction[] = [
  'explain.history.view',
  'explain.session.meta.view',
  'explain.session.full.view',
  'explain.diff.view',
  'explain.lineage.view'
];

const roles: Role[] = ['SUPER_ADMIN','ADMIN','ANALYST','AUDITOR','VIEWER','CRM_MANAGER','CRM'];

function table() {
  const rows: any[] = [];
  for (const role of roles) {
    const allowMap: Record<string,string> = {};
    for (const a of actions) allowMap[a] = roleAllows(role, a) ? '✓' : '✗';
    rows.push({ role, ...allowMap });
  }
  return rows;
}

function main() {
  console.log('RBAC Version 1 Permission Matrix (✓ allowed / ✗ denied)');
  console.table(table());
  // Spot checks (anti-examples)
  const cases: Array<[Role, ResourceAction, boolean]> = [
    ['CRM','explain.diff.view', false],
    ['VIEWER','explain.session.full.view', false],
    ['AUDITOR','explain.diff.view', false],
    ['ANALYST','explain.lineage.view', true],
    ['CRM_MANAGER','explain.diff.view', true]
  ];
  const failures = cases.filter(([r,a,expected])=> roleAllows(r,a)!==expected);
  if (failures.length) {
    console.error('Anti-example validation failed:', failures);
    process.exitCode = 1;
  } else {
    console.log('All anti-example cases passed.');
  }
}

main();
