/**
 * src/infrastructure/persistence/postgresql/pool.ts
 *
 * Conexión a PostgreSQL (Neon, rama `pruebas-zk`).
 * Usa pg.Pool para pooling de conexiones.
 *
 * Connection string de la rama pruebas-zk (aislada de main):
 *   postgresql://neondb_owner:...@ep-morning-bar-bbarunl6-pooler.c-15.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
 */

import { Pool } from 'pg';

export interface DatabaseConfig {
  connectionString: string;
}

export function createPool(config: DatabaseConfig): Pool {
  return new Pool({
    connectionString: config.connectionString,
    ssl: { rejectUnauthorized: false }, // Neon requiere sslmode=require
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export async function healthCheck(pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1 AS healthy');
    return result.rows[0]?.healthy === 1;
  } catch {
    return false;
  }
}
