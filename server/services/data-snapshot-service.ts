import { db } from '../db';
import { representatives, invoices, payments, salesPartners, activityLogs } from '../../shared/schema';
import { sql, eq, desc, and, or, like, gte, lte, asc } from 'drizzle-orm';

export interface SnapshotConfig {
  enableCaching: boolean;
  cacheExpiryMs: number;
  maxCacheSize: number;
  enablePagination: boolean;
  defaultPageSize: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: 'newest' | 'oldest' | 'amount_high' | 'amount_low';
  filters?: Record<string, any>;
}

export interface SnapshotData<T> {
  data: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  cached: boolean;
  cacheExpiry?: Date;
}

interface CacheEntry {
  data: any;
  expiry: Date;
  size: number;
}

export class DataSnapshotService {
  private cache = new Map<string, CacheEntry>();
  private config: SnapshotConfig;
  private totalCacheSize = 0;

  constructor(config: Partial<SnapshotConfig> = {}) {
    this.config = {
      enableCaching: config.enableCaching ?? true,
      cacheExpiryMs: config.cacheExpiryMs ?? 5 * 60 * 1000, // 5 minutes default
      maxCacheSize: config.maxCacheSize ?? 50 * 1024 * 1024, // 50MB default
      enablePagination: config.enablePagination ?? true,
      defaultPageSize: config.defaultPageSize ?? 20
    };
  }

  private getCacheKey(operation: string, params?: any): string {
    return `snapshot:${operation}:${JSON.stringify(params || {})}`;
  }

  private getCachedData<T>(cacheKey: string): T | null {
    if (!this.config.enableCaching) return null;

    const entry = this.cache.get(cacheKey);
    if (!entry || entry.expiry < new Date()) {
      if (entry) {
        this.totalCacheSize -= entry.size;
        this.cache.delete(cacheKey);
      }
      return null;
    }

    return entry.data;
  }

  private setCachedData(cacheKey: string, data: any): void {
    if (!this.config.enableCaching) return;

    const dataStr = JSON.stringify(data);
    const size = Buffer.byteLength(dataStr, 'utf8');

    // Check if adding this would exceed cache size limit
    if (this.totalCacheSize + size > this.config.maxCacheSize) {
      this.clearOldestCacheEntries();
    }

    const expiry = new Date(Date.now() + this.config.cacheExpiryMs);
    this.cache.set(cacheKey, { data, expiry, size });
    this.totalCacheSize += size;
  }

  private clearOldestCacheEntries(): void {
    // Clear 25% of cache entries (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].expiry.getTime() - b[1].expiry.getTime());
    
    const clearCount = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < clearCount; i++) {
      const [key, entry] = entries[i];
      this.totalCacheSize -= entry.size;
      this.cache.delete(key);
    }
  }

  // Clear cache manually
  public clearCache(): void {
    this.cache.clear();
    this.totalCacheSize = 0;
  }

  // Clear specific cache pattern
  public clearCachePattern(pattern: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.totalCacheSize -= entry.size;
        this.cache.delete(key);
      }
    }
  }

  // Get Representatives with Pagination and Caching
  async getRepresentativesSnapshot(params: PaginationParams): Promise<SnapshotData<any>> {
    const cacheKey = this.getCacheKey('representatives', params);
    const cached = this.getCachedData<SnapshotData<any>>(cacheKey);
    
    if (cached) {
      return { ...cached, cached: true };
    }

    const { page = 1, limit = this.config.defaultPageSize, sort = 'newest', filters = {} } = params;
    
    // Build where conditions
    const conditions: any[] = [];
    if (filters.search) {
      conditions.push(
        or(
          like(representatives.name, `%${filters.search}%`),
          like(representatives.code, `%${filters.search}%`)
        )
      );
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(representatives.isActive, filters.isActive));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(representatives)
      .where(whereClause ?? sql`true`);
    
    const totalCount = countResult[0]?.count || 0;

    // Get paginated data with sorting
    let orderBy: any;
    switch (sort) {
      case 'oldest':
        orderBy = asc(representatives.createdAt);
        break;
      case 'amount_high':
        orderBy = desc(representatives.totalSales);
        break;
      case 'amount_low':
        orderBy = asc(representatives.totalSales);
        break;
      default:
        orderBy = desc(representatives.createdAt);
    }

    const data = await db
      .select({
        id: representatives.id,
        name: representatives.name,
        code: representatives.code,
        phone: representatives.phone,
        isActive: representatives.isActive,
        totalSales: representatives.totalSales,
        createdAt: representatives.createdAt
      })
      .from(representatives)
      .where(whereClause ?? sql`true`)
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    
    const result: SnapshotData<any> = {
      data,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      cached: false,
      cacheExpiry: new Date(Date.now() + this.config.cacheExpiryMs)
    };

    this.setCachedData(cacheKey, result);
    return result;
  }

  // Get Invoices with Enhanced Pagination and Caching
  async getInvoicesSnapshot(params: PaginationParams): Promise<SnapshotData<any>> {
    const cacheKey = this.getCacheKey('invoices', params);
    const cached = this.getCachedData<SnapshotData<any>>(cacheKey);
    
    if (cached) {
      return { ...cached, cached: true };
    }

    const { page = 1, limit = this.config.defaultPageSize, sort = 'newest', filters = {} } = params;
    
    // Build complex where conditions
    const conditions: any[] = [];
    if (filters.search) {
      conditions.push(like(invoices.invoiceNumber, `%${filters.search}%`));
    }
    if (filters.status) {
      conditions.push(eq(invoices.status, filters.status));
    }
    if (filters.representativeId) {
      conditions.push(eq(invoices.representativeId, filters.representativeId));
    }
    if (filters.sentToTelegram !== undefined) {
      conditions.push(eq(invoices.sentToTelegram, filters.sentToTelegram));
    }
    if (filters.dateFrom) {
      conditions.push(gte(invoices.issueDate, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(invoices.issueDate, filters.dateTo));
    }
    if (filters.amountMin) {
      conditions.push(sql`CAST(${invoices.amount} as DECIMAL) >= ${filters.amountMin}`);
    }
    if (filters.amountMax) {
      conditions.push(sql`CAST(${invoices.amount} as DECIMAL) <= ${filters.amountMax}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count with optimized query
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(whereClause ?? sql`true`);
    
    const totalCount = countResult[0]?.count || 0;

    // Get paginated data with sorting and joins
    let orderBy: any;
    switch (sort) {
      case 'oldest':
        orderBy = asc(invoices.createdAt);
        break;
      case 'amount_high':
        orderBy = sql`CAST(${invoices.amount} as DECIMAL) DESC`;
        break;
      case 'amount_low':
        orderBy = sql`CAST(${invoices.amount} as DECIMAL) ASC`;
        break;
      default:
        orderBy = desc(invoices.createdAt);
    }

    const data = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        amount: invoices.amount,
        status: invoices.status,
        issueDate: invoices.issueDate,
        representativeId: invoices.representativeId,
        representativeName: representatives.name,
        representativeCode: representatives.code,
        sentToTelegram: invoices.sentToTelegram,
        createdAt: invoices.createdAt,
        batchId: invoices.batchId
      })
      .from(invoices)
      .leftJoin(representatives, eq(invoices.representativeId, representatives.id))
      .where(whereClause ?? sql`true`)
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    
    const result: SnapshotData<any> = {
      data,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      cached: false,
      cacheExpiry: new Date(Date.now() + this.config.cacheExpiryMs)
    };

    this.setCachedData(cacheKey, result);
    return result;
  }

  // Get Payments with Pagination and Caching
  async getPaymentsSnapshot(params: PaginationParams): Promise<SnapshotData<any>> {
    const cacheKey = this.getCacheKey('payments', params);
    const cached = this.getCachedData<SnapshotData<any>>(cacheKey);
    
    if (cached) {
      return { ...cached, cached: true };
    }

    const { page = 1, limit = this.config.defaultPageSize, sort = 'newest', filters = {} } = params;
    
    const conditions: any[] = [];
    if (filters.representativeId) {
      conditions.push(eq(payments.representativeId, filters.representativeId));
    }
    if (filters.isAllocated !== undefined) {
      conditions.push(eq(payments.isAllocated, filters.isAllocated));
    }
    if (filters.amountMin) {
      conditions.push(sql`CAST(${payments.amount} as DECIMAL) >= ${filters.amountMin}`);
    }
    if (filters.amountMax) {
      conditions.push(sql`CAST(${payments.amount} as DECIMAL) <= ${filters.amountMax}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(whereClause ?? sql`true`);
    
    const totalCount = countResult[0]?.count || 0;

    let orderBy: any;
    switch (sort) {
      case 'oldest':
        orderBy = asc(payments.paymentDate);
        break;
      case 'amount_high':
        orderBy = sql`CAST(${payments.amount} as DECIMAL) DESC`;
        break;
      case 'amount_low':
        orderBy = sql`CAST(${payments.amount} as DECIMAL) ASC`;
        break;
      default:
        orderBy = desc(payments.paymentDate);
    }

    const data = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        paymentDate: payments.paymentDate,
        description: payments.description,
        representativeId: payments.representativeId,
        representativeName: representatives.name,
        representativeCode: representatives.code,
        isAllocated: payments.isAllocated,
        createdAt: payments.createdAt
      })
      .from(payments)
      .leftJoin(representatives, eq(payments.representativeId, representatives.id))
      .where(whereClause ?? sql`true`)
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    
    const result: SnapshotData<any> = {
      data,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      cached: false,
      cacheExpiry: new Date(Date.now() + this.config.cacheExpiryMs)
    };

    this.setCachedData(cacheKey, result);
    return result;
  }

  // Get Dashboard Summary Data with Aggressive Caching
  async getDashboardSnapshot(): Promise<SnapshotData<any>> {
    const cacheKey = this.getCacheKey('dashboard_summary');
    const cached = this.getCachedData<SnapshotData<any>>(cacheKey);
    
    if (cached) {
      return { ...cached, cached: true };
    }

    // Parallel queries for dashboard metrics
    const [
      totalRevenueResult,
      activeRepsResult,
      unpaidInvoicesResult,
      overdueInvoicesResult,
      totalPartnersResult,
      recentActivitiesResult
    ] = await Promise.all([
      db.select({ 
        totalRevenue: sql<string>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)` 
      }).from(payments),
      
      db.select({ count: sql<number>`count(*)` })
        .from(representatives)
        .where(eq(representatives.isActive, true)),
      
      db.select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.status, 'unpaid')),
      
      db.select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.status, 'overdue')),
      
      db.select({ count: sql<number>`count(*)` })
        .from(salesPartners)
        .where(eq(salesPartners.isActive, true)),
      
      db.select()
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(10)
    ]);

    const dashboardData = {
      totalRevenue: totalRevenueResult[0]?.totalRevenue || "0",
      activeRepresentatives: activeRepsResult[0]?.count || 0,
      unpaidInvoices: unpaidInvoicesResult[0]?.count || 0,
      overdueInvoices: overdueInvoicesResult[0]?.count || 0,
      totalSalesPartners: totalPartnersResult[0]?.count || 0,
      recentActivities: recentActivitiesResult || []
    };

    const result: SnapshotData<any> = {
      data: [dashboardData],
      pagination: {
        currentPage: 1,
        pageSize: 1,
        totalCount: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      cached: false,
      cacheExpiry: new Date(Date.now() + this.config.cacheExpiryMs)
    };

    this.setCachedData(cacheKey, result);
    return result;
  }

  // Get cache statistics
  getCacheStats() {
    return {
      totalEntries: this.cache.size,
      totalSizeBytes: this.totalCacheSize,
      totalSizeMB: Math.round(this.totalCacheSize / (1024 * 1024) * 100) / 100,
      maxSizeMB: Math.round(this.config.maxCacheSize / (1024 * 1024) * 100) / 100,
      config: this.config
    };
  }
}

// Export singleton instance
export const dataSnapshotService = new DataSnapshotService({
  enableCaching: true,
  cacheExpiryMs: 5 * 60 * 1000, // 5 minutes
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  enablePagination: true,
  defaultPageSize: 20
});
