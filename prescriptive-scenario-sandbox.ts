/** Scenario & Simulation Sandbox (Iteration 37) */
import { ScenarioSet, ScenarioInstance } from './prescriptive-types';

export class ScenarioSandbox {
  generate(horizon: string, strategy: string, samples: number): ScenarioSet {
    const scenarios: ScenarioInstance[] = [];
    for(let i=0;i<samples;i++){
      scenarios.push({ id: 'sc_'+i, factors: { demand: randNorm(100,15), cost: randNorm(50,8) }, weight: 1/samples });
    }
    const coverageEstimate = Math.min(1, samples/200); // placeholder heuristic
    return { id: 'set_'+Date.now(), horizon, strategy, scenarios, coverageEstimate, tailAugmented: false };
  }
}

function randNorm(mean:number, sd:number){
  // Box-Muller
  const u1=Math.random(), u2=Math.random();
  const z = Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
  return mean + z*sd;
}
