// Structured audit event taxonomy (R1.2)
export const AuditEvents = {
  Explainability: {
    DiffView: 'explain_diff_view',
    FullView: 'explain_full_view',
    HistoryView: 'explain_history_view',
    LineageView: 'explain_lineage_view'
  },
  Governance: {
    AlertAck: 'governance_alert_ack',
    AlertUnack: 'governance_alert_unack',
    AlertEscalate: 'governance_alert_escalate',
    AlertList: 'governance_alert_list',
    AlertAnalytics: 'governance_alert_analytics',
    SuppressionMetrics: 'governance_suppression_metrics',
    AdaptiveMetrics: 'governance_adaptive_metrics',
    AutoPolicyStatus: 'governance_auto_policy_status'
  },
  Security: {
    RBACDenied: 'security_rbac_denied',
    RoleTamper: 'security_role_tamper',
    CSRFBlocked: 'security_csrf_blocked'
  },
  Performance: {
    DiffRateLimited: 'perf_diff_rate_limited',
    DiffCacheHit: 'perf_diff_cache_hit'
  },
  Data: {
  FullRedacted: 'data_full_redacted',
  RedactionApplied: 'data_redaction_applied'
  }
} as const;

export type AuditEventKey =
  | typeof AuditEvents.Explainability[keyof typeof AuditEvents.Explainability]
  | typeof AuditEvents.Governance[keyof typeof AuditEvents.Governance]
  | typeof AuditEvents.Security[keyof typeof AuditEvents.Security]
  | typeof AuditEvents.Performance[keyof typeof AuditEvents.Performance]
  | typeof AuditEvents.Data[keyof typeof AuditEvents.Data];

// Severity mapping defaults (can be overridden per call)
export function defaultSeverity(event: AuditEventKey) {
  if (event.startsWith('security_')) return 'warning';
  if (event === AuditEvents.Security.RoleTamper) return 'error';
  if (event === AuditEvents.Governance.AlertEscalate) return 'info';
  if (event.startsWith('perf_')) return 'info';
  return 'info';
}
