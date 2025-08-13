/**
 * Iteration 38 - Scenario Sampler (Stratified Skeleton)
 * هدف: تولید سناریوهای تنوع‌یافته برای ارزیابی Frontier و Robustness.
 * v1: تمرکز بر لایه ساده Strata + Tail Oversampling Placeholder
 */

export interface ScenarioStratum {
  id: string;
  weight: number; // نسبت هدف در نمونه‌گیری
  filters?: Record<string, any>; // فیلتر ساده (در v2 توسعه)
}

export interface SamplerConfig {
  total: number;
  strata?: ScenarioStratum[];
  tailFocusRatio?: number; // درصد سناریوهای اختصاص یافته به بخش tail (placeholder)
}

export interface ScenarioSample {
  scenarioId: string;
  stratumId?: string;
  factors: Record<string, number>;
  tags?: string[];
}

function pseudoRandom(seed: number) {
  let x = seed % 2147483647;
  if (x <= 0) x += 2147483646;
  return () => (x = x * 16807 % 2147483647) / 2147483647;
}

export function generateScenarioBatch(config: SamplerConfig, seed: number = Date.now()): ScenarioSample[] {
  const rnd = pseudoRandom(seed);
  const samples: ScenarioSample[] = [];
  const strata = config.strata && config.strata.length > 0 ? config.strata : [{ id: 'default', weight: 1 }];
  const totalWeight = strata.reduce((acc,s)=>acc + s.weight,0);

  for (const s of strata) {
    const count = Math.max(1, Math.round((s.weight / totalWeight) * config.total));
    for (let i=0;i<count;i++) {
      samples.push({
        scenarioId: `${s.id}-${i}-${Date.now()}`,
        stratumId: s.id,
        factors: {
          demand: Number((rnd()*100).toFixed(2)),
          cost: Number((rnd()*5000).toFixed(2)),
          latency: Number((rnd()*300).toFixed(2))
        },
        tags: []
      });
    }
  }

  // Tail oversampling placeholder (فعلاً فقط برچسب می‌زند)
  const tailCount = Math.round((config.tailFocusRatio || 0) * config.total);
  for (let i=0;i<tailCount;i++) {
    samples.push({
      scenarioId: `tail-${i}-${Date.now()}`,
      factors: {
        demand: Number((90 + rnd()*10).toFixed(2)), // مقدار بالا
        cost: Number((rnd()*8000 + 2000).toFixed(2)),
        latency: Number((250 + rnd()*50).toFixed(2))
      },
      tags: ['tail']
    });
  }

  return samples.slice(0, config.total + tailCount); // اجازه می‌دهد tail اضافه شود
}
