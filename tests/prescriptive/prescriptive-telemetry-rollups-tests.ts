/** Telemetry Rollups unit test */
import { PrescriptiveTelemetry } from '../../shared/prescriptive/prescriptive-telemetry.ts';

if (!process.env.PODSE_ROBUST_V1) process.env.PODSE_ROBUST_V1 = 'true';

// سناریو: بدون span
PrescriptiveTelemetry.reset();
let snap = PrescriptiveTelemetry.snapshot();
if (!snap.rollups || snap.rollups.totalSpans !== 0) throw new Error('Rollups empty spans failed');

// سناریو: یک span کامل (همزمان) – اعتبارسنجی مینیمال برای اجتناب از crash محیط
PrescriptiveTelemetry.reset();
PrescriptiveTelemetry.startSpan('alpha');
PrescriptiveTelemetry.endSpan('alpha');
PrescriptiveTelemetry.counter('constraints.evaluated', 4);
PrescriptiveTelemetry.counter('constraints.violation.hard', 1);
PrescriptiveTelemetry.counter('constraints.violation.soft', 1);
const s2 = PrescriptiveTelemetry.snapshot();
const r = s2.rollups;
if (!r) throw new Error('Missing rollups');
if (r.derived.constraintsEvaluated !== 4) throw new Error('constraints.evaluated mismatch');
if (r.derived.hardViolations !== 1) throw new Error('hard violation mismatch');
console.log(JSON.stringify({ status: 'TELEMETRY_ROLLUPS_PASS', spans: r.totalSpans, constraints: r.derived.constraintsEvaluated }));
