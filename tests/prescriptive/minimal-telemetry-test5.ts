import { PrescriptiveTelemetry } from '../../shared/prescriptive/prescriptive-telemetry.ts';
process.env.PODSE_ROBUST_V1='true';
PrescriptiveTelemetry.reset();
const s1 = PrescriptiveTelemetry.snapshot();
PrescriptiveTelemetry.startSpan('alpha');
PrescriptiveTelemetry.endSpan('alpha');
const s2 = PrescriptiveTelemetry.snapshot();
console.log('After span count', s2.rollups?.spanStats['alpha'].count);
