// 🎯 GAMIFICATION ENGINE - DA VINCI v6.0 Phase 4
// سیستم انگیزش‌سازی و گیمیفیکیشن هوشمند با هوش مصنوعی فارسی

import { storage } from "../storage";
import { persianAIEngine } from "./persian-ai-engine";
import { taskManagementService } from "./task-management-service";
import { performanceAnalyticsService } from "./performance-analytics-service";
import { db } from "../db";
import { representatives, crmTasks } from "@shared/schema";
import { eq, desc, and, gte, lte, sql, count, avg, sum } from "drizzle-orm";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'SALES' | 'CULTURAL' | 'TASK' | 'RELATIONSHIP' | 'LEARNING';
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  xpReward: number;
  requirements: {
    type: string;
    target: number;
    timeframe?: string;
  };
  culturalContext: string;
  persianMotivation: string;
  unlockedAt?: string;
  progress?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  earnedAt: string;
  culturalSignificance: string;
}

export interface XPSystem {
  currentXP: number;
  currentLevel: number;
  xpToNextLevel: number;
  totalXP: number;
  levelProgress: number;
  levelTitle: string;
  levelDescription: string;
  nextLevelTitle: string;
  culturalRank: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIAL';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
  xpReward: number;
  deadline: string;
  requirements: any;
  progress: number;
  maxProgress: number;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  culturalTheme: string;
  persianDescription: string;
}

export interface Leaderboard {
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  rankings: {
    rank: number;
    representativeId: number;
    representativeName: string;
    score: number;
    badge: string;
    change: number; // +1, -1, 0 for position change
    achievements: string[];
    culturalTitle: string;
  }[];
  myRank?: number;
  topThree: {
    first: any;
    second: any;
    third: any;
  };
}

export interface GamifiedProfile {
  representativeId: number;
  representativeName: string;
  xpSystem: XPSystem;
  achievements: Achievement[];
  badges: Badge[];
  activeChallenges: Challenge[];
  completedChallenges: Challenge[];
  stats: {
    totalTasksCompleted: number;
    perfectMonths: number;
    streakDays: number;
    culturalAdaptationScore: number;
    relationshipBuildingScore: number;
    salesMasteryLevel: number;
  };
  motivationalQuotes: string[];
  nextMilestones: Achievement[];
  leaderboardPosition: number;
}

export class GamificationEngine {
  
  private levelTitles = [
    { level: 1, title: "نوآموز", description: "آغاز سفر موفقیت", culturalRank: "شاگرد" },
    { level: 5, title: "کارآموز", description: "یادگیرنده با انگیزه", culturalRank: "کارآموز" },
    { level: 10, title: "ماهر", description: "تسلط بر اصول کسب و کار", culturalRank: "استاد کار" },
    { level: 15, title: "خبره", description: "متخصص در حوزه فعالیت", culturalRank: "اُستاد" },
    { level: 20, title: "استاد", description: "رهبر و الهام‌بخش دیگران", culturalRank: "استاد بزرگ" },
    { level: 30, title: "استاد بزرگ", description: "نخبه در عرصه کسب و کار", culturalRank: "مرشد" },
    { level: 50, title: "افسانه", description: "الگویی برای نسل‌های آینده", culturalRank: "پیرغلام" }
  ];

  private achievements: Achievement[] = [
    // Sales Achievements
    {
      id: 'first_sale',
      title: 'اولین گام',
      description: 'تکمیل اولین فروش موفق',
      icon: '🎯',
      category: 'SALES',
      tier: 'BRONZE',
      xpReward: 100,
      requirements: { type: 'sales_count', target: 1 },
      culturalContext: 'در فرهنگ ایرانی، اولین گام همیشه با برکت است',
      persianMotivation: 'آفرین! اولین قدم را با موفقیت برداشتی'
    },
    {
      id: 'sales_master',
      title: 'استاد فروش',
      description: 'دستیابی به ۱۰۰ فروش موفق',
      icon: '👑',
      category: 'SALES',
      tier: 'GOLD',
      xpReward: 1000,
      requirements: { type: 'sales_count', target: 100 },
      culturalContext: 'صبر و پشتکار، کلید موفقیت در کسب و کار',
      persianMotivation: 'تو یک استاد واقعی شدی! افتخار می‌کنیم'
    },
    
    // Cultural Achievements
    {
      id: 'cultural_harmony',
      title: 'هماهنگی فرهنگی',
      description: 'کسب امتیاز بالا در سازگاری فرهنگی',
      icon: '🌟',
      category: 'CULTURAL',
      tier: 'SILVER',
      xpReward: 500,
      requirements: { type: 'cultural_score', target: 85 },
      culturalContext: 'احترام به فرهنگ و ارزش‌های مشترک',
      persianMotivation: 'رفتار محترمانه‌ات الهام‌بخش است'
    },
    
    // Task Achievements
    {
      id: 'task_champion',
      title: 'قهرمان وظایف',
      description: 'تکمیل ۵۰ وظیفه بدون تاخیر',
      icon: '⚡',
      category: 'TASK',
      tier: 'GOLD',
      xpReward: 750,
      requirements: { type: 'tasks_on_time', target: 50 },
      culturalContext: 'وقت‌شناسی، نشانه احترام به دیگران',
      persianMotivation: 'انضباط و دقت تو قابل ستایش است'
    },
    
    // Relationship Achievements
    {
      id: 'relationship_builder',
      title: 'سازنده روابط',
      description: 'ایجاد روابط مثبت با ۲۰ مشتری',
      icon: '🤝',
      category: 'RELATIONSHIP',
      tier: 'SILVER',
      xpReward: 600,
      requirements: { type: 'customer_relationships', target: 20 },
      culturalContext: 'در فرهنگ ما، روابط انسانی بنیان کسب و کار است',
      persianMotivation: 'دل‌ها را برده‌ای و این بزرگترین موفقیت است'
    }
  ];

  private persianMotivationalQuotes = [
    "هر قدم که بر می‌داری، تو را به قله موفقیت نزدیک‌تر می‌کند",
    "صبر و استقامت، کلید گشایش همه مشکلات است", 
    "تو قابلیت رسیدن به بالاترین مقام‌ها را داری",
    "با هر تلاش، یک پله از نردبان موفقیت بالا می‌روی",
    "احترام و صداقت، پایه‌های محکم کسب و کار توست",
    "هیچ هدفی غیرممکن نیست، فقط زمان کافی می‌خواهد",
    "تو نه تنها کار می‌کنی، بلکه آینده‌ای روشن می‌سازی",
    "در فرهنگ ما، محبت و احترام، بزرگترین سرمایه است"
  ];

  constructor() {
    console.log('Gamification Engine initialized with Persian Cultural Motivation');
  }

  // ================== MAIN GAMIFICATION FUNCTIONS ==================

  async getGamifiedProfile(representativeId: number): Promise<GamifiedProfile> {
    try {
      const [representative] = await db.select()
        .from(representatives)
        .where(eq(representatives.id, representativeId))
        .limit(1);

      if (!representative) {
        throw new Error('نماینده یافت نشد');
      }

      // Calculate XP and Level
      const xpSystem = await this.calculateXPSystem(representativeId);
      
      // Get achievements
      const achievements = await this.getRepresentativeAchievements(representativeId);
      
      // Get badges
      const badges = await this.getRepresentativeBadges(representativeId);
      
      // Get active challenges
      const activeChallenges = await this.getActiveChallenges(representativeId);
      
      // Get completed challenges
      const completedChallenges = await this.getCompletedChallenges(representativeId);
      
      // Calculate stats
      const stats = await this.calculateGamificationStats(representativeId);
      
      // Get motivational quotes
      const motivationalQuotes = this.getRandomMotivationalQuotes(3);
      
      // Get next milestones
      const nextMilestones = await this.getNextMilestones(representativeId);
      
      // Get leaderboard position
      const leaderboardPosition = await this.getLeaderboardPosition(representativeId);

      return {
        representativeId,
        representativeName: representative.name || `نماینده ${representativeId}`,
        xpSystem,
        achievements,
        badges,
        activeChallenges,
        completedChallenges,
        stats,
        motivationalQuotes,
        nextMilestones,
        leaderboardPosition
      };

    } catch (error) {
      console.error('خطا در دریافت پروفایل گیمیفیکیشن:', error);
      throw error;
    }
  }

  async generateLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'monthly'): Promise<Leaderboard> {
    try {
      // Get all active representatives
      const activeReps = await db.select()
        .from(representatives)
        .where(eq(representatives.isActive, true));

      // Calculate scores for each representative
      const rankings = await Promise.all(
        activeReps.map(async (rep) => {
          const xpSystem = await this.calculateXPSystem(rep.id);
          const achievements = await this.getRepresentativeAchievements(rep.id);
          const stats = await this.calculateGamificationStats(rep.id);
          
          // Calculate composite score based on multiple factors
          const score = this.calculateCompositeScore(xpSystem, achievements, stats);
          
          return {
            rank: 0, // Will be set after sorting
            representativeId: rep.id,
            representativeName: rep.name || `نماینده ${rep.id}`,
            score,
            badge: this.getBadgeForScore(score),
            change: 0, // Mock change for now
            achievements: achievements.slice(0, 3).map(a => a.title),
            culturalTitle: this.getCulturalTitle(xpSystem.currentLevel)
          };
        })
      );

      // Sort by score descending
      rankings.sort((a, b) => b.score - a.score);
      
      // Assign ranks
      rankings.forEach((ranking, index) => {
        ranking.rank = index + 1;
      });

      // Get top three
      const topThree = {
        first: rankings[0] || null,
        second: rankings[1] || null,
        third: rankings[2] || null
      };

      return {
        period,
        rankings: rankings.slice(0, 50), // Top 50
        topThree
      };

    } catch (error) {
      console.error('خطا در تولید جدول امتیازات:', error);
      throw error;
    }
  }

  async createDailyChallenges(): Promise<Challenge[]> {
    const challenges: Challenge[] = [
      {
        id: `daily_${Date.now()}_1`,
        title: 'پیگیری مشتریان',
        description: 'تماس با ۵ مشتری و پیگیری وضعیت سفارشات',
        type: 'DAILY',
        difficulty: 'EASY',
        xpReward: 50,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        requirements: { type: 'customer_calls', target: 5 },
        progress: 0,
        maxProgress: 5,
        status: 'ACTIVE',
        culturalTheme: 'مراقبت از مشتریان',
        persianDescription: 'مشتری‌هایت منتظر صدای گرم توان - باهاشون تماس بگیر'
      },
      {
        id: `daily_${Date.now()}_2`,
        title: 'کیفیت ارتباط',
        description: 'پاسخ به تمام پیام‌ها در کمتر از ۲ ساعت',
        type: 'DAILY',
        difficulty: 'MEDIUM',
        xpReward: 75,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        requirements: { type: 'response_time', target: 120 }, // minutes
        progress: 0,
        maxProgress: 100,
        status: 'ACTIVE',
        culturalTheme: 'احترام به وقت دیگران',
        persianDescription: 'پاسخگویی سریع، نشان احترام به مشتریان عزیز است'
      }
    ];

    return challenges;
  }

  async awardXP(representativeId: number, xpAmount: number, reason: string): Promise<void> {
    try {
      // This would normally update the database
      // For now, we'll log the XP award
      console.log(`Awarded ${xpAmount} XP to representative ${representativeId} for: ${reason}`);
      
      // Check if level up occurred
      const xpSystem = await this.calculateXPSystem(representativeId);
      const newXP = xpSystem.currentXP + xpAmount;
      const newLevel = this.calculateLevel(newXP);
      
      if (newLevel > xpSystem.currentLevel) {
        await this.triggerLevelUp(representativeId, newLevel);
      }
      
    } catch (error) {
      console.error('خطا در اعطای XP:', error);
    }
  }

  async checkAchievements(representativeId: number): Promise<Achievement[]> {
    try {
      const newAchievements: Achievement[] = [];
      
      // Get representative data
      const performanceMetrics = await performanceAnalyticsService.analyzeRepresentativePerformance(
        representativeId, 'monthly', false
      );
      
      // Check each achievement
      for (const achievement of this.achievements) {
        const hasAchievement = await this.hasAchievement(representativeId, achievement.id);
        
        if (!hasAchievement && await this.meetsRequirement(representativeId, achievement.requirements, performanceMetrics)) {
          newAchievements.push({
            ...achievement,
            unlockedAt: new Date().toISOString()
          });
          
          // Award XP for achievement
          await this.awardXP(representativeId, achievement.xpReward, `Achievement: ${achievement.title}`);
        }
      }
      
      return newAchievements;
      
    } catch (error) {
      console.error('خطا در بررسی دستاوردها:', error);
      return [];
    }
  }

  // ================== HELPER METHODS ==================

  private async calculateXPSystem(representativeId: number): Promise<XPSystem> {
    // Mock XP calculation - in real implementation, this would come from database
    const baseXP = 1500; // Example base XP
    const currentLevel = this.calculateLevel(baseXP);
    const xpForCurrentLevel = this.getXPForLevel(currentLevel);
    const xpForNextLevel = this.getXPForLevel(currentLevel + 1);
    const xpToNextLevel = xpForNextLevel - baseXP;
    const levelProgress = ((baseXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
    
    const levelInfo = this.getLevelInfo(currentLevel);
    const nextLevelInfo = this.getLevelInfo(currentLevel + 1);

    return {
      currentXP: baseXP,
      currentLevel,
      xpToNextLevel,
      totalXP: baseXP,
      levelProgress,
      levelTitle: levelInfo.title,
      levelDescription: levelInfo.description,
      nextLevelTitle: nextLevelInfo.title,
      culturalRank: levelInfo.culturalRank
    };
  }

  private calculateLevel(xp: number): number {
    // Simple level calculation: every 500 XP = 1 level
    return Math.floor(xp / 500) + 1;
  }

  private getXPForLevel(level: number): number {
    return (level - 1) * 500;
  }

  private getLevelInfo(level: number) {
    const levelInfo = this.levelTitles
      .slice()
      .reverse()
      .find(info => level >= info.level) || this.levelTitles[0];
    
    return levelInfo;
  }

  private async getRepresentativeAchievements(representativeId: number): Promise<Achievement[]> {
    // Mock achievements - in real implementation, fetch from database
    return this.achievements.slice(0, 2).map(achievement => ({
      ...achievement,
      unlockedAt: new Date().toISOString()
    }));
  }

  private async getRepresentativeBadges(representativeId: number): Promise<Badge[]> {
    // Mock badges
    return [
      {
        id: 'newcomer',
        name: 'تازه وارد',
        description: 'به خانواده بزرگ ما خوش آمدی',
        icon: '🌟',
        rarity: 'COMMON',
        earnedAt: new Date().toISOString(),
        culturalSignificance: 'آغاز سفر موفقیت'
      }
    ];
  }

  private async getActiveChallenges(representativeId: number): Promise<Challenge[]> {
    return await this.createDailyChallenges();
  }

  private async getCompletedChallenges(representativeId: number): Promise<Challenge[]> {
    // Mock completed challenges
    return [];
  }

  private async calculateGamificationStats(representativeId: number) {
    // Mock stats calculation
    return {
      totalTasksCompleted: 45,
      perfectMonths: 2,
      streakDays: 15,
      culturalAdaptationScore: 85,
      relationshipBuildingScore: 78,
      salesMasteryLevel: 7
    };
  }

  private getRandomMotivationalQuotes(count: number): string[] {
    const shuffled = [...this.persianMotivationalQuotes].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private async getNextMilestones(representativeId: number): Promise<Achievement[]> {
    const currentAchievements = await this.getRepresentativeAchievements(representativeId);
    const achievedIds = currentAchievements.map(a => a.id);
    
    return this.achievements
      .filter(a => !achievedIds.includes(a.id))
      .slice(0, 3);
  }

  private async getLeaderboardPosition(representativeId: number): Promise<number> {
    // Mock leaderboard position
    return Math.floor(Math.random() * 50) + 1;
  }

  private calculateCompositeScore(xpSystem: XPSystem, achievements: Achievement[], stats: any): number {
    const xpScore = xpSystem.currentXP;
    const achievementScore = achievements.length * 100;
    const streakBonus = stats.streakDays * 10;
    const culturalBonus = stats.culturalAdaptationScore * 5;
    
    return xpScore + achievementScore + streakBonus + culturalBonus;
  }

  private getBadgeForScore(score: number): string {
    if (score >= 5000) return '🏆 نخبه';
    if (score >= 3000) return '🥇 ممتاز';
    if (score >= 2000) return '🥈 عالی';
    if (score >= 1000) return '🥉 خوب';
    return '🌟 مبتدی';
  }

  private getCulturalTitle(level: number): string {
    return this.getLevelInfo(level).culturalRank;
  }

  private async hasAchievement(representativeId: number, achievementId: string): Promise<boolean> {
    // Mock check - in real implementation, check database
    return false;
  }

  private async meetsRequirement(representativeId: number, requirements: any, performanceMetrics: any): Promise<boolean> {
    // Mock requirement checking
    switch (requirements.type) {
      case 'sales_count':
        return performanceMetrics.metrics.salesPerformance.totalSales > 0;
      case 'cultural_score':
        return performanceMetrics.metrics.culturalAlignment.adaptationScore >= requirements.target;
      case 'tasks_on_time':
        return performanceMetrics.metrics.taskCompletion.completedTasks >= requirements.target;
      default:
        return false;
    }
  }

  private async triggerLevelUp(representativeId: number, newLevel: number): Promise<void> {
    console.log(`🎉 Representative ${representativeId} leveled up to ${newLevel}!`);
    // In real implementation, this would trigger notifications, special rewards, etc.
  }
}

// Create and export singleton
export const gamificationEngine = new GamificationEngine();