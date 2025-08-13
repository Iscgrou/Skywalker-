# RBAC Governance Layer (Version 1)

Central objective: Protect explainability & diff surfaces with least-privilege role-based access while keeping policy transparent & easily extensible.

## Roles
- SUPER_ADMIN: Full wildcard access.
- ADMIN: Administrative (inherits ANALYST + AUDITOR) + manage settings/users.
- ANALYST: Deep analytical (history, meta, full session, diff, lineage).
- AUDITOR: Read-only compliance (history, meta, full session) – no diff/lineage.
- VIEWER: Minimal visibility (history list + meta only).
- CRM_MANAGER: CRM elevated (history, meta, diff) – no full session unless upgraded.
- CRM: Basic CRM (history only).

## Resource Actions
| Action | Description |
| ------ | ----------- |
| explain.history.view | List explainability sessions (IDs & meta) |
| explain.session.meta.view | View session meta (light) |
| explain.session.full.view | Full snapshot (adjustments + details) |
| explain.diff.view | Compare two versions (structural & adjustments) |
| explain.lineage.view | Lineage delta details in diff & full session lineage sections |
| settings.manage | Manage global settings (future) |
| users.manage | User/role administration (future) |

## Policy Source
Implemented in `shared/rbac.ts` with inheritance resolution at load producing `RESOLVED_ROLE_PERMISSIONS`.

## Middleware
`server/middleware/rbac.ts` exposes `rbac({ anyOf, allOf, allowRoles })` to guard routes. Explainability endpoints now protected.

## Error Contract
- 401 rbac_missing_identity: No user/session role could be resolved.
- 403 rbac_denied: Role authenticated but insufficient privileges.
- 500 rbac_misconfigured: Middleware invoked without any constraint (development misconfig).

## Anti-Examples (Negative Cases)
| Scenario | Expected Result |
| -------- | --------------- |
| Unauthenticated request to /api/prescriptive/explain/history | 401 rbac_missing_identity |
| CRM role requesting diff | 403 rbac_denied |
| VIEWER requesting full session | 403 rbac_denied |
| AUDITOR requesting diff | 403 rbac_denied |
| ANALYST requesting lineage (allowed) | 200 with lineage payload |
| Misconfigured middleware no constraints | 500 rbac_misconfigured (developer signal) |

## Extension Guidelines
1. Add new action string to ResourceAction union.
2. Append permission to appropriate role in ROLE_POLICIES (or create new role). Avoid broadening low-trust roles without review.
3. Increment RBAC_VERSION if contract or inheritance changes materially.
4. Ensure UI gating checks `hasAction('action.identifier')` BEFORE invoking expensive queries.

## Client Integration
Updated `use-crm-auth` to provide `hasAction()`; Diff panel now hides lineage toggle & displays denial message if lacking action.

## Future Enhancements
- Session binding of explicit Role claim vs. implicit mapping.
- Audit log entries on denied attempts (attach reason, IP, user, action).
- Policy hot-reload (config driven) & integrity hash.
- Unit tests for resolution cycles and inheritance breadth.

Version: 1  (Keep this line for automated scanners)
