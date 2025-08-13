import { Router } from 'express';
import { intelAggregator } from '../services/intel-aggregator';
	import { intelAdaptiveThresholds } from '../services/intel-adaptive-thresholds';
	import { intelCorrelationGraph } from '../services/intel-correlation-graph';
	import { intelPredictiveEngine } from '../services/intel-predictive-engine';
	import { intelPrescriptiveEngine } from '../services/intel-prescriptive-engine';
	import { intelScenarioEngine } from '../services/intel-scenario-engine';
	import { clusterCoordinator } from '../services/cluster-coordinator';
import { intelWindowStore } from '../services/intel-window-store';
import { intelBus } from '../services/intel-bus';
import { createIntelEvent } from '../services/intel-types';
import { requireRoles } from '../middleware/rbac';
import { auditLogger } from '../services/audit-logger';
import { db } from '../db';
import { intelRollups } from '../../shared/schema';
import { and, eq, gte, lte } from 'drizzle-orm';

export function registerIntelRoutes(router: Router){
	router.get('/intel/state', requireRoles(['ADMIN','SUPER_ADMIN','ANALYST']), (req, res)=>{
		return res.json({ ok:true, state: intelAggregator.getState() });
	});
  
		 router.get('/intel/adaptive/status', (_req,res)=>{
			 res.json({
				 adaptive: intelAdaptiveThresholds.getState(),
				 aggregatorWeights: intelAggregator.getWeights()
			 });
		 });
  
		 router.post('/intel/adaptive/weights', (req:any, res)=>{
			 // TODO: RBAC check (ADMIN)
			 const body = req.body||{};
			 intelAggregator.setWeights(body);
			 res.json({ ok:true, weights: intelAggregator.getWeights() });
		 });

		  router.get('/intel/correlations', (_req,res)=>{
		    const g = intelCorrelationGraph.getGraph();
		    res.json({ updatedAt: g.lastComputed, edges: g.edges });
		  });

		  router.get('/intel/correlations/graph', (_req,res)=>{
		    res.json(intelCorrelationGraph.getGraph());
		  });

		  router.get('/intel/predictive/forecast', (_req,res)=>{
		    res.json(intelPredictiveEngine.getState());
		  });

		  router.get('/intel/prescriptive/recommendations', (_req,res)=>{
		    res.json(intelPrescriptiveEngine.getState());
		  });

		  router.post('/intel/prescriptive/apply', (req:any,res)=>{
		    const { id } = req.body||{};
		    const result = intelPrescriptiveEngine.apply(id);
		    res.json(result);
		  });

		  router.get('/intel/scenarios', (_req,res)=>{
		    res.json(intelScenarioEngine.getState());
		  });

		  router.get('/intel/cluster/status', async (_req,res)=>{
		    const status = await clusterCoordinator.getStatus();
		    res.json(status);
		  });
	router.get('/intel/snapshots', requireRoles(['ADMIN','SUPER_ADMIN','ANALYST']), (req,res)=>{
		const winParam = req.query.windows as string | undefined;
		const windows = (winParam? winParam.split(',').map(v=> parseInt(v,10)).filter(v=> !isNaN(v)) : [60_000, 300_000, 3_600_000]);
		const snaps = windows.map(w=> intelWindowStore.getSnapshot(w)).filter(Boolean);
		return res.json({ ok:true, snapshots: snaps });
	});
	router.get('/intel/bus-metrics', requireRoles(['ADMIN','SUPER_ADMIN']), (req,res)=>{
		return res.json({ ok:true, metrics: intelBus.getMetrics() });
	});
	router.get('/intel/metrics', requireRoles(['ADMIN','SUPER_ADMIN','ANALYST']), (req,res)=>{
		const state = intelAggregator.getState();
		const bus = intelBus.getMetrics();
		const snap60 = intelWindowStore.getSnapshot(60_000);
		const snap300 = intelWindowStore.getSnapshot(300_000);
		return res.json({ ok:true, state, bus, windows: { '60s': snap60, '5m': snap300 } });
	});
	router.post('/intel/test-event', requireRoles(['ADMIN','SUPER_ADMIN']), (req,res)=>{
		try {
			const { domain='test', kind='user.activity', summary='test event', priority=1 } = req.body||{};
			const evt = createIntelEvent({ domain, kind, priority, sensitivity:'internal', source:'api.test', payload:{ summary, actorId: (req as any).session?.username } });
			const result = intelBus.publish(evt);
			auditLogger.info('intel_test_event', 'Injected test intel event', { domain, kind, priority, accepted: result.accepted }).catch(()=>{});
			return res.json({ ok:true, published: result });
		} catch(e:any){
			return res.status(400).json({ ok:false, error: e.message });
		}
	});
	// R5 history endpoint
	router.get('/intel/history', requireRoles(['ANALYST','ADMIN','SUPER_ADMIN']), async (req,res)=>{
		try {
			const windowMs = Number(req.query.windowMs);
			if (![60_000,300_000,3_600_000].includes(windowMs)) return res.status(400).json({ ok:false, error:'invalid_window' });
			const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 6*60*60*1000);
			const to = req.query.to ? new Date(String(req.query.to)) : new Date();
			const domain = req.query.domain ? String(req.query.domain) : undefined;
			const kind = req.query.kind ? String(req.query.kind) : undefined;
			const limit = req.query.limit ? Math.min(5000, Number(req.query.limit)) : 1000;
			const clauses: any[] = [ eq(intelRollups.windowMs, windowMs), gte(intelRollups.bucketTs, from), lte(intelRollups.bucketTs, to) ];
			if (domain) clauses.push(eq(intelRollups.domain, domain));
			if (kind) clauses.push(eq(intelRollups.kind, kind));
			const rows = await db.select().from(intelRollups).where(and(...clauses as any)).orderBy(intelRollups.bucketTs).limit(limit);
			return res.json({ ok:true, windowMs, from: from.toISOString(), to: to.toISOString(), items: rows });
		} catch(e:any){
			return res.status(500).json({ ok:false, error:'history_failed', message: e.message });
		}
	});
}
