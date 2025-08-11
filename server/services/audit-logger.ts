import { db } from "../db";
import { activityLogs } from "../../shared/schema";
import { desc, eq, lt } from "drizzle-orm";

export type AuditLogLevel = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogEntry {
  type: string;
  description: string;
  relatedId?: number;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  severity?: AuditLogLevel;
  metadata?: Record<string, any>;
}

class AuditLogger {
  private redactSensitiveData(value: string): string {
    // Redact IP addresses for privacy (keep first 3 octets)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) {
      const parts = value.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
    
    // Truncate user agent to avoid storing too much data
    if (value.length > 200) {
      return value.substring(0, 200) + '...';
    }
    
    return value;
  }

  private extractUserInfo(req: any): { userId?: string; sessionId?: string; ipAddress?: string; userAgent?: string } {
    const userId = req.session?.crmUser?.username || req.session?.username || req.user?.username;
    const sessionId = req.sessionID;
    const ipAddress = this.redactSensitiveData(
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown'
    );
    const userAgent = req.headers['user-agent'] ? this.redactSensitiveData(req.headers['user-agent']) : undefined;

    return { userId, sessionId, ipAddress, userAgent };
  }

  async log(entry: AuditLogEntry, req?: any): Promise<void> {
    try {
      const userInfo = req ? this.extractUserInfo(req) : {};
      
      await db.insert(activityLogs).values({
        type: entry.type,
        description: entry.description,
        relatedId: entry.relatedId,
        userId: entry.userId || userInfo.userId,
        sessionId: entry.sessionId || userInfo.sessionId,
        ipAddress: entry.ipAddress || userInfo.ipAddress,
        userAgent: entry.userAgent || userInfo.userAgent,
        severity: entry.severity || 'info',
        metadata: entry.metadata || null,
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  // Convenience methods for different log levels
  async info(type: string, description: string, metadata?: Record<string, any>, req?: any): Promise<void> {
    return this.log({ type, description, severity: 'info', metadata }, req);
  }

  async warning(type: string, description: string, metadata?: Record<string, any>, req?: any): Promise<void> {
    return this.log({ type, description, severity: 'warning', metadata }, req);
  }

  async error(type: string, description: string, metadata?: Record<string, any>, req?: any): Promise<void> {
    return this.log({ type, description, severity: 'error', metadata }, req);
  }

  async critical(type: string, description: string, metadata?: Record<string, any>, req?: any): Promise<void> {
    return this.log({ type, description, severity: 'critical', metadata }, req);
  }

  // Query methods for audit log viewer
  async getRecentLogs(limit: number = 100, offset: number = 0) {
    return db.select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getLogsByType(type: string, limit: number = 100) {
    return db.select()
      .from(activityLogs)
      .where(eq(activityLogs.type, type))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async getLogsBySeverity(severity: AuditLogLevel, limit: number = 100) {
    return db.select()
      .from(activityLogs)
      .where(eq(activityLogs.severity, severity))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  // Retention cleanup (run periodically)
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await db.delete(activityLogs)
      .where(lt(activityLogs.createdAt, cutoffDate));
      
    return result.rowCount || 0;
  }
}

export const auditLogger = new AuditLogger();
