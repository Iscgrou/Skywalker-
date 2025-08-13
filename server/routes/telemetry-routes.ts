import { Router } from 'express';
import { telemetryHub } from '../services/telemetry-hub';
import { requireRoles } from '../middleware/rbac';

// R4: Telemetry Routes
// سطح دسترسی: ANALYST به بالا (ANALYST, ADMIN, SUPER_ADMIN)

export function registerTelemetryRoutes(router: Router){
  router.get('/telemetry/summary', requireRoles(['ANALYST','ADMIN','SUPER_ADMIN']), (req,res)=>{
    return res.json({ ok:true, data: telemetryHub.getSummary() });
  });
  router.get('/telemetry/detailed', requireRoles(['ANALYST','ADMIN','SUPER_ADMIN']), (req,res)=>{
    return res.json({ ok:true, data: telemetryHub.getDetailed() });
  });
}
