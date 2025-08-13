// AI Orchestration Core Contracts (Phase 2 Forge)
import { z } from 'zod';

// Versioned base envelope
export const AiCommandEnvelopeSchema = z.object({
  version: z.literal('v1'),
  correlationId: z.string().min(8),
  issuedAt: z.string(), // ISO
  command: z.string(),
  actor: z.enum(['SYSTEM','MANAGER','STAFF','SCHEDULER']),
  payload: z.record(z.any())
});
export type AiCommandEnvelope = z.infer<typeof AiCommandEnvelopeSchema>;

export const AiResponseEnvelopeSchema = z.object({
  version: z.literal('v1'),
  correlationId: z.string(),
  receivedAt: z.string(),
  status: z.enum(['SUCCESS','FAILED']),
  output: z.record(z.any()).optional(),
  error: z.string().optional(),
  validation: z.object({
    passed: z.boolean(),
    errors: z.array(z.string()).optional()
  })
});
export type AiResponseEnvelope = z.infer<typeof AiResponseEnvelopeSchema>;

// Specific command payload schemas (extensible)
export const GenerateTaskCommandSchema = z.object({
  representativeId: z.number().optional(),
  contextWindow: z.array(z.string()).max(50).optional(),
  priorityHint: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).optional(),
  strategyGoal: z.enum(['DEBT_REDUCTION','ENGAGEMENT','RETENTION','RECOVERY']).optional()
});

export const AnalyzeReportCommandSchema = z.object({
  reportId: z.string(),
  rawText: z.string().min(10),
  representativeId: z.number().optional()
});

export const CoachingInsightCommandSchema = z.object({
  staffId: z.number(),
  taskId: z.string().optional(),
  recentEvents: z.array(z.object({
    type: z.string(),
    at: z.string(),
    payload: z.record(z.any())
  })).max(100)
});

export type GenerateTaskCommand = z.infer<typeof GenerateTaskCommandSchema>;
export type AnalyzeReportCommand = z.infer<typeof AnalyzeReportCommandSchema>;
export type CoachingInsightCommand = z.infer<typeof CoachingInsightCommandSchema>;

export const SupportedCommands = {
  'task.generate': GenerateTaskCommandSchema,
  'report.analyze': AnalyzeReportCommandSchema,
  'coaching.insight': CoachingInsightCommandSchema
} as const;

export type SupportedCommandNames = keyof typeof SupportedCommands;

export function validateCommandPayload(name: SupportedCommandNames, payload: any) {
  return SupportedCommands[name].safeParse(payload);
}
