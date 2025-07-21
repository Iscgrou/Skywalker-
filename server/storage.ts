import { 
  representatives, salesPartners, invoices, payments, activityLogs, settings,
  type Representative, type InsertRepresentative,
  type SalesPartner, type InsertSalesPartner,
  type Invoice, type InsertInvoice,
  type Payment, type InsertPayment,
  type ActivityLog, type InsertActivityLog,
  type Setting, type InsertSetting
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, ilike } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // Representatives
  getRepresentatives(): Promise<Representative[]>;
  getRepresentativeByCode(code: string): Promise<Representative | undefined>;
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
}

export class DatabaseStorage implements IStorage {
  async getRepresentatives(): Promise<Representative[]> {
    return await db.select().from(representatives).orderBy(desc(representatives.createdAt));
  }

  async getRepresentativeByCode(code: string): Promise<Representative | undefined> {
    const [rep] = await db.select().from(representatives).where(eq(representatives.code, code));
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

  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByRepresentative(repId: number): Promise<Invoice[]> {
    return await db.select().from(invoices)
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
    await db
      .update(invoices)
      .set({ 
        sentToTelegram: true, 
        telegramSentAt: new Date() 
      })
      .where(sql`${invoices.id} = ANY(${invoiceIds})`);

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
}

export const storage = new DatabaseStorage();
