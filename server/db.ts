import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.ts";

// Iteration 22: Lazy DB initialization (allows memory-only harness runs without env crash)
let _pool: Pool | null = null;
let _db: any = null;
export function ensureDb() {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    maxUses: 1000,
    allowExitOnIdle: false,
    idleTimeoutMillis: 30000,
  });
  _db = drizzle(_pool, { schema });
  return _db;
}

// Safe getter for underlying PG pool (may return null if DB not configured yet)
export function getPool(): Pool | null {
  if (_pool) return _pool;
  if (!process.env.DATABASE_URL) return null;
  ensureDb();
  return _pool;
}
export const db = new Proxy({}, {
  get(_t, prop) {
    const real = ensureDb();
    // @ts-ignore
    return real[prop];
  }
}) as ReturnType<typeof drizzle>;

// Performance monitoring for slow queries
export function logSlowQuery(queryName: string, duration: number) {
  if (duration > 100) {
    console.warn(`⚠️ Slow query: ${queryName} - ${duration}ms`);
  }
}

// Connection health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const p = ensureDb(); // ensure init or throw
    const client = await _pool!.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown handler
export async function closeDatabaseConnection(): Promise<void> {
  try {
    if (_pool) await _pool.end();
    console.log('Database connections closed gracefully');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}