/**
 * 🔮 PAFE - Predictive Analytics & Forecasting Engine Orchestrator
 */
import { EventEmitter } from 'events';
import { PredictiveDataIngestion } from './predictive-data-ingestion';
import { PredictiveFeatureStore } from './predictive-feature-store';
import { PredictiveModelsHub } from './predictive-models-hub';
import { PredictiveGovernance } from './predictive-governance';
import { PredictiveServingOrchestrator } from './predictive-serving-orchestrator';
import { PredictiveInsightSynthesis } from './predictive-insight-synthesis';
import { PredictiveIntegrationBridge } from './predictive-integration-bridge';
import { PredictiveSecurityWrapper } from './predictive-security-wrapper';

export class PredictiveAnalyticsEngine extends EventEmitter {
  ingestion = new PredictiveDataIngestion();
  featureStore = new PredictiveFeatureStore();
  modelsHub = new PredictiveModelsHub();
  governance = new PredictiveGovernance();
  serving = new PredictiveServingOrchestrator();
  insight = new PredictiveInsightSynthesis();
  integration = new PredictiveIntegrationBridge();
  security = new PredictiveSecurityWrapper();
  private initialized = false;

  constructor(){
    super();
    this.wireEvents();
  }

  private wireEvents(){
    this.modelsHub.on('PAFE_NEW_FORECAST_PUBLISHED', (f:any)=>{
      this.insight.processForecast(f);
      this.integration.publishForecast(f);
    });
  }

  async initialize(){
    if(this.initialized) return;
    this.featureStore.registerFeature({ name:'avg_revenue', version:'1.0.0', dataType:'number', source:'batch', transformation:'mean(window_7d)', lineage:['revenue_raw'] });
    this.initialized = true;
    this.emit('systemReady', { ts: Date.now(), components: ['ingestion','features','models','serving','insight'] });
  }

  async generateForecast(horizon:'P7D'|'P30D', kpis:string[], ctx?:{ scenarioContextId?:string }){
    const forecast = await this.serving.serveForecast(this.modelsHub.generateForecast.bind(this.modelsHub), horizon, kpis, ctx);
    return forecast;
  }

  async ingestSynthetic(records:any[]){
    const canon = await this.ingestion.ingestBatch(records);
    await this.featureStore.buildBatchFeatures(canon);
    return { ingested: canon.length };
  }

  getStatus(){
    return {
      initialized: this.initialized,
      ingestion: this.ingestion.getStatus(),
      serving: this.serving.getServingMetrics(),
      integration: this.integration.getMetrics(),
      governance: this.governance.getGovernanceStatus(),
      security: this.security.getSecurityStatus(),
      modelVersions: this.modelsHub.getModelVersions()
    };
  }
}

// @ts-ignore
if(!(globalThis as any).PredictiveEngine){
  // @ts-ignore
  (globalThis as any).PredictiveEngine = new PredictiveAnalyticsEngine();
}
