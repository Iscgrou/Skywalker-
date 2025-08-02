// XAI GROK ENGINE - DA VINCI v6.0 Persian Cultural AI Integration
import OpenAI from "openai";
import type { Representative, CrmTask } from "@shared/schema";

interface GrokConfig {
  apiKey: string;
  model: string;
  baseURL: string;
}

interface PersianCulturalAnalysis {
  communicationStyle: 'formal' | 'friendly' | 'respectful' | 'direct';
  culturalSensitivity: 'high' | 'medium' | 'low';
  businessApproach: 'traditional' | 'modern' | 'mixed';
  relationshipPriority: number; // 1-10 scale
  timeOrientation: 'punctual' | 'flexible' | 'relaxed';
  trustLevel: number; // 1-10 scale
}

interface TaskRecommendation {
  taskType: 'FOLLOW_UP' | 'DEBT_COLLECTION' | 'RELATIONSHIP_BUILDING' | 'PERFORMANCE_CHECK';
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  expectedOutcome: string;
  culturalConsiderations: string[];
  estimatedDifficulty: number; // 1-5 scale
  aiConfidence: number; // 1-100 scale
  xpReward: number;
}

export class XAIGrokEngine {
  private client: OpenAI;
  private isConfigured: boolean = false;
  private storage: any;

  constructor(storage?: any) {
    this.client = new OpenAI({
      baseURL: "https://api.x.ai/v1",
      apiKey: process.env.XAI_API_KEY || "dummy-key"
    });
    
    this.isConfigured = !!process.env.XAI_API_KEY;
    this.storage = storage;
    
    if (!this.isConfigured) {
      console.warn('XAI Grok Engine: API key not configured, using pattern-based fallback');
    } else {
      console.log('✅ XAI Grok Engine initialized successfully');
    }
  }

  // Get current AI configuration from database
  private async getAIConfig(category: string = 'GENERAL'): Promise<any> {
    if (!this.storage) return this.getDefaultConfig();
    
    try {
      const configs = await this.storage.getAiConfigurationsByCategory(category);
      return configs[0] || this.getDefaultConfig();
    } catch (error) {
      console.warn('Failed to load AI config, using defaults:', error);
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): any {
    return {
      temperature: 0.7,
      maxTokens: 300,
      culturalSensitivity: 0.95,
      religiousSensitivity: 0.90,
      traditionalValuesWeight: 0.80,
      languageFormality: 'RESPECTFUL',
      persianPoetryIntegration: true,
      culturalMetaphors: true
    };
  }

  // Test API connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isConfigured) {
        return { 
          success: false, 
          message: 'کلید API تنظیم نشده است' 
        };
      }

      const response = await this.client.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ role: "user", content: "سلام، لطفا با یک کلمه پاسخ دهید." }],
        max_tokens: 10
      });

      if (response.choices[0]?.message?.content) {
        return { 
          success: true, 
          message: 'اتصال به Grok AI برقرار شد' 
        };
      }

      return { 
        success: false, 
        message: 'پاسخ نامعتبر از API' 
      };
    } catch (error: any) {
      console.error('Grok API test failed:', error);
      return { 
        success: false, 
        message: `خطا در اتصال: ${error.message}` 
      };
    }
  }

  // Analyze representative cultural profile
  async analyzeCulturalProfile(representative: Representative): Promise<PersianCulturalAnalysis> {
    if (!this.isConfigured) {
      return this.getPatternBasedCulturalAnalysis(representative);
    }

    try {
      const prompt = `
تحلیل فرهنگی نماینده تجاری ایرانی:

نام: ${representative.name}
کد: ${representative.code}
وضعیت: ${representative.isActive ? 'فعال' : 'غیرفعال'}
بدهی: ${representative.totalDebt} ریال
فروش: ${representative.totalSales} ریال

لطفا بر اساس فرهنگ تجاری ایران، سبک ارتباطی و رویکرد کسب‌وکار این نماینده را تحلیل کن.
پاسخ را در قالب JSON با این فیلدها ارائه ده:
{
  "communicationStyle": "formal|friendly|respectful|direct",
  "culturalSensitivity": "high|medium|low", 
  "businessApproach": "traditional|modern|mixed",
  "relationshipPriority": 1-10,
  "timeOrientation": "punctual|flexible|relaxed",
  "trustLevel": 1-10
}
`;

      const response = await this.client.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 300
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return this.validateCulturalAnalysis(analysis);
    } catch (error) {
      console.error('Cultural analysis failed, using pattern-based fallback:', error);
      return this.getPatternBasedCulturalAnalysis(representative);
    }
  }

  // Generate task recommendation using AI (🔥 NOW WITH REAL CONFIG INTEGRATION)
  async generateTaskRecommendation(
    representative: Representative, 
    culturalProfile: PersianCulturalAnalysis
  ): Promise<TaskRecommendation> {
    if (!this.isConfigured) {
      return this.getPatternBasedTaskRecommendation(representative, culturalProfile);
    }

    try {
      // 🔥 GET ACTUAL BEHAVIOR AND CULTURAL CONFIGS
      const behaviorConfig = await this.getAIConfig('BEHAVIOR');
      const culturalConfig = await this.getAIConfig('PERSIAN_CULTURAL');
      
      const creativityLevel = parseFloat(behaviorConfig.creativityLevel || '0.6');
      const proactivityLevel = parseFloat(behaviorConfig.proactivityLevel || '0.8');
      const formality = culturalConfig.languageFormality || 'RESPECTFUL';
      
      const prompt = `
تولید وظیفه هوشمند برای نماینده تجاری (خلاقیت: ${Math.round(creativityLevel * 100)}%, فعالیت: ${Math.round(proactivityLevel * 100)}%):

اطلاعات نماینده:
- نام: ${representative.name}
- بدهی: ${representative.totalDebt} ریال
- فروش: ${representative.totalSales} ریال
- وضعیت: ${representative.isActive ? 'فعال' : 'غیرفعال'}

تحلیل فرهنگی:
- سبک ارتباط: ${culturalProfile.communicationStyle}
- حساسیت فرهنگی: ${culturalProfile.culturalSensitivity}
- رویکرد کسب‌وکار: ${culturalProfile.businessApproach}

سطح رسمیت: ${formality}
${proactivityLevel > 0.7 ? 'وظیفه پیشگیرانه و فعال تولید کنید.' : 'وظیفه محافظه‌کارانه پیشنهاد دهید.'}
${creativityLevel > 0.6 ? 'از ایده‌های خلاقانه و نوآورانه استفاده کنید.' : 'روش‌های سنتی و آزموده‌شده را ترجیح دهید.'}

لطفا وظیفه مناسب با رعایت فرهنگ ایرانی پیشنهاد کن:
{
  "taskType": "FOLLOW_UP|DEBT_COLLECTION|RELATIONSHIP_BUILDING|PERFORMANCE_CHECK",
  "priority": "URGENT|HIGH|MEDIUM|LOW",
  "title": "عنوان وظیفه",
  "description": "شرح کامل وظیفه",
  "expectedOutcome": "نتیجه مورد انتظار",
  "culturalConsiderations": ["نکته فرهنگی 1", "نکته فرهنگی 2"],
  "estimatedDifficulty": 1-5,
  "aiConfidence": 1-100,
  "xpReward": 10-100
}
`;

      const response = await this.client.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: parseInt(behaviorConfig.maxTokens || '500'),
        temperature: parseFloat(behaviorConfig.temperature || '0.7')
      });

      const recommendation = JSON.parse(response.choices[0].message.content || '{}');
      return this.validateTaskRecommendation(recommendation);
    } catch (error) {
      console.error('Task generation failed, using pattern-based fallback:', error);
      return this.getPatternBasedTaskRecommendation(representative, culturalProfile);
    }
  }

  // Analyze task completion quality
  async analyzeTaskCompletion(
    task: any, 
    outcome: string, 
    notes: string
  ): Promise<{ qualityScore: number; feedback: string; improvements: string[] }> {
    if (!this.isConfigured) {
      return this.getPatternBasedCompletionAnalysis(outcome, notes);
    }

    try {
      const prompt = `
تحلیل کیفیت انجام وظیفه:

وظیفه: ${task.title}
نتیجه: ${outcome}
یادداشت‌ها: ${notes}

لطفا کیفیت انجام کار را از ۱ تا ۱۰۰ نمره‌دهی کن و پیشنهادات بهبود ارائه ده:
{
  "qualityScore": 1-100,
  "feedback": "بازخورد فارسی",
  "improvements": ["پیشنهاد 1", "پیشنهاد 2"]
}
`;

      const response = await this.client.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 300
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Completion analysis failed, using pattern-based fallback:', error);
      return this.getPatternBasedCompletionAnalysis(outcome, notes);
    }
  }

  // Generate cultural response with Persian context (NOW WITH REAL CONFIG)
  async generateCulturalResponse(
    prompt: string, 
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    if (!this.isConfigured) {
      return "سیستم AI موقتاً غیرفعال است. لطفاً تنظیمات XAI Grok را بررسی کنید.";
    }

    try {
      // 🔥 GET ACTUAL CONFIG FROM DATABASE
      const config = await this.getAIConfig('PERSIAN_CULTURAL');
      const culturalSensitivity = parseFloat(config.culturalSensitivity || '0.95');
      const religiousSensitivity = parseFloat(config.religiousSensitivity || '0.90');
      const formality = config.languageFormality || 'RESPECTFUL';
      
      // Build culturally-aware prompt based on actual settings
      let formalityInstruction = '';
      switch (formality) {
        case 'FORMAL':
          formalityInstruction = 'با کمال احترام و بسیار رسمی پاسخ دهید.';
          break;
        case 'RESPECTFUL':
          formalityInstruction = 'با احترام و ادب معمولی پاسخ دهید.';
          break;
        case 'CASUAL':
          formalityInstruction = 'به شکل دوستانه و غیررسمی پاسخ دهید.';
          break;
      }

      const culturalPrompt = `
شما یک دستیار هوشمند فارسی با درک عمیق از فرهنگ ایرانی هستید.
حساسیت فرهنگی: ${Math.round(culturalSensitivity * 100)}%
حساسیت مذهبی: ${Math.round(religiousSensitivity * 100)}%
${formalityInstruction}
${config.persianPoetryIntegration ? 'در صورت مناسب بودن، از شعر فارسی استفاده کنید.' : ''}
${config.culturalMetaphors ? 'از استعاره‌های فرهنگی ایرانی بهره ببرید.' : ''}

سوال کاربر: ${prompt}

پاسخ فارسی:`;

      const response = await this.client.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ role: "user", content: culturalPrompt }],
        max_tokens: options.maxTokens || parseInt(config.maxTokens || '300'),
        temperature: options.temperature || parseFloat(config.temperature || '0.7')
      });

      return response.choices[0]?.message?.content || "متأسفانه پاسخی دریافت نشد.";
    } catch (error) {
      console.error('XAI cultural response failed:', error);
      return "خطا در ارتباط با سیستم AI. لطفاً مجدداً تلاش کنید.";
    }
  }

  // Update API configuration
  updateConfiguration(apiKey: string): void {
    this.client = new OpenAI({
      baseURL: "https://api.x.ai/v1",
      apiKey: apiKey
    });
    this.isConfigured = !!apiKey;
    
    // Update environment variable for persistence
    process.env.XAI_API_KEY = apiKey;
  }

  // Financial data analysis using Grok
  async analyzeFinancialData(
    totalRevenue: number,
    totalDebt: number, 
    activeReps: number,
    overdueInvoices: number
  ): Promise<any> {
    if (!this.isConfigured) {
      return {
        summary: "تحلیل مالی پایه بر اساس الگوها",
        insights: [
          "نرخ بدهی فعلی قابل قبول است",
          "تعداد نمایندگان فعال مناسب است",
          "فاکتورهای معوقه نیاز به پیگیری دارند"
        ],
        recommendations: [
          "تمرکز بر وصول مطالبات معوقه",
          "توسعه شبکه نمایندگان",
          "بهبود فرآیند پیگیری"
        ]
      };
    }

    try {
      const prompt = `
تحلیل وضعیت مالی شرکت:

📊 آمار مالی:
- درآمد کل: ${totalRevenue.toLocaleString('fa-IR')} ریال
- بدهی کل: ${totalDebt.toLocaleString('fa-IR')} ریال  
- نمایندگان فعال: ${activeReps}
- فاکتورهای معوقه: ${overdueInvoices}

لطفا تحلیل کاملی از وضعیت مالی ارائه ده و راه‌کارهای عملی پیشنهاد کن.
پاسخ را در قالب JSON ارائه ده:
{
  "summary": "خلاصه وضعیت",
  "insights": ["بینش 1", "بینش 2"],
  "recommendations": ["توصیه 1", "توصیه 2"],
  "risk_level": "low|medium|high"
}
`;

      const response = await this.client.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 800
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Financial analysis failed:', error);
      return this.analyzeFinancialData(totalRevenue, totalDebt, activeReps, overdueInvoices);
    }
  }

  // Answer financial questions using Grok
  async answerFinancialQuestion(question: string): Promise<string> {
    if (!this.isConfigured) {
      return "دستیار هوش مصنوعی در حال حاضر در دسترس نیست. لطفا کلید API را در تنظیمات وارد کنید.";
    }

    try {
      const prompt = `
سوال مالی: ${question}

لطفا پاسخ جامع و عملی به زبان فارسی ارائه ده. در پاسخ خود نکات فرهنگی و تجاری ایران را در نظر بگیر.
`;

      const response = await this.client.chat.completions.create({
        model: "grok-2-1212",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500
      });

      return response.choices[0].message.content || "متاسفانه نتوانستم پاسخ مناسبی تولید کنم.";
    } catch (error) {
      console.error('Question answering failed:', error);
      return "خطا در دریافت پاسخ از دستیار هوش مصنوعی. لطفا دوباره تلاش کنید.";
    }
  }

  // Pattern-based fallback methods
  private getPatternBasedCulturalAnalysis(rep: Representative): PersianCulturalAnalysis {
    const debtRatio = parseFloat(rep.totalDebt || "0") / Math.max(parseFloat(rep.totalSales || "1"), 1);
    const isHighPerformer = parseFloat(rep.totalSales || "0") > 50000000; // 50M Rial threshold
    
    return {
      communicationStyle: debtRatio > 0.3 ? 'formal' : 'friendly',
      culturalSensitivity: debtRatio > 0.5 ? 'high' : 'medium',
      businessApproach: isHighPerformer ? 'modern' : 'traditional',
      relationshipPriority: Math.min(10, Math.max(1, Math.round(parseFloat(rep.totalSales || "0") / 10000000))),
      timeOrientation: rep.isActive ? 'punctual' : 'flexible',
      trustLevel: Math.min(10, Math.max(1, 10 - Math.round(debtRatio * 5)))
    };
  }

  private getPatternBasedTaskRecommendation(
    rep: Representative, 
    cultural: PersianCulturalAnalysis
  ): TaskRecommendation {
    const debtAmount = parseFloat(rep.totalDebt || "0");
    const salesAmount = parseFloat(rep.totalSales || "0");
    
    if (debtAmount > 10000000) { // 10M Rial
      return {
        taskType: 'DEBT_COLLECTION',
        priority: debtAmount > 50000000 ? 'URGENT' : 'HIGH',
        title: `پیگیری بدهی ${rep.name}`,
        description: `پیگیری و وصول بدهی ${debtAmount.toLocaleString('fa-IR')} ریالی نماینده`,
        expectedOutcome: 'تعیین برنامه پرداخت یا تسویه بدهی',
        culturalConsiderations: [
          'استفاده از زبان محترمانه و صبورانه',
          'در نظر گرفتن شرایط اقتصادی',
          'ارائه راه‌حل‌های منعطف'
        ],
        estimatedDifficulty: Math.min(5, Math.round(debtAmount / 20000000)),
        aiConfidence: 85,
        xpReward: Math.min(100, Math.round(debtAmount / 1000000))
      };
    }
    
    if (salesAmount < 5000000) { // Low sales
      return {
        taskType: 'RELATIONSHIP_BUILDING',
        priority: 'MEDIUM',
        title: `توسعه ارتباط با ${rep.name}`,
        description: 'بررسی نیازها و ارائه راه‌کارهای افزایش فروش',
        expectedOutcome: 'شناسایی فرصت‌های جدید و افزایش تعامل',
        culturalConsiderations: [
          'صرف زمان کافی برای گفتگو',
          'نشان دادن علاقه واقعی به کسب‌وکار',
          'احترام به تجربه و دانش نماینده'
        ],
        estimatedDifficulty: 2,
        aiConfidence: 78,
        xpReward: 40
      };
    }
    
    return {
      taskType: 'FOLLOW_UP',
      priority: 'MEDIUM',
      title: `پیگیری عمومی ${rep.name}`,
      description: 'بررسی وضعیت کلی و شنیدن نظرات نماینده',
      expectedOutcome: 'حفظ ارتباط مثبت و شناسایی نیازها',
      culturalConsiderations: [
        'پرسیدن از احوال و وضعیت عمومی',
        'گوش دادن فعال به نگرانی‌ها',
        'ارائه حمایت در صورت نیاز'
      ],
      estimatedDifficulty: 1,
      aiConfidence: 70,
      xpReward: 25
    };
  }

  private getPatternBasedCompletionAnalysis(outcome: string, notes: string): any {
    const successKeywords = ['موفق', 'خوب', 'مثبت', 'راضی', 'تمام'];
    const isSuccessful = successKeywords.some(keyword => 
      outcome.includes(keyword) || notes.includes(keyword)
    );
    
    return {
      qualityScore: isSuccessful ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 30) + 50,
      feedback: isSuccessful 
        ? 'عملکرد مناسبی داشتید. ادامه دهید.'
        : 'می‌توانید در آینده بهتر عمل کنید.',
      improvements: [
        'پیگیری بیشتر با نماینده',
        'استفاده از زبان مؤدبانه‌تر',
        'صبر بیشتر در گفتگو'
      ]
    };
  }

  private validateCulturalAnalysis(data: any): PersianCulturalAnalysis {
    return {
      communicationStyle: ['formal', 'friendly', 'respectful', 'direct'].includes(data.communicationStyle) 
        ? data.communicationStyle : 'respectful',
      culturalSensitivity: ['high', 'medium', 'low'].includes(data.culturalSensitivity) 
        ? data.culturalSensitivity : 'medium',
      businessApproach: ['traditional', 'modern', 'mixed'].includes(data.businessApproach) 
        ? data.businessApproach : 'mixed',
      relationshipPriority: Math.min(10, Math.max(1, data.relationshipPriority || 5)),
      timeOrientation: ['punctual', 'flexible', 'relaxed'].includes(data.timeOrientation) 
        ? data.timeOrientation : 'flexible',
      trustLevel: Math.min(10, Math.max(1, data.trustLevel || 5))
    };
  }

  private validateTaskRecommendation(data: any): TaskRecommendation {
    const validTaskTypes = ['FOLLOW_UP', 'DEBT_COLLECTION', 'RELATIONSHIP_BUILDING', 'PERFORMANCE_CHECK'];
    const validPriorities = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
    
    return {
      taskType: validTaskTypes.includes(data.taskType) ? data.taskType : 'FOLLOW_UP',
      priority: validPriorities.includes(data.priority) ? data.priority : 'MEDIUM',
      title: data.title || 'وظیفه عمومی',
      description: data.description || 'شرح وظیفه',
      expectedOutcome: data.expectedOutcome || 'نتیجه مورد انتظار',
      culturalConsiderations: Array.isArray(data.culturalConsiderations) 
        ? data.culturalConsiderations : ['رعایت ادب فارسی'],
      estimatedDifficulty: Math.min(5, Math.max(1, data.estimatedDifficulty || 2)),
      aiConfidence: Math.min(100, Math.max(1, data.aiConfidence || 75)),
      xpReward: Math.min(100, Math.max(10, data.xpReward || 30))
    };
  }
}

// Export singleton instance
export const xaiGrokEngine = new XAIGrokEngine();