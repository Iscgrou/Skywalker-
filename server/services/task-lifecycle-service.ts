// Task Lifecycle Service - Append & Projection (Tier 1 Skeleton)
import { db } from '../db';
import { taskEvents, insertTaskEventSchema } from '../../shared/schema';
import { eventBus } from './event-bus';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const StatusGraph: Record<string, string[]> = {
  ASSIGNED: ['READ','IN_PROGRESS','CANCELLED'],
  READ: ['IN_PROGRESS','CANCELLED'],
  IN_PROGRESS: ['PAUSED','COMPLETED','CANCELLED'],
  PAUSED: ['IN_PROGRESS','CANCELLED'],
  COMPLETED: ['VERIFIED'],
  VERIFIED: [],
  CANCELLED: []
};

export class TaskLifecycleService {
  async appendRaw(event: z.infer<typeof insertTaskEventSchema>) {
    const parsed = insertTaskEventSchema.parse(event);
    const rows = await db.insert(taskEvents).values(parsed).returning();
    const saved = rows[0];
    // Publish generic and rep-scoped events
    eventBus.publish('task.event.appended', saved);
    if ((saved as any).representativeId) {
      eventBus.publish(`task.event.appended.rep.${(saved as any).representativeId}`, saved);
    }
    return rows;
  }

  async createTask(data: { taskId: string; title: string; description: string; representativeId?: number; assignedStaffId: number; priority: string; dueAt?: string; correlationId?: string; }) {
    return this.appendRaw({
      taskId: data.taskId,
      type: 'TASK_CREATED',
      actor: 'SYSTEM',
      correlationId: data.correlationId,
      representativeId: data.representativeId,
      payload: {
        title: data.title,
        description: data.description,
        representativeId: data.representativeId,
        assignedStaffId: data.assignedStaffId,
        priority: data.priority,
        dueAt: data.dueAt
      }
    });
  }

  async changeStatus(taskId: string, from: string | undefined, to: string, actor: string) {
    if (from && !StatusGraph[from]?.includes(to)) {
      throw new Error(`Invalid transition ${from} -> ${to}`);
    }
    // Attempt to fetch representativeId from existing events (first TASK_CREATED)
    const existing = await this.listEvents(taskId);
    const repId = existing.find(e=> e.type==='TASK_CREATED')?.representativeId;
    const correlationId = existing.find(e=> e.type==='TASK_CREATED')?.correlationId;
  return this.appendRaw({ taskId, type: 'TASK_STATUS_CHANGED', actor, representativeId: repId, correlationId, payload: { from, to } });
  }

  async addNote(taskId: string, note: string, actor: string) {
    const existing = await this.listEvents(taskId);
    const repId = existing.find(e=> e.type==='TASK_CREATED')?.representativeId;
    const correlationId = existing.find(e=> e.type==='TASK_CREATED')?.correlationId;
  return this.appendRaw({ taskId, type: 'TASK_NOTE_ADDED', actor, representativeId: repId, correlationId, payload: { note } });
  }

  async listEvents(taskId: string) {
    return db.select().from(taskEvents).where(eq(taskEvents.taskId, taskId));
  }

  async project(taskId: string) {
    const events = await this.listEvents(taskId);
    if (!events.length) return null;
    const state: any = { taskId, notes: [], status: 'ASSIGNED' };
    for (const ev of events) {
      switch (ev.type) {
        case 'TASK_CREATED':
          Object.assign(state, ev.payload);
          state.status = 'ASSIGNED';
          state.createdAt = ev.occurredAt;
          break;
        case 'TASK_STATUS_CHANGED':
          state.status = (ev.payload as any).to;
          if (state.status === 'COMPLETED') state.completedAt = ev.occurredAt;
          break;
        case 'TASK_NOTE_ADDED':
          state.notes.push({ note: (ev.payload as any).note, at: ev.occurredAt, actor: ev.actor });
          break;
        default:
          break;
      }
    }
    return state;
  }
}

export const taskLifecycleService = new TaskLifecycleService();
