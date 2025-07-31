// 🔄 CRM-ADMIN DATA SYNCHRONIZATION BRIDGE
import { storage } from '../storage';
import { crmAuthService } from './crm-auth-service';
import type { Representative, Invoice, Payment } from '@shared/schema';

export interface SyncedRepresentativeData {
  representativeId: number;
  basicProfile: {
    id: number;
    code: string;
    name: string;
    ownerName: string | null;
    phone: string | null;
    isActive: boolean;
  };
  financialSummary: {
    debtAmount: number;
    creditLevel: 'بالا' | 'متوسط' | 'پایین';
    paymentStatus: 'منظم' | 'نامنظم' | 'معوقه';
    lastPaymentDate: string | null;
  };
  restrictedData: boolean; // Indicates CRM-filtered data
}

export interface AdminTeamReport {
  totalRepresentatives: number;
  activeRepresentatives: number;
  inactiveRepresentatives: number;
  newRepresentatives: number;
  totalDebt: number;
  totalSales: number; // Only visible in admin
  averagePerformanceScore: number;
  crmSystemEffectiveness: {
    tasksGenerated: number;
    tasksCompleted: number;
    successRate: number;
    aiConfidenceAverage: number;
  };
  performanceRankings: RepresentativeRanking[];
  improvementRecommendations: string[];
}

export interface RepresentativeRanking {
  representativeId: number;
  name: string;
  performanceScore: number;
  trend: 'بهبود' | 'ثابت' | 'افت';
  rank: number;
  keyStrengths: string[];
  improvementAreas: string[];
}

export class CrmDataSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: Date = new Date();

  // Initialize real-time sync
  startRealTimeSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync every 5 minutes
    this.syncInterval = setInterval(async () => {
      try {
        await this.performFullSync();
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, 5 * 60 * 1000);

    console.log('CRM Real-time sync started');
  }

  stopRealTimeSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sync representative data for CRM panel (filtered)
  async syncRepresentativesForCrm(): Promise<SyncedRepresentativeData[]> {
    try {
      const representatives = await storage.getRepresentatives();
      const syncedData: SyncedRepresentativeData[] = [];

      for (const rep of representatives) {
        const financialSummary = await this.calculateFinancialSummary(rep);
        
        syncedData.push({
          representativeId: rep.id,
          basicProfile: {
            id: rep.id,
            code: rep.code,
            name: rep.name,
            ownerName: rep.ownerName,
            phone: rep.phone,
            isActive: rep.isActive || false
          },
          financialSummary,
          restrictedData: true // Always true for CRM panel
        });
      }

      this.lastSyncTime = new Date();
      await this.logSyncEvent('CRM_REPRESENTATIVE_SYNC', syncedData.length);
      
      return syncedData;
    } catch (error) {
      console.error('CRM representative sync failed:', error);
      throw error;
    }
  }

  // Generate team performance report for admin panel
  async generateTeamPerformanceReport(): Promise<AdminTeamReport> {
    try {
      const representatives = await storage.getRepresentatives();
      const performanceRankings = await this.calculatePerformanceRankings(representatives);
      const crmEffectiveness = await this.calculateCrmEffectiveness();

      const report: AdminTeamReport = {
        totalRepresentatives: representatives.length,
        activeRepresentatives: representatives.filter(r => r.isActive).length,
        inactiveRepresentatives: representatives.filter(r => !r.isActive).length,
        newRepresentatives: await this.countNewRepresentatives(),
        totalDebt: this.calculateTotalDebt(representatives),
        totalSales: this.calculateTotalSales(representatives),
        averagePerformanceScore: this.calculateAveragePerformance(performanceRankings),
        crmSystemEffectiveness: crmEffectiveness,
        performanceRankings,
        improvementRecommendations: await this.generateImprovementRecommendations(performanceRankings)
      };

      await this.logSyncEvent('ADMIN_TEAM_REPORT_GENERATED', representatives.length);
      return report;
    } catch (error) {
      console.error('Team performance report generation failed:', error);
      throw error;
    }
  }

  // Calculate financial summary with appropriate filtering
  private async calculateFinancialSummary(rep: Representative): Promise<SyncedRepresentativeData['financialSummary']> {
    const invoices = await storage.getInvoicesByRepresentative(rep.id);
    const payments = await storage.getPaymentsByRepresentative(rep.id);

    // Calculate debt (safe for CRM to see)
    const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount.toString()), 0);
    const totalPaid = payments.reduce((sum, pay) => sum + parseFloat(pay.amount.toString()), 0);
    const debtAmount = totalInvoiced - totalPaid;

    // Calculate credit level (abstracted for CRM)
    const creditLevel = this.calculateCreditLevel(rep.credit?.toString() || '0');

    // Calculate payment status
    const paymentStatus = this.calculatePaymentStatus(payments, invoices);

    // Get last payment date
    const lastPayment = payments.sort((a, b) => 
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    )[0];

    return {
      debtAmount,
      creditLevel,
      paymentStatus,
      lastPaymentDate: lastPayment?.paymentDate || null
    };
  }

  private calculateCreditLevel(creditAmount: string): 'بالا' | 'متوسط' | 'پایین' {
    const credit = parseFloat(creditAmount);
    if (credit > 1000000) return 'بالا';
    if (credit > 500000) return 'متوسط';
    return 'پایین';
  }

  private calculatePaymentStatus(payments: Payment[], invoices: Invoice[]): 'منظم' | 'نامنظم' | 'معوقه' {
    if (payments.length === 0) return 'معوقه';
    
    const recentPayments = payments.filter(p => {
      const paymentDate = new Date(p.paymentDate);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return paymentDate > thirtyDaysAgo;
    });

    const overDueInvoices = invoices.filter(inv => inv.status === 'overdue');
    
    if (overDueInvoices.length > 0) return 'معوقه';
    if (recentPayments.length > 0) return 'منظم';
    return 'نامنظم';
  }

  private async calculatePerformanceRankings(representatives: Representative[]): Promise<RepresentativeRanking[]> {
    const rankings: RepresentativeRanking[] = [];

    for (const rep of representatives) {
      const performanceScore = await this.calculateRepresentativePerformance(rep);
      const trend = await this.calculatePerformanceTrend(rep.id);
      const strengths = await this.identifyStrengths(rep.id);
      const improvementAreas = await this.identifyImprovementAreas(rep.id);

      rankings.push({
        representativeId: rep.id,
        name: rep.name,
        performanceScore,
        trend,
        rank: 0, // Will be set after sorting
        keyStrengths: strengths,
        improvementAreas: improvementAreas
      });
    }

    // Sort by performance score and assign ranks
    rankings.sort((a, b) => b.performanceScore - a.performanceScore);
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    return rankings;
  }

  private async calculateRepresentativePerformance(rep: Representative): Promise<number> {
    // Combine financial metrics with CRM performance
    let score = 50; // Base score

    // Financial performance (40% of score)
    const debtRatio = parseFloat(rep.totalDebt?.toString() || '0') / parseFloat(rep.totalSales?.toString() || '1');
    if (debtRatio < 0.1) score += 20;
    else if (debtRatio < 0.3) score += 10;
    else if (debtRatio > 0.5) score -= 10;

    // Activity level (30% of score)
    if (rep.isActive) score += 15;
    
    // Credit standing (30% of score)
    const credit = parseFloat(rep.credit?.toString() || '0');
    if (credit > 1000000) score += 15;
    else if (credit > 500000) score += 10;
    else if (credit < 100000) score -= 5;

    // CRM task performance (bonus points)
    const crmPerformance = await this.getCrmTaskPerformance(rep.id);
    score += crmPerformance;

    return Math.max(0, Math.min(100, score));
  }

  private async calculatePerformanceTrend(repId: number): Promise<'بهبود' | 'ثابت' | 'افت'> {
    // Analyze performance over last 3 months
    // This would compare current performance to historical data
    return 'ثابت'; // Simplified for now
  }

  private async identifyStrengths(repId: number): Promise<string[]> {
    const strengths: string[] = [];
    
    // Analyze CRM task results and financial data to identify strengths
    const taskResults = await this.getCrmTaskResults(repId);
    
    if (taskResults.averageQuality > 80) {
      strengths.push('کیفیت کار بالا');
    }
    
    if (taskResults.responseTime < 24) {
      strengths.push('پاسخگویی سریع');
    }
    
    if (taskResults.completionRate > 90) {
      strengths.push('انجام کامل وظایف');
    }

    return strengths.length > 0 ? strengths : ['نماینده معمولی'];
  }

  private async identifyImprovementAreas(repId: number): Promise<string[]> {
    const areas: string[] = [];
    
    const taskResults = await this.getCrmTaskResults(repId);
    
    if (taskResults.averageQuality < 60) {
      areas.push('بهبود کیفیت کار');
    }
    
    if (taskResults.responseTime > 48) {
      areas.push('تسریع در پاسخگویی');
    }
    
    if (taskResults.completionRate < 70) {
      areas.push('تکمیل وظایف محوله');
    }

    return areas;
  }

  private async calculateCrmEffectiveness(): Promise<AdminTeamReport['crmSystemEffectiveness']> {
    // Query CRM performance data
    const tasksGenerated = await this.countGeneratedTasks();
    const tasksCompleted = await this.countCompletedTasks();
    const successRate = tasksCompleted > 0 ? (tasksCompleted / tasksGenerated) * 100 : 0;
    const aiConfidenceAverage = await this.calculateAverageAIConfidence();

    return {
      tasksGenerated,
      tasksCompleted,
      successRate,
      aiConfidenceAverage
    };
  }

  private async countNewRepresentatives(): Promise<number> {
    // Count representatives created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const representatives = await storage.getRepresentatives();
    return representatives.filter(rep => 
      new Date(rep.createdAt || '') > thirtyDaysAgo
    ).length;
  }

  private calculateTotalDebt(representatives: Representative[]): number {
    return representatives.reduce((total, rep) => 
      total + parseFloat(rep.totalDebt?.toString() || '0'), 0
    );
  }

  private calculateTotalSales(representatives: Representative[]): number {
    return representatives.reduce((total, rep) => 
      total + parseFloat(rep.totalSales?.toString() || '0'), 0
    );
  }

  private calculateAveragePerformance(rankings: RepresentativeRanking[]): number {
    if (rankings.length === 0) return 0;
    
    const total = rankings.reduce((sum, ranking) => sum + ranking.performanceScore, 0);
    return total / rankings.length;
  }

  private async generateImprovementRecommendations(rankings: RepresentativeRanking[]): Promise<string[]> {
    const recommendations: string[] = [];
    
    const lowPerformers = rankings.filter(r => r.performanceScore < 60).length;
    const highPerformers = rankings.filter(r => r.performanceScore > 80).length;
    
    if (lowPerformers > rankings.length * 0.3) {
      recommendations.push('تمرکز بر بهبود عملکرد نمایندگان ضعیف');
    }
    
    if (highPerformers > 0) {
      recommendations.push('استفاده از تجربیات نمایندگان موفق برای آموزش سایرین');
    }
    
    const commonWeaknesses = this.findCommonWeaknesses(rankings);
    if (commonWeaknesses.length > 0) {
      recommendations.push(`آموزش عمومی در زمینه: ${commonWeaknesses.join('، ')}`);
    }

    return recommendations;
  }

  private findCommonWeaknesses(rankings: RepresentativeRanking[]): string[] {
    const weaknessCount: Record<string, number> = {};
    
    rankings.forEach(ranking => {
      ranking.improvementAreas.forEach(area => {
        weaknessCount[area] = (weaknessCount[area] || 0) + 1;
      });
    });
    
    return Object.entries(weaknessCount)
      .filter(([_, count]) => count > rankings.length * 0.2)
      .map(([weakness, _]) => weakness);
  }

  // Helper methods for CRM data
  private async getCrmTaskPerformance(repId: number): Promise<number> {
    // Query CRM task performance for this representative
    // Returns bonus points (0-20) based on CRM task success
    return 10; // Simplified for now
  }

  private async getCrmTaskResults(repId: number): Promise<{
    averageQuality: number;
    responseTime: number;
    completionRate: number;
  }> {
    // Query CRM task results for this representative
    return {
      averageQuality: 75,
      responseTime: 36,
      completionRate: 85
    };
  }

  private async countGeneratedTasks(): Promise<number> {
    // Query total CRM tasks generated
    return 150; // Would be actual database query
  }

  private async countCompletedTasks(): Promise<number> {
    // Query completed CRM tasks
    return 120; // Would be actual database query
  }

  private async calculateAverageAIConfidence(): Promise<number> {
    // Query average AI confidence from decision logs
    return 78; // Would be actual calculation
  }

  // Full system sync
  async performFullSync(): Promise<{
    representativesSynced: number;
    crmDataUpdated: boolean;
    adminReportGenerated: boolean;
    syncTime: Date;
  }> {
    try {
      const crmData = await this.syncRepresentativesForCrm();
      const adminReport = await this.generateTeamPerformanceReport();
      
      await this.updateCrmCache(crmData);
      await this.updateAdminCache(adminReport);
      
      this.lastSyncTime = new Date();
      
      return {
        representativesSynced: crmData.length,
        crmDataUpdated: true,
        adminReportGenerated: true,
        syncTime: this.lastSyncTime
      };
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    }
  }

  private async updateCrmCache(data: SyncedRepresentativeData[]): Promise<void> {
    // Update CRM data cache
    console.log(`CRM cache updated with ${data.length} representatives`);
  }

  private async updateAdminCache(report: AdminTeamReport): Promise<void> {
    // Update admin report cache
    console.log('Admin report cache updated');
  }

  private async logSyncEvent(eventType: string, count: number): Promise<void> {
    try {
      await storage.createActivityLog({
        type: `CRM_SYNC_${eventType}`,
        description: `Data synchronization completed: ${count} records processed`,
        metadata: {
          syncTime: this.lastSyncTime.toISOString(),
          recordCount: count,
          eventType
        }
      });
    } catch (error) {
      console.error('Failed to log sync event:', error);
    }
  }

  // Sync status and health
  getLastSyncTime(): Date {
    return this.lastSyncTime;
  }

  getSyncStatus(): {
    isRunning: boolean;
    lastSync: Date;
    nextSync: Date | null;
  } {
    return {
      isRunning: this.syncInterval !== null,
      lastSync: this.lastSyncTime,
      nextSync: this.syncInterval ? new Date(this.lastSyncTime.getTime() + 5 * 60 * 1000) : null
    };
  }
}

export const crmDataSyncService = new CrmDataSyncService();