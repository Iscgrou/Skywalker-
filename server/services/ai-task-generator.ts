// AI Task Generator Engine - DA VINCI v2.0
// Core intelligence system for generating Persian cultural workspace tasks

import { XAIGrokEngine } from "./xai-grok-engine";
import { settingsStorage } from "./settings-storage";
import type { 
  WorkspaceTask, 
  SupportStaff, 
  ManagerTask, 
  OfferIncentive, 
  AiKnowledge 
} from "@shared/schema";

// Import persian-date as ES module
import * as persianDate from "persian-date";

export interface TaskGenerationContext {
  managerTasks: ManagerTask[];
  availableStaff: SupportStaff[];
  activeOffers: OfferIncentive[];
  knowledgeBase: AiKnowledge[];
  representativeProfiles: any[];
}

export interface TaskGenerationResult {
  tasks: WorkspaceTask[];
  generationMetadata: {
    totalGenerated: number;
    culturalFactorsApplied: string[];
    aiConfidenceAverage: number;
    processingTimeMs: number;
  };
}

export class AITaskGenerator {
  private grokEngine: XAIGrokEngine;
  private persianCalendar: any;

  constructor() {
    this.grokEngine = new XAIGrokEngine(settingsStorage);
    
    // Initialize Persian calendar - use constructor function
    this.persianCalendar = persianDate;
  }

  /**
   * Main task generation pipeline
   * Processes manager workspace items and generates culturally-aware tasks
   */
  async generateDailyTasks(): Promise<TaskGenerationResult> {
    const startTime = Date.now();
    
    try {
      // 1. Gather generation context
      const context = await this.buildGenerationContext();
      
      // 2. Generate tasks using AI
      const tasks = await this.processManagerWorkspace(context);
      
      // 3. Apply cultural intelligence
      const culturallyEnhancedTasks = await this.applyCulturalIntelligence(tasks, context);
      
      // 4. Assign tasks to appropriate staff
      const assignedTasks = await this.assignTasksToStaff(culturallyEnhancedTasks, context);
      
      // 5. Schedule with Persian datetime
      const scheduledTasks = this.applyPersianScheduling(assignedTasks);
      
      const processingTime = Date.now() - startTime;
      
      return {
        tasks: scheduledTasks,
        generationMetadata: {
          totalGenerated: scheduledTasks.length,
          culturalFactorsApplied: this.extractCulturalFactors(scheduledTasks),
          aiConfidenceAverage: this.calculateAverageConfidence(scheduledTasks),
          processingTimeMs: processingTime
        }
      };
    } catch (error) {
      console.error('Task generation failed:', error);
      return {
        tasks: [],
        generationMetadata: {
          totalGenerated: 0,
          culturalFactorsApplied: [],
          aiConfidenceAverage: 0,
          processingTimeMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Build comprehensive context for task generation
   */
  private async buildGenerationContext(): Promise<TaskGenerationContext> {
    // DA VINCI v2.0 - Use available data with error handling for missing tables
    try {
      const contextPromises = [
        settingsStorage.getManagerTasks().catch(() => []),
        settingsStorage.getSupportStaff().catch(() => []),
        settingsStorage.getOfferIncentives().catch(() => []),
        settingsStorage.getAiKnowledge().catch(() => []),
        this.getRepresentativeProfiles().catch(() => [])
      ];

      const [managerTasks, staff, offers, knowledge, representatives] = await Promise.all(contextPromises);

      return {
        managerTasks: managerTasks.filter(task => task?.isActive),
        availableStaff: staff.filter(s => s?.isActive),
        activeOffers: offers.filter(offer => offer?.isActive),
        knowledgeBase: knowledge.filter(kb => kb?.isActive),
        representativeProfiles: representatives
      };
    } catch (error) {
      console.log('Using minimal context for DA VINCI v2.0 task generation');
      const representatives = await this.getRepresentativeProfiles().catch(() => []);
      
      return {
        managerTasks: [],
        availableStaff: [],
        activeOffers: [],
        knowledgeBase: [],
        representativeProfiles: representatives
      };
    }
  }

  /**
   * Process manager workspace items through AI
   */
  private async processManagerWorkspace(context: TaskGenerationContext): Promise<Partial<WorkspaceTask>[]> {
    const tasks: Partial<WorkspaceTask>[] = [];

    for (const managerTask of context.managerTasks) {
      try {
        // Generate AI-powered task based on manager's definition
        const aiPrompt = this.buildTaskGenerationPrompt(managerTask, context);
        
        const aiResponse = await this.grokEngine.generateTaskRecommendation(
          // Find representative related to this task
          context.representativeProfiles.find(rep => 
            managerTask.targetRepresentatives?.includes(rep.id)
          ) || context.representativeProfiles[0], // Fallback to first rep
          
          // Cultural analysis placeholder - will be enhanced
          {
            communicationStyle: 'respectful',
            culturalSensitivity: 'high',
            businessApproach: 'traditional',
            relationshipPriority: 8,
            timeOrientation: 'flexible',
            trustLevel: 7
          }
        );

        // Convert AI recommendation to workspace task
        const workspaceTask: Partial<WorkspaceTask> = {
          title: aiResponse.title,
          description: aiResponse.description,
          priority: aiResponse.priority,
          aiContext: {
            culturalConsiderations: aiResponse.culturalConsiderations,
            suggestedApproach: aiResponse.description,
            expectedOutcome: aiResponse.expectedOutcome,
            riskLevel: Math.ceil(aiResponse.estimatedDifficulty)
          },
          managerTaskId: managerTask.id.toString(),
          generatedFromSettings: {
            staffAssignment: 0, // Will be assigned later
            relatedOffers: context.activeOffers
              .filter((offer: any) => managerTask.assignedStaffId && offer.id)
              .map((offer: any) => offer.id),
            knowledgeBaseRefs: context.knowledgeBase
              .filter((kb: any) => kb.id)
              .map((kb: any) => kb.id.toString())
          }
        };

        tasks.push(workspaceTask);
      } catch (error) {
        console.error(`Failed to process manager task ${managerTask.id}:`, error);
        // Continue with other tasks
      }
    }

    return tasks;
  }

  /**
   * Apply Persian cultural intelligence to generated tasks
   */
  private async applyCulturalIntelligence(
    tasks: Partial<WorkspaceTask>[], 
    context: TaskGenerationContext
  ): Promise<Partial<WorkspaceTask>[]> {
    
    return Promise.all(tasks.map(async (task) => {
      try {
        // Enhanced cultural prompt for Persian business context
        const culturalPrompt = `
تحلیل فرهنگی وظیفه کاری برای محیط تجاری ایران:

وظیفه: ${task.title}
شرح: ${task.description}

لطفا موارد زیر را با در نظر گیری فرهنگ کاری ایران تحلیل کن:
1. بهترین زمان تماس با نماینده
2. نحوه برخورد محترمانه و مؤثر
3. احتمال موفقیت و ریسک‌های احتمالی
4. پیشنهاد کلمات و عبارات مناسب
5. نکات فرهنگی مهم

پاسخ را در قالب JSON ارائه ده.
`;

        // Use public interface instead of private client
        const culturalAnalysisResponse = await this.grokEngine.generateResponse(culturalPrompt);

        // Try to parse as JSON, fallback to basic structure
        let analysis: any = {};
        try {
          analysis = JSON.parse(culturalAnalysisResponse);
        } catch {
          analysis = {
            culturalNotes: ['فرهنگ کاری ایرانی در نظر گرفته شود'],
            suggestedApproach: culturalAnalysisResponse.substring(0, 200),
            riskLevel: 3
          };
        }
        
        // Enhance task with cultural insights
        return {
          ...task,
          aiContext: {
            ...task.aiContext!,
            culturalConsiderations: [
              ...(task.aiContext?.culturalConsiderations || []),
              ...(analysis.culturalNotes || [])
            ],
            suggestedApproach: analysis.suggestedApproach || task.aiContext?.suggestedApproach || '',
            riskLevel: analysis.riskLevel || task.aiContext?.riskLevel || 3
          }
        };
      } catch (error) {
        console.error('Cultural analysis failed for task:', error);
        return task; // Return original task if analysis fails
      }
    }));
  }

  /**
   * Assign tasks to appropriate staff members
   */
  private async assignTasksToStaff(
    tasks: Partial<WorkspaceTask>[], 
    context: TaskGenerationContext
  ): Promise<Partial<WorkspaceTask>[]> {
    
    return tasks.map(task => {
      // Smart staff assignment based on workload, skills, and task requirements
      const assignedStaff = this.selectOptimalStaff(task, context.availableStaff);
      
      return {
        ...task,
        staffId: assignedStaff?.id || context.availableStaff[0]?.id || 1,
        generatedFromSettings: {
          ...task.generatedFromSettings!,
          staffAssignment: assignedStaff?.id || context.availableStaff[0]?.id || 1
        }
      };
    });
  }

  /**
   * Apply Persian scheduling and datetime
   */
  private applyPersianScheduling(tasks: Partial<WorkspaceTask>[]): WorkspaceTask[] {
    const now = new this.persianCalendar();
    
    return tasks.map((task, index) => {
      // Generate unique task ID
      const taskId = `TASK-${now.format('YYYY-MM-DD')}-${(index + 1).toString().padStart(3, '0')}`;
      
      // Schedule task for immediate assignment
      const assignedAt = now.format('YYYY/MM/DD HH:mm:ss');
      
      // Set deadline based on priority
      const deadlineHours = this.getDeadlineHours(task.priority || 'MEDIUM');
      const deadline = now.clone().add(deadlineHours, 'hours').format('YYYY/MM/DD HH:mm:ss');

      return {
        id: taskId,
        staffId: task.staffId!,
        representativeId: task.representativeId || 1, // Will be set properly later
        title: task.title!,
        description: task.description!,
        priority: task.priority!,
        status: 'ASSIGNED' as const,
        assignedAt,
        deadline,
        aiContext: task.aiContext!,
        managerTaskId: task.managerTaskId,
        generatedFromSettings: task.generatedFromSettings!
      };
    });
  }

  // Helper methods
  private buildTaskGenerationPrompt(managerTask: ManagerTask, context: TaskGenerationContext): string {
    return `
مدیر CRM وظیفه زیر را تعریف کرده:
عنوان: ${managerTask.title}
شرح: ${managerTask.description}
اولویت: ${managerTask.priority}

منابع در دسترس:
- کارمندان: ${context.availableStaff.map((s: any) => s.fullName).join(', ')}
- آفرها: ${context.activeOffers.map((o: any) => o.offerName).join(', ')}
- دانش خصوصی: ${context.knowledgeBase.map((k: any) => k.title || k.category).join(', ')}

لطفا این وظیفه را به صورت عملیاتی و قابل اجرا برای کارمند پشتیبانی تبدیل کن.
`;
  }

  private selectOptimalStaff(task: Partial<WorkspaceTask>, staff: SupportStaff[]): SupportStaff | null {
    if (staff.length === 0) return null;
    
    // Simple round-robin for now - can be enhanced with workload balancing
    return staff[Math.floor(Math.random() * staff.length)];
  }

  private getDeadlineHours(priority: string): number {
    switch (priority) {
      case 'URGENT': return 4;
      case 'HIGH': return 12;
      case 'MEDIUM': return 24;
      case 'LOW': return 48;
      default: return 24;
    }
  }

  private extractCulturalFactors(tasks: WorkspaceTask[]): string[] {
    const factors = new Set<string>();
    tasks.forEach(task => {
      task.aiContext.culturalConsiderations.forEach((factor: any) => factors.add(factor));
    });
    return Array.from(factors);
  }

  private calculateAverageConfidence(tasks: WorkspaceTask[]): number {
    if (tasks.length === 0) return 0;
    
    const totalConfidence = tasks.reduce((sum, task) => {
      return sum + (task.aiContext.riskLevel || 0) * 20; // Convert risk to confidence
    }, 0);
    
    return Math.round(totalConfidence / tasks.length);
  }

  private async getRepresentativeProfiles(): Promise<any[]> {
    // TODO: Integrate with existing representative system
    // For now, return empty array
    return [];
  }
}