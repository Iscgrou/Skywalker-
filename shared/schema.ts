import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Representatives (نمایندگان)
export const representatives = pgTable("representatives", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // REP-001, mntzresf, etc.
  name: text("name").notNull(), // Shop name
  ownerName: text("owner_name"), // صاحب فروشگاه
  panelUsername: text("panel_username").notNull(), // یوزرنیم ادمین پنل - admin_username from JSON
  phone: text("phone"),
  publicId: text("public_id").notNull().unique(), // For public portal access - based on panelUsername
  salesPartnerId: integer("sales_partner_id"), // همکار فروش معرف
  isActive: boolean("is_active").default(true),
  totalDebt: decimal("total_debt", { precision: 15, scale: 2 }).default("0"), // بدهی کل
  totalSales: decimal("total_sales", { precision: 15, scale: 2 }).default("0"), // فروش کل
  credit: decimal("credit", { precision: 15, scale: 2 }).default("0"), // اعتبار
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Sales Partners (همکاران فروش)
export const salesPartners = pgTable("sales_partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("0"), // نرخ کمیسیون درصدی
  totalCommission: decimal("total_commission", { precision: 15, scale: 2 }).default("0"), // کل کمیسیون
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Invoices (فاکتورها)
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  representativeId: integer("representative_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  issueDate: text("issue_date").notNull(), // Persian date: 1404/4/30
  dueDate: text("due_date"), // Persian date
  status: text("status").notNull().default("unpaid"), // unpaid, paid, overdue
  usageData: json("usage_data"), // Raw JSON data from uploaded file
  sentToTelegram: boolean("sent_to_telegram").default(false),
  telegramSentAt: timestamp("telegram_sent_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Payments (پرداخت‌ها)
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  representativeId: integer("representative_id").notNull(),
  invoiceId: integer("invoice_id"), // null if not assigned to specific invoice
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: text("payment_date").notNull(), // Persian date
  description: text("description"),
  isAllocated: boolean("is_allocated").default(false), // آیا تخصیص یافته
  createdAt: timestamp("created_at").defaultNow()
});

// Activity Log (لاگ فعالیت‌ها)
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // invoice_created, payment_received, telegram_sent, etc.
  description: text("description").notNull(),
  relatedId: integer("related_id"), // ID of related entity
  metadata: json("metadata"), // Additional data
  createdAt: timestamp("created_at").defaultNow()
});

// Admin Users (کاربران ادمین)
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Invoice Edits (ویرایش‌های فاکتور)
export const invoiceEdits = pgTable("invoice_edits", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  originalUsageData: json("original_usage_data"),
  editedUsageData: json("edited_usage_data"),
  editType: text("edit_type").notNull(), // "MANUAL_EDIT", "RECORD_ADD", "RECORD_DELETE"
  editReason: text("edit_reason"),
  originalAmount: decimal("original_amount", { precision: 15, scale: 2 }),
  editedAmount: decimal("edited_amount", { precision: 15, scale: 2 }),
  editedBy: text("edited_by").notNull(),
  isActive: boolean("is_active").default(true),
  transactionId: text("transaction_id"), // UUID for atomic transaction tracking
  createdAt: timestamp("created_at").defaultNow()
});

// Financial Transactions (تراکنش‌های مالی) - Clock's Core Gear System
export const financialTransactions = pgTable("financial_transactions", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(), // UUID for atomic operations
  type: text("type").notNull(), // "INVOICE_CREATE", "INVOICE_EDIT", "PAYMENT_ALLOCATE", "DEBT_RECONCILE"
  status: text("status").notNull().default("PENDING"), // "PENDING", "COMPLETED", "ROLLED_BACK"
  representativeId: integer("representative_id").notNull(),
  relatedEntityType: text("related_entity_type"), // "invoice", "payment", "edit"
  relatedEntityId: integer("related_entity_id"),
  originalState: json("original_state"), // Snapshot before transaction
  targetState: json("target_state"), // Intended state after transaction
  actualState: json("actual_state"), // Final state after completion
  financialImpact: json("financial_impact"), // { debtChange, creditChange, balanceChange }
  processingSteps: json("processing_steps").default([]), // Array of atomic steps
  rollbackData: json("rollback_data"), // Data needed for rollback
  initiatedBy: text("initiated_by").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Data Integrity Constraints (محدودیت‌های یکپارچگی داده) - Clock's Precision Mechanism
export const dataIntegrityConstraints = pgTable("data_integrity_constraints", {
  id: serial("id").primaryKey(),
  constraintType: text("constraint_type").notNull(), // "BALANCE_CHECK", "DEBT_LIMIT", "FINANCIAL_RECONCILIATION"
  entityType: text("entity_type").notNull(), // "representative", "invoice", "payment"
  entityId: integer("entity_id").notNull(),
  constraintRule: json("constraint_rule"), // Validation rules and limits
  currentStatus: text("current_status").notNull().default("VALID"), // "VALID", "VIOLATED", "WARNING"
  lastValidationAt: timestamp("last_validation_at").defaultNow(),
  violationDetails: json("violation_details"), // Details if constraint is violated
  autoFixAttempts: integer("auto_fix_attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Settings (تنظیمات)
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Relations
export const representativesRelations = relations(representatives, ({ one, many }) => ({
  salesPartner: one(salesPartners, {
    fields: [representatives.salesPartnerId],
    references: [salesPartners.id]
  }),
  invoices: many(invoices),
  payments: many(payments)
}));

export const salesPartnersRelations = relations(salesPartners, ({ many }) => ({
  representatives: many(representatives)
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  representative: one(representatives, {
    fields: [invoices.representativeId],
    references: [representatives.id]
  })
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  representative: one(representatives, {
    fields: [payments.representativeId],
    references: [representatives.id]
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id]
  })
}));

export const invoiceEditsRelations = relations(invoiceEdits, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceEdits.invoiceId],
    references: [invoices.id]
  }),
  transaction: one(financialTransactions, {
    fields: [invoiceEdits.transactionId],
    references: [financialTransactions.transactionId]
  })
}));

export const financialTransactionsRelations = relations(financialTransactions, ({ one, many }) => ({
  representative: one(representatives, {
    fields: [financialTransactions.representativeId],
    references: [representatives.id]
  }),
  invoiceEdits: many(invoiceEdits)
}));

export const dataIntegrityConstraintsRelations = relations(dataIntegrityConstraints, ({ one }) => ({
  representative: one(representatives, {
    fields: [dataIntegrityConstraints.entityId],
    references: [representatives.id]
  })
}));

// Insert Schemas
export const insertRepresentativeSchema = createInsertSchema(representatives).omit({
  id: true,
  publicId: true,
  totalDebt: true,
  totalSales: true,
  credit: true,
  createdAt: true,
  updatedAt: true
});

export const insertSalesPartnerSchema = createInsertSchema(salesPartners).omit({
  id: true,
  totalCommission: true,
  createdAt: true
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  invoiceNumber: true,
  sentToTelegram: true,
  telegramSentAt: true,
  createdAt: true
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  isAllocated: true,
  createdAt: true
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  lastLoginAt: true,
  createdAt: true
});

export const insertInvoiceEditSchema = createInsertSchema(invoiceEdits).omit({
  id: true,
  createdAt: true
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  status: true,
  completedAt: true,
  createdAt: true
});

export const insertDataIntegrityConstraintSchema = createInsertSchema(dataIntegrityConstraints).omit({
  id: true,
  currentStatus: true,
  lastValidationAt: true,
  autoFixAttempts: true,
  createdAt: true,
  updatedAt: true
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true
});

// Types
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export type Representative = typeof representatives.$inferSelect;
export type InsertRepresentative = z.infer<typeof insertRepresentativeSchema>;

export type SalesPartner = typeof salesPartners.$inferSelect;
export type InsertSalesPartner = z.infer<typeof insertSalesPartnerSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type InvoiceEdit = typeof invoiceEdits.$inferSelect;
export type InsertInvoiceEdit = z.infer<typeof insertInvoiceEditSchema>;

export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;

export type DataIntegrityConstraint = typeof dataIntegrityConstraints.$inferSelect;
export type InsertDataIntegrityConstraint = z.infer<typeof insertDataIntegrityConstraintSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
