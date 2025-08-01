// 🧠 ADAPTIVE LEARNING SERVICE - یادگیری تطبیقی از تجربیات واقعی
import { nanoid } from 'nanoid';
import { storage } from '../storage';
import { persianAIEngine } from './persian-ai-engine';
import { db } from '../db';
import { aiKnowledgeBase } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { 
  AiKnowledgeBase, 
  InsertAiKnowledgeBase,
  CrmTaskResult,
  Representative,
  AiDecisionLog,
  InsertAiDecisionLog 
} from '@shared/schema';

export interface LearningPattern {
  id: string;
  patternType: 'SUCCESS' | 'FAILURE' | 'PARTIAL_SUCCESS';
  context: {
    representativeLevel: string;
    taskType: string;
    culturalFactors: any;
    businessContext: string;
  };
  outcome: {
    actualResult: string;
    expectedResult: string;
    satisfaction: number; // 1-10
    effectiveness: number; // 1-10
  };
  insights: {
    whatWorked: string[];
    whatFailed: string[];
    culturalInsights: string[];
    recommendations: string[];
  };
  frequency: number;
  reliability: number; // 0-100
  lastApplied: Date;
}

export interface DailyInstructions {
  date: string;
  generalStrategy: string;
  representativeSpecificTasks: Array<{
    representativeId: number;
    representativeName: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    specificInstructions: string[];
    culturalContext: string;
    expectedOutcomes: string[];
    timeAllocation: string;
    followUpPlan: string;
  }>;
  teamLevelGuidance: {
    focusAreas: string[];
    commonChallenges: string[];
    successStrategies: string[];
    culturalConsiderations: string[];
  };
  aiConfidence: number;
  basedOnExperiences: number; // تعداد تجربیات واقعی که از آن‌ها یاد گرفته
}

export class AdaptiveLearningService {
  private learningPatterns: Map<string, LearningPattern> = new Map();
  private experienceDatabase: Map<string, any[]> = new Map();

  constructor() {
    this.initializeLearningSystem();
  }

  private async initializeLearningSystem() {
    try {
      // Load existing knowledge from database
      await this.loadExistingKnowledge();
      console.log('🧠 Adaptive Learning System initialized');
    } catch (error) {
      console.error('Error initializing learning system:', error);
    }
  }

  private async loadExistingKnowledge() {
    try {
      const knowledgeEntries = await db
        .select()
        .from(aiKnowledgeBase)
        .where(eq(aiKnowledgeBase.category, 'LEARNING_PATTERN'));

      let loadedCount = 0;
      for (const entry of knowledgeEntries) {
        try {
          const pattern: LearningPattern = JSON.parse(entry.description);
          this.learningPatterns.set(pattern.id, pattern);
          loadedCount++;
        } catch (parseError) {
          console.warn(`Failed to parse learning pattern ${entry.knowledgeId}`);
        }
      }

      console.log(`Loading existing knowledge patterns... ${loadedCount} patterns loaded`);
    } catch (error) {
      console.error('Error loading knowledge:', error);
    }
  }

  /**
   * تحلیل نتیجه وظیفه و استخراج الگوهای یادگیری
   */
  async learnFromTaskResult(taskResult: CrmTaskResult, representative: Representative): Promise<void> {
    try {
      // استخراج context از task result
      const context = {
        representativeLevel: await this.getRepresentativeLevel(representative),
        taskType: taskResult.taskId, // This should be mapped to actual task type
        culturalFactors: await this.analyzeCulturalFactors(representative),
        businessContext: this.extractBusinessContext(taskResult)
      };

      // تحلیل outcome
      const outcome = {
        actualResult: taskResult.outcome,
        expectedResult: taskResult.taskId, // Should map to expected outcome
        satisfaction: taskResult.qualityScore || 5,
        effectiveness: this.calculateEffectiveness(taskResult)
      };

      // استخراج insights
      const insights = await this.extractInsights(taskResult, representative, context);

      // ایجاد learning pattern
      const pattern: LearningPattern = {
        id: nanoid(),
        patternType: this.categorizeOutcome(taskResult.outcome),
        context,
        outcome,
        insights,
        frequency: 1,
        reliability: this.calculateReliability(taskResult),
        lastApplied: new Date()
      };

      // ذخیره pattern
      await this.storeLearningPattern(pattern);
      
      // آپدیت knowledge base
      await this.updateKnowledgeBase(pattern);

      console.log(`🎓 Learning pattern stored: ${pattern.patternType} for ${representative.name}`);
    } catch (error) {
      console.error('Error in learning from task result:', error);
    }
  }

  /**
   * تولید دستورالعمل‌های روزانه بر اساس تجربیات یادگیری شده
   */
  async generateDailyInstructions(): Promise<DailyInstructions> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const representatives = await storage.getRepresentatives();
      
      // تحلیل patterns موفق
      const successPatterns = Array.from(this.learningPatterns.values())
        .filter(p => p.patternType === 'SUCCESS' && p.reliability > 70);

      // تولید استراتژی کلی بر اساس patterns
      const generalStrategy = await this.generateGeneralStrategy(successPatterns);

      // تولید وظایف اختصاصی برای هر نماینده
      const representativeSpecificTasks = await Promise.all(
        representatives.slice(0, 10).map(rep => this.generateRepresentativeInstructions(rep, successPatterns))
      );

      // تولید راهنمایی سطح تیم
      const teamLevelGuidance = await this.generateTeamGuidance(successPatterns);

      const instructions: DailyInstructions = {
        date: today,
        generalStrategy,
        representativeSpecificTasks,
        teamLevelGuidance,
        aiConfidence: this.calculateOverallConfidence(),
        basedOnExperiences: this.learningPatterns.size
      };

      // ذخیره دستورالعمل‌ها برای tracking
      await this.storeDailyInstructions(instructions);

      return instructions;
    } catch (error) {
      console.error('Error generating daily instructions:', error);
      return this.getDefaultInstructions();
    }
  }

  private async generateGeneralStrategy(successPatterns: LearningPattern[]): Promise<string> {
    if (successPatterns.length === 0) {
      return "رویکرد متعادل با تأکید بر ارتباط مؤثر و درک نیازهای نمایندگان";
    }

    // تحلیل common success factors
    const successFactors = successPatterns.flatMap(p => p.insights.whatWorked);
    const topFactors = this.getMostFrequent(successFactors, 3);

    return `امروز بر اساس ${successPatterns.length} تجربه موفق، استراتژی کلی: ${topFactors.join('، ')}. تأکید ویژه بر ${topFactors[0]} که در ${this.calculateSuccessRate(topFactors[0])}% موارد موفق بوده است.`;
  }

  private async generateRepresentativeInstructions(
    representative: Representative, 
    successPatterns: LearningPattern[]
  ) {
    // یافتن patterns مشابه برای این نماینده
    const relevantPatterns = successPatterns.filter(p => 
      this.isPatternRelevant(p, representative)
    );

    const culturalProfile = await persianAIEngine.analyzeCulturalProfile(representative);
    
    return {
      representativeId: representative.id,
      representativeName: representative.name,
      priority: this.calculatePriority(representative, relevantPatterns) as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
      specificInstructions: this.generateSpecificInstructions(representative, relevantPatterns),
      culturalContext: this.generateCulturalContext(culturalProfile),
      expectedOutcomes: this.generateExpectedOutcomes(relevantPatterns),
      timeAllocation: this.calculateTimeAllocation(representative, relevantPatterns),
      followUpPlan: this.generateFollowUpPlan(representative, relevantPatterns)
    };
  }

  private async generateTeamGuidance(successPatterns: LearningPattern[]) {
    const allInsights = successPatterns.flatMap(p => p.insights.culturalInsights);
    const challenges = successPatterns.flatMap(p => p.insights.whatFailed);
    const strategies = successPatterns.flatMap(p => p.insights.whatWorked);

    return {
      focusAreas: this.getMostFrequent(strategies, 3),
      commonChallenges: this.getMostFrequent(challenges, 3),
      successStrategies: this.getMostFrequent(strategies, 5),
      culturalConsiderations: this.getMostFrequent(allInsights, 3)
    };
  }

  // Helper methods
  private async getRepresentativeLevel(representative: Representative): Promise<string> {
    // This would get from database or calculate
    return 'ACTIVE'; // Default
  }

  private async analyzeCulturalFactors(representative: Representative): Promise<any> {
    return await persianAIEngine.analyzeCulturalProfile(representative);
  }

  private extractBusinessContext(taskResult: CrmTaskResult): string {
    return taskResult.detailedReport || 'General business context';
  }

  private calculateEffectiveness(taskResult: CrmTaskResult): number {
    // Complex calculation based on multiple factors
    const baseScore = taskResult.qualityScore || 50;
    const outcomeMultiplier = taskResult.outcome === 'SUCCESS' ? 1.2 : 
                            taskResult.outcome === 'PARTIAL_SUCCESS' ? 0.8 : 0.4;
    
    return Math.min(10, Math.round((baseScore / 10) * outcomeMultiplier));
  }

  private async extractInsights(
    taskResult: CrmTaskResult, 
    representative: Representative, 
    context: any
  ): Promise<LearningPattern['insights']> {
    // Extract meaningful insights from the task result
    const whatWorked: string[] = [];
    const whatFailed: string[] = [];
    const culturalInsights: string[] = [];
    const recommendations: string[] = [];

    if (taskResult.outcome === 'SUCCESS') {
      whatWorked.push(taskResult.lessonsLearned || 'Successful approach applied');
      culturalInsights.push('رویکرد فرهنگی مناسب');
    } else {
      whatFailed.push(taskResult.followUpReason || 'Standard approach failed');
      recommendations.push(taskResult.improvementSuggestions || 'نیاز به تغییر رویکرد');
    }

    return { whatWorked, whatFailed, culturalInsights, recommendations };
  }

  private categorizeOutcome(outcome: string): 'SUCCESS' | 'FAILURE' | 'PARTIAL_SUCCESS' {
    switch(outcome) {
      case 'SUCCESS': return 'SUCCESS';
      case 'PARTIAL_SUCCESS': return 'PARTIAL_SUCCESS';
      default: return 'FAILURE';
    }
  }

  private calculateReliability(taskResult: CrmTaskResult): number {
    // Calculate reliability based on quality, communication, etc.
    const quality = taskResult.qualityScore || 50;
    const communication = taskResult.communicationQuality || 50;
    return Math.round((quality + communication) / 2);
  }

  private async storeLearningPattern(pattern: LearningPattern): Promise<void> {
    this.learningPatterns.set(pattern.id, pattern);
    
    // Store to persistent database
    try {
      await db.insert(aiKnowledgeBase).values({
        knowledgeId: pattern.id,
        category: 'LEARNING_PATTERN',
        title: `${pattern.patternType} Pattern`,
        description: JSON.stringify(pattern),
        sourceType: 'TASK_RESULT',
        sourceId: pattern.id,
        applicableScenarios: pattern.context,
        successRate: pattern.reliability.toString(),
        culturalContext: JSON.stringify(pattern.insights.culturalInsights),
        tags: ['adaptive_learning', pattern.patternType.toLowerCase()],
        isActive: true,
        confidenceLevel: pattern.reliability
      });
      console.log(`💾 Learning pattern persisted to database: ${pattern.id}`);
    } catch (error) {
      console.error('Error persisting learning pattern:', error);
    }
  }

  private async updateKnowledgeBase(pattern: LearningPattern): Promise<void> {
    // Update AI knowledge base with new learning
    console.log('Updating knowledge base with new pattern:', pattern.id);
  }

  private getMostFrequent(items: string[], limit: number): string[] {
    const frequency = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([item]) => item);
  }

  private isPatternRelevant(pattern: LearningPattern, representative: Representative): boolean {
    // Simple relevance check - in practice this would be more sophisticated
    return pattern.reliability > 60;
  }

  private calculatePriority(representative: Representative, patterns: LearningPattern[]): string {
    // Calculate priority based on debt, last contact, pattern analysis
    if (representative.totalDebt && parseFloat(representative.totalDebt) > 1000000) {
      return 'HIGH';
    }
    return patterns.length > 0 ? 'MEDIUM' : 'LOW';
  }

  private generateSpecificInstructions(representative: Representative, patterns: LearningPattern[]): string[] {
    const instructions = [
      `بررسی وضعیت مالی ${representative.name}`,
      'پیگیری فاکتورهای معوقه',
      'ارتباط دوستانه و محترمانه'
    ];

    // Add pattern-based instructions
    patterns.forEach(pattern => {
      instructions.push(...pattern.insights.recommendations);
    });

    return instructions.slice(0, 5); // Limit to top 5
  }

  private generateCulturalContext(culturalProfile: any): string {
    return culturalProfile?.recommendedApproach || 'رویکرد متعادل و محترمانه';
  }

  private generateExpectedOutcomes(patterns: LearningPattern[]): string[] {
    if (patterns.length === 0) {
      return ['ارتباط مؤثر', 'درک بهتر نیازها'];
    }
    
    return patterns.map(p => p.outcome.expectedResult).slice(0, 3);
  }

  private calculateTimeAllocation(representative: Representative, patterns: LearningPattern[]): string {
    // Calculate based on complexity and historical data
    return patterns.length > 2 ? '30-45 دقیقه' : '15-20 دقیقه';
  }

  private generateFollowUpPlan(representative: Representative, patterns: LearningPattern[]): string {
    return patterns.length > 0 ? 
      'پیگیری بر اساس الگوهای موفق قبلی' : 
      'پیگیری استاندارد طبق برنامه';
  }

  private calculateOverallConfidence(): number {
    const patterns = Array.from(this.learningPatterns.values());
    if (patterns.length === 0) return 50;
    
    const avgReliability = patterns.reduce((sum, p) => sum + p.reliability, 0) / patterns.length;
    return Math.round(avgReliability);
  }

  private calculateSuccessRate(factor: string): number {
    const patterns = Array.from(this.learningPatterns.values());
    const relevantPatterns = patterns.filter(p => 
      p.insights.whatWorked.includes(factor)
    );
    
    if (relevantPatterns.length === 0) return 50;
    
    const successfulPatterns = relevantPatterns.filter(p => p.patternType === 'SUCCESS');
    return Math.round((successfulPatterns.length / relevantPatterns.length) * 100);
  }

  private async storeDailyInstructions(instructions: DailyInstructions): Promise<void> {
    // Store daily instructions for tracking and analysis
    console.log(`📋 Daily instructions generated for ${instructions.date}`);
  }

  private getDefaultInstructions(): DailyInstructions {
    return {
      date: new Date().toISOString().split('T')[0],
      generalStrategy: 'رویکرد متعادل با تأکید بر ارتباط مؤثر',
      representativeSpecificTasks: [],
      teamLevelGuidance: {
        focusAreas: ['ارتباط مؤثر', 'مدیریت بدهی'],
        commonChallenges: ['تأخیر در پاسخگویی'],
        successStrategies: ['تماس منظم', 'رویکرد دوستانه'],
        culturalConsiderations: ['احترام به فرهنگ ایرانی']
      },
      aiConfidence: 50,
      basedOnExperiences: 0
    };
  }
}

export const adaptiveLearningService = new AdaptiveLearningService();