// 🔐 CRM DUAL AUTHENTICATION & ACCESS CONTROL SERVICE
import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import type { AdminUser } from '@shared/schema';

export interface CrmSession {
  userId: number;
  username: string;
  role: 'ADMIN' | 'CRM';
  panelType: 'ADMIN_PANEL' | 'CRM_PANEL';
  permissions: Permission[];
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface Permission {
  resource: string;
  actions: string[];
  restrictions: DataRestriction[];
}

export interface DataRestriction {
  field: string;
  accessLevel: 'FULL' | 'LIMITED' | 'NONE';
  condition?: string;
}

// CRM Access Control Rules
const CRM_ACCESS_RULES = {
  'representatives': {
    fields: {
      'id': 'FULL',
      'code': 'FULL', 
      'name': 'FULL',
      'ownerName': 'FULL',
      'phone': 'FULL',
      'totalDebt': 'FULL', // CRM can see debt amounts
      'totalSales': 'NONE', // CRM CANNOT see sales figures
      'credit': 'LIMITED', // Only basic credit info
      'panelUsername': 'NONE', // Security sensitive
      'publicId': 'NONE' // Security sensitive
    },
    actions: ['READ', 'UPDATE_PROFILE'] // Cannot create/delete
  },
  'invoices': {
    fields: {
      'amount': 'NONE', // CRM cannot see invoice amounts
      'issueDate': 'FULL',
      'dueDate': 'FULL',
      'status': 'FULL'
    },
    actions: ['READ'] // Read-only for context
  },
  'payments': {
    fields: {
      'amount': 'NONE', // CRM cannot see payment amounts
      'paymentDate': 'FULL',
      'description': 'FULL'
    },
    actions: ['READ'] // Read-only for context
  },
  'salesPartners': {
    access: 'NONE' // CRM has no access to sales partner data
  },
  'activityLogs': {
    access: 'LIMITED', // Only CRM-related activities
    filter: "type LIKE 'CRM_%'"
  }
};

const ADMIN_ACCESS_RULES = {
  // Admin has full access to everything
  '*': {
    fields: '*',
    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT']
  }
};

export class CrmAuthService {
  private activeSessions: Map<string, CrmSession> = new Map();

  async authenticateUser(username: string, password: string): Promise<CrmSession | null> {
    try {
      // Handle dual authentication system
      if (username === 'mgr' && password === '8679') {
        return await this.createAdminSession();
      } else if (username === 'crm' && password === '8679') {
        return await this.createCrmSession();
      } else {
        // Check database for other admin users
        const user = await storage.getUserByUsername(username);
        if (user && await bcrypt.compare(password, user.passwordHash)) {
          return await this.createAdminSession(user);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  private async createAdminSession(user?: AdminUser): Promise<CrmSession> {
    const sessionId = this.generateSessionId();
    const session: CrmSession = {
      userId: user?.id || 1,
      username: user?.username || 'mgr',
      role: 'ADMIN',
      panelType: 'ADMIN_PANEL',
      permissions: this.getAdminPermissions(),
      sessionId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
    };

    this.activeSessions.set(sessionId, session);
    await this.logSecurityEvent('ADMIN_LOGIN', session);
    
    return session;
  }

  private async createCrmSession(): Promise<CrmSession> {
    const sessionId = this.generateSessionId();
    const session: CrmSession = {
      userId: 2, // Special CRM user ID
      username: 'crm',
      role: 'CRM',
      panelType: 'CRM_PANEL',
      permissions: this.getCrmPermissions(),
      sessionId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours (shorter for security)
    };

    this.activeSessions.set(sessionId, session);
    await this.logSecurityEvent('CRM_LOGIN', session);
    
    return session;
  }

  private getAdminPermissions(): Permission[] {
    return [{
      resource: '*',
      actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT', 'ADMIN'],
      restrictions: []
    }];
  }

  private getCrmPermissions(): Permission[] {
    return [
      {
        resource: 'representatives',
        actions: ['READ', 'UPDATE_PROFILE'],
        restrictions: [
          { field: 'totalSales', accessLevel: 'NONE' },
          { field: 'panelUsername', accessLevel: 'NONE' },
          { field: 'publicId', accessLevel: 'NONE' },
          { field: 'credit', accessLevel: 'LIMITED' }
        ]
      },
      {
        resource: 'representative_levels',
        actions: ['READ', 'UPDATE'],
        restrictions: []
      },
      {
        resource: 'crm_tasks',
        actions: ['READ', 'CREATE', 'UPDATE'],
        restrictions: []
      },
      {
        resource: 'crm_task_results',
        actions: ['READ', 'CREATE'],
        restrictions: []
      },
      {
        resource: 'crm_performance_analytics',
        actions: ['READ'],
        restrictions: []
      },
      {
        resource: 'ai_knowledge_base',
        actions: ['READ'],
        restrictions: []
      },
      {
        resource: 'invoices',
        actions: ['READ'],
        restrictions: [
          { field: 'amount', accessLevel: 'NONE' },
          { field: 'usageData', accessLevel: 'NONE' }
        ]
      },
      {
        resource: 'payments',
        actions: ['READ'],
        restrictions: [
          { field: 'amount', accessLevel: 'NONE' }
        ]
      }
    ];
  }

  // Access Control Enforcement
  async validateAccess(sessionId: string, resource: string, action: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session || this.isSessionExpired(session)) {
      return false;
    }

    // Admin has full access
    if (session.role === 'ADMIN') {
      return true;
    }

    // Check CRM permissions
    return this.checkCrmPermission(session, resource, action);
  }

  private checkCrmPermission(session: CrmSession, resource: string, action: string): boolean {
    const permission = session.permissions.find(p => 
      p.resource === resource || p.resource === '*'
    );
    
    return permission ? permission.actions.includes(action) : false;
  }

  // Data Filtering for CRM Panel
  async filterSensitiveData(sessionId: string, resource: string, data: any): Promise<any> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Invalid session');
    }

    // Admin sees everything
    if (session.role === 'ADMIN') {
      return data;
    }

    // Apply CRM restrictions
    return this.applyCrmDataFilters(resource, data);
  }

  private applyCrmDataFilters(resource: string, data: any): any {
    const rules = CRM_ACCESS_RULES[resource];
    if (!rules) {
      return null; // No access rule = no access
    }

    if (rules.access === 'NONE') {
      return null;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.filterSingleItem(rules, item));
    } else {
      return this.filterSingleItem(rules, data);
    }
  }

  private filterSingleItem(rules: any, item: any): any {
    if (!rules.fields) {
      return item;
    }

    const filtered = {};
    for (const [field, value] of Object.entries(item)) {
      const fieldAccess = rules.fields[field];
      
      if (fieldAccess === 'FULL') {
        filtered[field] = value;
      } else if (fieldAccess === 'LIMITED') {
        // Apply limited access logic (e.g., only show range for credit)
        filtered[field] = this.applyLimitedAccess(field, value);
      }
      // 'NONE' fields are excluded
    }

    return filtered;
  }

  private applyLimitedAccess(field: string, value: any): any {
    switch (field) {
      case 'credit':
        // Show credit range instead of exact amount
        if (typeof value === 'number') {
          if (value > 1000000) return 'بالا';
          if (value > 500000) return 'متوسط';
          return 'پایین';
        }
        return value;
      default:
        return value;
    }
  }

  // Session Management
  async validateSession(sessionId: string): Promise<CrmSession | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session || this.isSessionExpired(session)) {
      if (session) {
        this.activeSessions.delete(sessionId);
      }
      return null;
    }
    return session;
  }

  private isSessionExpired(session: CrmSession): boolean {
    return new Date() > session.expiresAt;
  }

  async extendSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session || this.isSessionExpired(session)) {
      return false;
    }

    // Extend session by original duration
    const extensionHours = session.role === 'ADMIN' ? 8 : 4;
    session.expiresAt = new Date(Date.now() + extensionHours * 60 * 60 * 1000);
    
    return true;
  }

  async logout(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      await this.logSecurityEvent('LOGOUT', session);
      this.activeSessions.delete(sessionId);
    }
  }

  // Security Auditing
  private async logSecurityEvent(eventType: string, session: CrmSession): Promise<void> {
    try {
      await storage.createActivityLog({
        type: `SECURITY_${eventType}`,
        description: `${eventType} for ${session.role} user: ${session.username}`,
        relatedId: session.userId,
        metadata: {
          sessionId: session.sessionId,
          role: session.role,
          panelType: session.panelType,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  async getActiveSessions(): Promise<CrmSession[]> {
    // Clean expired sessions first
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (this.isSessionExpired(session)) {
        this.activeSessions.delete(sessionId);
      }
    }
    
    return Array.from(this.activeSessions.values());
  }

  // Utility Methods
  private generateSessionId(): string {
    return `crm_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // Security Health Check
  async performSecurityAudit(): Promise<{
    activeSessions: number;
    expiredSessionsCleared: number;
    securityAlerts: string[];
  }> {
    let expiredCount = 0;
    const alerts: string[] = [];

    // Clean expired sessions
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (this.isSessionExpired(session)) {
        this.activeSessions.delete(sessionId);
        expiredCount++;
      }
    }

    // Check for security concerns
    const adminSessions = Array.from(this.activeSessions.values())
      .filter(s => s.role === 'ADMIN').length;
    
    if (adminSessions > 3) {
      alerts.push(`Unusual number of admin sessions: ${adminSessions}`);
    }

    return {
      activeSessions: this.activeSessions.size,
      expiredSessionsCleared: expiredCount,
      securityAlerts: alerts
    };
  }
}

export const crmAuthService = new CrmAuthService();