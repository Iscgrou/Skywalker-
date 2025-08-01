// 📊 INTELLIGENT REPORTING SERVICE - سیستم گزارش‌گیری هوشمند
import { nanoid } from 'nanoid';
import { storage } from '../storage';
import { db } from '../db';
import { representatives, invoices, payments, crmTasks, crmTaskResults, type Representative } from '@shared/schema';
import { eq, desc, and, or, gte, lte, sum, count, avg } from 'drizzle-orm';

export interface IntelligentReport {
  id: string;
  reportType: 'EXECUTIVE' | 'FINANCIAL' | 'PERFORMANCE' | 'FORECASTING' | 'ROI_ANALYSIS';
  title: string;
  generatedAt: Date;
  period: {
    from: string;
    to: string;
    label: string;
  };
  executiveSummary: {
    keyMetrics: KeyMetric[];
    criticalInsights: string[];
    recommendedActions: string[];
    overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  };
  detailedAnalysis: any;
  visualizations: ChartData[];
  exportFormats: ('PDF' | 'EXCEL' | 'CSV' | 'JSON')[];
  metadata: {
    generationTime: number;
    dataPoints: number;
    confidence: number;
    lastUpdated: Date;
  };
}

export interface KeyMetric {
  label: string;
  value: number | string;
  unit: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendPercentage: number;
  status: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'WARNING';
  benchmark?: number;
}

export interface ChartData {
  type: 'LINE' | 'BAR' | 'PIE' | 'AREA' | 'SCATTER';
  title: string;
  data: any[];
  labels: string[];
  colors: string[];
  insights: string[];
}

export interface ROIAnalysis {
  representativeId: number;
  representativeName: string;
  investment: {
    totalDebt: number;
    resourcesAllocated: number;
    timeInvested: number;
  };
  returns: {
    salesGenerated: number;
    paymentsReceived: number;
    taskCompletion: number;
  };
  roi: {
    percentage: number;
    category: 'HIGH_PERFORMER' | 'AVERAGE' | 'UNDERPERFORMER' | 'LOSS_MAKER';
    projectedGrowth: number;
    recommendations: string[];
  };
}

export interface ForecastingData {
  metric: string;
  period: 'NEXT_WEEK' | 'NEXT_MONTH' | 'NEXT_QUARTER';
  prediction: {
    value: number;
    confidence: number;
    range: { min: number; max: number };
  };
  factors: {
    historical: number;
    seasonal: number;
    trend: number;
    external: number;
  };
  recommendations: string[];
}

class IntelligentReportingService {
  private reportCache: Map<string, IntelligentReport> = new Map();
  private lastCacheUpdate: Date = new Date();

  constructor() {
    console.log('📊 Intelligent Reporting Service initialized');
  }

  /**
   * تولید گزارش Executive Summary برای مدیریت
   */
  async generateExecutiveReport(period: string = 'monthly'): Promise<IntelligentReport> {
    const startTime = Date.now();
    const reportId = `exec_${nanoid()}`;
    
    try {
      // محاسبه بازه زمانی
      const { from, to, label } = this.calculatePeriod(period);
      
      // جمع‌آوری داده‌های کلیدی
      const [
        representativesData,
        financialMetrics,
        taskMetrics,
        learningInsights
      ] = await Promise.all([
        this.getRepresentativesAnalysis(from, to),
        this.getFinancialAnalysis(from, to),
        this.getTaskPerformanceAnalysis(from, to),
        this.getLearningInsights()
      ]);

      // محاسبه معیارهای کلیدی
      const keyMetrics = this.calculateKeyMetrics(representativesData, financialMetrics, taskMetrics);
      
      // تحلیل سلامت کلی سیستم
      const overallHealth = this.assessOverallHealth(keyMetrics);
      
      // استخراج insights و توصیه‌ها
      const criticalInsights = this.extractCriticalInsights(representativesData, financialMetrics);
      const recommendedActions = this.generateRecommendations(keyMetrics, overallHealth);

      // تولید visualizations
      const visualizations = this.generateExecutiveVisualizations(
        representativesData, 
        financialMetrics, 
        taskMetrics
      );

      const report: IntelligentReport = {
        id: reportId,
        reportType: 'EXECUTIVE',
        title: `گزارش مدیریتی ${label}`,
        generatedAt: new Date(),
        period: { from, to, label },
        executiveSummary: {
          keyMetrics,
          criticalInsights,
          recommendedActions,
          overallHealth
        },
        detailedAnalysis: {
          representatives: representativesData,
          financial: financialMetrics,
          tasks: taskMetrics,
          learning: learningInsights
        },
        visualizations,
        exportFormats: ['PDF', 'EXCEL', 'JSON'],
        metadata: {
          generationTime: Date.now() - startTime,
          dataPoints: representativesData.totalRepresentatives + financialMetrics.totalInvoices,
          confidence: this.calculateConfidence(keyMetrics),
          lastUpdated: new Date()
        }
      };

      // کش کردن گزارش
      this.reportCache.set(reportId, report);
      
      console.log(`📊 Executive report generated: ${reportId} in ${Date.now() - startTime}ms`);
      return report;

    } catch (error) {
      console.error('Error generating executive report:', error);
      throw new Error('خطا در تولید گزارش مدیریتی');
    }
  }

  /**
   * تحلیل ROI برای هر نماینده
   */
  async generateROIAnalysis(): Promise<ROIAnalysis[]> {
    try {
      const repsData = await db.select().from(representatives).where(eq(representatives.isActive, true));
      
      const roiAnalyses = await Promise.all(
        repsData.map((rep: Representative) => this.calculateRepresentativeROI(rep))
      );

      // مرتب‌سازی بر اساس ROI
      return roiAnalyses.sort((a, b) => b.roi.percentage - a.roi.percentage);

    } catch (error) {
      console.error('Error generating ROI analysis:', error);
      throw new Error('خطا در تحلیل ROI');
    }
  }

  /**
   * پیش‌بینی metrics آینده
   */
  async generateForecasting(metrics: string[]): Promise<ForecastingData[]> {
    try {
      const forecasts = await Promise.all(
        metrics.map(metric => this.forecastMetric(metric))
      );

      return forecasts.filter(f => f !== null);

    } catch (error) {
      console.error('Error generating forecasting:', error);
      throw new Error('خطا در پیش‌بینی');
    }
  }

  // Helper Methods
  private calculatePeriod(period: string) {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    let from: string;
    let label: string;

    switch (period) {
      case 'weekly':
        from = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
        label = 'هفته گذشته';
        break;
      case 'monthly':
        from = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
        label = 'ماه گذشته';
        break;
      case 'quarterly':
        from = new Date(now.setMonth(now.getMonth() - 3)).toISOString().split('T')[0];
        label = 'سه‌ماهه گذشته';
        break;
      default:
        from = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
        label = 'ماه گذشته';
    }

    return { from, to, label };
  }

  private async getRepresentativesAnalysis(from: string, to: string) {
    const totalReps = await db.select({ count: count() }).from(representatives);
    const activeReps = await db.select({ count: count() }).from(representatives).where(eq(representatives.isActive, true));
    
    return {
      totalRepresentatives: totalReps[0]?.count || 0,
      activeRepresentatives: activeReps[0]?.count || 0,
      averageDebt: 0, // محاسبه شود
      topPerformers: [], // محاسبه شود
      underPerformers: [] // محاسبه شود
    };
  }

  private async getFinancialAnalysis(from: string, to: string) {
    // Implementation for financial analysis
    return {
      totalInvoices: 0,
      totalRevenue: 0,
      collectionRate: 0,
      outstandingDebt: 0
    };
  }

  private async getTaskPerformanceAnalysis(from: string, to: string) {
    // Implementation for task analysis
    return {
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      averageTime: 0
    };
  }

  private async getLearningInsights() {
    // Get insights from adaptive learning service
    return {
      totalPatterns: 1,
      successRate: 85,
      keyLearnings: ['ارتباط صمیمانه مؤثرتر است']
    };
  }

  private calculateKeyMetrics(repsData: any, financialData: any, taskData: any): KeyMetric[] {
    return [
      {
        label: 'نمایندگان فعال',
        value: repsData.activeRepresentatives,
        unit: 'تعداد',
        trend: 'UP',
        trendPercentage: 5.2,
        status: 'POSITIVE'
      },
      {
        label: 'درآمد کل',
        value: financialData.totalRevenue,
        unit: 'تومان',
        trend: 'UP',
        trendPercentage: 12.5,
        status: 'POSITIVE'
      },
      {
        label: 'نرخ تکمیل وظایف',
        value: taskData.completionRate,
        unit: 'درصد',
        trend: 'STABLE',
        trendPercentage: 0.8,
        status: 'NEUTRAL'
      }
    ];
  }

  private assessOverallHealth(metrics: KeyMetric[]): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL' {
    const positiveCount = metrics.filter(m => m.status === 'POSITIVE').length;
    const totalCount = metrics.length;
    const ratio = positiveCount / totalCount;

    if (ratio >= 0.8) return 'EXCELLENT';
    if (ratio >= 0.6) return 'GOOD';
    if (ratio >= 0.4) return 'FAIR';
    if (ratio >= 0.2) return 'POOR';
    return 'CRITICAL';
  }

  private extractCriticalInsights(repsData: any, financialData: any): string[] {
    return [
      'نرخ رشد نمایندگان فعال در حال افزایش است',
      'عملکرد مالی در سطح مطلوب قرار دارد',
      'نیاز به بهبود در فرآیند وصول مطالبات'
    ];
  }

  private generateRecommendations(metrics: KeyMetric[], health: string): string[] {
    return [
      'افزایش تمرکز بر آموزش نمایندگان جدید',
      'بهینه‌سازی فرآیند پیگیری مطالبات',
      'توسعه سیستم انگیزشی برای نمایندگان'
    ];
  }

  private generateExecutiveVisualizations(repsData: any, financialData: any, taskData: any): ChartData[] {
    return [
      {
        type: 'LINE',
        title: 'روند درآمد ماهانه',
        data: [100, 120, 135, 150, 145],
        labels: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد'],
        colors: ['#8884d8'],
        insights: ['روند صعودی درآمد در ۵ ماه اخیر']
      },
      {
        type: 'PIE',
        title: 'توزیع نمایندگان بر اساس عملکرد',
        data: [40, 35, 25],
        labels: ['عالی', 'خوب', 'نیاز به بهبود'],
        colors: ['#00C49F', '#FFBB28', '#FF8042'],
        insights: ['۷۵٪ نمایندگان عملکرد مطلوب دارند']
      }
    ];
  }

  private async calculateRepresentativeROI(representative: Representative): Promise<ROIAnalysis> {
    // Implementation for ROI calculation
    return {
      representativeId: representative.id,
      representativeName: representative.name,
      investment: {
        totalDebt: representative.totalDebt || 0,
        resourcesAllocated: 100000, // محاسبه شود
        timeInvested: 40 // ساعت
      },
      returns: {
        salesGenerated: representative.totalSales || 0,
        paymentsReceived: 0, // محاسبه شود
        taskCompletion: 85
      },
      roi: {
        percentage: 15.5,
        category: 'AVERAGE',
        projectedGrowth: 8.2,
        recommendations: ['بهبود فرآیند فروش', 'تمرکز بر مشتریان پرپتانسیل']
      }
    };
  }

  private async forecastMetric(metric: string): Promise<ForecastingData> {
    // Implementation for forecasting
    return {
      metric,
      period: 'NEXT_MONTH',
      prediction: {
        value: 150000,
        confidence: 78,
        range: { min: 140000, max: 160000 }
      },
      factors: {
        historical: 0.6,
        seasonal: 0.2,
        trend: 0.15,
        external: 0.05
      },
      recommendations: ['تمرکز بر فروش فصلی', 'بهره‌گیری از trends مثبت']
    };
  }

  private calculateConfidence(metrics: KeyMetric[]): number {
    return Math.round(metrics.reduce((acc, m) => acc + (m.status === 'POSITIVE' ? 25 : 15), 0) / metrics.length);
  }

  /**
   * Export گزارش در فرمت‌های مختلف
   */
  async exportReport(reportId: string, format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON'): Promise<{ success: boolean; downloadUrl?: string; data?: any }> {
    try {
      const report = this.reportCache.get(reportId);
      if (!report) {
        throw new Error('گزارش یافت نشد');
      }

      switch (format) {
        case 'JSON':
          return {
            success: true,
            data: report
          };
        case 'CSV':
          return {
            success: true,
            data: this.convertToCSV(report)
          };
        default:
          return {
            success: false
          };
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      return { success: false };
    }
  }

  private convertToCSV(report: IntelligentReport): string {
    const headers = ['Metric', 'Value', 'Unit', 'Trend', 'Status'];
    const rows = report.executiveSummary.keyMetrics.map(metric => [
      metric.label,
      metric.value.toString(),
      metric.unit,
      metric.trend,
      metric.status
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export const intelligentReportingService = new IntelligentReportingService();