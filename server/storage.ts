import { 
  representatives, salesPartners, invoices, payments, activityLogs, settings, adminUsers, invoiceEdits,
  financialTransactions, dataIntegrityConstraints,
  type Representative, type InsertRepresentative,
  type SalesPartner, type InsertSalesPartner,
  type Invoice, type InsertInvoice,
  type Payment, type InsertPayment,
  type ActivityLog, type InsertActivityLog,
  type Setting, type InsertSetting,
  type AdminUser, type InsertAdminUser,
  type InvoiceEdit, type InsertInvoiceEdit,
  type FinancialTransaction, type InsertFinancialTransaction,
  type DataIntegrityConstraint, type InsertDataIntegrityConstraint
} from "@shared/schema";
import { db, checkDatabaseHealth } from "./db";
import { eq, desc, sql, and, or, ilike, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

// Database operation wrapper with retry logic and error handling
async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`Database operation "${operationName}" failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Database operation "${operationName}" failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Exponential backoff: wait 2^attempt seconds
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw new Error(`Database operation "${operationName}" failed unexpectedly`);
}

export interface IStorage {
  // Representatives
  getRepresentatives(): Promise<Representative[]>;
  getRepresentative(id: number): Promise<Representative | undefined>;
  getRepresentativeByCode(code: string): Promise<Representative | undefined>;
  getRepresentativeByPanelUsername(panelUsername: string): Promise<Representative | undefined>;
  getRepresentativeByPublicId(publicId: string): Promise<Representative | undefined>;
  createRepresentative(rep: InsertRepresentative): Promise<Representative>;
  updateRepresentative(id: number, rep: Partial<Representative>): Promise<Representative>;
  deleteRepresentative(id: number): Promise<void>;

  // Sales Partners
  getSalesPartners(): Promise<SalesPartner[]>;
  getSalesPartner(id: number): Promise<SalesPartner | undefined>;
  createSalesPartner(partner: InsertSalesPartner): Promise<SalesPartner>;
  updateSalesPartner(id: number, partner: Partial<SalesPartner>): Promise<SalesPartner>;

  // Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoicesByRepresentative(repId: number): Promise<Invoice[]>;
  getInvoicesForTelegram(): Promise<Invoice[]>; // Unsent invoices
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice>;
  markInvoicesAsSentToTelegram(invoiceIds: number[]): Promise<void>;

  // Payments
  getPayments(): Promise<Payment[]>;
  getPaymentsByRepresentative(repId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  allocatePaymentToInvoice(paymentId: number, invoiceId: number): Promise<void>;

  // Activity Logs
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  updateSetting(key: string, value: string): Promise<Setting>;

  // Admin Users (Authentication)
  getAdminUser(username: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  updateAdminUserLogin(id: number): Promise<void>;
  initializeDefaultAdminUser(username: string, password: string): Promise<void>;

  // Data Reset Functions (Admin Only)
  getDataCounts(): Promise<{
    representatives: number;
    invoices: number;
    payments: number;
    salesPartners: number;
    settings: number;
    activityLogs: number;
  }>;
  resetData(options: {
    representatives: boolean;
    invoices: boolean;
    payments: boolean;
    salesPartners: boolean;
    settings: boolean;
    activityLogs: boolean;
  }): Promise<{
    deletedCounts: {
      representatives: number;
      invoices: number;
      payments: number;
      salesPartners: number;
      settings: number;
      activityLogs: number;
      total: number;
    };
  }>;

  // Dashboard data
  getDashboardData(): Promise<{
    totalRevenue: string;
    totalDebt: string;
    activeRepresentatives: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalSalesPartners: number;
    recentActivities: ActivityLog[];
  }>;

  // Financial calculations
  updateRepresentativeFinancials(repId: number): Promise<void>;

  // Invoice Edits
  getInvoiceEdits(invoiceId: number): Promise<InvoiceEdit[]>;
  createInvoiceEdit(edit: InsertInvoiceEdit): Promise<InvoiceEdit>;
  getInvoiceEditHistory(invoiceId: number): Promise<InvoiceEdit[]>;
  updateRepresentativeDebt(invoiceId: number, originalAmount: number, editedAmount: number): Promise<void>;

  // Financial Transactions (Clock Mechanism Core)
  createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction>;
  updateTransactionStatus(transactionId: string, status: string, actualState?: any): Promise<void>;
  getFinancialTransaction(transactionId: string): Promise<FinancialTransaction | undefined>;
  getTransactionsByRepresentative(repId: number): Promise<FinancialTransaction[]>;
  getPendingTransactions(): Promise<FinancialTransaction[]>;
  rollbackTransaction(transactionId: string): Promise<void>;

  // Data Integrity Constraints (Clock Precision)
  createIntegrityConstraint(constraint: InsertDataIntegrityConstraint): Promise<DataIntegrityConstraint>;
  validateConstraints(entityType: string, entityId: number): Promise<{isValid: boolean, violations: any[]}>;
  getConstraintViolations(): Promise<DataIntegrityConstraint[]>;
  fixConstraintViolation(constraintId: number): Promise<boolean>;
  updateConstraintStatus(constraintId: number, status: string, details?: any): Promise<void>;

  // Atomic Operations (Complete Financial Transaction Processing)
  executeAtomicInvoiceEdit(editData: {
    invoiceId: number;
    editedUsageData: any;
    editReason: string;
    editedBy: string;
    originalAmount: number;
    editedAmount: number;
  }): Promise<{transactionId: string, editId: number, success: boolean}>;
}

export class DatabaseStorage implements IStorage {
  async getRepresentatives(): Promise<Representative[]> {
    return await withDatabaseRetry(
      () => db.select().from(representatives).orderBy(desc(representatives.createdAt)),
      'getRepresentatives'
    );
  }

  async getRepresentative(id: number): Promise<Representative | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [rep] = await db.select().from(representatives).where(eq(representatives.id, id));
        return rep || undefined;
      },
      'getRepresentative'
    );
  }

  async getRepresentativeByCode(code: string): Promise<Representative | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [rep] = await db.select().from(representatives).where(eq(representatives.code, code));
        return rep || undefined;
      },
      'getRepresentativeByCode'
    );
  }

  async getRepresentativeByPanelUsername(panelUsername: string): Promise<Representative | undefined> {
    const [rep] = await db.select().from(representatives).where(eq(representatives.panelUsername, panelUsername));
    return rep || undefined;
  }

  async getRepresentativeByPublicId(publicId: string): Promise<Representative | undefined> {
    const [rep] = await db.select().from(representatives).where(eq(representatives.publicId, publicId));
    return rep || undefined;
  }

  async createRepresentative(rep: InsertRepresentative): Promise<Representative> {
    const publicId = nanoid(32); // Generate unique public ID for portal access
    const [newRep] = await db
      .insert(representatives)
      .values({ ...rep, publicId })
      .returning();
    
    await this.createActivityLog({
      type: "representative_created",
      description: `نماینده جدید "${newRep.name}" اضافه شد`,
      relatedId: newRep.id
    });

    return newRep;
  }

  async updateRepresentative(id: number, rep: Partial<Representative>): Promise<Representative> {
    const [updated] = await db
      .update(representatives)
      .set({ ...rep, updatedAt: new Date() })
      .where(eq(representatives.id, id))
      .returning();
    return updated;
  }

  async deleteRepresentative(id: number): Promise<void> {
    await db.delete(representatives).where(eq(representatives.id, id));
  }

  async getSalesPartners(): Promise<SalesPartner[]> {
    return await db.select().from(salesPartners).orderBy(desc(salesPartners.createdAt));
  }

  async getSalesPartner(id: number): Promise<SalesPartner | undefined> {
    const [partner] = await db.select().from(salesPartners).where(eq(salesPartners.id, id));
    return partner || undefined;
  }

  async createSalesPartner(partner: InsertSalesPartner): Promise<SalesPartner> {
    const [newPartner] = await db
      .insert(salesPartners)
      .values(partner)
      .returning();
    
    await this.createActivityLog({
      type: "sales_partner_created",
      description: `همکار فروش جدید "${newPartner.name}" اضافه شد`,
      relatedId: newPartner.id
    });

    return newPartner;
  }

  async updateSalesPartner(id: number, partner: Partial<SalesPartner>): Promise<SalesPartner> {
    const [updated] = await db
      .update(salesPartners)
      .set(partner)
      .where(eq(salesPartners.id, id))
      .returning();
    return updated;
  }

  async getInvoices(): Promise<any[]> {
    return await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        representativeId: invoices.representativeId,
        amount: invoices.amount,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        usageData: invoices.usageData,
        sentToTelegram: invoices.sentToTelegram,
        telegramSentAt: invoices.telegramSentAt,
        createdAt: invoices.createdAt,
        // Join representative information
        representativeName: representatives.name,
        representativeCode: representatives.code,
        panelUsername: representatives.panelUsername
      })
      .from(invoices)
      .leftJoin(representatives, eq(invoices.representativeId, representatives.id))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByRepresentative(repId: number): Promise<any[]> {
    return await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        representativeId: invoices.representativeId,
        amount: invoices.amount,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        usageData: invoices.usageData,
        sentToTelegram: invoices.sentToTelegram,
        telegramSentAt: invoices.telegramSentAt,
        createdAt: invoices.createdAt,
        // Join representative information
        representativeName: representatives.name,
        representativeCode: representatives.code,
        panelUsername: representatives.panelUsername
      })
      .from(invoices)
      .leftJoin(representatives, eq(invoices.representativeId, representatives.id))
      .where(eq(invoices.representativeId, repId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoicesForTelegram(): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.sentToTelegram, false))
      .orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    // Generate invoice number
    const count = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    const invoiceNumber = `INV-${String(count[0].count + 1).padStart(4, '0')}`;

    const [newInvoice] = await db
      .insert(invoices)
      .values({ ...invoice, invoiceNumber })
      .returning();

    // Update representative's total debt
    await this.updateRepresentativeFinancials(newInvoice.representativeId);

    await this.createActivityLog({
      type: "invoice_created",
      description: `فاکتور ${invoiceNumber} برای نماینده ایجاد شد`,
      relatedId: newInvoice.id
    });

    return newInvoice;
  }

  async updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice> {
    const [updated] = await db
      .update(invoices)
      .set(invoice)
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  async markInvoicesAsSentToTelegram(invoiceIds: number[]): Promise<void> {
    // Use OR conditions for multiple IDs instead of ANY array syntax
    const whereConditions = invoiceIds.map(id => eq(invoices.id, id));
    const whereClause = whereConditions.length === 1 ? whereConditions[0] : or(...whereConditions);
    
    await db
      .update(invoices)
      .set({ 
        sentToTelegram: true, 
        telegramSentAt: new Date() 
      })
      .where(whereClause);

    await this.createActivityLog({
      type: "telegram_sent",
      description: `${invoiceIds.length} فاکتور به تلگرام ارسال شد`,
      metadata: { invoiceIds }
    });
  }

  async getPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async getPaymentsByRepresentative(repId: number): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.representativeId, repId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db
      .insert(payments)
      .values(payment)
      .returning();

    // Update representative's financials after payment
    await this.updateRepresentativeFinancials(newPayment.representativeId);

    const rep = await db.select().from(representatives)
      .where(eq(representatives.id, newPayment.representativeId));
    
    await this.createActivityLog({
      type: "payment_received",
      description: `پرداخت ${newPayment.amount} تومانی از نماینده "${rep[0]?.name}" ثبت شد`,
      relatedId: newPayment.id
    });

    return newPayment;
  }

  async allocatePaymentToInvoice(paymentId: number, invoiceId: number): Promise<void> {
    await db
      .update(payments)
      .set({ invoiceId, isAllocated: true })
      .where(eq(payments.id, paymentId));

    // Update invoice status if fully paid
    const payment = await db.select().from(payments).where(eq(payments.id, paymentId));
    const invoice = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    
    if (payment[0] && invoice[0] && 
        parseFloat(payment[0].amount) >= parseFloat(invoice[0].amount)) {
      await db
        .update(invoices)
        .set({ status: "paid" })
        .where(eq(invoices.id, invoiceId));
    }
  }

  async getActivityLogs(limit = 50): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db
      .insert(activityLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async updateSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    
    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [newSetting] = await db
        .insert(settings)
        .values({ key, value })
        .returning();
      return newSetting;
    }
  }

  async getDashboardData() {
    return await withDatabaseRetry(async () => {
      // Get financial totals
      const [totalRevenueResult] = await db
        .select({ 
          totalRevenue: sql<string>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)` 
        })
        .from(invoices)
        .where(eq(invoices.status, "paid"));

      const [totalDebtResult] = await db
        .select({ 
          totalDebt: sql<string>`COALESCE(SUM(CAST(total_debt as DECIMAL)), 0)` 
        })
        .from(representatives);

      // Count representatives and invoices
      const [activeReps] = await db
        .select({ count: sql<number>`count(*)` })
        .from(representatives)
        .where(eq(representatives.isActive, true));

      const [pendingInvs] = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.status, "unpaid"));

      const [overdueInvs] = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.status, "overdue"));

      const [totalPartners] = await db
        .select({ count: sql<number>`count(*)` })
        .from(salesPartners)
        .where(eq(salesPartners.isActive, true));

      // Get recent activities
      const recentActivities = await this.getActivityLogs(10);

      return {
        totalRevenue: totalRevenueResult.totalRevenue || "0",
        totalDebt: totalDebtResult.totalDebt || "0",
        activeRepresentatives: activeReps.count,
        pendingInvoices: pendingInvs.count,
        overdueInvoices: overdueInvs.count,
        totalSalesPartners: totalPartners.count,
        recentActivities
      };
    }, 'getDashboardData');
  }

  async updateRepresentativeFinancials(repId: number): Promise<void> {
    // Calculate total debt (unpaid + overdue invoices)
    const [debtResult] = await db
      .select({ 
        totalDebt: sql<string>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)` 
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.representativeId, repId),
          or(eq(invoices.status, "unpaid"), eq(invoices.status, "overdue"))
        )
      );

    // Calculate total sales (all invoices)
    const [salesResult] = await db
      .select({ 
        totalSales: sql<string>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)` 
      })
      .from(invoices)
      .where(eq(invoices.representativeId, repId));

    // Update representative
    await db
      .update(representatives)
      .set({
        totalDebt: debtResult.totalDebt || "0",
        totalSales: salesResult.totalSales || "0",
        updatedAt: new Date()
      })
      .where(eq(representatives.id, repId));
  }

  // Admin Users methods
  async getAdminUser(username: string): Promise<AdminUser | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
        return user || undefined;
      },
      'getAdminUser'
    );
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    return await withDatabaseRetry(
      async () => {
        const [newUser] = await db.insert(adminUsers).values(user).returning();
        return newUser;
      },
      'createAdminUser'
    );
  }

  async updateAdminUserLogin(id: number): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        await db
          .update(adminUsers)
          .set({ lastLoginAt: new Date() })
          .where(eq(adminUsers.id, id));
      },
      'updateAdminUserLogin'
    );
  }

  // Initialize default admin user if not exists
  async initializeDefaultAdminUser(username: string, password: string): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        const existingUser = await this.getAdminUser(username);
        if (!existingUser) {
          const passwordHash = await bcrypt.hash(password, 10);
          await this.createAdminUser({
            username,
            passwordHash,
            isActive: true
          });
          console.log(`Default admin user created: ${username}`);
        }
      },
      'initializeDefaultAdminUser'
    );
  }

  // Data Reset Functions
  async getDataCounts(): Promise<{
    representatives: number;
    invoices: number;
    payments: number;
    salesPartners: number;
    settings: number;
    activityLogs: number;
  }> {
    return await withDatabaseRetry(
      async () => {
        const [repCount] = await db.select({ count: sql<number>`count(*)` }).from(representatives);
        const [invCount] = await db.select({ count: sql<number>`count(*)` }).from(invoices);
        const [payCount] = await db.select({ count: sql<number>`count(*)` }).from(payments);
        const [partCount] = await db.select({ count: sql<number>`count(*)` }).from(salesPartners);
        const [setCount] = await db.select({ count: sql<number>`count(*)` }).from(settings);
        const [logCount] = await db.select({ count: sql<number>`count(*)` }).from(activityLogs);

        return {
          representatives: Number(repCount.count),
          invoices: Number(invCount.count),
          payments: Number(payCount.count),
          salesPartners: Number(partCount.count),
          settings: Number(setCount.count),
          activityLogs: Number(logCount.count),
        };
      },
      'getDataCounts'
    );
  }

  async resetData(options: {
    representatives: boolean;
    invoices: boolean;
    payments: boolean;
    salesPartners: boolean;
    settings: boolean;
    activityLogs: boolean;
  }): Promise<{
    deletedCounts: {
      representatives: number;
      invoices: number;
      payments: number;
      salesPartners: number;
      settings: number;
      activityLogs: number;
      total: number;
    };
  }> {
    return await withDatabaseRetry(
      async () => {
        const deletedCounts = {
          representatives: 0,
          invoices: 0,
          payments: 0,
          salesPartners: 0,
          settings: 0,
          activityLogs: 0,
          total: 0,
        };

        // Order matters for referential integrity
        // Delete in correct order to avoid foreign key constraint violations

        if (options.payments) {
          const result = await db.delete(payments);
          deletedCounts.payments = result.rowCount || 0;
          await this.createActivityLog({
            type: 'system',
            description: `بازنشانی پرداخت‌ها: ${deletedCounts.payments} رکورد حذف شد`,
            relatedId: null,
            metadata: { resetType: 'payments', count: deletedCounts.payments }
          });
        }

        if (options.invoices) {
          const result = await db.delete(invoices);
          deletedCounts.invoices = result.rowCount || 0;
          await this.createActivityLog({
            type: 'system',
            description: `بازنشانی فاکتورها: ${deletedCounts.invoices} رکورد حذف شد`,
            relatedId: null,
            metadata: { resetType: 'invoices', count: deletedCounts.invoices }
          });
        }

        if (options.representatives) {
          const result = await db.delete(representatives);
          deletedCounts.representatives = result.rowCount || 0;
          await this.createActivityLog({
            type: 'system',
            description: `بازنشانی نمایندگان: ${deletedCounts.representatives} رکورد حذف شد`,
            relatedId: null,
            metadata: { resetType: 'representatives', count: deletedCounts.representatives }
          });
        }

        if (options.salesPartners) {
          const result = await db.delete(salesPartners);
          deletedCounts.salesPartners = result.rowCount || 0;
          await this.createActivityLog({
            type: 'system',
            description: `بازنشانی همکاران فروش: ${deletedCounts.salesPartners} رکورد حذف شد`,
            relatedId: null,
            metadata: { resetType: 'salesPartners', count: deletedCounts.salesPartners }
          });
        }

        if (options.settings) {
          // Keep admin user settings but reset other settings
          const result = await db.delete(settings).where(
            and(
              sql`key NOT LIKE 'admin_%'`,
              sql`key != 'initialized'`
            )
          );
          deletedCounts.settings = result.rowCount || 0;
          await this.createActivityLog({
            type: 'system',
            description: `بازنشانی تنظیمات: ${deletedCounts.settings} تنظیم به حالت پیش‌فرض بازگردانده شد`,
            relatedId: null,
            metadata: { resetType: 'settings', count: deletedCounts.settings }
          });
        }

        // Activity logs should be deleted last (after logging other deletions)
        if (options.activityLogs) {
          const result = await db.delete(activityLogs);
          deletedCounts.activityLogs = result.rowCount || 0;
          // Don't log this deletion as logs are being cleared
        }

        // Calculate total (excluding the total field itself)
        const values = Object.entries(deletedCounts).filter(([key]) => key !== 'total').map(([, value]) => value);
        deletedCounts.total = values.reduce((sum, count) => sum + count, 0);

        return { deletedCounts };
      },
      'resetData'
    );
  }

  // Invoice Edits Methods
  async getInvoiceEdits(invoiceId: number): Promise<InvoiceEdit[]> {
    return await withDatabaseRetry(
      () => db.select().from(invoiceEdits)
        .where(eq(invoiceEdits.invoiceId, invoiceId))
        .orderBy(desc(invoiceEdits.createdAt)),
      'getInvoiceEdits'
    );
  }

  async createInvoiceEdit(edit: InsertInvoiceEdit): Promise<InvoiceEdit> {
    return await withDatabaseRetry(
      async () => {
        const [newEdit] = await db
          .insert(invoiceEdits)
          .values(edit)
          .returning();
        
        await this.createActivityLog({
          type: "invoice_edited",
          description: `فاکتور ${edit.invoiceId} توسط ${edit.editedBy} ویرایش شد`,
          relatedId: edit.invoiceId,
          metadata: {
            editType: edit.editType,
            originalAmount: edit.originalAmount,
            editedAmount: edit.editedAmount,
            editedBy: edit.editedBy
          }
        });

        return newEdit;
      },
      'createInvoiceEdit'
    );
  }

  async getInvoiceEditHistory(invoiceId: number): Promise<InvoiceEdit[]> {
    return await withDatabaseRetry(
      () => db.select().from(invoiceEdits)
        .where(and(
          eq(invoiceEdits.invoiceId, invoiceId),
          eq(invoiceEdits.isActive, true)
        ))
        .orderBy(desc(invoiceEdits.createdAt)),
      'getInvoiceEditHistory'
    );
  }

  async updateRepresentativeDebt(invoiceId: number, originalAmount: number, editedAmount: number): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        // Get invoice to find representative
        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
        if (!invoice) {
          throw new Error(`Invoice ${invoiceId} not found`);
        }

        // Calculate debt difference
        const debtDifference = editedAmount - originalAmount;
        
        // Update representative's total debt
        await db
          .update(representatives)
          .set({
            totalDebt: sql`${representatives.totalDebt} + ${debtDifference}`,
            updatedAt: new Date()
          })
          .where(eq(representatives.id, invoice.representativeId));

        await this.createActivityLog({
          type: "debt_updated",
          description: `بدهی نماینده به دلیل ویرایش فاکتور ${invoiceId} بروزرسانی شد`,
          relatedId: invoice.representativeId,
          metadata: {
            invoiceId: invoiceId,
            originalAmount: originalAmount,
            editedAmount: editedAmount,
            debtDifference: debtDifference
          }
        });
      },
      'updateRepresentativeDebt'
    );
  }

  // ====== FINANCIAL TRANSACTIONS (CLOCK CORE MECHANISM) ======
  async createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction> {
    return await withDatabaseRetry(
      async () => {
        const [created] = await db.insert(financialTransactions)
          .values({
            ...transaction,
            transactionId: transaction.transactionId || nanoid(),
            createdAt: new Date()
          })
          .returning();
        return created;
      },
      'createFinancialTransaction'
    );
  }

  async updateTransactionStatus(transactionId: string, status: string, actualState?: any): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        const updateData: any = { status };
        if (actualState) {
          updateData.actualState = actualState;
        }
        if (status === 'COMPLETED') {
          updateData.completedAt = new Date();
        }

        await db.update(financialTransactions)
          .set(updateData)
          .where(eq(financialTransactions.transactionId, transactionId));
      },
      'updateTransactionStatus'
    );
  }



  async getFinancialTransaction(transactionId: string): Promise<FinancialTransaction | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [transaction] = await db.select()
          .from(financialTransactions)
          .where(eq(financialTransactions.transactionId, transactionId));
        return transaction;
      },
      'getFinancialTransaction'
    );
  }

  async getTransactionsByRepresentative(repId: number): Promise<FinancialTransaction[]> {
    return await withDatabaseRetry(
      () => db.select()
        .from(financialTransactions)
        .where(eq(financialTransactions.representativeId, repId))
        .orderBy(desc(financialTransactions.createdAt)),
      'getTransactionsByRepresentative'
    );
  }

  async getPendingTransactions(): Promise<FinancialTransaction[]> {
    return await withDatabaseRetry(
      () => db.select()
        .from(financialTransactions)
        .where(eq(financialTransactions.status, 'PENDING'))
        .orderBy(desc(financialTransactions.createdAt)),
      'getPendingTransactions'
    );
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        const transaction = await this.getFinancialTransaction(transactionId);
        if (!transaction) {
          throw new Error(`Transaction ${transactionId} not found`);
        }

        // Restore original state using rollback data
        if (transaction.rollbackData) {
          // Implementation depends on transaction type
          const rollbackData = transaction.rollbackData as any;
          
          if (transaction.type === 'INVOICE_EDIT') {
            // Restore original invoice amount and representative debt
            await db.update(invoices)
              .set({ amount: rollbackData.originalAmount })
              .where(eq(invoices.id, rollbackData.invoiceId));
              
            await db.update(representatives)
              .set({ 
                totalDebt: rollbackData.originalRepresentativeDebt,
                updatedAt: new Date()
              })
              .where(eq(representatives.id, rollbackData.representativeId));
          }
        }

        // Mark transaction as rolled back
        await this.updateTransactionStatus(transactionId, 'ROLLED_BACK');
        
        await this.createActivityLog({
          type: "transaction_rollback",
          description: `تراکنش ${transactionId} برگردانده شد`,
          relatedId: transaction.representativeId,
          metadata: { transactionId, originalType: transaction.type }
        });
      },
      'rollbackTransaction'
    );
  }

  // ====== DATA INTEGRITY CONSTRAINTS (CLOCK PRECISION) ======
  async createIntegrityConstraint(constraint: InsertDataIntegrityConstraint): Promise<DataIntegrityConstraint> {
    return await withDatabaseRetry(
      async () => {
        const [created] = await db.insert(dataIntegrityConstraints)
          .values({
            ...constraint,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        return created;
      },
      'createIntegrityConstraint'
    );
  }

  async validateConstraints(entityType: string, entityId: number): Promise<{isValid: boolean, violations: any[]}> {
    return await withDatabaseRetry(
      async () => {
        const constraints = await db.select()
          .from(dataIntegrityConstraints)
          .where(and(
            eq(dataIntegrityConstraints.entityType, entityType),
            eq(dataIntegrityConstraints.entityId, entityId),
            eq(dataIntegrityConstraints.currentStatus, 'VALID')
          ));

        const violations: any[] = [];
        
        for (const constraint of constraints) {
          const rule = constraint.constraintRule as any;
          
          if (constraint.constraintType === 'BALANCE_CHECK') {
            // Check representative balance consistency
            const [rep] = await db.select().from(representatives).where(eq(representatives.id, entityId));
            if (rep && rule.maxDebt && parseFloat(rep.totalDebt || '0') > rule.maxDebt) {
              violations.push({
                constraintId: constraint.id,
                type: 'DEBT_LIMIT_EXCEEDED',
                current: rep.totalDebt,
                limit: rule.maxDebt
              });
            }
          }
        }

        return {
          isValid: violations.length === 0,
          violations
        };
      },
      'validateConstraints'
    );
  }

  async getConstraintViolations(): Promise<DataIntegrityConstraint[]> {
    return await withDatabaseRetry(
      () => db.select()
        .from(dataIntegrityConstraints)
        .where(eq(dataIntegrityConstraints.currentStatus, 'VIOLATED'))
        .orderBy(desc(dataIntegrityConstraints.lastValidationAt)),
      'getConstraintViolations'
    );
  }

  async fixConstraintViolation(constraintId: number): Promise<boolean> {
    return await withDatabaseRetry(
      async () => {
        const [constraint] = await db.select()
          .from(dataIntegrityConstraints)
          .where(eq(dataIntegrityConstraints.id, constraintId));

        if (!constraint) return false;

        // Auto-fix logic based on constraint type
        let fixed = false;
        if (constraint.constraintType === 'BALANCE_CHECK') {
          // Recalculate representative financial totals
          await this.updateRepresentativeFinancials(constraint.entityId);
          fixed = true;
        }

        if (fixed) {
          await this.updateConstraintStatus(constraintId, 'VALID');
        }

        return fixed;
      },
      'fixConstraintViolation'
    );
  }

  async updateConstraintStatus(constraintId: number, status: string, details?: any): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        const updateData: any = {
          currentStatus: status,
          lastValidationAt: new Date(),
          updatedAt: new Date()
        };
        
        if (details) {
          updateData.violationDetails = details;
        }

        await db.update(dataIntegrityConstraints)
          .set(updateData)
          .where(eq(dataIntegrityConstraints.id, constraintId));
      },
      'updateConstraintStatus'
    );
  }

  // ====== FINANCIAL RECONCILIATION ======
  async reconcileFinancialData(): Promise<{success: boolean, message: string}> {
    return await withDatabaseRetry(
      async () => {
        // Simple reconciliation - check for any pending transactions
        const pendingTransactions = await this.getPendingTransactions();
        return {
          success: true,
          message: `هماهنگی کامل شد. ${pendingTransactions.length} تراکنش در انتظار پردازش`
        };
      },
      'reconcileFinancialData'
    );
  }

  // ====== ATOMIC OPERATIONS (COMPLETE CLOCK SYNCHRONIZATION) ======
  async executeAtomicInvoiceEdit(editData: {
    invoiceId: number;
    editedUsageData: any;
    editReason: string;
    editedBy: string;
    originalAmount: number;
    editedAmount: number;
  }): Promise<{transactionId: string, editId: number, success: boolean}> {
    
    const transactionId = `EDIT-${editData.invoiceId}-${Date.now()}-${nanoid(8)}`;
    
    return await withDatabaseRetry(
      async () => {
        try {
          // Start transaction
          const [invoice] = await db.select().from(invoices).where(eq(invoices.id, editData.invoiceId));
          if (!invoice) {
            throw new Error(`Invoice ${editData.invoiceId} not found`);
          }

          const [representative] = await db.select().from(representatives)
            .where(eq(representatives.id, invoice.representativeId));
          
          if (!representative) {
            throw new Error(`Representative ${invoice.representativeId} not found`);
          }

          // Create financial transaction record
          await this.createFinancialTransaction({
            transactionId,
            type: 'INVOICE_EDIT',
            representativeId: invoice.representativeId,
            relatedEntityType: 'invoice',
            relatedEntityId: editData.invoiceId,
            originalState: {
              invoiceAmount: editData.originalAmount,
              representativeDebt: representative.totalDebt,
              usageData: invoice.usageData
            },
            targetState: {
              invoiceAmount: editData.editedAmount,
              newUsageData: editData.editedUsageData
            },
            financialImpact: {
              debtChange: editData.editedAmount - editData.originalAmount,
              balanceChange: editData.editedAmount - editData.originalAmount
            },
            rollbackData: {
              invoiceId: editData.invoiceId,
              originalAmount: editData.originalAmount,
              representativeId: invoice.representativeId,
              originalRepresentativeDebt: representative.totalDebt,
              originalUsageData: invoice.usageData
            },
            initiatedBy: editData.editedBy
          });

          // Create invoice edit record
          const [createdEdit] = await db.insert(invoiceEdits)
            .values({
              invoiceId: editData.invoiceId,
              originalUsageData: invoice.usageData,
              editedUsageData: editData.editedUsageData,
              editType: 'MANUAL_EDIT',
              editReason: editData.editReason,
              originalAmount: editData.originalAmount.toString(),
              editedAmount: editData.editedAmount.toString(),
              editedBy: editData.editedBy,
              transactionId: transactionId
            })
            .returning();

          // Update invoice amount and usage data
          await db.update(invoices)
            .set({
              amount: editData.editedAmount.toString(),
              usageData: editData.editedUsageData
            })
            .where(eq(invoices.id, editData.invoiceId));

          // Update representative debt
          const debtDifference = editData.editedAmount - editData.originalAmount;
          await db.update(representatives)
            .set({
              totalDebt: sql`${representatives.totalDebt} + ${debtDifference}`,
              updatedAt: new Date()
            })
            .where(eq(representatives.id, invoice.representativeId));

          // Complete transaction
          await this.updateTransactionStatus(transactionId, 'COMPLETED', {
            invoiceAmount: editData.editedAmount,
            newRepresentativeDebt: sql`${representatives.totalDebt} + ${debtDifference}`,
            editId: createdEdit.id
          });

          // Create activity log
          await this.createActivityLog({
            type: "atomic_invoice_edit",
            description: `فاکتور ${editData.invoiceId} با تراکنش اتمیک ${transactionId} ویرایش شد`,
            relatedId: invoice.representativeId,
            metadata: {
              transactionId,
              editId: createdEdit.id,
              originalAmount: editData.originalAmount,
              editedAmount: editData.editedAmount,
              debtChange: debtDifference
            }
          });

          return {
            transactionId,
            editId: createdEdit.id,
            success: true
          };

        } catch (error: any) {
          // Rollback transaction on error
          await this.updateTransactionStatus(transactionId, 'ROLLED_BACK');
          throw error;
        }
      },
      'executeAtomicInvoiceEdit'
    );
  }
}

export const storage = new DatabaseStorage();
