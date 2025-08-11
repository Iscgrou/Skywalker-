CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"related_id" integer,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'ADMIN',
	"permissions" json DEFAULT '["FINANCIAL_MANAGEMENT","REPORTS"]'::json,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "ai_configuration" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_name" text NOT NULL,
	"config_category" text NOT NULL,
	"ai_enabled" boolean DEFAULT true,
	"default_model" text DEFAULT 'groq/llama-3.1-8b-instant',
	"max_tokens" integer DEFAULT 4096,
	"temperature" numeric(3, 2) DEFAULT '0.7',
	"top_p" numeric(3, 2) DEFAULT '0.9',
	"frequency_penalty" numeric(3, 2) DEFAULT '0.0',
	"presence_penalty" numeric(3, 2) DEFAULT '0.0',
	"cultural_sensitivity" numeric(3, 2) DEFAULT '0.95',
	"religious_sensitivity" numeric(3, 2) DEFAULT '0.9',
	"traditional_values_weight" numeric(3, 2) DEFAULT '0.8',
	"language_formality" text DEFAULT 'RESPECTFUL',
	"persian_poetry_integration" boolean DEFAULT true,
	"cultural_metaphors" boolean DEFAULT true,
	"proactivity_level" numeric(3, 2) DEFAULT '0.8',
	"confidence_threshold" numeric(3, 2) DEFAULT '0.75',
	"learning_rate" numeric(3, 2) DEFAULT '0.1',
	"creativity_level" numeric(3, 2) DEFAULT '0.6',
	"risk_tolerance" numeric(3, 2) DEFAULT '0.3',
	"context_window_memory" integer DEFAULT 10,
	"groq_model_variant" text DEFAULT 'llama-3.1-8b-instant',
	"groq_api_endpoint" text DEFAULT 'https://api.groq.com/openai/v1',
	"max_concurrent_requests" integer DEFAULT 5,
	"request_timeout_ms" integer DEFAULT 30000,
	"retry_attempts" integer DEFAULT 3,
	"rate_limit_rpm" integer DEFAULT 30,
	"data_encryption" boolean DEFAULT true,
	"access_logging" boolean DEFAULT true,
	"sensitive_data_redaction" boolean DEFAULT true,
	"emergency_stop_enabled" boolean DEFAULT true,
	"audit_trail" boolean DEFAULT true,
	"response_time_limit" integer DEFAULT 5000,
	"quality_threshold" numeric(3, 2) DEFAULT '0.8',
	"error_rate_threshold" numeric(3, 2) DEFAULT '0.05',
	"performance_metrics" json DEFAULT '{}'::json,
	"system_prompt" text,
	"cultural_prompts" json DEFAULT '[]'::json,
	"behavior_prompts" json DEFAULT '[]'::json,
	"special_instructions" json DEFAULT '[]'::json,
	"telegram_integration" boolean DEFAULT false,
	"xai_integration" boolean DEFAULT false,
	"custom_api_endpoints" json DEFAULT '[]'::json,
	"is_active" boolean DEFAULT true,
	"last_modified_by" text,
	"config_version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_configuration_config_name_unique" UNIQUE("config_name")
);
--> statement-breakpoint
CREATE TABLE "ai_decision_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"decision_type" text NOT NULL,
	"representative_id" integer,
	"input_data" json,
	"reasoning" text NOT NULL,
	"confidence_score" integer,
	"expected_outcome" text,
	"actual_outcome" text,
	"context_factors" json,
	"cultural_considerations" json,
	"alternative_options" json,
	"decision_effectiveness" integer,
	"learning_points" text,
	"admin_override" boolean DEFAULT false,
	"override_reason" text,
	"created_at" timestamp DEFAULT now(),
	"evaluated_at" timestamp,
	CONSTRAINT "ai_decision_log_decision_id_unique" UNIQUE("decision_id")
);
--> statement-breakpoint
CREATE TABLE "ai_knowledge_base" (
	"id" serial PRIMARY KEY NOT NULL,
	"knowledge_id" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text,
	"applicable_scenarios" json,
	"success_rate" numeric(5, 2),
	"usage_count" integer DEFAULT 0,
	"cultural_context" text,
	"confidence_level" integer,
	"tags" json DEFAULT '[]'::json,
	"related_knowledge" json DEFAULT '[]'::json,
	"last_used_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_knowledge_base_knowledge_id_unique" UNIQUE("knowledge_id")
);
--> statement-breakpoint
CREATE TABLE "ai_knowledge_database" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"representative_status" text,
	"behavior_type" text,
	"behavior_description" text,
	"tested_approaches" json DEFAULT '[]'::json,
	"approach_results" json DEFAULT '[]'::json,
	"success_rate" numeric(5, 2),
	"question_category" text,
	"question_text" text,
	"recommended_answer" text,
	"alternative_answers" json DEFAULT '[]'::json,
	"title" text,
	"content" text,
	"tags" json DEFAULT '[]'::json,
	"applicable_scenarios" json DEFAULT '[]'::json,
	"source_type" text,
	"confidence" numeric(5, 2) DEFAULT '0',
	"usage_count" integer DEFAULT 0,
	"effectiveness_score" numeric(5, 2),
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_test_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"test_type" text NOT NULL,
	"related_entity_type" text,
	"related_entity_id" integer,
	"test_parameters" json DEFAULT '{}'::json,
	"test_started" timestamp DEFAULT now(),
	"test_completed" timestamp,
	"test_duration" integer,
	"test_status" text NOT NULL,
	"response_data" json DEFAULT '{}'::json,
	"error_message" text,
	"warning_messages" json DEFAULT '[]'::json,
	"debug_logs" json DEFAULT '[]'::json,
	"network_logs" json DEFAULT '[]'::json,
	"performance_metrics" json DEFAULT '{}'::json,
	"ai_analysis" text,
	"recommendations" json DEFAULT '[]'::json,
	"initiated_by" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_test_results_test_id_unique" UNIQUE("test_id")
);
--> statement-breakpoint
CREATE TABLE "crm_cultural_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"representative_id" integer NOT NULL,
	"communication_style" text NOT NULL,
	"cultural_factors" json NOT NULL,
	"personality_traits" json NOT NULL,
	"motivation_factors" json NOT NULL,
	"recommended_approach" text NOT NULL,
	"confidence" numeric(5, 2) DEFAULT '0',
	"last_analyzed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "crm_cultural_profiles_representative_id_unique" UNIQUE("representative_id")
);
--> statement-breakpoint
CREATE TABLE "crm_performance_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"representative_id" integer NOT NULL,
	"analytics_id" text NOT NULL,
	"period" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"tasks_assigned" integer DEFAULT 0,
	"tasks_completed" integer DEFAULT 0,
	"tasks_overdue" integer DEFAULT 0,
	"average_completion_time" integer,
	"average_quality_score" numeric(5, 2),
	"communication_quality" numeric(5, 2),
	"customer_satisfaction" numeric(5, 2),
	"relationship_score" integer,
	"response_time" integer,
	"proactive_actions" integer,
	"improvement_areas" json,
	"strength_areas" json,
	"recommended_actions" json,
	"ai_insights" json,
	"predicted_trends" json,
	"personalized_recommendations" json,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "crm_performance_analytics_analytics_id_unique" UNIQUE("analytics_id")
);
--> statement-breakpoint
CREATE TABLE "crm_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"encrypted_value" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"last_tested_at" timestamp,
	"test_status" text,
	"test_results" json,
	"debug_logs" json,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "crm_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "crm_system_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"description" text NOT NULL,
	"related_entities" json,
	"admin_panel_data" json,
	"crm_panel_impact" json,
	"automated_actions" json,
	"requires_human_review" boolean DEFAULT false,
	"reviewed_by" text,
	"review_notes" text,
	"reviewed_at" timestamp,
	"priority" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "crm_system_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "crm_task_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"representative_id" integer NOT NULL,
	"submission_type" text NOT NULL,
	"outcome" text NOT NULL,
	"detailed_report" text NOT NULL,
	"emotional_tone" text,
	"communication_quality" integer,
	"objectives_achieved" json,
	"lessons_learned" text,
	"improvement_suggestions" text,
	"ai_evaluation" json,
	"xp_earned" integer DEFAULT 0,
	"quality_score" integer,
	"follow_up_required" boolean DEFAULT false,
	"follow_up_reason" text,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"representative_id" integer NOT NULL,
	"ai_generated_by_model" text DEFAULT 'PERSIAN_CRM_AI',
	"task_type" text NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'ASSIGNED' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"expected_outcome" text,
	"contextual_data" json,
	"due_date" timestamp NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"completed_at" timestamp,
	"ai_confidence_score" integer,
	"xp_reward" integer DEFAULT 0,
	"difficulty_level" integer DEFAULT 1,
	"reminder_count" integer DEFAULT 0,
	"escalation_level" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "crm_tasks_task_id_unique" UNIQUE("task_id")
);
--> statement-breakpoint
CREATE TABLE "crm_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text,
	"email" text,
	"role" text DEFAULT 'CRM_MANAGER',
	"permissions" json DEFAULT '["VIEW_REPRESENTATIVES","MANAGE_TASKS","VIEW_ANALYTICS"]'::json,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "crm_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "data_integrity_constraints" (
	"id" serial PRIMARY KEY NOT NULL,
	"constraint_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"constraint_rule" json,
	"current_status" text DEFAULT 'VALID' NOT NULL,
	"last_validation_at" timestamp DEFAULT now(),
	"violation_details" json,
	"auto_fix_attempts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financial_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"representative_id" integer NOT NULL,
	"related_entity_type" text,
	"related_entity_id" integer,
	"original_state" json,
	"target_state" json,
	"actual_state" json,
	"financial_impact" json,
	"processing_steps" json DEFAULT '[]'::json,
	"rollback_data" json,
	"initiated_by" text NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "financial_transactions_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "invoice_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_name" text NOT NULL,
	"batch_code" text NOT NULL,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_invoices" integer DEFAULT 0,
	"total_amount" numeric(15, 2) DEFAULT '0',
	"uploaded_by" text NOT NULL,
	"uploaded_file_name" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "invoice_batches_batch_code_unique" UNIQUE("batch_code")
);
--> statement-breakpoint
CREATE TABLE "invoice_edits" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"original_usage_data" json,
	"edited_usage_data" json,
	"edit_type" text NOT NULL,
	"edit_reason" text,
	"original_amount" numeric(15, 2),
	"edited_amount" numeric(15, 2),
	"edited_by" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"transaction_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"representative_id" integer NOT NULL,
	"batch_id" integer,
	"amount" numeric(15, 2) NOT NULL,
	"issue_date" text NOT NULL,
	"due_date" text,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"usage_data" json,
	"sent_to_telegram" boolean DEFAULT false,
	"telegram_sent_at" timestamp,
	"telegram_send_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "manager_task_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"execution_id" text NOT NULL,
	"execution_date" text NOT NULL,
	"assigned_staff_id" integer NOT NULL,
	"assigned_staff_name" text NOT NULL,
	"generated_instructions" text,
	"target_list" json DEFAULT '[]'::json,
	"target_count" integer DEFAULT 0,
	"ai_model" text,
	"ai_prompt" text,
	"ai_response" text,
	"ai_confidence" numeric(5, 2),
	"processing_time" integer,
	"status" text DEFAULT 'GENERATED',
	"assigned_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"actual_executed" integer,
	"success_count" integer,
	"failure_count" integer,
	"execution_notes" text,
	"staff_feedback" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "manager_task_executions_execution_id_unique" UNIQUE("execution_id")
);
--> statement-breakpoint
CREATE TABLE "manager_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"assigned_staff_id" integer,
	"assigned_staff_name" text,
	"task_type" text NOT NULL,
	"frequency" text NOT NULL,
	"priority" text DEFAULT 'MEDIUM',
	"daily_target" integer,
	"target_criteria" json DEFAULT '{}'::json,
	"specific_instructions" text,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"schedule_details" json DEFAULT '{}'::json,
	"ai_processed" boolean DEFAULT false,
	"ai_instructions" text,
	"ai_context" json DEFAULT '{}'::json,
	"last_ai_processing" timestamp,
	"total_executions" integer DEFAULT 0,
	"successful_executions" integer DEFAULT 0,
	"last_execution_date" timestamp,
	"average_completion_time" integer,
	"status" text DEFAULT 'ACTIVE',
	"is_recurring" boolean DEFAULT true,
	"created_by" text NOT NULL,
	"paused_by" text,
	"paused_at" timestamp,
	"pause_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "manager_tasks_task_id_unique" UNIQUE("task_id")
);
--> statement-breakpoint
CREATE TABLE "offers_incentives" (
	"id" serial PRIMARY KEY NOT NULL,
	"offer_name" text NOT NULL,
	"offer_type" text NOT NULL,
	"monetary_value" numeric(15, 2),
	"volume_bonus" json DEFAULT '{}'::json,
	"time_frame" text,
	"eligibility_criteria" json DEFAULT '{}'::json,
	"min_purchase_amount" numeric(15, 2),
	"max_usage_per_representative" integer,
	"terms" text,
	"restrictions" json DEFAULT '[]'::json,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"cost_per_offer" numeric(15, 2),
	"max_total_cost" numeric(15, 2),
	"budget_allocated" numeric(15, 2),
	"budget_used" numeric(15, 2) DEFAULT '0',
	"times_offered" integer DEFAULT 0,
	"times_accepted" integer DEFAULT 0,
	"acceptance_rate" numeric(5, 2),
	"average_impact" json DEFAULT '{}'::json,
	"ai_recommendation_score" numeric(5, 2),
	"ai_usage_patterns" json DEFAULT '{}'::json,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"approved_by" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"representative_id" integer NOT NULL,
	"invoice_id" integer,
	"amount" numeric(15, 2) NOT NULL,
	"payment_date" text NOT NULL,
	"description" text,
	"is_allocated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workspace_reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"representative_id" integer NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"scheduled_for" text NOT NULL,
	"context" json NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'ACTIVE',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "representative_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"representative_id" integer NOT NULL,
	"current_level" text NOT NULL,
	"previous_level" text,
	"level_change_reason" text,
	"psychological_profile" json,
	"communication_style" text,
	"response_pattern" json,
	"motivation_factors" json,
	"performance_metrics" json,
	"ai_assessment" json,
	"last_interaction_date" timestamp,
	"auto_level_change_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "representative_support_history" (
	"id" text PRIMARY KEY NOT NULL,
	"representative_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	"interaction_type" text NOT NULL,
	"interaction_date" text NOT NULL,
	"summary" text NOT NULL,
	"details" text,
	"outcome" text,
	"related_task_id" text,
	"related_report_id" text,
	"ai_insights" json,
	"emotional_tone" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "representative_support_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"representative_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	"interaction_date" text NOT NULL,
	"task_id" text,
	"report_id" text,
	"summary" text NOT NULL,
	"issues" json,
	"resolution" text,
	"next_steps" json,
	"response_time" integer,
	"satisfaction_level" text,
	"follow_up_required" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "representatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"owner_name" text,
	"panel_username" text NOT NULL,
	"phone" text,
	"telegram_id" text,
	"public_id" text NOT NULL,
	"sales_partner_id" integer,
	"is_active" boolean DEFAULT true,
	"total_debt" numeric(15, 2) DEFAULT '0',
	"total_sales" numeric(15, 2) DEFAULT '0',
	"credit" numeric(15, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "representatives_code_unique" UNIQUE("code"),
	CONSTRAINT "representatives_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "sales_partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"commission_rate" numeric(5, 2) DEFAULT '0',
	"total_commission" numeric(15, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "support_staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"phone" text,
	"daily_work_hours" integer DEFAULT 8,
	"weekly_holidays" json DEFAULT '[]'::json,
	"work_start_time" text DEFAULT '09:00',
	"work_end_time" text DEFAULT '17:00',
	"job_description" text,
	"working_style" text,
	"special_skills" json DEFAULT '[]'::json,
	"personality_traits" json DEFAULT '[]'::json,
	"psychological_profile" json DEFAULT '{}'::json,
	"communication_style" text,
	"motivation_factors" json DEFAULT '[]'::json,
	"stress_level" text,
	"work_preferences" json DEFAULT '{}'::json,
	"performance_score" numeric(5, 2) DEFAULT '0',
	"task_completion_rate" numeric(5, 2) DEFAULT '0',
	"customer_satisfaction_rate" numeric(5, 2) DEFAULT '0',
	"ai_interaction_style" text,
	"ai_personalization_data" json DEFAULT '{}'::json,
	"last_ai_analysis" timestamp,
	"is_active" boolean DEFAULT true,
	"hired_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "support_staff_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "task_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"staff_id" integer NOT NULL,
	"representative_id" integer NOT NULL,
	"content" text NOT NULL,
	"submitted_at" text NOT NULL,
	"ai_analysis" json,
	"status" text DEFAULT 'PENDING_REVIEW',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_reports_analysis" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"representative_id" integer NOT NULL,
	"key_insights" json NOT NULL,
	"cultural_context" json NOT NULL,
	"priority_level" text NOT NULL,
	"next_contact_date" text,
	"follow_up_actions" json NOT NULL,
	"representative_updates" json NOT NULL,
	"ai_confidence" integer DEFAULT 75,
	"processing_model" text DEFAULT 'XAI_GROK',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "telegram_send_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"send_type" text NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"sent_by" text NOT NULL,
	"bot_token" text,
	"chat_id" text,
	"message_template" text,
	"send_status" text DEFAULT 'SUCCESS' NOT NULL,
	"error_message" text,
	"telegram_message_id" text,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "workspace_ai_reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"representative_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"context" text,
	"scheduled_for" text NOT NULL,
	"scheduled_time" text DEFAULT '07:00',
	"source_type" text NOT NULL,
	"source_id" text,
	"status" text DEFAULT 'ACTIVE',
	"completed_at" text,
	"priority" text DEFAULT 'MEDIUM',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workspace_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"representative_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'ASSIGNED',
	"assigned_at" text NOT NULL,
	"deadline" text NOT NULL,
	"read_at" text,
	"completed_at" text,
	"ai_context" json NOT NULL,
	"manager_task_id" text,
	"generated_from_settings" json NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
