// Follow-up Manager - DA VINCI v2.0 Intelligent Reminder System
// AI-powered follow-up scheduling with Persian cultural intelligence

import { db } from "../db";
import { eq, sql, and, lt, gte } from "drizzle-orm";
import { 
  workspaceAiReminders, 
  representatives, 
  taskReportsAnalysis,
  type WorkspaceAiReminder,
  type InsertWorkspaceAiReminder,
  type TaskReportsAnalysis 
} from "@shared/schema";
import { nanoid } from "nanoid";
import * as persianDate from "persian-date";
import { xaiGrokEngine } from "./xai-grok-engine";

export interface FollowUpSuggestion {
  representativeId: number;
  representativeName: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedAction: string;
  culturalContext: string;
  nextContactDate: string;
  reminderType: 'CALL' | 'VISIT' | 'MESSAGE' | 'PAYMENT_FOLLOW';
  reason: string;
  aiConfidence: number;
}

export interface ReminderStats {
  totalActive: number;
  overdue: number;
  today: number;
  highPriority: number;
  automated: number;
  manual: number;
}

export class FollowUpManager {

  /**
   * تولید یادآورهای هوشمند بر اساس تحلیلات
   */
  async generateSmartReminders(): Promise<FollowUpSuggestion[]> {
    try {
      console.log('🤖 Generating smart reminders using AI...');

      // Get recent analysis data
      const analysisData = await db.execute(sql`
        SELECT 
          tra.representative_id,
          tra.priority_level,
          tra.next_contact_date,
          tra.follow_up_actions,
          tra.ai_confidence,
          r.name as representative_name,
          r.total_debt,
          r.sales_balance
        FROM task_reports_analysis tra
        JOIN representatives r ON r.id = tra.representative_id  
        WHERE tra.created_at >= NOW() - INTERVAL '7 days'
        AND tra.next_contact_date IS NOT NULL
        ORDER BY tra.priority_level DESC, tra.ai_confidence DESC
        LIMIT 20
      `);

      const suggestions: FollowUpSuggestion[] = [];

      for (const row of analysisData.rows) {
        try {
          const aiPrompt = `
تحلیل کن و بهترین نوع یادآور را پیشنهاد بده:
نماینده: ${row.representative_name}
بدهی: ${row.total_debt} تومان
موجودی فروش: ${row.sales_balance} تومان
اولویت تحلیل AI: ${row.priority_level}
اقدامات پیشنهادی: ${row.follow_up_actions}

با در نظر گیری فرهنگ ایرانی و آداب تجاری، بهترین نوع یادآور (تماس، پیامک، ویزیت) و متن مناسب را پیشنهاد بده.
`;

          const aiResponse = await xaiGrokEngine.generateCulturalInsights({
            id: row.representative_id,
            name: row.representative_name,
            totalDebt: row.total_debt,
            sales_balance: row.sales_balance
          }, aiPrompt);
          
          // Parse AI response to extract recommendation
          const reminderType = this.extractReminderType(aiResponse);
          const culturalContext = this.extractCulturalContext(aiResponse);
          
          const suggestion: FollowUpSuggestion = {
            representativeId: row.representative_id as number,
            representativeName: row.representative_name as string,
            priority: this.determinePriority(row.priority_level as number, row.total_debt as number),
            suggestedAction: this.extractAction(aiResponse),
            culturalContext,
            nextContactDate: row.next_contact_date as string,
            reminderType,
            reason: this.extractReason(aiResponse),
            aiConfidence: (row.ai_confidence as number) || 75
          };

          suggestions.push(suggestion);

        } catch (error) {
          console.error(`Error processing suggestion for representative ${row.representative_id}:`, error);
        }
      }

      console.log(`✅ Generated ${suggestions.length} smart reminders`);
      return suggestions;

    } catch (error) {
      console.error('Error generating smart reminders:', error);
      return [];
    }
  }

  /**
   * ایجاد یادآور هوشمند در دیتابیس
   */
  async createSmartReminder(suggestion: FollowUpSuggestion, staffId: number): Promise<WorkspaceAiReminder> {
    try {
      const reminderId = `AI-REM-${nanoid(8).toUpperCase()}`;
      
      const reminderData: InsertWorkspaceAiReminder = {
        staffId,
        representativeId: suggestion.representativeId,
        title: `${suggestion.reminderType}: ${suggestion.representativeName}`,
        description: `${suggestion.suggestedAction}\n\nزمینه فرهنگی: ${suggestion.culturalContext}`,
        priority: suggestion.priority,
        // reminderType is not in schema - using context field instead
        scheduledFor: suggestion.nextContactDate,
        scheduledTime: "09:00",
        sourceType: "AI_ANALYSIS",
        sourceId: `analysis-${suggestion.representativeId}`,
        context: `${suggestion.reminderType}: ${suggestion.culturalContext}`
      };

      const result = await db.insert(workspaceAiReminders).values([{
        ...reminderData,
        id: reminderId
      }]).returning();
      
      console.log(`📝 Created smart reminder: ${reminderId} for ${suggestion.representativeName}`);
      return result[0];

    } catch (error) {
      console.error('Error creating smart reminder:', error);
      throw new Error('خطا در ایجاد یادآور هوشمند');
    }
  }

  /**
   * دریافت یادآورهای امروز
   */
  async getTodayReminders(staffId: number): Promise<WorkspaceAiReminder[]> {
    try {
      const today = new (persianDate as any)().format('YYYY-MM-DD');
      
      return await db.select().from(workspaceAiReminders)
        .where(and(
          eq(workspaceAiReminders.staffId, staffId),
          gte(workspaceAiReminders.scheduledFor, today + " 00:00:00")
        ))
        .orderBy(workspaceAiReminders.priority, workspaceAiReminders.scheduledFor);

    } catch (error) {
      console.error('Error fetching today reminders:', error);
      throw new Error('خطا در دریافت یادآورهای امروز');
    }
  }

  /**
   * آمار یادآورها
   */
  async getReminderStats(staffId: number): Promise<ReminderStats> {
    try {
      const today = new (persianDate as any)().format('YYYY-MM-DD');
      
      const stats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_active,
          COUNT(CASE WHEN scheduled_for < ${today} THEN 1 END) as overdue,
          COUNT(CASE WHEN scheduled_for = ${today} THEN 1 END) as today,
          COUNT(CASE WHEN priority = 'HIGH' THEN 1 END) as high_priority,
          COUNT(CASE WHEN source_type = 'AI_ANALYSIS' THEN 1 END) as automated,
          COUNT(CASE WHEN source_type != 'AI_ANALYSIS' THEN 1 END) as manual
        FROM workspace_ai_reminders 
        WHERE staff_id = ${staffId}
      `);

      const row = stats.rows[0];
      return {
        totalActive: Number(row.total_active) || 0,
        overdue: Number(row.overdue) || 0,
        today: Number(row.today) || 0,
        highPriority: Number(row.high_priority) || 0,
        automated: Number(row.automated) || 0,
        manual: Number(row.manual) || 0
      };

    } catch (error) {
      console.error('Error fetching reminder stats:', error);
      return {
        totalActive: 0,
        overdue: 0,
        today: 0,
        highPriority: 0,
        automated: 0,
        manual: 0
      };
    }
  }

  /**
   * تعویق یادآور
   */
  async snoozeReminder(reminderId: string, newDate: string): Promise<void> {
    try {
      await db.update(workspaceAiReminders)
        .set({ 
          scheduledFor: newDate,
          updatedAt: new Date()
        })
        .where(eq(workspaceAiReminders.id, reminderId));

    } catch (error) {
      console.error(`Error snoozing reminder ${reminderId}:`, error);
      throw new Error('خطا در تعویق یادآور');
    }
  }

  /**
   * تکمیل یادآور
   */
  async completeReminder(reminderId: string, notes?: string): Promise<void> {
    try {
      await db.update(workspaceAiReminders)
        .set({ 
          context: notes || 'تکمیل شد',
          updatedAt: new Date()
        })
        .where(eq(workspaceAiReminders.id, reminderId));

    } catch (error) {
      console.error(`Error completing reminder ${reminderId}:`, error);
      throw new Error('خطا در تکمیل یادآور');
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private extractReminderType(aiResponse: string): 'CALL' | 'VISIT' | 'MESSAGE' | 'PAYMENT_FOLLOW' {
    const response = aiResponse.toLowerCase();
    
    if (response.includes('تماس') || response.includes('زنگ')) {
      return 'CALL';
    } else if (response.includes('ویزیت') || response.includes('ملاقات')) {
      return 'VISIT';  
    } else if (response.includes('پیامک') || response.includes('پیام')) {
      return 'MESSAGE';
    } else if (response.includes('بدهی') || response.includes('پرداخت')) {
      return 'PAYMENT_FOLLOW';
    }
    
    return 'CALL'; // Default
  }

  private extractCulturalContext(aiResponse: string): string {
    // Extract cultural context from AI response
    const lines = aiResponse.split('\n');
    const culturalLine = lines.find(line => 
      line.includes('فرهنگ') || 
      line.includes('آداب') || 
      line.includes('احترام')
    );
    
    return culturalLine || 'رعایت ادب و احترام در ارتباط';
  }

  private extractAction(aiResponse: string): string {
    const lines = aiResponse.split('\n');
    const actionLine = lines.find(line => 
      line.includes('پیشنهاد') || 
      line.includes('اقدام') ||
      line.includes('کار')
    );
    
    return actionLine || 'پیگیری وضعیت نماینده';
  }

  private extractReason(aiResponse: string): string {
    const lines = aiResponse.split('\n');
    const reasonLine = lines.find(line => 
      line.includes('دلیل') || 
      line.includes('چرا') ||
      line.includes('علت')
    );
    
    return reasonLine || 'بر اساس تحلیل هوش مصنوعی';
  }

  private determinePriority(aiPriority: number, debt: number): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (aiPriority >= 4 || debt > 50000000) { // 50M+ Toman
      return 'HIGH';
    } else if (aiPriority >= 3 || debt > 10000000) { // 10M+ Toman  
      return 'MEDIUM';
    }
    return 'LOW';
  }
}

// Export singleton instance
export const followUpManager = new FollowUpManager();