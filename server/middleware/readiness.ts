import { Request, Response, NextFunction } from 'express';

interface ReadinessState {
  predictiveReady: boolean;
  prescriptiveReady: boolean;
  startedAt: number;
}

export const readinessState: ReadinessState = {
  predictiveReady: false,
  prescriptiveReady: false,
  startedAt: Date.now(),
};

export function markPredictiveReady(){ readinessState.predictiveReady = true; }
export function markPrescriptiveReady(){ readinessState.prescriptiveReady = true; }

export function readinessGuard(required: ('predictive'|'prescriptive')[]) {
  return function(req: Request, res: Response, next: NextFunction){
    for (const r of required){
      if (r === 'predictive' && !readinessState.predictiveReady) {
        return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', service: 'predictive', message: 'Predictive engine initializing' });
      }
      if (r === 'prescriptive' && !readinessState.prescriptiveReady) {
        return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', service: 'prescriptive', message: 'Prescriptive engine initializing' });
      }
    }
    next();
  };
}

export function getExtendedReadiness(){
  return {
    uptimeMs: Date.now() - readinessState.startedAt,
    predictiveReady: readinessState.predictiveReady,
    prescriptiveReady: readinessState.prescriptiveReady,
  };
}
