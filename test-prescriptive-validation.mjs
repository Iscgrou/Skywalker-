#!/usr/bin/env node
/**
 * Synthetic Validation Runner – PODSE (Iteration 37)
 * Computes layer scores (L1..L10) using placeholder metrics.
 */
import './prescriptive-orchestrator.ts';

function clamp(v,min=0,max=1){ return Math.min(max, Math.max(min,v)); }

async function main(){
  const eng = global.PrescriptiveEngine;
  await eng.initialize();
  const req = { requestId:'VAL_'+Date.now(), horizon:'P7D', objectives:[{id:'value'},{id:'cost'}] };
  const res = await eng.prescribe(req);

  // Placeholder synthetic metrics
  const metrics = {
    FPR: 0.85,
    HCVR: 0.0,
    RR: 0.2,
    BCR: 0.55,
    SCI: res.metrics.scenarioCoverage,
    TPG: -0.1,
    Drift: 0.05,
    SIR: 0.15,
    HVn: clamp(res.paretoFrontMeta.hypervolume/3,0,1),
    DS: clamp(res.paretoFrontMeta.diversity,0,1),
    RS: 0.7,
    IRPD: 0.2,
    GVR: 0.0,
    RDL: 50,
    SSS: 0.8,
    ECR: 0.9,
    AC: 1.0,
    SHI: 1.0,
    OSL: 0,
    PAR: 0.6
  };

  const weights = { L1:0.12,L2:0.10,L3:0.13,L4:0.10,L5:0.10,L6:0.12,L7:0.08,L8:0.08,L9:0.07,L10:0.10 };

  const scores = {};
  // L1
  scores.L1 = 0.5*clamp(metrics.FPR,0,1) + 0.5*(1-metrics.HCVR);
  const BCRadj = clamp(1 - Math.abs(metrics.BCR-0.5)/0.2,0,1);
  const RRpen = (1 - clamp((metrics.RR-0.3)/0.4,0,1));
  scores.L2 = BCRadj*0.6 + RRpen*0.4;
  const SCI_norm = clamp(metrics.SCI/0.85,0,1);
  const TailAdj = clamp(1 - clamp(((-metrics.TPG - 0.05)/0.3),0,1),0,1);
  scores.L3 = 0.6*SCI_norm + 0.4*TailAdj;
  const Convergence = 1 - clamp(metrics.Drift/0.08,0,1);
  const Stagnation = 1 - clamp(metrics.SIR/0.3,0,1);
  scores.L4 = 0.5*(Convergence+Stagnation);
  scores.L5 = 0.55*metrics.HVn + 0.45*clamp(metrics.DS/0.3,0,1);
  scores.L6 = 0.65*metrics.RS + 0.35*(1 - clamp(metrics.IRPD/0.6,0,1));
  scores.L7 = (1 - metrics.GVR)*0.7 + (1 - clamp(metrics.RDL/200,0,1))*0.3;
  scores.L8 = 0.5*metrics.SSS + 0.5*metrics.ECR;
  scores.L9 = 0.6*metrics.AC + 0.4*metrics.SHI;
  const OSL_score = 1 - clamp(metrics.OSL/1,0,1);
  const PAR_score = clamp(metrics.PAR/0.7,0,1);
  scores.L10 = 0.45*OSL_score + 0.55*PAR_score;

  let criticalFail = [];
  if(metrics.HCVR>0) criticalFail.push('L1_HARD_VIOLATION');
  if(metrics.RR>0.6) criticalFail.push('L2_RELAX_EXCESS');
  if(metrics.SCI<0.65) criticalFail.push('L3_COVERAGE_LOW');
  if(metrics.Drift>0.12 || metrics.SIR>0.5) criticalFail.push('L4_CONVERGENCE');
  if(res.paretoFrontMeta.size<2) criticalFail.push('L5_FRONTIER_SIZE');
  if(metrics.RS<0.5) criticalFail.push('L6_ROBUSTNESS_LOW');
  if(metrics.GVR>0) criticalFail.push('L7_GUARDRAIL');
  if(metrics.ECR<0.75) criticalFail.push('L8_EXPLAIN');
  if(metrics.AC<1.0) criticalFail.push('L9_AUDIT');
  if(metrics.OSL>2) criticalFail.push('L10_SYNC');

  const composite = Object.entries(weights).reduce((acc,[k,w])=> acc + w * (scores[k]||0),0);
  const band = composite>=0.85? 'ممتاز': composite>=0.75? 'پایدار': composite>=0.65? 'قابل قبول':'ناکافی';

  console.log('--- PODSE VALIDATION REPORT ---');
  console.log('Scores:', scores);
  console.log('Composite:', composite.toFixed(3), 'Band:', band);
  console.log('CriticalFails:', criticalFail);
  console.log('BestPolicyId:', res.bestPolicy?.policyId);
  process.exit(0);
}

main();
