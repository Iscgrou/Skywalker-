// GROQ AI ENGINE - DA VINCI v6.0 Persian Cultural Intelligence
import Groq from "groq-sdk";
import type { Representative, CrmTask } from "@shared/schema";

interface GroqConfig {
  apiKey: string;
  model: string;
  baseURL: string;
  temperature: number;
  maxTokens: number;
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

export class GroqAIEngine {
  private client: Groq;
  private isConfigured: boolean = false;
  private config: GroqConfig;

  constructor() {
    this.config = {
      apiKey: process.env.GROQ_API_KEY || "",
      model: "llama-3.1-8b-instant",
      baseURL: "https://api.groq.com/openai/v1",
      temperature: 0.7,
      maxTokens: 1000
    };

    this.client = new Groq({
      apiKey: this.config.apiKey
    });
    
    this.isConfigured = !!process.env.GROQ_API_KEY;
    
    if (!this.isConfigured) {
      console.warn('Groq AI Engine: API key not configured, using pattern-based fallback');
    } else {
      console.log('✅ Groq AI Engine initialized successfully');
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<GroqConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.apiKey) {
      this.client = new Groq({
        apiKey: newConfig.apiKey
      });
      this.isConfigured = true;
    }
  }

  // Test API connection
  async testConnection(): Promise<{ success: boolean; message: string; responseTime?: number }> {
    try {
      if (!this.isConfigured) {
        return { 
          success: false, 
          message: 'کلید API Groq تنظیم نشده است' 
        };
      }

      const startTime = Date.now();
      
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ 
          role: "user", 
          content: "سلام، لطفا با یک کلمه فارسی پاسخ دهید." 
        }],
        max_tokens: 10,
        temperature: 0.1
      });

      const responseTime = Date.now() - startTime;

      if (response.choices[0]?.message?.content) {
        return { 
          success: true, 
          message: `اتصال به Groq AI برقرار شد - مدل: ${this.config.model}`,
          responseTime
        };
      }

      return { 
        success: false, 
        message: 'پاسخ نامعتبر از Groq API' 
      };

    } catch (error: any) {
      console.error('Groq connection test failed:', error);
      return { 
        success: false, 
        message: `خطا در اتصال به Groq: ${error.message}` 
      };
    }
  }

  // Generate response with cultural context
  async generateResponse(
    prompt: string, 
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      culturalContext?: boolean;
      persianOptimized?: boolean;
    } = {}
  ): Promise<string> {
    try {
      if (!this.isConfigured) {
        return this.generateFallbackResponse(prompt);
      }

      const model = options.model || this.config.model;
      const temperature = options.temperature || this.config.temperature;
      const maxTokens = options.maxTokens || this.config.maxTokens;

      // Add Persian cultural context if requested
      let contextualPrompt = prompt;
      if (options.culturalContext) {
        contextualPrompt = `
شما یک دستیار هوشمند فارسی با درک عمیق از فرهنگ ایرانی هستید. لطفا:
- با احترام و ادب پاسخ دهید
- از اصطلاحات مناسب فرهنگ ایرانی استفاده کنید
- در صورت لزوم از شعر یا ضرب‌المثل فارسی استفاده کنید
- روابط انسانی را در اولویت قرار دهید

سوال: ${prompt}

پاسخ:`;
      }

      if (options.persianOptimized) {
        contextualPrompt = `${contextualPrompt}

توجه: لطفا پاسخ خود را به زبان فارسی و با در نظر گیری فرهنگ و آداب ایرانی ارائه دهید.`;
      }

      const response = await this.client.chat.completions.create({
        model,
        messages: [{ 
          role: "user", 
          content: contextualPrompt 
        }],
        max_tokens: maxTokens,
        temperature,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      });

      return response.choices[0]?.message?.content || "خطا در تولید پاسخ";

    } catch (error: any) {
      console.error('Groq generation error:', error);
      return this.generateFallbackResponse(prompt);
    }
  }

  // Process message with Persian cultural intelligence
  async processMessage(
    message: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      culturalAnalysis?: boolean;
    } = {}
  ): Promise<string> {
    return this.generateResponse(message, {
      ...options,
      culturalContext: true,
      persianOptimized: true
    });
  }

  // Analyze representative culturally
  async analyzeCulturalProfile(representative: Representative): Promise<PersianCulturalAnalysis> {
    try {
      if (!this.isConfigured) {
        return this.generateFallbackCulturalAnalysis(representative);
      }

      const prompt = `
تحلیل فرهنگی نماینده:
نام: ${representative.name}
کد: ${representative.code}
مالک: ${representative.ownerName}
فروش کل: ${representative.totalSales}
بدهی: ${representative.totalDebt}
وضعیت: ${representative.isActive ? 'فعال' : 'غیرفعال'}

لطفا بر اساس این اطلاعات، پروفایل فرهنگی این نماینده را تحلیل کنید و JSON زیر را تکمیل کنید:
{
  "communicationStyle": "formal/friendly/respectful/direct",
  "culturalSensitivity": "high/medium/low", 
  "businessApproach": "traditional/modern/mixed",
  "relationshipPriority": 1-10,
  "timeOrientation": "punctual/flexible/relaxed",
  "trustLevel": 1-10
}

فقط JSON را برگردانید:`;

      const response = await this.generateResponse(prompt, {
        temperature: 0.3,
        maxTokens: 200
      });

      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Failed to parse cultural analysis:', parseError);
      }

      return this.generateFallbackCulturalAnalysis(representative);

    } catch (error) {
      console.error('Cultural analysis failed:', error);
      return this.generateFallbackCulturalAnalysis(representative);
    }
  }

  // Generate task recommendations
  async generateTaskRecommendations(representative: Representative): Promise<TaskRecommendation[]> {
    try {
      if (!this.isConfigured) {
        return this.generateFallbackTaskRecommendations(representative);
      }

      const culturalProfile = await this.analyzeCulturalProfile(representative);

      const prompt = `
بر اساس اطلاعات زیر، سه پیشنهاد کاری مناسب ارائه دهید:

نماینده: ${representative.name}
بدهی: ${representative.totalDebt} ریال
فروش: ${representative.totalSales} ریال
سبک ارتباط: ${culturalProfile.communicationStyle}
رویکرد کسب‌وکار: ${culturalProfile.businessApproach}

لطفا ۳ پیشنهاد کاری با فرمت JSON ارائه دهید:
[
  {
    "taskType": "FOLLOW_UP/DEBT_COLLECTION/RELATIONSHIP_BUILDING/PERFORMANCE_CHECK",
    "priority": "URGENT/HIGH/MEDIUM/LOW",
    "title": "عنوان کوتاه",
    "description": "شرح کامل",
    "expectedOutcome": "نتیجه مورد انتظار",
    "culturalConsiderations": ["نکته فرهنگی ۱", "نکته فرهنگی ۲"],
    "estimatedDifficulty": 1-5,
    "aiConfidence": 1-100,
    "xpReward": 10-100
  }
]

فقط JSON Array را برگردانید:`;

      const response = await this.generateResponse(prompt, {
        temperature: 0.4,
        maxTokens: 800
      });

      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const tasks = JSON.parse(jsonMatch[0]);
          return tasks.slice(0, 3); // Maximum 3 tasks
        }
      } catch (parseError) {
        console.error('Failed to parse task recommendations:', parseError);
      }

      return this.generateFallbackTaskRecommendations(representative);

    } catch (error) {
      console.error('Task generation failed:', error);
      return this.generateFallbackTaskRecommendations(representative);
    }
  }

  // Fallback responses when API is not available
  private generateFallbackResponse(prompt: string): string {
    const responses = [
      "متأسفانه در حال حاضر دستیار AI در دسترس نیست. لطفاً بعداً تلاش کنید.",
      "سیستم AI موقتاً غیرفعال است. لطفاً تنظیمات Groq را بررسی کنید.",
      "خطا در ارتباط با سرویس Groq. لطفاً کلید API را تأیید کنید."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private generateFallbackCulturalAnalysis(representative: Representative): PersianCulturalAnalysis {
    // Basic analysis based on available data
    const salesLevel = representative.totalSales || 0;
    const debtLevel = representative.totalDebt || 0;
    
    return {
      communicationStyle: salesLevel > 1000000 ? 'formal' : 'friendly',
      culturalSensitivity: 'high',
      businessApproach: debtLevel > salesLevel * 0.3 ? 'traditional' : 'modern',
      relationshipPriority: representative.isActive ? 8 : 5,
      timeOrientation: 'flexible',
      trustLevel: representative.isActive ? 7 : 4
    };
  }

  private generateFallbackTaskRecommendations(representative: Representative): TaskRecommendation[] {
    const tasks: TaskRecommendation[] = [];
    
    // Generate basic tasks based on data
    if (representative.totalDebt > 0) {
      tasks.push({
        taskType: 'DEBT_COLLECTION',
        priority: representative.totalDebt > 10000000 ? 'HIGH' : 'MEDIUM',
        title: 'پیگیری مطالبات',
        description: `پیگیری مطالبات معوق نماینده ${representative.name}`,
        expectedOutcome: 'کاهش بدهی و تنظیم پلان پرداخت',
        culturalConsiderations: ['رعایت ادب و احترام', 'ارائه راه‌حل منطقی'],
        estimatedDifficulty: 3,
        aiConfidence: 75,
        xpReward: 30
      });
    }

    if (representative.isActive) {
      tasks.push({
        taskType: 'PERFORMANCE_CHECK',
        priority: 'MEDIUM',
        title: 'بررسی عملکرد',
        description: `ارزیابی عملکرد فروش نماینده ${representative.name}`,
        expectedOutcome: 'شناسایی نقاط قوت و ضعف',
        culturalConsiderations: ['تقدیر از تلاش‌ها', 'ارائه پیشنهادات سازنده'],
        estimatedDifficulty: 2,
        aiConfidence: 85,
        xpReward: 25
      });
    }

    tasks.push({
      taskType: 'RELATIONSHIP_BUILDING',
      priority: 'LOW',
      title: 'تقویت روابط',
      description: `برقراری ارتباط دوستانه با ${representative.name}`,
      expectedOutcome: 'بهبود روابط کاری و اعتماد متقابل',
      culturalConsiderations: ['پرسش از احوال خانواده', 'نشان دادن علاقه صمیمانه'],
      estimatedDifficulty: 1,
      aiConfidence: 90,
      xpReward: 15
    });

    return tasks;
  }

  // Get current configuration
  getConfig(): GroqConfig {
    return { ...this.config };
  }

  // Check if engine is configured
  isReady(): boolean {
    return this.isConfigured;
  }

  // Get available models
  getAvailableModels(): string[] {
    return [
      "llama-3.1-8b-instant",
      "llama-3.1-70b-versatile", 
      "llama-3.2-1b-preview",
      "llama-3.2-3b-preview",
      "llama-3.2-11b-vision-preview",
      "llama-3.2-90b-vision-preview",
      "mixtral-8x7b-32768",
      "gemma2-9b-it"
    ];
  }

  // Persian cultural optimization
  optimizeForPersianCulture(config: Partial<GroqConfig>): GroqConfig {
    return {
      ...this.config,
      ...config,
      // Optimized settings for Persian cultural context
      temperature: config.temperature || 0.7, // Balanced creativity
      maxTokens: config.maxTokens || 1000 // Adequate response length
    };
  }
}

// Export singleton instance
export const groqAIEngine = new GroqAIEngine();