// R2.1: Schema extensions for behavior analytics and adaptive intelligence
import { sqliteTable, text, integer, real, primaryKey, unique } from 'drizzle-orm/sqlite-core';

// Store user behavior baselines and patterns
export const behaviorBaselines = sqliteTable('behavior_baselines', {
  userId: text('user_id').notNull(),
  metric: text('metric').notNull(),  // e.g., 'login_frequency', 'session_duration', 'resource_access_pattern'
  value: real('value').notNull(),    // baseline value
  standardDeviation: real('standard_deviation'),
  lastUpdated: integer('last_updated').notNull(),
  sampleSize: integer('sample_size').notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.metric] }),
  };
});

// Store anomaly detection results
export const anomalyDetections = sqliteTable('anomaly_detections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  eventType: text('event_type').notNull(), // 'login', 'resource_access', 'role_change'
  severity: real('severity').notNull(),  // 0-1 score of how anomalous
  timestamp: integer('timestamp').notNull(),
  metric: text('metric').notNull(),  
  observed: real('observed').notNull(),
  expected: real('expected'),
  details: text('details'),  // JSON string of additional details
});

// Auto-tuning parameters for the system
export const systemParameters = sqliteTable('system_parameters', {
  paramId: text('param_id').primaryKey(),  // e.g. 'rate_limit.diff', 'cache.ttl'
  currentValue: real('current_value').notNull(),
  defaultValue: real('default_value').notNull(), 
  minValue: real('min_value'),
  maxValue: real('max_value'),
  autoTuneEnabled: integer('auto_tune_enabled', { mode: 'boolean' }).notNull().default(true),
  lastTuned: integer('last_tuned'),
  tuningMetric: text('tuning_metric'), // metric used to tune this parameter
  description: text('description'),
});

// Access patterns by resource type
export const resourceAccessPatterns = sqliteTable('resource_access_patterns', {
  resourceType: text('resource_type').notNull(), // 'diff', 'full_session', etc.
  hourOfDay: integer('hour_of_day').notNull(), // 0-23
  dayOfWeek: integer('day_of_week').notNull(), // 0-6 (Sunday-Saturday)
  accessCount: integer('access_count').notNull().default(0),
  lastUpdated: integer('last_updated').notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.resourceType, table.hourOfDay, table.dayOfWeek] }),
  };
});

// Geographic access patterns
export const geographicAccessPatterns = sqliteTable('geographic_access_patterns', {
  userId: text('user_id').notNull(),
  ipPrefix: text('ip_prefix').notNull(), // first 3 octets of IP
  accessCount: integer('access_count').notNull().default(1),
  lastAccess: integer('last_access').notNull(),
  firstSeen: integer('first_seen').notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.ipPrefix] }),
  };
});
