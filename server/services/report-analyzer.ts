// Report Analysis Engine - DA VINCI v2.0
// AI-powered analysis of staff reports and generation of follow-up actions

import { XAIGrokEngine } from "./xai-grok-engine";
import { workspaceStorage } from "./workspace-storage";
import { settingsStorage } from "./settings-storage";
import type { TaskReport, WorkspaceReminder } from "@shared/schema";
import { nanoid } from "nanoid";

// Import persian-date as ES module
import * as persianDate from "persian-date";

export interface ReportAnalysisResult {
  keyInsights: string[];
  representativeStatus: 'POSITIVE' | 'NEUTRAL' | 'CONCERNING';
  followUpRequired: boolean;
  nextContactDate?: string;
  extractedIssues: string[];
  recommendations: string[];
  confidenceScore: number;
}

export class ReportAnalyzer {
  private grokEngine: XAIGrokEngine;

  constructor() {
    this.grokEngine = new XAIGrokEngine(settingsStorage);
  }

  /**
   * Main analysis method - processes a staff report using AI
   */
  async analyzeReport(report: TaskReport): Promise<TaskReport> {
    try {
      console.log(`Analyzing report ${report.id} for task ${report.taskId}`);
      
      // Get related task for context
      const task = await workspaceStorage.getTaskById(report.taskId);
      if (!task) {
        throw new Error('Related task not found');
      }

      // Generate AI analysis
      const analysis = await this.generateAIAnalysis(report.content, task);
      
      // Update report with analysis results
      await workspaceStorage.updateReportAnalysis(report.id, analysis);
      
      // Generate follow-up reminders if needed
      if (analysis.followUpRequired) {
        await this.generateFollowUpReminders(report, analysis);
      }

      // Update representative profile with insights
      await this.updateRepresentativeProfile(task.representativeId, analysis.keyInsights);
      
      return {
        ...report,
        aiAnalysis: analysis,
        status: 'AI_PROCESSED'
      };
    } catch (error) {
      console.error(`Error analyzing report ${report.id}:`, error);
      throw new Error('خطا در تحلیل گزارش');
    }
  }

  /**
   * Generate AI analysis of the report content
   */
  private async generateAIAnalysis(content: string, task: any): Promise<ReportAnalysisResult> {
    const analysisPrompt = `
تحلیل گزارش کارمند پشتیبانی CRM:

وظیفه اصلی: ${task.title}
شرح وظیفه: ${task.description}
اولویت: ${task.priority}

گزارش کارمند:
"${content}"

لطفا این گزارش را با در نظر گیری فرهنگ تجاری ایران تحلیل کن و موارد زیر را مشخص کن:

1. نکات کلیدی و مهم (key insights)
2. وضعیت نماینده: مثبت، خنثی، یا نگران‌کننده  
3. آیا پیگیری بیشتری نیاز است؟
4. تاریخ پیشنهادی برای تماس بعدی (اگر نیاز باشد)
5. مسائل استخراج شده
6. پیشنهادات برای اقدامات بعدی
7. امتیاز اطمینان (1-10)

پاسخ را در قالب JSON با ساختار زیر ارائه ده:
{
  "keyInsights": ["نکته 1", "نکته 2"],
  "representativeStatus": "POSITIVE|NEUTRAL|CONCERNING", 
  "followUpRequired": true/false,
  "nextContactDate": "1403/09/15",
  "extractedIssues": ["مسئله 1", "مسئله 2"],
  "recommendations": ["پیشنهاد 1", "پیشنهاد 2"],
  "confidenceScore": 8
}
`;

    try {
      const analysisResponse = await this.grokEngine.generateResponse(analysisPrompt);
      
      // Try to parse as JSON with fallback
      let analysis: ReportAnalysisResult;
      try {
        const parsed = JSON.parse(analysisResponse);
        analysis = {
          keyInsights: parsed.keyInsights || ['گزارش ثبت شد'],
          representativeStatus: parsed.representativeStatus || 'NEUTRAL',
          followUpRequired: parsed.followUpRequired || false,
          nextContactDate: parsed.nextContactDate,
          extractedIssues: parsed.extractedIssues || [],
          recommendations: parsed.recommendations || ['ادامه پیگیری معمول'],
          confidenceScore: parsed.confidenceScore || 5
        };
      } catch (parseError) {
        // Fallback analysis based on content length and keywords
        analysis = this.generateFallbackAnalysis(content);
      }

      return analysis;
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      return this.generateFallbackAnalysis(content);
    }
  }

  /**
   * Generate fallback analysis when AI fails
   */
  private generateFallbackAnalysis(content: string): ReportAnalysisResult {
    const contentLength = content.length;
    const positiveKeywords = ['موفق', 'خوب', 'راضی', 'تمایل', 'پذیرفت'];
    const negativeKeywords = ['مشکل', 'نارضایتی', 'رد کرد', 'نمی‌خواهد', 'مخالف'];
    
    const hasPositive = positiveKeywords.some(keyword => content.includes(keyword));
    const hasNegative = negativeKeywords.some(keyword => content.includes(keyword));
    
    let status: 'POSITIVE' | 'NEUTRAL' | 'CONCERNING' = 'NEUTRAL';
    if (hasPositive && !hasNegative) status = 'POSITIVE';
    else if (hasNegative) status = 'CONCERNING';

    return {
      keyInsights: [`گزارش ${contentLength > 100 ? 'مفصل' : 'خلاصه'} ارائه شده`],
      representativeStatus: status,
      followUpRequired: hasNegative || contentLength < 50,
      extractedIssues: hasNegative ? ['نیاز به بررسی بیشتر'] : [],
      recommendations: ['ادامه پیگیری بر اساس روال معمول'],
      confidenceScore: 6
    };
  }

  /**
   * Extract key insights using NLP
   */
  async extractKeyInsights(content: string): Promise<string[]> {
    const insightPrompt = `
از متن زیر، مهم‌ترین نکات را استخراج کن:

"${content}"

لطفا 3-5 نکته کلیدی را در قالب لیست فارسی ارائه ده:
`;

    try {
      const response = await this.grokEngine.generateResponse(insightPrompt);
      
      // Extract bullet points or numbered items
      const insights = response
        .split('\n')
        .filter(line => line.trim().length > 0)
        .filter(line => line.includes('•') || line.includes('-') || /^\d+\./.test(line.trim()))
        .map(line => line.replace(/^[•\-\d\.]\s*/, '').trim())
        .filter(insight => insight.length > 5);

      return insights.length > 0 ? insights : ['اطلاعات کلی ثبت شد'];
    } catch (error) {
      console.error('Error extracting insights:', error);
      return ['خطا در استخراج نکات کلیدی'];
    }
  }

  /**
   * Generate follow-up reminders based on analysis
   */
  async generateFollowUpReminders(report: TaskReport, analysis: ReportAnalysisResult): Promise<WorkspaceReminder[]> {
    try {
      const task = await workspaceStorage.getTaskById(report.taskId);
      if (!task) return [];

      const reminders: WorkspaceReminder[] = [];
      const now = new (persianDate as any)();

      // Different reminder types based on analysis
      if (analysis.representativeStatus === 'CONCERNING') {
        // Urgent follow-up within 24 hours
        const urgentDate = now.clone().add(1, 'day').format('YYYY/MM/DD HH:mm:ss');
        
        const urgentReminder = await workspaceStorage.createReminder({
          staffId: task.staffId,
          representativeId: task.representativeId,
          type: 'ISSUE_CHECK',
          message: `بررسی فوری مسائل نماینده بر اساس گزارش: ${analysis.extractedIssues.join(', ')}`,
          scheduledFor: urgentDate,
          context: {
            lastInteraction: report.submittedAt,
            pendingIssues: analysis.extractedIssues,
            importantNotes: analysis.keyInsights
          },
          priority: 'HIGH'
        });
        
        reminders.push(urgentReminder);
      }

      // Regular follow-up if specified
      if (analysis.nextContactDate) {
        const followUpReminder = await workspaceStorage.createReminder({
          staffId: task.staffId,
          representativeId: task.representativeId,
          type: 'FOLLOW_UP_CALL',
          message: `پیگیری معمول بر اساس برنامه‌ریزی: ${analysis.recommendations.join(', ')}`,
          scheduledFor: `${analysis.nextContactDate} 09:00:00`,
          context: {
            lastInteraction: report.submittedAt,
            pendingIssues: analysis.extractedIssues,
            importantNotes: analysis.keyInsights
          },
          priority: 'MEDIUM'
        });
        
        reminders.push(followUpReminder);
      }

      return reminders;
    } catch (error) {
      console.error('Error generating follow-up reminders:', error);
      return [];
    }
  }

  /**
   * Update representative profile with new insights
   */
  async updateRepresentativeProfile(repId: number, insights: string[]): Promise<void> {
    try {
      // Log support interaction
      const now = new (persianDate as any)();
      
      await workspaceStorage.logSupportInteraction({
        representativeId: repId,
        staffId: 1, // TODO: Get from session/context
        interactionDate: now.format('YYYY/MM/DD'),
        summary: insights.join(' • '),
        issues: insights.filter(insight => 
          insight.includes('مشکل') || insight.includes('نگرانی') || insight.includes('مسئله')
        ),
        resolution: 'در حال پیگیری',
        nextSteps: ['ادامه نظارت', 'بررسی پیشرفت'],
        responseTime: 60, // Default 1 hour
        satisfactionLevel: 'MEDIUM',
        followUpRequired: insights.some(insight => 
          insight.includes('پیگیری') || insight.includes('بررسی')
        )
      });
      
      console.log(`Representative ${repId} profile updated with ${insights.length} insights`);
    } catch (error) {
      console.error(`Error updating representative ${repId} profile:`, error);
      // Don't throw - this shouldn't block the main analysis
    }
  }

  /**
   * Process all pending reports
   */
  async processPendingReports(): Promise<{
    processed: number;
    failed: number;
    results: TaskReport[];
  }> {
    try {
      const pendingReports = await workspaceStorage.getPendingReports();
      console.log(`Processing ${pendingReports.length} pending reports`);
      
      const results: TaskReport[] = [];
      let processed = 0;
      let failed = 0;

      for (const report of pendingReports) {
        try {
          const analyzedReport = await this.analyzeReport(report);
          results.push(analyzedReport);
          processed++;
        } catch (error) {
          console.error(`Failed to process report ${report.id}:`, error);
          failed++;
        }
      }

      return { processed, failed, results };
    } catch (error) {
      console.error('Error processing pending reports:', error);
      throw new Error('خطا در پردازش گزارش‌های در انتظار');
    }
  }
}

// Export singleton instance
export const reportAnalyzer = new ReportAnalyzer();