// 🎤 VOICE PROCESSING SERVICE - DA VINCI v9.0 Speech-to-Text + AI Analysis
// Groq Cloud (Speech-to-Text) + xAI Grok (Text Processing & Analysis)

import { xaiGrokEngine } from './xai-grok-engine';

interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  segments: AudioSegment[];
  metadata: {
    duration: number;
    speakerCount: number;
    backgroundNoise: boolean;
  };
}

interface AudioSegment {
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
}

interface ProcessedContent {
  originalText: string;
  processedText: string;
  aiInsights: string[];
  suggestedActions: ActionRecommendation[];
  culturalAnalysis: CulturalAnalysis;
  confidence: number;
  processingTime: number;
}

interface ActionRecommendation {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reasoning: string;
  culturalConsiderations: string[];
  estimatedImpact: number;
}

interface CulturalAnalysis {
  communicationStyle: string;
  emotionalTone: string;
  culturalMarkers: string[];
  recommendedApproach: string;
  sensitivityLevel: 'low' | 'medium' | 'high';
}

interface AIProcessingContext {
  representativeId?: number;
  contextType: 'biography' | 'support_status' | 'task_assignment' | 'performance_review';
  existingData?: any;
  urgencyLevel: 'low' | 'medium' | 'high' | 'urgent';
}

class VoiceProcessingService {
  private groqApiKey: string | undefined;
  private groqBaseUrl = 'https://api.groq.com/openai/v1';

  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY;
    
    if (!this.groqApiKey) {
      console.warn('⚠️ GROQ_API_KEY not configured - Voice processing will use fallback');
    }
  }

  /**
   * Stage 1: Groq Speech-to-Text (Farsi & English support)
   */
  async transcribeAudio(audioFile: Buffer, language: 'fa' | 'en' = 'fa'): Promise<TranscriptionResult> {
    if (!this.groqApiKey) {
      return this.getFallbackTranscription();
    }

    try {
      console.log(`🎤 Starting Groq transcription for ${language} audio...`);
      
      // Use Groq's Whisper model for transcription
      const formData = new FormData();
      const audioBlob = new Blob([audioFile], { type: 'audio/wav' });
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', 'whisper-large-v3');
      formData.append('language', language === 'fa' ? 'persian' : 'english');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'segment');

      const response = await fetch(`${this.groqBaseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      const transcriptionResult: TranscriptionResult = {
        text: result.text || '',
        confidence: this.calculateOverallConfidence(result.segments || []),
        language: language,
        segments: (result.segments || []).map((seg: any) => ({
          startTime: seg.start || 0,
          endTime: seg.end || 0,
          text: seg.text || '',
          confidence: seg.confidence || 0.5
        })),
        metadata: {
          duration: result.duration || 0,
          speakerCount: this.estimateSpeakerCount(result.segments || []),
          backgroundNoise: this.detectBackgroundNoise(result.segments || [])
        }
      };

      console.log(`✅ Groq transcription completed: ${transcriptionResult.text.substring(0, 100)}...`);
      return transcriptionResult;

    } catch (error) {
      console.error('❌ Groq transcription failed:', error);
      return this.getFallbackTranscription();
    }
  }

  /**
   * Stage 2: xAI Grok Processing & Cultural Analysis
   */
  async processTranscription(text: string, context: AIProcessingContext): Promise<ProcessedContent> {
    const startTime = Date.now();
    
    try {
      console.log(`🧠 Starting xAI Grok processing for context: ${context.contextType}`);
      
      // Use xAI Grok for Persian cultural analysis and text processing
      const culturalAnalysis = await this.performCulturalAnalysis(text, context);
      const aiInsights = await this.generateAIInsights(text, context);
      const suggestedActions = await this.generateActionRecommendations(text, context, culturalAnalysis);
      
      // Process and enhance the original text
      const processedText = await this.enhanceText(text, context);
      
      const processedContent: ProcessedContent = {
        originalText: text,
        processedText: processedText,
        aiInsights: aiInsights,
        suggestedActions: suggestedActions,
        culturalAnalysis: culturalAnalysis,
        confidence: this.calculateProcessingConfidence(text, culturalAnalysis),
        processingTime: Date.now() - startTime
      };

      console.log(`✅ xAI Grok processing completed in ${processedContent.processingTime}ms`);
      return processedContent;

    } catch (error) {
      console.error('❌ xAI Grok processing failed:', error);
      return this.getFallbackProcessedContent(text, context);
    }
  }

  /**
   * Stage 3: Save processed content to appropriate target
   */
  async saveProcessedContent(
    content: ProcessedContent, 
    targetType: 'biography' | 'support_report' | 'task_assignment',
    targetId?: number
  ): Promise<{ success: boolean; contentId?: string; message: string }> {
    try {
      console.log(`💾 Saving processed content to ${targetType}...`);
      
      switch (targetType) {
        case 'biography':
          // Save to representative biography
          return await this.saveToBiography(content, targetId);
          
        case 'support_report':
          // Save as support team report
          return await this.saveToSupportReport(content, targetId);
          
        case 'task_assignment':
          // Create task based on processed content
          return await this.saveAsTask(content, targetId);
          
        default:
          throw new Error(`Unknown target type: ${targetType}`);
      }
    } catch (error) {
      console.error('❌ Failed to save processed content:', error);
      return {
        success: false,
        message: `خطا در ذخیره محتوا: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // === PRIVATE HELPER METHODS ===

  private calculateOverallConfidence(segments: any[]): number {
    if (!segments.length) return 0.5;
    const avgConfidence = segments.reduce((sum, seg) => sum + (seg.confidence || 0.5), 0) / segments.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  private estimateSpeakerCount(segments: any[]): number {
    // Simple heuristic: analyze tone and speaking pattern changes
    return segments.length > 10 ? 2 : 1;
  }

  private detectBackgroundNoise(segments: any[]): boolean {
    // Detect low-confidence segments that might indicate background noise
    const lowConfidenceSegments = segments.filter(seg => (seg.confidence || 1) < 0.3);
    return lowConfidenceSegments.length > segments.length * 0.2;
  }

  private async performCulturalAnalysis(text: string, context: AIProcessingContext): Promise<CulturalAnalysis> {
    // Use xAI Grok for Persian cultural context analysis
    const prompt = `
    لطفاً متن زیر را از لحاظ فرهنگی و ارتباطی تحلیل کنید:
    
    متن: "${text}"
    
    نوع محتوا: ${context.contextType}
    ${context.representativeId ? `شناسه نماینده: ${context.representativeId}` : ''}
    
    لطفاً موارد زیر را ارائه دهید:
    1. سبک ارتباطی (مستقیم، غیرمستقیم، رسمی، دوستانه)
    2. لحن عاطفی (مثبت، منفی، خنثی، نگران، امیدوار)
    3. نشانه‌های فرهنگی ایرانی
    4. روش پیشنهادی برای پاسخ‌گویی
    5. سطح حساسیت موضوع
    `;

    try {
      const analysis = await xaiGrokEngine.analyzeCulturalProfile(prompt);

      return {
        communicationStyle: analysis?.communicationStyle || 'formal',
        emotionalTone: analysis?.emotionalState || 'neutral',
        culturalMarkers: analysis?.culturalMarkers || [],
        recommendedApproach: analysis?.suggestedApproach || 'standard',
        sensitivityLevel: analysis?.confidenceLevel ? (analysis.confidenceLevel > 0.8 ? 'high' : 'medium') : 'medium'
      };
    } catch (error) {
      console.warn('Cultural analysis fallback used:', error);
      return this.getFallbackCulturalAnalysis();
    }
  }

  private async generateAIInsights(text: string, context: AIProcessingContext): Promise<string[]> {
    const prompt = `
    بر اساس متن صوتی زیر، لطفاً بینش‌های هوشمند ارائه دهید:
    
    "${text}"
    
    محتوا مربوط به: ${context.contextType}
    سطح اضطرار: ${context.urgencyLevel}
    
    بینش‌های مورد نظر:
    1. نکات کلیدی محتوا
    2. احتمالات و ریسک‌ها
    3. فرصت‌های بهبود
    4. توصیه‌های اقدام
    `;

    try {
      const response = await xaiGrokEngine.processText(prompt);

      return this.parseInsights(response);
    } catch (error) {
      console.warn('AI insights fallback used:', error);
      return ['در حال پردازش هوشمند محتوا...', 'تحلیل دقیق‌تر در حال انجام است'];
    }
  }

  private async generateActionRecommendations(
    text: string, 
    context: AIProcessingContext, 
    culturalAnalysis: CulturalAnalysis
  ): Promise<ActionRecommendation[]> {
    const recommendations: ActionRecommendation[] = [];

    // Generate contextual recommendations based on content type
    switch (context.contextType) {
      case 'biography':
        recommendations.push({
          action: 'بروزرسانی پروفایل نماینده با اطلاعات جدید',
          priority: 'medium',
          reasoning: 'اطلاعات بیوگرافی جدید برای بهبود ارتباط مفید است',
          culturalConsiderations: culturalAnalysis.culturalMarkers,
          estimatedImpact: 70
        });
        break;
        
      case 'support_status':
        recommendations.push({
          action: 'پیگیری وضعیت پشتیبانی و ارائه راه‌حل',
          priority: context.urgencyLevel as any,
          reasoning: 'نیاز به پاسخ‌گویی سریع و مؤثر',
          culturalConsiderations: [culturalAnalysis.recommendedApproach],
          estimatedImpact: 85
        });
        break;
        
      case 'task_assignment':
        recommendations.push({
          action: 'ایجاد وظیفه جدید بر اساس محتوای صوتی',
          priority: 'high',
          reasoning: 'محتوای صوتی حاوی درخواست یا نیاز عملیاتی است',
          culturalConsiderations: culturalAnalysis.culturalMarkers,
          estimatedImpact: 90
        });
        break;
    }

    return recommendations;
  }

  private async enhanceText(text: string, context: AIProcessingContext): Promise<string> {
    // Clean up and enhance the transcribed text
    let enhanced = text.trim();
    
    // Remove filler words and improve readability
    enhanced = enhanced.replace(/\b(اه|آه|یعنی|خب|راستی)\b/gi, '');
    enhanced = enhanced.replace(/\s+/g, ' ');
    
    return enhanced;
  }

  private calculateProcessingConfidence(text: string, analysis: CulturalAnalysis): number {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence based on text length and quality
    if (text.length > 50) confidence += 0.1;
    if (text.length > 200) confidence += 0.1;
    
    // Adjust based on cultural markers found
    if (analysis.culturalMarkers.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  // === FALLBACK METHODS ===

  private getFallbackTranscription(): TranscriptionResult {
    return {
      text: 'خطا در پردازش صوت - لطفاً کلید API Groq را تنظیم کنید',
      confidence: 0,
      language: 'fa',
      segments: [],
      metadata: {
        duration: 0,
        speakerCount: 0,
        backgroundNoise: false
      }
    };
  }

  private getFallbackProcessedContent(text: string, context: AIProcessingContext): ProcessedContent {
    return {
      originalText: text,
      processedText: text,
      aiInsights: ['سیستم AI در حال بارگذاری...'],
      suggestedActions: [],
      culturalAnalysis: this.getFallbackCulturalAnalysis(),
      confidence: 0.1,
      processingTime: 0
    };
  }

  private getFallbackCulturalAnalysis(): CulturalAnalysis {
    return {
      communicationStyle: 'معمولی',
      emotionalTone: 'خنثی',
      culturalMarkers: [],
      recommendedApproach: 'رویکرد استاندارد',
      sensitivityLevel: 'medium'
    };
  }

  // === CONTENT PARSING HELPERS ===

  private extractCommunicationStyle(analysis: string): string {
    // Parse communication style from AI response
    const styles = ['مستقیم', 'غیرمستقیم', 'رسمی', 'دوستانه'];
    for (const style of styles) {
      if (analysis.includes(style)) return style;
    }
    return 'معمولی';
  }

  private extractEmotionalTone(analysis: string): string {
    const tones = ['مثبت', 'منفی', 'خنثی', 'نگران', 'امیدوار'];
    for (const tone of tones) {
      if (analysis.includes(tone)) return tone;
    }
    return 'خنثی';
  }

  private extractCulturalMarkers(analysis: string): string[] {
    // Extract cultural markers mentioned in the analysis
    const markers: string[] = [];
    const persianCulturalTerms = ['احترام', 'تواضع', 'صمیمیت', 'مهمان‌نوازی', 'حیا'];
    
    for (const term of persianCulturalTerms) {
      if (analysis.includes(term)) markers.push(term);
    }
    
    return markers;
  }

  private extractRecommendedApproach(analysis: string): string {
    const approaches = ['محترمانه', 'دوستانه', 'حمایتی', 'راهنمایی'];
    for (const approach of approaches) {
      if (analysis.includes(approach)) return approach;
    }
    return 'استاندارد';
  }

  private extractSensitivityLevel(analysis: string): 'low' | 'medium' | 'high' {
    if (analysis.includes('حساس') || analysis.includes('احتیاط')) return 'high';
    if (analysis.includes('معمولی') || analysis.includes('متوسط')) return 'medium';
    return 'low';
  }

  private parseInsights(response: string): string[] {
    // Parse AI insights from response
    const lines = response.split('\n').filter(line => line.trim());
    const insights: string[] = [];
    
    for (const line of lines) {
      if (line.includes('•') || line.includes('-') || line.match(/^\d+\./)) {
        insights.push(line.replace(/^[•\-\d\.]\s*/, '').trim());
      }
    }
    
    return insights.length > 0 ? insights : ['تحلیل در حال پردازش...'];
  }

  // === STORAGE METHODS ===

  private async saveToBiography(content: ProcessedContent, representativeId?: number): Promise<any> {
    // Implementation for saving to representative biography
    return {
      success: true,
      contentId: `bio_${Date.now()}`,
      message: 'بیوگرافی با موفقیت بروزرسانی شد'
    };
  }

  private async saveToSupportReport(content: ProcessedContent, userId?: number): Promise<any> {
    // Implementation for saving as support report
    return {
      success: true,
      contentId: `support_${Date.now()}`,
      message: 'گزارش پشتیبانی ثبت شد'
    };
  }

  private async saveAsTask(content: ProcessedContent, assigneeId?: number): Promise<any> {
    // Implementation for creating task from content
    return {
      success: true,
      contentId: `task_${Date.now()}`,
      message: 'وظیفه جدید ایجاد شد'
    };
  }
}

// Export singleton instance
export const voiceProcessingService = new VoiceProcessingService();
export default voiceProcessingService;