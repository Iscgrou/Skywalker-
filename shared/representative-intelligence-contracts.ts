// Representative Intelligence Contracts (v1)
import { z } from 'zod';

export const SubMetricSchema = z.object({
  value: z.number().nullable(),
  confidence: z.number().min(0).max(1)
});

export const RepresentativeProfileSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  debt: z.number(),
  sales: z.number(),
  debtAnomaly: z.boolean().optional(),
  debtAnomalyFactor: z.number().nullable().optional(),
  debtTrend7d: SubMetricSchema,
  paymentVolatility: SubMetricSchema,
  responseLatencyAvg: SubMetricSchema,
  responseLatencyP90: SubMetricSchema.optional(),
  followUpComplianceRate: SubMetricSchema,
  inactivityDays: SubMetricSchema,
  engagementScore: SubMetricSchema,
  churnRiskScore: SubMetricSchema,
  lastInteractionAt: z.string().nullable().optional(),
  cultural: z.object({
    communicationStyle: z.string().nullable(),
    motivationFactors: z.array(z.string()).nullable(),
    recommendedApproach: z.string().nullable(),
    confidence: z.number().min(0).max(1)
  }),
  alternativeProfilesCount: z.number().min(0).optional(),
  offers: z.object({
    lastOfferId: z.string().nullable(),
    lastOfferOutcome: z.string().nullable(),
    offerConversionRate: SubMetricSchema,
    topEffectiveOffers: z.array(z.string()).optional()
  }),
  aiContextVersion: z.string()
});

export type RepresentativeProfile = z.infer<typeof RepresentativeProfileSchema>;

export interface RepresentativeIntelService {
  getProfile(id: number): Promise<RepresentativeProfile | null>;
  getProfiles(ids: number[]): Promise<RepresentativeProfile[]>;
  recompute(id: number): Promise<RepresentativeProfile | null>;
}
