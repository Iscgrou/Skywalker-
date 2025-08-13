import { PrescriptiveTelemetry } from '../../shared/prescriptive/prescriptive-telemetry.ts';
process.env.PODSE_ROBUST_V1 = 'true';
const snap = PrescriptiveTelemetry.snapshot();
console.log('SNAP_OK', !!snap.rollups, snap.rollups?.totalSpans);
