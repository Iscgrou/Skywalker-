import { nowPersian, addHoursPersian } from '../server/lib/persian-time.js';

function simulateTaskDates(priority: 'URGENT'|'HIGH'|'MEDIUM'|'LOW' = 'MEDIUM') {
  const map: Record<string, number> = { URGENT: 4, HIGH: 12, MEDIUM: 24, LOW: 48 };
  const hours = map[priority] ?? 24;
  return {
    assignedAt: nowPersian(),
    deadline: addHoursPersian(hours)
  };
}

console.log('Simulated MEDIUM:', simulateTaskDates('MEDIUM'));
console.log('Simulated URGENT:', simulateTaskDates('URGENT'));
