/** Objective & Policy Registry (Iteration 37) */
import { ObjectiveSpec } from './prescriptive-types';

export class ObjectiveRegistry {
  private objectives: ObjectiveSpec[] = [];
  register(obj: ObjectiveSpec){
    const i = this.objectives.find(o=>o.id===obj.id);
    if(i) return; // idempotent
    this.objectives.push(obj);
  }
  list(){ return [...this.objectives]; }
  snapshotWeights(){
    return this.objectives.map(o=>({ id: o.id, weight: o.weight }));
  }
  hashSnapshot(){
    const base = JSON.stringify(this.snapshotWeights());
    return createSimpleHash(base);
  }
}

function createSimpleHash(s: string){
  let h = 0; for(let i=0;i<s.length;i++){ h=(h*31 + s.charCodeAt(i))>>>0; }
  return 'OBJ_'+h.toString(16);
}
