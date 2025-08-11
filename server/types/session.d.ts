import 'express-session';

declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean;
    user?: {
      id: number;
      username: string;
      role: string;
      permissions: string[];
    };
    crmAuthenticated?: boolean;
    crmUser?: {
      id: number;
      username: string;
      fullName: string;
      role: string;
      permissions: string[];
      panelType: string;
    };
  // CRM manager-gate
  crmManager?: boolean;
  crmManagerExpiry?: number;
  // Session timing metadata (set in server/index.ts middleware)
  createdAt?: number;
  lastActivity?: number;
    // AI call sessions (transient)
    aiCallSessions?: Record<string, {
      representativeId: number;
      staffId: number;
      reason: string;
      context: any;
      startedAt: string;
    }>;
  }
}