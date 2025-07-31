// ★CRITICAL NEW ARTIFACT★ - NEXUS PROTOCOL CONTRACTS

export interface RepresentativeLevel {
  NEW: "تازه‌کار - نیازمند راهنمایی کامل";
  ACTIVE: "فعال - در حال انجام وظایف";
  INACTIVE: "غیرفعال - نیازمند بازگردانی";
}

export interface AIManagerPersonality {
  role: "مدیر ارشد واحد ارتباطات با مشتری";
  capabilities: {
    deepPsychologicalUnderstanding: boolean;
    emotionalIntelligence: boolean;
    culturalAdaptation: boolean;
    experientialLearning: boolean;
    performanceEvaluation: boolean;
    strategicDecisionMaking: boolean;
  };
  decisionMakingProcess: {
    analyzeRepresentativeProfile: () => Promise<PsychProfile>;
    reviewHistoricalData: () => Promise<HistoricalInsights>;
    generateContextualTask: () => Promise<IntelligentTask>;
    evaluateTaskResult: () => Promise<PerformanceAssessment>;
    provideFeedback: () => Promise<DevelopmentPlan>;
  };
}

// Authentication & Access Control Contract
export interface AuthenticationContract {
  validateDualAccess(credentials: LoginCredentials): Promise<UserSession>;
  enforceRoleBasedAccess(role: 'ADMIN' | 'CRM', resource: string): boolean;
  maintainSessionIntegrity(sessionId: string): Promise<boolean>;
  auditSecurityEvents(event: SecurityEvent): Promise<void>;
}

export interface LoginCredentials {
  username: 'mgr' | 'crm';
  password: '8679';
  sessionContext?: 'ADMIN_PANEL' | 'CRM_PANEL';
}

// Data Synchronization Contract - Critical for Panel Integration
export interface DataSyncContract {
  syncRepresentativeFinancials(): Promise<{
    representativeId: number;
    debtAmount: number;
    creditScore: number;
    lastPaymentDate: string;
    restrictedFinancialData: boolean; // CRM can't see full sales
  }[]>;
  
  syncRepresentativeProfiles(): Promise<{
    representativeId: number;
    basicProfile: RepresentativeBasicProfile;
    psychologicalProfile?: PsychologicalProfile; // Only if analysis exists
    performanceMetrics: PublicPerformanceMetrics; // Safe metrics only
  }[]>;
  
  restrictSensitiveData(role: 'ADMIN' | 'CRM', data: any): any;
  validateDataAccess(role: string, dataType: string): boolean;
}

// AI Intelligence Contract - Persian Cultural Intelligence
export interface PersianCulturalAIContract {
  analyzeRepresentativePsychology(repId: number): Promise<{
    communicationStyle: 'محترمانه' | 'دوستانه' | 'مستقیم' | 'حمایتی';
    motivationFactors: string[];
    culturalContext: PersianBusinessCulture;
    responsePatterns: HistoricalBehavior;
    recommendedApproach: CommunicationStrategy;
  }>;

  generateIntelligentTask(context: {
    representativeLevel: RepresentativeLevel;
    psychProfile: PsychologicalProfile;
    currentFinancialStatus: FinancialContext;
    historicalPerformance: PerformanceHistory;
    culturalFactors: PersianCulturalFactors;
  }): Promise<IntelligentCrmTask>;

  evaluateTaskOutcome(result: {
    taskId: string;
    outcome: TaskOutcome;
    representativeResponse: RepresentativeResponse;
    emotionalTone: EmotionalTone;
    culturalAdaptation: CulturalFeedback;
  }): Promise<AILearningInsights>;

  updateKnowledgeBase(insights: AILearningInsights): Promise<void>;
}

// Clock Mechanism Integration Contract - Atomic Operations
export interface ClockMechanismContract {
  // Hour Hand: Financial-CRM Atomic Operations
  executeAtomicFinancialCrmOperation(operation: {
    type: 'DEBT_UPDATE_WITH_CRM_TASK' | 'PAYMENT_WITH_PERFORMANCE_IMPACT';
    financialData: FinancialTransactionData;
    crmData: CrmOperationData;
    rollbackStrategy: RollbackPlan;
  }): Promise<AtomicOperationResult>;

  // Minute Hand: Representative Management Synchronization
  synchronizeRepresentativeState(changes: {
    financialChanges?: FinancialStateChange;
    crmLevelChanges?: LevelStateChange;
    performanceChanges?: PerformanceStateChange;
  }): Promise<SynchronizationResult>;

  // Second Hand: Real-time Monitoring & Audit
  monitorSystemIntegrity(): Promise<SystemHealthReport>;
  auditCrossSystemOperations(): Promise<AuditTrailReport>;
}

// Team Performance Reporting Contract - Admin Panel Extension
export interface TeamPerformanceContract {
  generateTeamAnalytics(period: AnalyticsPeriod): Promise<{
    overallTeamHealth: TeamHealthMetrics;
    individualPerformanceRankings: RepresentativeRanking[];
    improvementRecommendations: TeamImprovementPlan;
    culturalInsights: TeamCulturalAnalysis;
    predictiveAnalytics: TeamPerformancePredictions;
    crmSystemEffectiveness: CrmEffectivenessReport;
  }>;

  identifyHighPerformers(): Promise<HighPerformerAnalysis[]>;
  identifyUnderPerformers(): Promise<UnderPerformerAnalysis[]>;
  generateDevelopmentPlans(): Promise<DevelopmentPlan[]>;
}

// Performance Analytics Contract
export interface PerformanceAnalyticsContract {
  calculateRepresentativeScore(repId: number): Promise<{
    overallScore: number; // 1-100
    taskCompletionRate: number;
    qualityScore: number;
    culturalAdaptationScore: number;
    improvementTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    personalizedFeedback: string;
  }>;

  predictFuturePerformance(repId: number): Promise<PerformancePrediction>;
  identifyTrainingNeeds(repId: number): Promise<TrainingRecommendations>;
}

// Security & Privacy Contract
export interface SecurityContract {
  enforceDataSegregation(role: 'ADMIN' | 'CRM'): DataSegregationRules;
  validateSensitiveDataAccess(dataRequest: DataAccessRequest): boolean;
  logSecurityEvents(event: SecurityEvent): Promise<void>;
  encryptSensitiveData(data: any): Promise<EncryptedData>;
}

// Types for the contracts
export type TaskOutcome = 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | 'NEEDS_FOLLOW_UP';
export type EmotionalTone = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'FRUSTRATED' | 'MOTIVATED';
export type AnalyticsPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

export interface PersianBusinessCulture {
  respectHierarchy: boolean;
  valueRelationships: boolean;
  indirectCommunication: boolean;
  familyOriented: boolean;
  hospitalityFocused: boolean;
}

export interface IntelligentCrmTask {
  taskId: string;
  type: 'FOLLOW_UP' | 'DEBT_COLLECTION' | 'RELATIONSHIP_BUILDING' | 'PERFORMANCE_CHECK';
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  culturallyAdaptedContent: {
    title: string;
    description: string;
    suggestedApproach: string;
    culturalConsiderations: string[];
  };
  expectedOutcome: string;
  aiConfidenceScore: number;
  personalizedForRepresentative: boolean;
}

export interface AILearningInsights {
  whatWorked: string[];
  whatDidntWork: string[];
  culturalFactorsObserved: string[];
  improvementSuggestions: string[];
  knowledgeToAdd: KnowledgeBaseEntry[];
}