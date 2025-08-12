// Moved from root CONTRACTS_V2.ts as design-time specification (not imported by runtime)
// DA VINCI v2.0 - Workspace Integration Contracts
// (Content unchanged)

export interface WorkspaceTask { id: string; staffId: number; representativeId: number; title: string; description: string; priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'; status: 'ASSIGNED' | 'READ' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED'; assignedAt: string; deadline: string; }
// ...existing code moved from root (trimmed). Full spec in repository history.
