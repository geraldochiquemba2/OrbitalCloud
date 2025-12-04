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

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;
