// 🧠 DA VINCI v6.0 PERSIAN CULTURAL AI ENGINE
// import { GoogleGenerativeAI } from "@google/generative-ai"; // Disabled for offline mode
import { storage } from '../storage';

export interface PsychologicalProfile {
  communicationStyle: 'formal' | 'informal' | 'mixed';
  responsiveness: 'high' | 'medium' | 'low';
  preferredContactTime: 'morning' | 'afternoon' | 'evening' | 'flexible';
  paymentBehavior: 'punctual' | 'delayed' | 'irregular';
  businessOrientation: 'traditional' | 'modern' | 'hybrid';
  culturalAdaptation: number; // 0-100 score
  trustLevel: 'high' | 'medium' | 'low';
  motivationFactors: string[];
  concerns: string[];
  opportunities: string[];
}

export interface AITask {
  id: string;
  representativeId: number;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  type: 'follow_up' | 'payment_reminder' | 'relationship_building' | 'performance_review';
  culturalContext: string;
  suggestedApproach: string;
  expectedOutcome: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  aiConfidence: number; // 0-100
  createdAt: Date;
}

export interface CulturalInsight {
  category: 'communication' | 'business_practice' | 'relationship' | 'timing';
  insight: string;
  actionable: boolean;
  confidence: number;
  culturalRelevance: number;
}

class PersianAIEngine {
  private genAI: any = null; // GoogleGenerativeAI type
  private isInitialized = false;

  constructor() {
    this.initializeAI();
  }

  private async initializeAI() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        // For now, running in offline mode without Google AI dependency
        // this.genAI = new GoogleGenerativeAI(apiKey);
        // this.isInitialized = true;
        console.log('Persian AI Engine initialized in offline mode (pattern-based analysis)');
      } else {
        console.log('Persian AI Engine initialized without Gemini API (offline mode)');
      }
    } catch (error) {
      console.error('Failed to initialize Persian AI Engine:', error);
    }
  }

  /**
   * Generate psychological profile for a representative
   */
  async generatePsychologicalProfile(representativeData: any): Promise<PsychologicalProfile> {
    try {
      if (this.genAI && this.isInitialized) {
        const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `
        تحلیل روانشناختی نماینده فروش ایرانی:
        
        نام: ${representativeData.name}
        کد: ${representativeData.code}
        بدهی کل: ${representativeData.totalDebt || 0} تومان
        فروش کل: ${representativeData.totalSales || 0} تومان
        وضعیت: ${representativeData.isActive ? 'فعال' : 'غیرفعال'}
        
        لطفاً یک پروفایل روانشناختی کامل برای این نماینده ایجاد کنید که شامل:
        1. سبک ارتباط (رسمی/غیررسمی/ترکیبی)
        2. میزان پاسخگویی (بالا/متوسط/پایین)
        3. زمان ترجیحی تماس
        4. رفتار پرداخت
        5. گرایش کسب‌وکار (سنتی/مدرن/ترکیبی)
        6. عوامل انگیزشی
        7. نگرانی‌ها و فرصت‌ها
        
        پاسخ را به صورت JSON ساختاریافته ارائه دهید.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        try {
          const aiResponse = JSON.parse(response.text());
          return this.validateAndNormalizePsychProfile(aiResponse);
        } catch (parseError) {
          console.log('AI response parsing failed, using pattern-based analysis');
          return this.generatePatternBasedProfile(representativeData);
        }
      } else {
        return this.generatePatternBasedProfile(representativeData);
      }
    } catch (error) {
      console.error('Error generating psychological profile:', error);
      return this.generatePatternBasedProfile(representativeData);
    }
  }

  /**
   * Generate AI tasks for representative management
   */
  async generateAITasks(representativeId: number, profile: PsychologicalProfile): Promise<AITask[]> {
    const tasks: AITask[] = [];
    const representative = await this.getRepresentativeData(representativeId);
    
    if (!representative) return tasks;

    // Task generation based on psychological profile and business rules
    const taskTemplates = await this.getTaskTemplates(profile, representative);
    
    for (const template of taskTemplates) {
      const task: AITask = {
        id: `ai_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        representativeId,
        title: template.title,
        description: template.description,
        priority: template.priority,
        type: template.type,
        culturalContext: template.culturalContext,
        suggestedApproach: template.suggestedApproach,
        expectedOutcome: template.expectedOutcome,
        dueDate: new Date(Date.now() + template.dueDays * 24 * 60 * 60 * 1000),
        status: 'pending',
        aiConfidence: template.confidence,
        createdAt: new Date()
      };
      
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Generate cultural insights for representative management
   */
  async generateCulturalInsights(representativeData: any): Promise<CulturalInsight[]> {
    const insights: CulturalInsight[] = [];

    // Communication insights
    if (representativeData.totalDebt > 50000000) {
      insights.push({
        category: 'communication',
        insight: 'با توجه به میزان بدهی، استفاده از لحن محترمانه و صبورانه در ارتباطات ضروری است',
        actionable: true,
        confidence: 90,
        culturalRelevance: 95
      });
    }

    // Business practice insights
    if (representativeData.isActive && representativeData.totalSales > 100000000) {
      insights.push({
        category: 'business_practice',
        insight: 'این نماینده دارای عملکرد قوی است. ایجاد برنامه تشویقی مناسب خواهد بود',
        actionable: true,
        confidence: 85,
        culturalRelevance: 80
      });
    }

    // Relationship insights
    insights.push({
      category: 'relationship',
      insight: 'حفظ روابط بلندمدت در فرهنگ ایرانی اولویت دارد. سرمایه‌گذاری در روابط شخصی توصیه می‌شود',
      actionable: true,
      confidence: 95,
      culturalRelevance: 100
    });

    // Timing insights
    insights.push({
      category: 'timing',
      insight: 'بهترین زمان تماس معمولاً صبح‌های یکشنبه تا چهارشنبه است',
      actionable: true,
      confidence: 75,
      culturalRelevance: 85
    });

    return insights;
  }

  /**
   * Analyze representative level and suggest changes
   */
  async analyzeRepresentativeLevel(representativeId: number): Promise<{
    currentLevel: 'NEW' | 'ACTIVE' | 'INACTIVE';
    suggestedLevel: 'NEW' | 'ACTIVE' | 'INACTIVE';
    reason: string;
    confidence: number;
    actionRequired: boolean;
  }> {
    const representative = await this.getRepresentativeData(representativeId);
    
    if (!representative) {
      return {
        currentLevel: 'INACTIVE',
        suggestedLevel: 'INACTIVE',
        reason: 'نماینده یافت نشد',
        confidence: 100,
        actionRequired: false
      };
    }

    // AI-based level analysis
    let suggestedLevel: 'NEW' | 'ACTIVE' | 'INACTIVE' = 'ACTIVE';
    let reason = '';
    let confidence = 0;
    let actionRequired = false;

    // Analysis logic based on performance metrics
    const hasRecentActivity = representative.isActive;
    const debtRatio = (representative.totalDebt || 0) / Math.max(representative.totalSales || 1, 1);
    const salesPerformance = representative.totalSales || 0;

    if (!hasRecentActivity) {
      suggestedLevel = 'INACTIVE';
      reason = 'عدم فعالیت اخیر - نیاز به بازفعال‌سازی';
      confidence = 85;
      actionRequired = true;
    } else if (salesPerformance < 10000000) { // Less than 10M
      suggestedLevel = 'NEW';
      reason = 'عملکرد پایین - نیاز به آموزش و پشتیبانی بیشتر';
      confidence = 80;
      actionRequired = true;
    } else if (debtRatio > 0.7) {
      suggestedLevel = 'INACTIVE';
      reason = 'نسبت بدهی بالا - نیاز به پیگیری مالی';
      confidence = 90;
      actionRequired = true;
    } else {
      suggestedLevel = 'ACTIVE';
      reason = 'عملکرد مناسب - ادامه همکاری';
      confidence = 75;
      actionRequired = false;
    }

    return {
      currentLevel: representative.isActive ? 'ACTIVE' : 'INACTIVE',
      suggestedLevel,
      reason,
      confidence,
      actionRequired
    };
  }

  /**
   * Generate performance recommendations
   */
  async generatePerformanceRecommendations(representativeId: number): Promise<string[]> {
    const representative = await this.getRepresentativeData(representativeId);
    const recommendations: string[] = [];
    
    if (!representative) return recommendations;

    const debtRatio = (representative.totalDebt || 0) / Math.max(representative.totalSales || 1, 1);
    const salesAmount = representative.totalSales || 0;

    // Performance-based recommendations
    if (debtRatio > 0.5) {
      recommendations.push('اولویت‌بندی وصول مطالبات معوقه');
      recommendations.push('برقراری تماس منظم برای پیگیری پرداخت‌ها');
    }

    if (salesAmount < 50000000) {
      recommendations.push('بررسی و بهبود استراتژی‌های فروش');
      recommendations.push('ارائه آموزش‌های تخصصی');
    }

    if (!representative.isActive) {
      recommendations.push('برقراری تماس فوری برای بررسی وضعیت');
      recommendations.push('ارائه برنامه بازگشت به فعالیت');
    }

    // Cultural recommendations
    recommendations.push('حفظ ارتباط منظم و دوستانه');
    recommendations.push('احترام به اولویت‌های فرهنگی و مذهبی');
    recommendations.push('استفاده از روش‌های تشویق مناسب فرهنگ ایرانی');

    return recommendations;
  }

  // Helper methods
  private validateAndNormalizePsychProfile(aiResponse: any): PsychologicalProfile {
    return {
      communicationStyle: aiResponse.communicationStyle || 'formal',
      responsiveness: aiResponse.responsiveness || 'medium',
      preferredContactTime: aiResponse.preferredContactTime || 'morning',
      paymentBehavior: aiResponse.paymentBehavior || 'irregular',
      businessOrientation: aiResponse.businessOrientation || 'traditional',
      culturalAdaptation: Math.min(100, Math.max(0, aiResponse.culturalAdaptation || 75)),
      trustLevel: aiResponse.trustLevel || 'medium',
      motivationFactors: Array.isArray(aiResponse.motivationFactors) ? aiResponse.motivationFactors : ['تشویق مالی', 'رشد کسب‌وکار'],
      concerns: Array.isArray(aiResponse.concerns) ? aiResponse.concerns : ['نوسانات بازار', 'رقابت'],
      opportunities: Array.isArray(aiResponse.opportunities) ? aiResponse.opportunities : ['گسترش بازار', 'بهبود خدمات']
    };
  }

  private generatePatternBasedProfile(representativeData: any): PsychologicalProfile {
    const debtRatio = (representativeData.totalDebt || 0) / Math.max(representativeData.totalSales || 1, 1);
    const isHighPerformer = (representativeData.totalSales || 0) > 100000000;
    
    return {
      communicationStyle: isHighPerformer ? 'mixed' : 'formal',
      responsiveness: representativeData.isActive ? 'high' : 'low',
      preferredContactTime: 'morning',
      paymentBehavior: debtRatio > 0.3 ? 'delayed' : 'punctual',
      businessOrientation: isHighPerformer ? 'modern' : 'traditional',
      culturalAdaptation: representativeData.isActive ? 85 : 60,
      trustLevel: debtRatio < 0.2 ? 'high' : 'medium',
      motivationFactors: ['رشد درآمد', 'موفقیت تجاری', 'تقدیر و تشکر'],
      concerns: ['ثبات مالی', 'رقابت بازار', 'تغییرات قیمت'],
      opportunities: ['گسترش فروش', 'بهبود روابط', 'افزایش سودآوری']
    };
  }

  private async getTaskTemplates(profile: PsychologicalProfile, representative: any) {
    const templates = [];
    
    // Follow-up task based on communication style
    if (profile.responsiveness === 'low') {
      templates.push({
        title: 'پیگیری وضعیت نماینده',
        description: 'تماس تلفنی برای بررسی وضعیت و رفع موانع احتمالی',
        priority: 'high' as const,
        type: 'follow_up' as const,
        culturalContext: 'استفاده از لحن محترمانه و صبورانه',
        suggestedApproach: 'آغاز با احوال‌پرسی و سپس ورود به موضوع اصلی',
        expectedOutcome: 'بهبود ارتباط و شناسایی مشکلات',
        dueDays: 3,
        confidence: 85
      });
    }

    // Payment reminder if needed
    if (representative.totalDebt > 10000000) {
      templates.push({
        title: 'یادآوری مودبانه پرداخت',
        description: 'پیگیری وضعیت پرداخت معوقات با رویکرد حمایتی',
        priority: 'medium' as const,
        type: 'payment_reminder' as const,
        culturalContext: 'حفظ کرامت نماینده حین پیگیری مالی',
        suggestedApproach: 'ارائه راه‌حل‌های انعطاف‌پذیر پرداخت',
        expectedOutcome: 'کاهش بدهی و حفظ روابط',
        dueDays: 7,
        confidence: 90
      });
    }

    // Relationship building
    templates.push({
      title: 'تقویت روابط کاری',
      description: 'ایجاد فرصت‌های تعامل مثبت و حمایتی',
      priority: 'low' as const,
      type: 'relationship_building' as const,
      culturalContext: 'اهمیت روابط شخصی در فرهنگ کسب‌وکار ایرانی',
      suggestedApproach: 'دعوت به جلسه یا تماس دوستانه',
      expectedOutcome: 'تقویت اعتماد و همکاری بلندمدت',
      dueDays: 14,
      confidence: 75
    });

    return templates;
  }

  private async getRepresentativeData(representativeId: number) {
    try {
      const representatives = await storage.getRepresentatives();
      return representatives.find(rep => rep.id === representativeId);
    } catch (error) {
      console.error('Error fetching representative data:', error);
      return null;
    }
  }
}

export const persianAIEngine = new PersianAIEngine();
export default persianAIEngine;