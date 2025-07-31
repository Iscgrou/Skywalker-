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

// ==================== CRM INTELLIGENT SYSTEM ====================

// CRM Representative Levels (سطح‌بندی نمایندگان)
export const representativeLevels = pgTable("representative_levels", {
  id: serial("id").primaryKey(),
  representativeId: integer("representative_id").notNull(),
  currentLevel: text("current_level").notNull(), // "NEW", "ACTIVE", "INACTIVE"
  previousLevel: text("previous_level"),
  levelChangeReason: text("level_change_reason"),
  psychologicalProfile: json("psychological_profile"), // Deep psychological analysis
  communicationStyle: text("communication_style"), // "FORMAL", "FRIENDLY", "DIRECT", "SUPPORTIVE"
  responsePattern: json("response_pattern"), // Historical response behavior
  motivationFactors: json("motivation_factors"), // What motivates this representative
  performanceMetrics: json("performance_metrics"), // Calculated performance data
  aiAssessment: json("ai_assessment"), // AI's assessment of the representative
  lastInteractionDate: timestamp("last_interaction_date"),
  autoLevelChangeAt: timestamp("auto_level_change_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// CRM Tasks (وظایف هوشمند)
export const crmTasks = pgTable("crm_tasks", {
  id: serial("id").primaryKey(),
  taskId: text("task_id").notNull().unique(), // UUID for tracking
  representativeId: integer("representative_id").notNull(),
  aiGeneratedByModel: text("ai_generated_by_model").default("PERSIAN_CRM_AI"), // Which AI model generated this
  taskType: text("task_type").notNull(), // "FOLLOW_UP", "DEBT_COLLECTION", "RELATIONSHIP_BUILDING", "PERFORMANCE_CHECK"
  priority: text("priority").notNull(), // "URGENT", "HIGH", "MEDIUM", "LOW"
  status: text("status").notNull().default("ASSIGNED"), // "ASSIGNED", "IN_PROGRESS", "COMPLETED", "FAILED", "ESCALATED"
  title: text("title").notNull(),
  description: text("description").notNull(),
  expectedOutcome: text("expected_outcome"), // What should be achieved
  contextualData: json("contextual_data"), // Data from admin panel that influenced this task
  dueDate: timestamp("due_date").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  aiConfidenceScore: integer("ai_confidence_score"), // How confident AI is about this task (1-100)
  xpReward: integer("xp_reward").default(0), // Gamification points
  difficultyLevel: integer("difficulty_level").default(1), // 1-5 scale
  reminderCount: integer("reminder_count").default(0),
  escalationLevel: integer("escalation_level").default(0),
  createdAt: timestamp("created_at").defaultNow()
});

// CRM Task Results (نتایج وظایف)
export const crmTaskResults = pgTable("crm_task_results", {
  id: serial("id").primaryKey(),
  taskId: text("task_id").notNull(),
  representativeId: integer("representative_id").notNull(),
  submissionType: text("submission_type").notNull(), // "MANUAL", "SYSTEM_DETECTED", "AUTO_GENERATED"
  outcome: text("outcome").notNull(), // "SUCCESS", "PARTIAL_SUCCESS", "FAILURE", "NEEDS_FOLLOW_UP"
  detailedReport: text("detailed_report").notNull(),
  emotionalTone: text("emotional_tone"), // AI-detected tone: "POSITIVE", "NEUTRAL", "NEGATIVE", "FRUSTRATED"
  communicationQuality: integer("communication_quality"), // AI-assessed quality (1-10)
  objectivesAchieved: json("objectives_achieved"), // Which objectives were met
  lessonsLearned: text("lessons_learned"),
  improvementSuggestions: text("improvement_suggestions"),
  aiEvaluation: json("ai_evaluation"), // AI's assessment of the result
  xpEarned: integer("xp_earned").default(0),
  qualityScore: integer("quality_score"), // Overall quality assessment (1-100)
  followUpRequired: boolean("follow_up_required").default(false),
  followUpReason: text("follow_up_reason"),
  submittedAt: timestamp("submitted_at").defaultNow()
});

// AI Knowledge Base (دیتابیس دانش هوشمند)
export const aiKnowledgeBase = pgTable("ai_knowledge_base", {
  id: serial("id").primaryKey(),
  knowledgeId: text("knowledge_id").notNull().unique(),
  category: text("category").notNull(), // "BEST_PRACTICE", "COMMON_MISTAKE", "SUCCESSFUL_APPROACH", "CULTURAL_INSIGHT"
  title: text("title").notNull(),
  description: text("description").notNull(),
  sourceType: text("source_type").notNull(), // "TASK_RESULT", "ADMIN_INPUT", "AI_ANALYSIS", "PATTERN_DETECTION"
  sourceId: text("source_id"), // Reference to source data
  applicableScenarios: json("applicable_scenarios"), // When to apply this knowledge
  successRate: decimal("success_rate", { precision: 5, scale: 2 }), // How successful this knowledge has been
  usageCount: integer("usage_count").default(0),
  culturalContext: text("cultural_context"), // Persian/Iranian business culture context
  confidenceLevel: integer("confidence_level"), // AI confidence in this knowledge (1-100)
  tags: json("tags").default([]), // Searchable tags
  relatedKnowledge: json("related_knowledge").default([]), // Links to related knowledge
  lastUsedAt: timestamp("last_used_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// AI Decision Log (لاگ تصمیم‌گیری هوش مصنوعی)
export const aiDecisionLog = pgTable("ai_decision_log", {
  id: serial("id").primaryKey(),
  decisionId: text("decision_id").notNull().unique(),
  decisionType: text("decision_type").notNull(), // "TASK_ASSIGNMENT", "PRIORITY_CHANGE", "LEVEL_CHANGE", "ESCALATION"
  representativeId: integer("representative_id"),
  inputData: json("input_data"), // Data used to make the decision
  reasoning: text("reasoning").notNull(), // AI's reasoning process
  confidenceScore: integer("confidence_score"), // How confident AI is (1-100)
  expectedOutcome: text("expected_outcome"),
  actualOutcome: text("actual_outcome"), // To be filled later for learning
  contextFactors: json("context_factors"), // What factors influenced the decision
  culturalConsiderations: json("cultural_considerations"), // Persian culture factors
  alternativeOptions: json("alternative_options"), // Other options AI considered
  decisionEffectiveness: integer("decision_effectiveness"), // Measured later (1-10)
  learningPoints: text("learning_points"), // What AI learned from this decision
  adminOverride: boolean("admin_override").default(false),
  overrideReason: text("override_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  evaluatedAt: timestamp("evaluated_at")
});

// CRM Performance Analytics (آنالیز عملکرد)
export const crmPerformanceAnalytics = pgTable("crm_performance_analytics", {
  id: serial("id").primaryKey(),
  representativeId: integer("representative_id").notNull(),
  analyticsId: text("analytics_id").notNull().unique(),
  period: text("period").notNull(), // "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // Task Performance
  tasksAssigned: integer("tasks_assigned").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  tasksOverdue: integer("tasks_overdue").default(0),
  averageCompletionTime: integer("average_completion_time"), // in hours
  
  // Quality Metrics
  averageQualityScore: decimal("average_quality_score", { precision: 5, 2 }),
  communicationQuality: decimal("communication_quality", { precision: 5, 2 }),
  customerSatisfaction: decimal("customer_satisfaction", { precision: 5, 2 }),
  
  // Relationship Metrics
  relationshipScore: integer("relationship_score"), // 1-100
  responseTime: integer("response_time"), // average response time in hours
  proactiveActions: integer("proactive_actions"), // self-initiated actions
  
  // Improvement Tracking
  improvementAreas: json("improvement_areas"),
  strengthAreas: json("strength_areas"),
  recommendedActions: json("recommended_actions"),
  
  // AI Analysis
  aiInsights: json("ai_insights"),
  predictedTrends: json("predicted_trends"),
  personalizedRecommendations: json("personalized_recommendations"),
  
  createdAt: timestamp("created_at").defaultNow()
});

// CRM System Events (رویدادهای سیستم)
export const crmSystemEvents = pgTable("crm_system_events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(), // "ADMIN_SYNC", "AI_DECISION", "PERFORMANCE_ALERT", "SYSTEM_LEARNING"
  description: text("description").notNull(),
  relatedEntities: json("related_entities"), // What entities are affected
  adminPanelData: json("admin_panel_data"), // Data pulled from admin panel
  crmPanelImpact: json("crm_panel_impact"), // How this affects CRM panel
  automatedActions: json("automated_actions"), // What actions were taken automatically
  requiresHumanReview: boolean("requires_human_review").default(false),
  reviewedBy: text("reviewed_by"),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at"),
  priority: text("priority").notNull(), // "LOW", "MEDIUM", "HIGH", "CRITICAL"
  status: text("status").notNull().default("ACTIVE"), // "ACTIVE", "RESOLVED", "ESCALATED"
  createdAt: timestamp("created_at").defaultNow()
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

// CRM Relations
export const representativeLevelsRelations = relations(representativeLevels, ({ one }) => ({
  representative: one(representatives, {
    fields: [representativeLevels.representativeId],
    references: [representatives.id]
  })
}));

export const crmTasksRelations = relations(crmTasks, ({ one, many }) => ({
  representative: one(representatives, {
    fields: [crmTasks.representativeId],
    references: [representatives.id]
  }),
  results: many(crmTaskResults)
}));

export const crmTaskResultsRelations = relations(crmTaskResults, ({ one }) => ({
  task: one(crmTasks, {
    fields: [crmTaskResults.taskId],
    references: [crmTasks.taskId]
  }),
  representative: one(representatives, {
    fields: [crmTaskResults.representativeId],
    references: [representatives.id]
  })
}));

export const crmPerformanceAnalyticsRelations = relations(crmPerformanceAnalytics, ({ one }) => ({
  representative: one(representatives, {
    fields: [crmPerformanceAnalytics.representativeId],
    references: [representatives.id]
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

// CRM Insert Schemas
export const insertRepresentativeLevelSchema = createInsertSchema(representativeLevels).omit({
  id: true,
  autoLevelChangeAt: true,
  createdAt: true,
  updatedAt: true
});

export const insertCrmTaskSchema = createInsertSchema(crmTasks).omit({
  id: true,
  assignedAt: true,
  startedAt: true,
  completedAt: true,
  reminderCount: true,
  escalationLevel: true,
  createdAt: true
});

export const insertCrmTaskResultSchema = createInsertSchema(crmTaskResults).omit({
  id: true,
  submittedAt: true
});

export const insertAiKnowledgeBaseSchema = createInsertSchema(aiKnowledgeBase).omit({
  id: true,
  usageCount: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true
});

export const insertAiDecisionLogSchema = createInsertSchema(aiDecisionLog).omit({
  id: true,
  actualOutcome: true,
  decisionEffectiveness: true,
  learningPoints: true,
  adminOverride: true,
  overrideReason: true,
  createdAt: true,
  evaluatedAt: true
});

export const insertCrmPerformanceAnalyticsSchema = createInsertSchema(crmPerformanceAnalytics).omit({
  id: true,
  createdAt: true
});

export const insertCrmSystemEventSchema = createInsertSchema(crmSystemEvents).omit({
  id: true,
  reviewedBy: true,
  reviewNotes: true,
  reviewedAt: true,
  createdAt: true
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

// CRM Types
export type RepresentativeLevel = typeof representativeLevels.$inferSelect;
export type InsertRepresentativeLevel = z.infer<typeof insertRepresentativeLevelSchema>;

export type CrmTask = typeof crmTasks.$inferSelect;
export type InsertCrmTask = z.infer<typeof insertCrmTaskSchema>;

export type CrmTaskResult = typeof crmTaskResults.$inferSelect;
export type InsertCrmTaskResult = z.infer<typeof insertCrmTaskResultSchema>;

export type AiKnowledgeBase = typeof aiKnowledgeBase.$inferSelect;
export type InsertAiKnowledgeBase = z.infer<typeof insertAiKnowledgeBaseSchema>;

export type AiDecisionLog = typeof aiDecisionLog.$inferSelect;
export type InsertAiDecisionLog = z.infer<typeof insertAiDecisionLogSchema>;

export type CrmPerformanceAnalytics = typeof crmPerformanceAnalytics.$inferSelect;
export type InsertCrmPerformanceAnalytics = z.infer<typeof insertCrmPerformanceAnalyticsSchema>;

export type CrmSystemEvent = typeof crmSystemEvents.$inferSelect;
export type InsertCrmSystemEvent = z.infer<typeof insertCrmSystemEventSchema>;
