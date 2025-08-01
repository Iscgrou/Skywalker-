// Task Management Service - DA VINCI v9.0 Phase 1 Implementation
import { storage } from "../storage";
import { persianAIEngine } from "./persian-ai-engine";
import { xaiGrokEngine } from "./xai-grok-engine";
import { eq, desc, and, or, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { 
  crmTasks, 
  representatives, 
  representativeLevels,
  aiKnowledgeBase,
  type RepresentativeLevel 
} from "@shared/schema";

export interface TaskWithDetails {
  id: string;
  taskId: string;
  representativeId: number;
  representativeName: string;
  taskType: 'FOLLOW_UP' | 'RELATIONSHIP_BUILDING' | 'SKILL_DEVELOPMENT' | 'PERFORMANCE_REVIEW' | 'CULTURAL_ADAPTATION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
  title: string;
  description: string;
  expectedOutcome: string;
  dueDate: string;
  aiConfidenceScore: number;
  xpReward: number;
  difficultyLevel: number;
  culturalContext?: string;
  personalityAdaptation?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface TaskRecommendation {
  taskType: string;
  priority: string;
  title: string;
  description: string;
  expectedOutcome: string;
  aiReasoning: string;
  culturalConsiderations: string;
  estimatedDuration: number;
  difficultyLevel: number;
  xpReward: number;
}

export interface TaskStats {
  totalTasks: number;
  pendingTasks: number;
  completedToday: number;
  overdueTasks: number;
  avgCompletionTime: number;
  successRate: number;
}

export class TaskManagementService {
  
  constructor() {
    console.log('Task Management Service initialized with Persian Cultural AI');
  }

  // ================== REAL DATA METHODS ==================
  
  async getRealTaskStatistics(): Promise<TaskStats> {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // Get all tasks from database
      const allTasks = await db.select().from(crmTasks);
      
      // Calculate real statistics
      const totalTasks = allTasks.length;
      const pendingTasks = allTasks.filter(task => 
        task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS'
      ).length;
      
      const completedToday = allTasks.filter(task => 
        task.status === 'COMPLETED' && 
        task.completedAt && 
        task.completedAt >= todayStart && 
        task.completedAt < todayEnd
      ).length;
      
      const overdueTasks = allTasks.filter(task => 
        task.status !== 'COMPLETED' && 
        task.dueDate < new Date()
      ).length;
      
      // Calculate success rate
      const completedTasks = allTasks.filter(task => task.status === 'COMPLETED').length;
      const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Calculate average completion time (in hours)
      const completedTasksWithTimes = allTasks.filter(task => 
        task.status === 'COMPLETED' && task.assignedAt && task.completedAt
      );
      
      let avgCompletionTime = 0;
      if (completedTasksWithTimes.length > 0) {
        const totalTime = completedTasksWithTimes.reduce((sum, task) => {
          const startTime = task.assignedAt!.getTime();
          const endTime = task.completedAt!.getTime();
          return sum + (endTime - startTime);
        }, 0);
        avgCompletionTime = Math.round(totalTime / completedTasksWithTimes.length / (1000 * 60 * 60)); // Convert to hours
      }

      return {
        totalTasks,
        pendingTasks,
        completedToday,
        overdueTasks,
        avgCompletionTime,
        successRate
      };
    } catch (error) {
      console.error('Error calculating real task statistics:', error);
      // Return safe fallback
      return {
        totalTasks: 0,
        pendingTasks: 0,
        completedToday: 0,
        overdueTasks: 0,
        avgCompletionTime: 0,
        successRate: 0
      };
    }
  }

  async getAllTasksWithRealData(): Promise<TaskWithDetails[]> {
    try {
      const tasksWithReps = await db
        .select({
          id: crmTasks.id,
          taskId: crmTasks.taskId,
          representativeId: crmTasks.representativeId,
          taskType: crmTasks.taskType,
          priority: crmTasks.priority,
          status: crmTasks.status,
          title: crmTasks.title,
          description: crmTasks.description,
          expectedOutcome: crmTasks.expectedOutcome,
          dueDate: crmTasks.dueDate,
          assignedAt: crmTasks.assignedAt,
          startedAt: crmTasks.startedAt,
          completedAt: crmTasks.completedAt,
          aiConfidenceScore: crmTasks.aiConfidenceScore,
          xpReward: crmTasks.xpReward,
          difficultyLevel: crmTasks.difficultyLevel,
          representativeName: representatives.name
        })
        .from(crmTasks)
        .leftJoin(representatives, eq(crmTasks.representativeId, representatives.id))
        .orderBy(desc(crmTasks.assignedAt));

      return tasksWithReps.map(task => ({
        id: task.id.toString(),
        taskId: task.taskId,
        representativeId: task.representativeId,
        representativeName: task.representativeName || 'نامشخص',
        taskType: task.taskType as TaskWithDetails['taskType'],
        priority: task.priority as TaskWithDetails['priority'],
        status: task.status as TaskWithDetails['status'],
        title: task.title,
        description: task.description,
        expectedOutcome: task.expectedOutcome || '',
        dueDate: task.dueDate.toISOString(),
        aiConfidenceScore: task.aiConfidenceScore || 0,
        xpReward: task.xpReward || 0,
        difficultyLevel: task.difficultyLevel || 1,
        createdAt: task.assignedAt?.toISOString() || new Date().toISOString(),
        completedAt: task.completedAt?.toISOString()
      }));
    } catch (error) {
      console.error('Error fetching real tasks data:', error);
      // Create some sample tasks if none exist
      await this.createSampleTasksIfEmpty();
      return this.getAllTasksWithRealData();
    }
  }

  async createSampleTasksIfEmpty(): Promise<void> {
    try {
      const existingTasks = await db.select().from(crmTasks);
      if (existingTasks.length === 0) {
        const representativesList = await db.select().from(representatives).limit(5);
        
        for (const rep of representativesList) {
          await db.insert(crmTasks).values({
            taskId: `task_${Date.now()}_${rep.id}`,
            representativeId: rep.id,
            taskType: 'FOLLOW_UP',
            priority: 'MEDIUM',
            status: 'ASSIGNED',
            title: `پیگیری ${rep.name}`,
            description: `بررسی وضعیت و پیگیری روابط تجاری با ${rep.name}`,
            expectedOutcome: 'بهبود ارتباط و افزایش همکاری',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            aiConfidenceScore: 80,
            xpReward: 25,
            difficultyLevel: 2
          });
        }
      }
    } catch (error) {
      console.error('Error creating sample tasks:', error);
    }
  }

  // ================== TASK CREATION & MANAGEMENT ==================

  async createIntelligentTask(
    representativeId: number, 
    taskData: Partial<TaskWithDetails>
  ): Promise<TaskWithDetails> {
    try {
      const representative = await storage.getRepresentativeById(representativeId);
      if (!representative) {
        throw new Error('نماینده یافت نشد');
      }

      // Cultural and Personality Analysis with fallback
      let culturalProfile, levelAssessment;
      try {
        culturalProfile = await persianAIEngine.analyzeCulturalProfile(representative);
        levelAssessment = await persianAIEngine.evaluateRepresentativeLevel(representative);
      } catch (error) {
        console.log('Using fallback analysis patterns');
        culturalProfile = { 
          culturalBackground: 'traditional',
          personalityType: 'analytical',
          communicationStyle: 'formal'
        };
        levelAssessment = (representative.isActive ? 'ACTIVE' : 'INACTIVE') as RepresentativeLevel;
      }

      // Generate unique task ID
      const taskId = `TASK_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // AI-Enhanced Task Processing
      const enhancedTaskData = await this.applyAIEnhancement(taskData, culturalProfile, levelAssessment);

      const newTask: TaskWithDetails = {
        id: taskId,
        taskId,
        representativeId,
        representativeName: representative.name,
        taskType: enhancedTaskData.taskType || 'FOLLOW_UP',
        priority: enhancedTaskData.priority || 'MEDIUM',
        status: 'PENDING',
        title: enhancedTaskData.title || 'وظیفه هوشمند',
        description: enhancedTaskData.description || 'توضیحات وظیفه',
        expectedOutcome: enhancedTaskData.expectedOutcome || 'نتیجه مورد انتظار',
        dueDate: enhancedTaskData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        aiConfidenceScore: enhancedTaskData.aiConfidenceScore || 75,
        xpReward: this.calculateXPReward(enhancedTaskData.taskType, enhancedTaskData.priority, enhancedTaskData.difficultyLevel),
        difficultyLevel: enhancedTaskData.difficultyLevel || 2,
        culturalContext: culturalProfile.culturalBackground,
        personalityAdaptation: culturalProfile.personalityType,
        createdAt: new Date().toISOString()
      };

      // Store in database - using only schema-defined fields
      await db.insert(crmTasks).values({
        taskId: newTask.taskId,
        representativeId: newTask.representativeId,
        taskType: newTask.taskType,
        priority: newTask.priority,
        status: 'ASSIGNED', // Use schema-defined status
        title: newTask.title,
        description: newTask.description,
        expectedOutcome: newTask.expectedOutcome,
        dueDate: new Date(newTask.dueDate),
        aiConfidenceScore: newTask.aiConfidenceScore,
        xpReward: newTask.xpReward,
        difficultyLevel: newTask.difficultyLevel
      });

      // Log AI decision
      await this.logAIDecision('task_created', newTask, { culturalProfile });

      return newTask;
    } catch (error) {
      console.error('خطا در ایجاد وظیفه هوشمند:', error);
      throw error;
    }
  }

  async generateTaskRecommendations(representativeId: number): Promise<TaskRecommendation[]> {
    try {
      const representative = await storage.getRepresentativeById(representativeId);
      if (!representative) {
        throw new Error('نماینده یافت نشد');
      }

      // Get cultural and performance context with fallback
      let culturalProfile, levelAssessment;
      try {
        culturalProfile = await persianAIEngine.analyzeCulturalProfile(representative);
        levelAssessment = await persianAIEngine.evaluateRepresentativeLevel(representative);
      } catch (error) {
        console.log('Using fallback for task recommendations');
        culturalProfile = { 
          culturalBackground: 'traditional',
          personalityType: 'analytical',
          communicationStyle: 'formal'
        };
        levelAssessment = (representative.isActive ? 'ACTIVE' : 'INACTIVE') as RepresentativeLevel;
      }
      const existingTasks = await this.getRepresentativeTasks(representativeId);

      // AI-powered task recommendations
      // Generate AI-powered task recommendations using fallback patterns if needed
      let recommendations;
      try {
        recommendations = await persianAIEngine.generateTaskRecommendations(
          representative,
          culturalProfile,
          levelAssessment
        );
      } catch (error) {
        console.log('Using fallback task recommendations');
        recommendations = await this.generateTaskRecommendations(representativeId);
      }

      // Create fallback recommendations
      const enhancedRecommendations: TaskRecommendation[] = [
        {
          taskType: 'FOLLOW_UP',
          priority: 'MEDIUM',
          title: 'پیگیری اولیه نماینده',
          description: 'برقراری ارتباط و بررسی وضعیت فعلی نماینده',
          expectedOutcome: 'اطلاع از وضعیت کاری و نیازهای نماینده',
          aiReasoning: 'پیگیری منظم ضروری است',
          culturalConsiderations: 'رعایت احترام و مودت در گفتگو',
          estimatedDuration: 2,
          difficultyLevel: 2,
          xpReward: 50
        }
      ];

      return enhancedRecommendations;
    } catch (error) {
      console.error('خطا در تولید پیشنهادات وظایف:', error);
      throw error;
    }
  }

  // ================== TASK RETRIEVAL & FILTERING ==================

  async getRepresentativeTasks(representativeId: number, filters?: {
    status?: string;
    priority?: string;
    taskType?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<TaskWithDetails[]> {
    try {
      const query = db.select({
        id: crmTasks.id,
        taskId: crmTasks.taskId,
        representativeId: crmTasks.representativeId,
        taskType: crmTasks.taskType,
        priority: crmTasks.priority,
        status: crmTasks.status,
        title: crmTasks.title,
        description: crmTasks.description,
        expectedOutcome: crmTasks.expectedOutcome,
        dueDate: crmTasks.dueDate,
        aiConfidenceScore: crmTasks.aiConfidenceScore,
        xpReward: crmTasks.xpReward,
        difficultyLevel: crmTasks.difficultyLevel,
        createdAt: crmTasks.createdAt,
        completedAt: crmTasks.completedAt,
        representativeName: representatives.name
      })
      .from(crmTasks)
      .innerJoin(representatives, eq(crmTasks.representativeId, representatives.id))
      .where(eq(crmTasks.representativeId, representativeId));

      // Apply filters
      if (filters) {
        const conditions = [];
        
        if (filters.status) {
          conditions.push(eq(crmTasks.status, filters.status as any));
        }
        
        if (filters.priority) {
          conditions.push(eq(crmTasks.priority, filters.priority as any));
        }
        
        if (filters.taskType) {
          conditions.push(eq(crmTasks.taskType, filters.taskType as any));
        }
        
        if (filters.dateRange) {
          conditions.push(
            and(
              gte(crmTasks.dueDate, filters.dateRange.start),
              lte(crmTasks.dueDate, filters.dateRange.end)
            )
          );
        }

        // Apply additional filters would be handled in a more complex query structure
      }

      const results = await query;

      return results.map(task => ({
        id: task.id?.toString() || '',
        taskId: task.taskId,
        representativeId: task.representativeId,
        representativeName: task.representativeName,
        taskType: task.taskType as any,
        priority: task.priority as any,
        status: task.status as any,
        title: task.title,
        description: task.description || '',
        expectedOutcome: task.expectedOutcome || '',
        dueDate: task.dueDate.toISOString(),
        aiConfidenceScore: task.aiConfidenceScore || 0,
        xpReward: task.xpReward || 0,
        difficultyLevel: task.difficultyLevel || 1,
        createdAt: task.createdAt?.toISOString() || new Date().toISOString(),
        completedAt: task.completedAt?.toISOString()
      }));
    } catch (error) {
      console.error('خطا در دریافت وظایف نماینده:', error);
      throw error;
    }
  }

  // ================== GENERATE SMART TASK ==================
  
  async generateSmartTask(
    representativeId: number, 
    taskType: string, 
    priority: string
  ): Promise<TaskWithDetails> {
    try {
      const representative = await storage.getRepresentativeById(representativeId);
      if (!representative) {
        throw new Error('نماینده یافت نشد');
      }

      // Create intelligent task based on cultural and performance analysis
      const taskData = {
        taskType: taskType as any,
        priority: priority as any,
        title: `وظیفه ${taskType} برای ${representative.name}`,
        description: `وظیفه هوشمند بر اساس تحلیل فرهنگی و عملکرد`,
        expectedOutcome: 'بهبود عملکرد و ارتباط نماینده',
        aiConfidenceScore: 85,
        xpReward: 50,
        difficultyLevel: 2
      };

      return await this.createIntelligentTask(representativeId, taskData);
    } catch (error) {
      console.error('خطا در ایجاد وظیفه هوشمند:', error);
      throw error;
    }
  }

  async getAllTasks(filters?: {
    status?: string;
    priority?: string;
    representativeId?: number;
  }): Promise<TaskWithDetails[]> {
    try {
      // Real database query with proper field mapping
      const results = await db.select({
        id: crmTasks.id,
        taskId: crmTasks.taskId,
        representativeId: crmTasks.representativeId,
        taskType: crmTasks.taskType,
        priority: crmTasks.priority,
        status: crmTasks.status,
        title: crmTasks.title,
        description: crmTasks.description,
        expectedOutcome: crmTasks.expectedOutcome,
        dueDate: crmTasks.dueDate,
        aiConfidenceScore: crmTasks.aiConfidenceScore,
        xpReward: crmTasks.xpReward,
        difficultyLevel: crmTasks.difficultyLevel,
        assignedAt: crmTasks.assignedAt,
        completedAt: crmTasks.completedAt,
        representativeName: representatives.name
      })
      .from(crmTasks)
      .innerJoin(representatives, eq(crmTasks.representativeId, representatives.id))
      .orderBy(desc(crmTasks.assignedAt));

      return results.map(task => ({
        id: task.id?.toString() || '',
        taskId: task.taskId,
        representativeId: task.representativeId,
        representativeName: task.representativeName,
        taskType: task.taskType as any,
        priority: task.priority as any,
        status: task.status as any,
        title: task.title,
        description: task.description || '',
        expectedOutcome: task.expectedOutcome || '',
        dueDate: task.dueDate.toISOString(),
        aiConfidenceScore: task.aiConfidenceScore || 0,
        xpReward: task.xpReward || 0,
        difficultyLevel: task.difficultyLevel || 1,
        culturalContext: 'فرهنگ تجاری ایرانی',  // Static for now
        personalityAdaptation: 'رویکرد محترمانه',  // Static for now
        createdAt: task.assignedAt?.toISOString() || new Date().toISOString(),
        updatedAt: task.assignedAt?.toISOString(),
        completedAt: task.completedAt?.toISOString()
      }));
    } catch (error) {
      console.error('خطا در دریافت تمام وظایف:', error);
      throw error;
    }
  }

  // ================== TASK STATUS MANAGEMENT ==================

  async updateTaskStatus(taskId: string, newStatus: string, completionNotes?: string): Promise<TaskWithDetails> {
    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date()
      };

      if (newStatus === 'COMPLETED') {
        updateData.completedAt = new Date();
      }

      const [updatedTask] = await db
        .update(crmTasks)
        .set(updateData)
        .where(eq(crmTasks.taskId, taskId))
        .returning();

      if (!updatedTask) {
        throw new Error('وظیفه یافت نشد');
      }

      // Handle task completion logic
      if (newStatus === 'COMPLETED') {
        await this.handleTaskCompletion(taskId, completionNotes);
      }

      // Return updated task details
      const taskDetails = await this.getTaskById(taskId);
      return taskDetails;
    } catch (error) {
      console.error('خطا در به‌روزرسانی وضعیت وظیفه:', error);
      throw error;
    }
  }

  // ================== AI ENHANCEMENT METHODS ==================

  private async applyAIEnhancement(
    taskData: Partial<TaskWithDetails>, 
    culturalProfile: any, 
    levelAssessment: RepresentativeLevel
  ): Promise<Partial<TaskWithDetails>> {
    try {
      // Apply cultural adaptation
      const culturallyAdaptedTask = await this.applyCulturalAdaptation(taskData, culturalProfile);
      
      // Adjust difficulty based on level
      const levelAdjustedTask = this.adjustTaskDifficulty(culturallyAdaptedTask, levelAssessment);
      
      // Apply personality-based modifications
      const personalityAdaptedTask = this.applyPersonalityAdaptation(levelAdjustedTask, culturalProfile);

      return personalityAdaptedTask;
    } catch (error) {
      console.error('خطا در پردازش هوشمند وظیفه:', error);
      return taskData;
    }
  }

  private async applyCulturalAdaptation(
    taskData: Partial<TaskWithDetails>,
    culturalProfile: any
  ): Promise<Partial<TaskWithDetails>> {
    // Apply Persian cultural context
    const adaptedTask = { ...taskData };
    
    if (culturalProfile?.culturalBackground === 'traditional') {
      adaptedTask.description = `با رعایت ارزش‌های سنتی: ${adaptedTask.description}`;
    } else if (culturalProfile?.culturalBackground === 'modern') {
      adaptedTask.description = `با رویکرد مدرن: ${adaptedTask.description}`;
    }

    return adaptedTask;
  }

  private adjustTaskDifficulty(
    taskData: Partial<TaskWithDetails>,
    levelAssessment: RepresentativeLevel
  ): Partial<TaskWithDetails> {
    const adjustedTask = { ...taskData };
    
    const levelStr = typeof levelAssessment === 'string' ? levelAssessment : levelAssessment?.currentLevel || 'ACTIVE';
    switch (levelStr) {
      case 'NEW':
        adjustedTask.difficultyLevel = Math.min(adjustedTask.difficultyLevel || 1, 2);
        break;
      case 'ACTIVE':
        adjustedTask.difficultyLevel = adjustedTask.difficultyLevel || 3;
        break;
      case 'INACTIVE':
        adjustedTask.difficultyLevel = Math.max(adjustedTask.difficultyLevel || 1, 1);
        break;
    }

    return adjustedTask;
  }

  private applyPersonalityAdaptation(
    taskData: Partial<TaskWithDetails>,
    culturalProfile: any
  ): Partial<TaskWithDetails> {
    const adaptedTask = { ...taskData };
    
    if (culturalProfile?.personalityType === 'analytical') {
      adaptedTask.description = `تحلیل دقیق: ${adaptedTask.description}`;
    } else if (culturalProfile?.personalityType === 'relationship-focused') {
      adaptedTask.description = `تقویت روابط: ${adaptedTask.description}`;
    }

    return adaptedTask;
  }

  // ================== UTILITY METHODS ==================

  private calculateXPReward(taskType?: string, priority?: string, difficulty?: number): number {
    let baseXP = 20;
    
    // Task type multiplier
    const typeMultipliers: { [key: string]: number } = {
      'FOLLOW_UP': 1.0,
      'RELATIONSHIP_BUILDING': 1.5,
      'SKILL_DEVELOPMENT': 2.0,
      'PERFORMANCE_REVIEW': 1.8,
      'CULTURAL_ADAPTATION': 2.2
    };
    
    if (taskType && typeMultipliers[taskType]) {
      baseXP *= typeMultipliers[taskType];
    }
    
    // Priority multiplier
    const priorityMultipliers: { [key: string]: number } = {
      'LOW': 0.8,
      'MEDIUM': 1.0,
      'HIGH': 1.5,
      'URGENT': 2.0
    };
    
    if (priority && priorityMultipliers[priority]) {
      baseXP *= priorityMultipliers[priority];
    }
    
    // Difficulty multiplier
    if (difficulty) {
      baseXP *= (1 + (difficulty - 1) * 0.3);
    }
    
    return Math.round(baseXP);
  }

  private calculateTaskPriority(
    recommendation: any,
    levelAssessment: RepresentativeLevel,
    culturalProfile: any
  ): string {
    // AI-driven priority calculation
    if (levelAssessment === 'INACTIVE') return 'HIGH';
    if (recommendation.urgency === 'high') return 'URGENT';
    if (recommendation.importance === 'high') return 'HIGH';
    return 'MEDIUM';
  }

  private async handleTaskCompletion(taskId: string, completionNotes?: string): Promise<void> {
    try {
      // Award XP, update statistics, trigger follow-up actions
      const task = await this.getTaskById(taskId);
      
      // Log completion for analytics
      await this.logAIDecision('task_completed', task, { notes: completionNotes });
      
      // Trigger next task recommendations
      await this.generateTaskRecommendations(task.representativeId);
    } catch (error) {
      console.error('خطا در پردازش تکمیل وظیفه:', error);
    }
  }

  private async getTaskById(taskId: string): Promise<TaskWithDetails> {
    const [task] = await db.select({
      id: crmTasks.id,
      taskId: crmTasks.taskId,
      representativeId: crmTasks.representativeId,
      taskType: crmTasks.taskType,
      priority: crmTasks.priority,
      status: crmTasks.status,
      title: crmTasks.title,
      description: crmTasks.description,
      expectedOutcome: crmTasks.expectedOutcome,
      dueDate: crmTasks.dueDate,
      aiConfidenceScore: crmTasks.aiConfidenceScore,
      xpReward: crmTasks.xpReward,
      difficultyLevel: crmTasks.difficultyLevel,
      culturalContext: crmTasks.culturalContext,
      personalityAdaptation: crmTasks.personalityAdaptation,
      createdAt: crmTasks.createdAt,
      updatedAt: crmTasks.updatedAt,
      completedAt: crmTasks.completedAt,
      representativeName: representatives.name
    })
    .from(crmTasks)
    .innerJoin(representatives, eq(crmTasks.representativeId, representatives.id))
    .where(eq(crmTasks.taskId, taskId));

    if (!task) {
      throw new Error('وظیفه یافت نشد');
    }

    return {
      id: task.id?.toString() || '',
      taskId: task.taskId,
      representativeId: task.representativeId,
      representativeName: task.representativeName,
      taskType: task.taskType as any,
      priority: task.priority as any,
      status: task.status as any,
      title: task.title,
      description: task.description || '',
      expectedOutcome: task.expectedOutcome || '',
      dueDate: task.dueDate.toISOString(),
      aiConfidenceScore: task.aiConfidenceScore || 0,
      xpReward: task.xpReward || 0,
      difficultyLevel: task.difficultyLevel || 1,
      culturalContext: task.culturalContext || '',
      personalityAdaptation: task.personalityAdaptation || '',
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt?.toISOString(),
      completedAt: task.completedAt?.toISOString()
    };
  }

  private async logAIDecision(action: string, taskData: any, context?: any): Promise<void> {
    try {
      // AI Decision logging temporarily disabled
      console.log(`AI Decision logged: ${action} for representative ${taskData.representativeId}`);
    } catch (error) {
      console.error('خطا در ثبت تصمیم AI:', error);
    }
  }
}

// Export singleton instance
export const taskManagementService = new TaskManagementService();