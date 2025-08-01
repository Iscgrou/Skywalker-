// 🎯 MAIN CRM SERVICE - Orchestrates All CRM Operations
import { nanoid } from 'nanoid';
import { persianAIEngine } from './persian-ai-engine';
import { crmAuthService } from './crm-auth-service';
import { crmDataSyncService } from './crm-data-sync';
import { storage } from '../storage';
import type { 
  Representative, 
  CrmTask, 
  CrmTaskResult, 
  RepresentativeLevel, 
  AiDecisionLog,
  InsertCrmTask,
  InsertCrmTaskResult,
  InsertRepresentativeLevel,
  InsertAiDecisionLog 
} from '@shared/schema';

export interface CrmDashboardData {
  totalRepresentatives: number;
  activeRepresentatives: number;
  pendingTasks: number;
  completedTasksToday: number;
  aiInsights: AIInsight[];
  recentActivity: ActivityItem[];
  performanceAlerts: PerformanceAlert[];
}

export interface AIInsight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  confidence: number;
  actionRequired: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'task_assigned' | 'task_completed' | 'level_changed' | 'ai_decision';
  description: string;
  timestamp: Date;
  representativeName?: string;
}

export interface PerformanceAlert {
  representativeId: number;
  representativeName: string;
  alertType: 'poor_performance' | 'overdue_tasks' | 'inactive' | 'improvement_needed';
  severity: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  recommendedAction: string;
}

export class CrmService {
  constructor() {
    // Initialize real-time sync
    crmDataSyncService.startRealTimeSync();
  }

  // Dashboard and Overview
  async getCrmDashboard(): Promise<CrmDashboardData> {
    try {
      const representatives = await storage.getRepresentatives();
      const activeReps = representatives.filter(r => r.isActive);
      
      const pendingTasks = await this.countPendingTasks();
      const completedToday = await this.countTasksCompletedToday();
      
      const aiInsights = await this.generateAIInsights();
      const recentActivity = await this.getRecentActivity();
      const performanceAlerts = await this.generatePerformanceAlerts();

      return {
        totalRepresentatives: representatives.length,
        activeRepresentatives: activeReps.length,
        pendingTasks,
        completedTasksToday: completedToday,
        aiInsights,
        recentActivity,
        performanceAlerts
      };
    } catch (error) {
      console.error('Failed to generate CRM dashboard:', error);
      throw error;
    }
  }

  // Representative Management - Enhanced with Persian AI
  async getRepresentativeLevel(representativeId: number): Promise<RepresentativeLevel | null> {
    try {
      const representative = await storage.getRepresentativeById(representativeId);
      if (!representative) return null;

      // Use Persian AI Engine for cultural analysis
      const aiLevel = await persianAIEngine.evaluateRepresentativeLevel(representative);
      return aiLevel;
    } catch (error) {
      console.error('Failed to get representative level:', error);
      return null;
    }
  }

  // Persian Cultural Analysis
  async analyzeCulturalProfile(representativeId: number) {
    try {
      const representative = await storage.getRepresentativeById(representativeId);
      if (!representative) {
        throw new Error('نماینده یافت نشد');
      }

      const culturalProfile = await persianAIEngine.analyzeCulturalProfile(representative);
      return culturalProfile;
    } catch (error) {
      console.error('خطا در تحلیل فرهنگی:', error);
      throw error;
    }
  }

  // AI Task Generation
  async generateIntelligentTasks(representativeId: number) {
    try {
      const representative = await storage.getRepresentativeById(representativeId);
      if (!representative) {
        throw new Error('نماینده یافت نشد');
      }

      const culturalProfile = await persianAIEngine.analyzeCulturalProfile(representative);
      const level = await persianAIEngine.evaluateRepresentativeLevel(representative);
      const taskRecommendations = await persianAIEngine.generateTaskRecommendations(
        representative, 
        culturalProfile, 
        level
      );

      return {
        culturalProfile,
        level,
        taskRecommendations
      };
    } catch (error) {
      console.error('خطا در تولید وظایف هوشمند:', error);
      throw error;
    }
  }

  async updateRepresentativeLevel(
    representativeId: number, 
    newLevel: 'NEW' | 'ACTIVE' | 'INACTIVE',
    reason: string
  ): Promise<void> {
    try {
      const representative = await storage.getRepresentative(representativeId);
      if (!representative) {
        throw new Error('Representative not found');
      }

      // Get current level
      const currentLevel = await this.getRepresentativeLevel(representativeId);
      
      const levelData: InsertRepresentativeLevel = {
        representativeId,
        currentLevel: newLevel,
        previousLevel: currentLevel?.currentLevel || null,
        levelChangeReason: reason,
        psychologicalProfile: await this.getOrCreatePsychProfile(representativeId),
        communicationStyle: await this.inferCommunicationStyle(representativeId),
        responsePattern: await this.analyzeResponsePattern(representativeId),
        motivationFactors: await this.identifyMotivationFactors(representativeId),
        performanceMetrics: await this.calculatePerformanceMetrics(representativeId),
        aiAssessment: await this.getAIAssessment(representativeId),
        lastInteractionDate: new Date()
      };

      // Create/update representative level record
      await this.createOrUpdateRepresentativeLevel(levelData);

      // Log the level change decision
      await this.logAIDecision({
        decisionType: 'LEVEL_CHANGE',
        representativeId,
        reasoning: `نماینده از سطح ${currentLevel?.currentLevel || 'نامشخص'} به ${newLevel} تغییر یافت. دلیل: ${reason}`,
        confidenceScore: 85,
        expectedOutcome: `بهبود عملکرد نماینده در سطح ${newLevel}`,
        contextFactors: {
          previousLevel: currentLevel?.currentLevel,
          changeReason: reason,
          timestamp: new Date().toISOString()
        }
      });

      // Generate appropriate tasks for new level
      await this.generateTasksForLevel(representativeId, newLevel);

    } catch (error) {
      console.error('Failed to update representative level:', error);
      throw error;
    }
  }

  // Task Management
  async generateTaskForRepresentative(representativeId: number): Promise<CrmTask> {
    try {
      const representative = await storage.getRepresentative(representativeId);
      if (!representative) {
        throw new Error('Representative not found');
      }

      // Build context for AI task generation
      const context = await this.buildTaskGenerationContext(representative);
      
      // Use Persian AI engine to generate intelligent task
      const aiResult = await persianAIEngine.generateIntelligentTask(context);
      
      const taskData: InsertCrmTask = {
        ...aiResult.task,
        representativeId,
        taskId: aiResult.task.taskId || nanoid(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      // Create task in database
      const task = await this.createTask(taskData);

      // Log AI decision
      await this.logAIDecision({
        decisionType: 'TASK_ASSIGNMENT',
        representativeId,
        reasoning: aiResult.reasoning,
        confidenceScore: aiResult.successPrediction,
        expectedOutcome: task.expectedOutcome || '',
        contextFactors: {
          culturalAdaptations: aiResult.culturalAdaptations,
          taskType: task.taskType,
          priority: task.priority
        }
      });

      return task;
    } catch (error) {
      console.error('Failed to generate task:', error);
      throw error;
    }
  }

  async submitTaskResult(taskId: string, result: Omit<InsertCrmTaskResult, 'taskId'>): Promise<void> {
    try {
      // Get the original task
      const task = await this.getTaskById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Create task result
      const taskResult: InsertCrmTaskResult = {
        ...result,
        taskId
      };

      await this.createTaskResult(taskResult);

      // Update task status
      await this.updateTaskStatus(taskId, 'COMPLETED');

      // Let AI learn from the result
      const resultRecord = await this.getTaskResult(taskId);
      if (resultRecord) {
        await persianAIEngine.learnFromTaskResult(resultRecord);
      }

      // Check if follow-up is needed
      if (result.followUpRequired) {
        await this.scheduleFollowUpTask(task.representativeId, result.followUpReason || '');
      }

    } catch (error) {
      console.error('Failed to submit task result:', error);
      throw error;
    }
  }

  // AI and Analytics
  async getAIRecommendations(representativeId: number): Promise<{
    recommendations: string[];
    insights: AIInsight[];
    nextActions: string[];
  }> {
    try {
      const representative = await storage.getRepresentative(representativeId);
      if (!representative) {
        throw new Error('Representative not found');
      }

      const aiAnalysis = await persianAIEngine.analyzeRepresentative(representative);
      
      const insights: AIInsight[] = [
        {
          type: 'info',
          title: 'تحلیل شخصیت',
          description: `سبک ارتباطی: ${aiAnalysis.culturalProfile.communicationStyle}`,
          confidence: aiAnalysis.confidenceScore,
          actionRequired: false
        },
        {
          type: 'success',
          title: 'نقاط قوت',
          description: aiAnalysis.culturalProfile.motivationFactors.join('، '),
          confidence: aiAnalysis.confidenceScore,
          actionRequired: false
        }
      ];

      return {
        recommendations: aiAnalysis.recommendations,
        insights,
        nextActions: ['تولید وظیفه جدید', 'بررسی عملکرد', 'تحلیل روانشناختی']
      };
    } catch (error) {
      console.error('Failed to get AI recommendations:', error);
      throw error;
    }
  }

  // Performance and Reporting
  async getRepresentativePerformance(representativeId: number): Promise<{
    overallScore: number;
    taskStats: {
      assigned: number;
      completed: number;
      overdue: number;
      successRate: number;
    };
    trendAnalysis: {
      trend: 'بهبود' | 'ثابت' | 'افت';
      changePercent: number;
      periodComparison: string;
    };
    recommendations: string[];
  }> {
    try {
      // Calculate performance metrics
      const taskStats = await this.calculateTaskStats(representativeId);
      const overallScore = await this.calculateOverallScore(representativeId);
      const trendAnalysis = await this.analyzeTrend(representativeId);
      const recommendations = await this.generatePerformanceRecommendations(representativeId);

      return {
        overallScore,
        taskStats,
        trendAnalysis,
        recommendations
      };
    } catch (error) {
      console.error('Failed to get representative performance:', error);
      throw error;
    }
  }

  // Helper Methods
  private async buildTaskGenerationContext(representative: Representative): Promise<any> {
    const level = await this.getRepresentativeLevel(representative.id);
    const financialContext = await this.buildFinancialContext(representative);
    const performanceHistory = await this.getPerformanceHistory(representative.id);
    
    return {
      representativeLevel: level?.currentLevel || 'NEW',
      psychProfile: level?.psychologicalProfile || await this.getOrCreatePsychProfile(representative.id),
      culturalProfile: await this.getCulturalProfile(representative.id),
      financialContext,
      recentPerformance: await this.getRecentPerformance(representative.id),
      historicalData: performanceHistory
    };
  }

  private async buildFinancialContext(representative: Representative): Promise<any> {
    return {
      currentDebtAmount: parseFloat(representative.totalDebt?.toString() || '0'),
      debtTrend: await this.calculateDebtTrend(representative.id),
      paymentHistory: await this.getPaymentHistory(representative.id),
      creditScore: parseFloat(representative.credit?.toString() || '0'),
      riskLevel: this.calculateRiskLevel(representative)
    };
  }

  private calculateRiskLevel(representative: Representative): 'پایین' | 'متوسط' | 'بالا' {
    const debt = parseFloat(representative.totalDebt?.toString() || '0');
    const sales = parseFloat(representative.totalSales?.toString() || '1');
    const ratio = debt / sales;
    
    if (ratio > 0.5) return 'بالا';
    if (ratio > 0.2) return 'متوسط';
    return 'پایین';
  }

  // Database operations (simplified - would use actual storage methods)
  private async createTask(taskData: InsertCrmTask): Promise<CrmTask> {
    // Would use storage.createCrmTask()
    return {} as CrmTask;
  }

  private async createTaskResult(resultData: InsertCrmTaskResult): Promise<CrmTaskResult> {
    // Would use storage.createCrmTaskResult()
    return {} as CrmTaskResult;
  }

  private async getTaskById(taskId: string): Promise<CrmTask | null> {
    // Would use storage.getCrmTaskById()
    return null;
  }

  private async getTaskResult(taskId: string): Promise<CrmTaskResult | null> {
    // Would use storage.getCrmTaskResult()
    return null;
  }

  private async updateTaskStatus(taskId: string, status: string): Promise<void> {
    // Would use storage.updateCrmTask()
  }

  private async createOrUpdateRepresentativeLevel(levelData: InsertRepresentativeLevel): Promise<void> {
    // Would use storage.createOrUpdateRepresentativeLevel()
  }

  private async logAIDecision(decision: Omit<InsertAiDecisionLog, 'decisionId'>): Promise<void> {
    const decisionData: InsertAiDecisionLog = {
      ...decision,
      decisionId: nanoid()
    };
    // Would use storage.createAiDecisionLog()
  }

  // Placeholder methods for complex calculations
  private async countPendingTasks(): Promise<number> { return 15; }
  private async countTasksCompletedToday(): Promise<number> { return 8; }
  private async generateAIInsights(): Promise<AIInsight[]> { return []; }
  private async getRecentActivity(): Promise<ActivityItem[]> { return []; }
  private async generatePerformanceAlerts(): Promise<PerformanceAlert[]> { return []; }
  private async getOrCreatePsychProfile(repId: number): Promise<any> { return {}; }
  private async inferCommunicationStyle(repId: number): Promise<string> { return 'محترمانه'; }
  private async analyzeResponsePattern(repId: number): Promise<any> { return {}; }
  private async identifyMotivationFactors(repId: number): Promise<any> { return []; }
  private async calculatePerformanceMetrics(repId: number): Promise<any> { return {}; }
  private async getAIAssessment(repId: number): Promise<any> { return {}; }
  private async generateTasksForLevel(repId: number, level: string): Promise<void> {}
  private async scheduleFollowUpTask(repId: number, reason: string): Promise<void> {}
  private async calculateTaskStats(repId: number): Promise<any> { return {}; }
  private async calculateOverallScore(repId: number): Promise<number> { return 75; }
  private async analyzeTrend(repId: number): Promise<any> { return {}; }
  private async generatePerformanceRecommendations(repId: number): Promise<string[]> { return []; }
  private async getPerformanceHistory(repId: number): Promise<any> { return {}; }
  private async getCulturalProfile(repId: number): Promise<any> { return {}; }
  private async getRecentPerformance(repId: number): Promise<any> { return {}; }
  private async calculateDebtTrend(repId: number): Promise<string> { return 'ثابت'; }
  private async getPaymentHistory(repId: number): Promise<string> { return 'منظم'; }
}

export const crmService = new CrmService();