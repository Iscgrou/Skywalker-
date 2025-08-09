import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as StandardPool } from 'pg';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as standardDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless environment with enhanced error handling
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

// SHERLOCK v17.1: Force new database connection override
let databaseUrl: string;

// Always prioritize new PostgreSQL credentials if available
if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
  // Force use of new database with SSL requirement
  databaseUrl = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}/${process.env.PGDATABASE}?sslmode=require`;
  console.log('🔧 SHERLOCK v17.1: FORCING new PostgreSQL database connection with SSL');
  console.log(`🔧 Database: ${process.env.PGDATABASE} on ${process.env.PGHOST}`);
  
  // Override the environment variable to ensure consistency
  process.env.DATABASE_URL = databaseUrl;
} else {
  // Fallback to existing DATABASE_URL if new credentials not available
  databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !databaseUrl.includes('sslmode=require')) {
    databaseUrl = databaseUrl.includes('?') ? `${databaseUrl}&sslmode=require` : `${databaseUrl}?sslmode=require`;
    process.env.DATABASE_URL = databaseUrl;
    console.log('🔧 SHERLOCK v17.1: Enhanced existing DATABASE_URL with SSL security');
  }
}

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// SHERLOCK v17.4: Force standard PostgreSQL driver to bypass Neon issues
const useStandardPostgreSQL = true; // Always use standard driver for reliability
console.log(`🔧 SHERLOCK v17.4: Forcing Standard PostgreSQL driver (PGHOST: ${process.env.PGHOST})`);

export const pool = useStandardPostgreSQL 
  ? new StandardPool({
      connectionString: databaseUrl,
      max: 5,
      ssl: { rejectUnauthorized: false },
      idle_in_transaction_session_timeout: 30000,
    })
  : new NeonPool({ 
      connectionString: databaseUrl,
      max: 5,
      maxUses: 1000,
      ssl: { rejectUnauthorized: false },
      allowExitOnIdle: false,
      idleTimeoutMillis: 30000,
    });

// Enhanced database instance with driver selection
export const db = useStandardPostgreSQL
  ? standardDrizzle(pool as StandardPool, { schema, logger: process.env.NODE_ENV === 'development' })
  : drizzle({ 
      client: pool as NeonPool, 
      schema,
      logger: process.env.NODE_ENV === 'development' 
    });

console.log(`🔧 SHERLOCK v17.3: Using ${useStandardPostgreSQL ? 'Standard PostgreSQL' : 'Neon'} driver for database connection`);

// Performance monitoring for slow queries
export function logSlowQuery(queryName: string, duration: number) {
  if (duration > 100) {
    console.warn(`⚠️ Slow query: ${queryName} - ${duration}ms`);
  }
}

// Connection health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
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
    await pool.end();
    console.log('Database connections closed gracefully');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}