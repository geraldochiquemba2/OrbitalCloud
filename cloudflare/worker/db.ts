/**
 * Database Connection for Cloudflare Workers
 * 
 * Usa @neondatabase/serverless para conectar ao Supabase PostgreSQL.
 * Configuração especial para compatibilidade com Supabase Pooler.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

// Configuração OBRIGATÓRIA para Supabase
neonConfig.pipelineConnect = false;
neonConfig.useSecureWebSocket = true;

export function createDb(databaseUrl: string) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }
  
  console.log('Creating database connection to Supabase...');
  
  try {
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzle({ client: pool, schema });
    console.log('Database connection created successfully');
    return db;
  } catch (error) {
    console.error('Failed to create database connection:', error);
    throw error;
  }
}

export type Database = ReturnType<typeof createDb>;
