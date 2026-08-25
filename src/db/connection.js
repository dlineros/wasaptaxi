import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config/env.js';
import * as schema from './schema.js';

const { Pool } = pg;

let db;
let pool;

/**
 * Inicializa la conexión a PostgreSQL y retorna la instancia de Drizzle.
 */
export function getDb() {
  if (!db) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('Error inesperado en pool de PostgreSQL:', err);
    });

    db = drizzle(pool, { schema });
  }
  return db;
}

/**
 * Retorna el pool de pg directamente (para queries raw con FOR UPDATE).
 */
export function getPool() {
  if (!pool) {
    getDb(); // Inicializa pool como efecto secundario
  }
  return pool;
}

/**
 * Cierra la conexión a la base de datos.
 */
export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
