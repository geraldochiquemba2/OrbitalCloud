/**
 * Database Connection for Cloudflare Workers
 * 
 * Usa @neondatabase/serverless para conectar ao Supabase PostgreSQL.
 * O driver neon funciona via HTTP, compatível com qualquer PostgreSQL.
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

neonConfig.fetchConnectionCache = true;
neonConfig.useSecureWebSocket = true;

export function createDb(databaseUrl: string) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }
  
  try {
    const sql = neon(databaseUrl);
    return drizzle(sql, { schema });
  } catch (error) {
    console.error('Failed to create database connection:', error);
    throw error;
  }
}

export type Database = ReturnType<typeof createDb>;
