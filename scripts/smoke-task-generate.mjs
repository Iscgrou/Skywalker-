import { aiOrchestrationCore } from '../server/services/ai-orchestration-core.ts';

const result = aiOrchestrationCore.issueCommand('task.generate', { representativeId: 1 }, 'SYSTEM');
console.log('Issued command:', result);
// Allow async inline dispatch to run
setTimeout(()=>{ console.log('Smoke test done'); }, 1200);
