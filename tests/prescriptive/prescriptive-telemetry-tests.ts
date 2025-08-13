/** Telemetry unit test */
import { PrescriptiveTelemetry } from '../../shared/prescriptive/prescriptive-telemetry.ts';

if (!process.env.PODSE_ROBUST_V1) process.env.PODSE_ROBUST_V1 = 'true';

PrescriptiveTelemetry.reset();
PrescriptiveTelemetry.startSpan('t1');
setTimeout(() => {
  PrescriptiveTelemetry.endSpan('t1');
  PrescriptiveTelemetry.counter('x', 3);
  PrescriptiveTelemetry.counter('x', 2);
  const snap = PrescriptiveTelemetry.snapshot();
  if (!snap.spans.length) throw new Error('No spans recorded');
  const counters: any = snap.counters;
  if (counters.x !== 5) throw new Error('Counter incorrect');
  console.log(JSON.stringify({ status: 'TELEMETRY_PASS', spans: snap.spans.length, counterX: counters.x }));
}, 5);
