import { PrescriptiveTelemetry } from '../../shared/prescriptive/prescriptive-telemetry.ts';
process.env.PODSE_ROBUST_V1='true';
PrescriptiveTelemetry.reset();
const s1 = PrescriptiveTelemetry.snapshot();
console.log('ONE', s1.rollups?.totalSpans);
const s2 = PrescriptiveTelemetry.snapshot();
console.log('TWO', s2.rollups?.totalSpans);
