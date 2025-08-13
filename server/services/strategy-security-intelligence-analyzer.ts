/**
 * DA VINCI Iteration 33 - Security Intelligence Analyzer & Response Automation
 * 
 * کامپوننت‌های پیشرفته برای تحلیل هوشمندانه تهدیدات و پاسخ خودکار:
 * 1. Security Intelligence Analyzer (correlation + risk scoring)
 * 2. Response Automation Engine (automated responses + escalation)
 * 3. Security Business Bridge (security → business impact translation)
 */

import { EventEmitter } from 'events';
import type { SecurityEvent, SecurityThreat, SecurityIncident } from './strategy-security-intelligence-engine.js';

// ==================== SECURITY INTELLIGENCE ANALYZER ====================

interface ThreatCorrelation {
  id: string;
  timestamp: number;
  relatedThreats: string[];
  correlationScore: number; // 0-1
  pattern: string;
  riskMultiplier: number;
  description: string;
  attackPhase: 'reconnaissance' | 'initial_access' | 'execution' | 'persistence' | 'privilege_escalation' | 'defense_evasion' | 'credential_access' | 'discovery' | 'lateral_movement' | 'collection' | 'exfiltration' | 'impact';
  confidenceLevel: number;
}

interface RiskAssessment {
  overallRisk: number; // 0-100
  riskFactors: {
    factor: string;
    weight: number;
    score: number;
    reasoning: string;
  }[];
  trends: {
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number;
    timeframe: string;
  };
  predictions: {
    nextLikelyThreat: string;
    probability: number;
    timeframe: string;
  }[];
}

class SecurityIntelligenceAnalyzer extends EventEmitter {
  private threats: Map<string, SecurityThreat> = new Map();
  private correlations: Map<string, ThreatCorrelation> = new Map();
  private riskHistory: { timestamp: number; risk: number }[] = [];
  private patterns: Map<string, any> = new Map();
  private isActive: boolean = false;
  
  constructor() {
    super();
    this.initializePatterns();
  }
  
  start(): void {
    this.isActive = true;
    
    // شروع analysis cycles
    this.startCorrelationAnalysis();
    this.startRiskAssessment();
    this.startPatternLearning();
    
    console.log('[SecurityIntelligenceAnalyzer] Intelligence analysis started');
  }
  
  stop(): void {
    this.isActive = false;
    console.log('[SecurityIntelligenceAnalyzer] Intelligence analysis stopped');
  }
  
  processThreat(threat: SecurityThreat): void {
    if (!this.isActive) return;
    
    // ذخیره threat
    this.threats.set(threat.id, threat);
    
    // تحلیل correlation
    this.analyzeCorrelations(threat);
    
    // به‌روزرسانی risk assessment
    this.updateRiskAssessment();
    
    // یادگیری patterns
    this.learnFromThreat(threat);
    
    // ارسال نتایج
    this.emit('threatAnalyzed', {
      threat,
      correlations: this.getRelevantCorrelations(threat.id),
      riskAssessment: this.getCurrentRiskAssessment()
    });
  }
  
  private initializePatterns(): void {
    // Attack patterns شناخته شده
    this.patterns.set('multi_stage_attack', {
      phases: ['reconnaissance', 'initial_access', 'privilege_escalation', 'lateral_movement'],
      indicators: ['port_scan', 'brute_force', 'privilege_escalation', 'unusual_network'],
      timeWindow: 3600000, // 1 hour
      severity: 'critical'
    });
    
    this.patterns.set('data_exfiltration', {
      phases: ['collection', 'exfiltration'],
      indicators: ['sensitive_file_access', 'large_data_transfer', 'external_communication'],
      timeWindow: 1800000, // 30 minutes
      severity: 'high'
    });
    
    this.patterns.set('insider_threat', {
      phases: ['credential_access', 'collection', 'exfiltration'],
      indicators: ['after_hours_access', 'sensitive_data_access', 'unusual_behavior'],
      timeWindow: 86400000, // 24 hours
      severity: 'high'
    });
  }
  
  private startCorrelationAnalysis(): void {
    setInterval(() => {
      if (!this.isActive) return;
      
      this.performCorrelationAnalysis();
    }, 30000); // هر 30 ثانیه
  }
  
  private startRiskAssessment(): void {
    setInterval(() => {
      if (!this.isActive) return;
      
      this.performRiskAssessment();
    }, 60000); // هر دقیقه
  }
  
  private startPatternLearning(): void {
    setInterval(() => {
      if (!this.isActive) return;
      
      this.learnNewPatterns();
    }, 300000); // هر 5 دقیقه
  }
  
  private analyzeCorrelations(newThreat: SecurityThreat): void {
    const recentThreats = this.getRecentThreats(3600000); // last hour
    
    for (const existingThreat of recentThreats) {
      if (existingThreat.id === newThreat.id) continue;
      
      const correlation = this.calculateCorrelation(newThreat, existingThreat);
      
      if (correlation.correlationScore > 0.6) {
        this.correlations.set(correlation.id, correlation);
        
        // اگر correlation قوی باشد، incident جدید بسازیم
        if (correlation.correlationScore > 0.8) {
          this.emit('highCorrelationDetected', correlation);
        }
      }
    }
  }
  
  private calculateCorrelation(threat1: SecurityThreat, threat2: SecurityThreat): ThreatCorrelation {
    let score = 0;
    let factors: string[] = [];
    
    // Time proximity
    const timeDiff = Math.abs(threat1.timestamp - threat2.timestamp);
    if (timeDiff < 300000) { // 5 minutes
      score += 0.3;
      factors.push('temporal_proximity');
    }
    
    // Source similarity
    if (threat1.metadata?.sourceIp === threat2.metadata?.sourceIp) {
      score += 0.3;
      factors.push('same_source_ip');
    }
    
    // User similarity
    if (threat1.metadata?.userId === threat2.metadata?.userId) {
      score += 0.2;
      factors.push('same_user');
    }
    
    // Category correlation
    if (this.isCategoryCorrelated(threat1.category, threat2.category)) {
      score += 0.2;
      factors.push('category_correlation');
    }
    
    // Attack pattern matching
    const patternMatch = this.matchAttackPattern([threat1, threat2]);
    if (patternMatch) {
      score += 0.4;
      factors.push(`pattern_${patternMatch}`);
    }
    
    return {
      id: `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      relatedThreats: [threat1.id, threat2.id],
      correlationScore: Math.min(score, 1),
      pattern: factors.join(','),
      riskMultiplier: score > 0.8 ? 2.0 : score > 0.6 ? 1.5 : 1.0,
      description: `Correlation detected: ${factors.join(', ')}`,
      attackPhase: this.determineAttackPhase([threat1, threat2]),
      confidenceLevel: score
    };
  }
  
  private getRecentThreats(timeWindow: number): SecurityThreat[] {
    const cutoff = Date.now() - timeWindow;
    return Array.from(this.threats.values())
      .filter(threat => threat.timestamp > cutoff)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  
  private isCategoryCorrelated(cat1: string, cat2: string): boolean {
    const correlatedCategories = [
      ['authentication', 'system'],
      ['network', 'system'],
      ['application', 'data'],
      ['system', 'data']
    ];
    
    return correlatedCategories.some(pair => 
      (pair[0] === cat1 && pair[1] === cat2) ||
      (pair[0] === cat2 && pair[1] === cat1)
    );
  }
  
  private matchAttackPattern(threats: SecurityThreat[]): string | null {
    for (const [patternName, pattern] of this.patterns) {
      const indicators = threats.map(t => t.type);
      const matchCount = pattern.indicators.filter((indicator: string) => 
        indicators.some(i => i.includes(indicator))
      ).length;
      
      if (matchCount >= pattern.indicators.length * 0.6) {
        return patternName;
      }
    }
    
    return null;
  }
  
  private determineAttackPhase(threats: SecurityThreat[]): any {
    // شبیه‌سازی attack phase detection
    const phases = ['reconnaissance', 'initial_access', 'execution', 'persistence', 'privilege_escalation'];
    return phases[Math.floor(Math.random() * phases.length)];
  }
  
  private performCorrelationAnalysis(): void {
    const recentThreats = this.getRecentThreats(3600000);
    
    // Multi-threat correlation analysis
    if (recentThreats.length >= 3) {
      const complexCorrelation = this.analyzeComplexCorrelations(recentThreats);
      if (complexCorrelation.correlationScore > 0.7) {
        this.emit('complexAttackDetected', complexCorrelation);
      }
    }
  }
  
  private analyzeComplexCorrelations(threats: SecurityThreat[]): ThreatCorrelation {
    // پیدا کردن الگوهای پیچیده در چندین threat
    const timeSpan = Math.max(...threats.map(t => t.timestamp)) - Math.min(...threats.map(t => t.timestamp));
    const uniqueSources = new Set(threats.map(t => t.metadata?.sourceIp).filter(Boolean)).size;
    const severityScore = threats.reduce((sum, t) => sum + (
      t.severity === 'critical' ? 4 : t.severity === 'high' ? 3 : 
      t.severity === 'medium' ? 2 : 1
    ), 0) / threats.length;
    
    let correlationScore = 0;
    
    // Time clustering
    if (timeSpan < 1800000) correlationScore += 0.3; // 30 minutes
    
    // Source diversity (APT characteristic)
    if (uniqueSources > 1 && uniqueSources < threats.length) correlationScore += 0.2;
    
    // Severity escalation
    if (severityScore > 2.5) correlationScore += 0.3;
    
    // Pattern matching
    const patternMatch = this.matchAttackPattern(threats);
    if (patternMatch) correlationScore += 0.4;
    
    return {
      id: `complex_corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      relatedThreats: threats.map(t => t.id),
      correlationScore,
      pattern: patternMatch || 'complex_attack',
      riskMultiplier: correlationScore > 0.8 ? 3.0 : 2.0,
      description: `Complex attack pattern detected across ${threats.length} threats`,
      attackPhase: 'lateral_movement',
      confidenceLevel: correlationScore
    };
  }
  
  private performRiskAssessment(): void {
    const assessment = this.getCurrentRiskAssessment();
    
    // ذخیره risk history
    this.riskHistory.push({
      timestamp: Date.now(),
      risk: assessment.overallRisk
    });
    
    // حذف history قدیمی
    const cutoff = Date.now() - 86400000; // 24 hours
    this.riskHistory = this.riskHistory.filter(h => h.timestamp > cutoff);
    
    this.emit('riskAssessmentUpdated', assessment);
  }
  
  private learnNewPatterns(): void {
    const recentThreats = this.getRecentThreats(86400000); // 24 hours
    
    // Machine learning simulation برای pattern discovery
    if (recentThreats.length > 10) {
      const newPattern = this.discoverPattern(recentThreats);
      if (newPattern) {
        this.patterns.set(newPattern.name, newPattern);
        this.emit('newPatternLearned', newPattern);
      }
    }
  }
  
  private discoverPattern(threats: SecurityThreat[]): any | null {
    // شبیه‌سازی pattern discovery
    if (Math.random() > 0.9) {
      return {
        name: `discovered_pattern_${Date.now()}`,
        indicators: ['custom_indicator_1', 'custom_indicator_2'],
        timeWindow: 1800000,
        severity: 'medium',
        confidence: 0.7
      };
    }
    
    return null;
  }
  
  private learnFromThreat(threat: SecurityThreat): void {
    // یادگیری از threat جدید
    // شبیه‌سازی machine learning update
  }
  
  private updateRiskAssessment(): void {
    // به‌روزرسانی risk assessment با threat جدید
  }
  
  getCurrentRiskAssessment(): RiskAssessment {
    const recentThreats = this.getRecentThreats(3600000);
    const criticalThreats = recentThreats.filter(t => t.severity === 'critical').length;
    const highThreats = recentThreats.filter(t => t.severity === 'high').length;
    
    const riskFactors = [
      {
        factor: 'Critical Threats',
        weight: 0.4,
        score: Math.min(criticalThreats * 20, 100),
        reasoning: `${criticalThreats} critical threats detected in last hour`
      },
      {
        factor: 'High Severity Threats',
        weight: 0.3,
        score: Math.min(highThreats * 10, 100),
        reasoning: `${highThreats} high severity threats detected`
      },
      {
        factor: 'Threat Correlation',
        weight: 0.2,
        score: Math.min(this.correlations.size * 15, 100),
        reasoning: `${this.correlations.size} threat correlations identified`
      },
      {
        factor: 'Attack Patterns',
        weight: 0.1,
        score: this.patterns.size > 5 ? 30 : 10,
        reasoning: `${this.patterns.size} attack patterns in knowledge base`
      }
    ];
    
    const overallRisk = riskFactors.reduce((sum, factor) => 
      sum + (factor.score * factor.weight), 0
    );
    
    // Trend analysis
    const recentRisks = this.riskHistory.slice(-10);
    let trend = 'stable';
    let trendRate = 0;
    
    if (recentRisks.length > 3) {
      const recent = recentRisks.slice(-3).map(h => h.risk);
      const older = recentRisks.slice(-6, -3).map(h => h.risk);
      
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
      
      if (recentAvg > olderAvg * 1.1) {
        trend = 'increasing';
        trendRate = (recentAvg - olderAvg) / olderAvg;
      } else if (recentAvg < olderAvg * 0.9) {
        trend = 'decreasing';
        trendRate = (olderAvg - recentAvg) / olderAvg;
      }
    }
    
    return {
      overallRisk: Math.round(overallRisk),
      riskFactors,
      trends: {
        direction: trend as any,
        rate: trendRate,
        timeframe: '1 hour'
      },
      predictions: [
        {
          nextLikelyThreat: 'Application vulnerability exploitation',
          probability: 0.3,
          timeframe: '2 hours'
        },
        {
          nextLikelyThreat: 'Credential compromise attempt',
          probability: 0.25,
          timeframe: '4 hours'
        }
      ]
    };
  }
  
  getRelevantCorrelations(threatId: string): ThreatCorrelation[] {
    return Array.from(this.correlations.values())
      .filter(corr => corr.relatedThreats.includes(threatId))
      .sort((a, b) => b.correlationScore - a.correlationScore);
  }
  
  getAnalyzerStats(): Record<string, any> {
    return {
      active: this.isActive,
      totalThreats: this.threats.size,
      activeCorrelations: this.correlations.size,
      knownPatterns: this.patterns.size,
      riskHistoryPoints: this.riskHistory.length,
      currentRisk: this.getCurrentRiskAssessment().overallRisk
    };
  }
}

// ==================== RESPONSE AUTOMATION ENGINE ====================

interface SecurityResponse {
  id: string;
  timestamp: number;
  triggerThreatId: string;
  responseType: 'automated' | 'manual' | 'escalated';
  actions: SecurityAction[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  effectiveness: number; // 0-1
  businessImpact: {
    serviceContinuity: 'maintained' | 'degraded' | 'disrupted';
    userImpact: number; // number of affected users
    costOfResponse: number;
  };
}

interface SecurityAction {
  id: string;
  type: 'block_ip' | 'lock_account' | 'isolate_system' | 'alert_team' | 'gather_evidence' | 'backup_data';
  target: string;
  parameters: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  timestamp: number;
  duration?: number;
  rollbackPossible: boolean;
}

class ResponseAutomationEngine extends EventEmitter {
  private responses: Map<string, SecurityResponse> = new Map();
  private responseRules: Map<string, any> = new Map();
  private escalationPolicies: Map<string, any> = new Map();
  private isActive: boolean = false;
  
  constructor() {
    super();
    this.initializeResponseRules();
    this.initializeEscalationPolicies();
  }
  
  start(): void {
    this.isActive = true;
    console.log('[ResponseAutomationEngine] Response automation started');
  }
  
  stop(): void {
    this.isActive = false;
    console.log('[ResponseAutomationEngine] Response automation stopped');
  }
  
  processSecurityThreat(threat: SecurityThreat, correlation?: ThreatCorrelation): void {
    if (!this.isActive) return;
    
    // تعیین نوع response مناسب
    const responseType = this.determineResponseType(threat, correlation);
    
    // انتخاب actions مناسب
    const actions = this.selectActions(threat, responseType);
    
    // ایجاد response
    const response: SecurityResponse = {
      id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      triggerThreatId: threat.id,
      responseType,
      actions,
      status: 'pending',
      effectiveness: 0,
      businessImpact: {
        serviceContinuity: 'maintained',
        userImpact: 0,
        costOfResponse: 0
      }
    };
    
    this.responses.set(response.id, response);
    
    // اجرای response
    this.executeResponse(response);
  }
  
  private initializeResponseRules(): void {
    // Critical threat responses
    this.responseRules.set('critical_threat', {
      condition: (threat: SecurityThreat) => threat.severity === 'critical',
      actions: ['block_ip', 'alert_team', 'isolate_system', 'gather_evidence'],
      automated: true,
      escalate: true
    });
    
    // High threat responses
    this.responseRules.set('high_threat', {
      condition: (threat: SecurityThreat) => threat.severity === 'high',
      actions: ['block_ip', 'alert_team', 'gather_evidence'],
      automated: true,
      escalate: false
    });
    
    // Brute force responses
    this.responseRules.set('brute_force', {
      condition: (threat: SecurityThreat) => 
        threat.description.includes('brute force') || threat.description.includes('login_failure'),
      actions: ['lock_account', 'block_ip', 'alert_team'],
      automated: true,
      escalate: false
    });
    
    // Data exfiltration responses
    this.responseRules.set('data_exfiltration', {
      condition: (threat: SecurityThreat) => 
        threat.category.includes('data') && threat.severity !== 'low',
      actions: ['isolate_system', 'backup_data', 'alert_team', 'gather_evidence'],
      automated: false,
      escalate: true
    });
  }
  
  private initializeEscalationPolicies(): void {
    this.escalationPolicies.set('critical_incident', {
      triggers: ['critical', 'multiple_high_correlation'],
      contacts: ['security_team', 'ciso', 'cto'],
      sla: 900000, // 15 minutes
      methods: ['phone', 'sms', 'email']
    });
    
    this.escalationPolicies.set('high_risk', {
      triggers: ['high', 'pattern_match'],
      contacts: ['security_team', 'devops'],
      sla: 3600000, // 1 hour
      methods: ['email', 'slack']
    });
  }
  
  private determineResponseType(threat: SecurityThreat, correlation?: ThreatCorrelation): 'automated' | 'manual' | 'escalated' {
    // Critical threats همیشه escalate می‌شوند
    if (threat.severity === 'critical') {
      return 'escalated';
    }
    
    // Correlated threats که خطرناک هستند
    if (correlation && correlation.correlationScore > 0.8) {
      return 'escalated';
    }
    
    // Threats با automated recommendation
    if (threat.recommendations.automated) {
      return 'automated';
    }
    
    return 'manual';
  }
  
  private selectActions(threat: SecurityThreat, responseType: string): SecurityAction[] {
    const actions: SecurityAction[] = [];
    
    // انتخاب actions بر اساس rules
    for (const [ruleId, rule] of this.responseRules) {
      if (rule.condition(threat)) {
        for (const actionType of rule.actions) {
          actions.push(this.createAction(actionType, threat));
        }
        break; // اولین rule match را استفاده کن
      }
    }
    
    // اگر action پیدا نشد، default actions
    if (actions.length === 0) {
      actions.push(this.createAction('alert_team', threat));
      if (threat.severity !== 'low') {
        actions.push(this.createAction('gather_evidence', threat));
      }
    }
    
    return actions;
  }
  
  private createAction(type: string, threat: SecurityThreat): SecurityAction {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const baseAction = {
      id: actionId,
      type: type as any,
      target: '',
      parameters: {},
      status: 'pending' as const,
      timestamp: Date.now(),
      rollbackPossible: true
    };
    
    switch (type) {
      case 'block_ip':
        return {
          ...baseAction,
          target: threat.metadata?.sourceIp || 'unknown',
          parameters: {
            duration: 3600000, // 1 hour
            reason: `Blocked due to ${threat.description}`
          },
          rollbackPossible: true
        };
        
      case 'lock_account':
        return {
          ...baseAction,
          target: threat.metadata?.userId || 'unknown',
          parameters: {
            duration: 1800000, // 30 minutes
            reason: `Account locked due to ${threat.description}`
          },
          rollbackPossible: true
        };
        
      case 'isolate_system':
        return {
          ...baseAction,
          target: threat.affectedAssets[0] || 'unknown',
          parameters: {
            isolationType: 'network',
            duration: 7200000 // 2 hours
          },
          rollbackPossible: true
        };
        
      case 'alert_team':
        return {
          ...baseAction,
          target: 'security_team',
          parameters: {
            urgency: threat.severity,
            channel: ['email', 'slack'],
            message: `Security threat detected: ${threat.description}`
          },
          rollbackPossible: false
        };
        
      case 'gather_evidence':
        return {
          ...baseAction,
          target: 'evidence_collector',
          parameters: {
            scope: threat.affectedAssets,
            retention: 2592000000, // 30 days
            types: ['logs', 'network_traffic', 'system_state']
          },
          rollbackPossible: false
        };
        
      case 'backup_data':
        return {
          ...baseAction,
          target: threat.affectedAssets[0] || 'unknown',
          parameters: {
            priority: 'high',
            encryption: true,
            retention: 2592000000 // 30 days
          },
          rollbackPossible: false
        };
        
      default:
        return baseAction;
    }
  }
  
  private async executeResponse(response: SecurityResponse): Promise<void> {
    response.status = 'executing';
    this.emit('responseStarted', response);
    
    try {
      // اجرای actions به صورت موازی یا سری
      for (const action of response.actions) {
        await this.executeAction(action);
      }
      
      response.status = 'completed';
      response.effectiveness = this.calculateEffectiveness(response);
      
      this.emit('responseCompleted', response);
      
    } catch (error) {
      response.status = 'failed';
      this.emit('responseFailed', { response, error });
    }
  }
  
  private async executeAction(action: SecurityAction): Promise<void> {
    action.status = 'executing';
    
    // شبیه‌سازی اجرای action
    const executionTime = Math.random() * 5000 + 1000; // 1-6 seconds
    
    await new Promise(resolve => setTimeout(resolve, executionTime));
    
    // شبیه‌سازی success rate
    if (Math.random() > 0.1) { // 90% success rate
      action.status = 'completed';
      action.duration = executionTime;
    } else {
      action.status = 'failed';
      throw new Error(`Action ${action.type} failed`);
    }
    
    console.log(`[ResponseEngine] Action ${action.type} completed for target ${action.target}`);
  }
  
  private calculateEffectiveness(response: SecurityResponse): number {
    const completedActions = response.actions.filter(a => a.status === 'completed').length;
    const totalActions = response.actions.length;
    
    return totalActions > 0 ? completedActions / totalActions : 0;
  }
  
  getResponseStats(): Record<string, any> {
    const responses = Array.from(this.responses.values());
    
    return {
      active: this.isActive,
      totalResponses: responses.length,
      completedResponses: responses.filter(r => r.status === 'completed').length,
      failedResponses: responses.filter(r => r.status === 'failed').length,
      averageEffectiveness: responses.length > 0 ? 
        responses.reduce((sum, r) => sum + r.effectiveness, 0) / responses.length : 0,
      responseRules: this.responseRules.size,
      escalationPolicies: this.escalationPolicies.size
    };
  }
}

export { SecurityIntelligenceAnalyzer, ResponseAutomationEngine };
export type { ThreatCorrelation, RiskAssessment, SecurityResponse, SecurityAction };
