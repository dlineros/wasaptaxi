import { getPool } from './connection.js';

/**
 * Crea las tablas e índices en PostgreSQL si no existen al iniciar la app.
 */
export async function initDb() {
  const pool = getPool();
  console.log('🔄 Verificando y creando tablas en PostgreSQL...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS passengers (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      car_model VARCHAR(100),
      car_plate VARCHAR(20),
      is_active BOOLEAN DEFAULT true NOT NULL,
      latitude DECIMAL(10, 7),
      longitude DECIMAL(10, 7),
      location_updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rides (
      id SERIAL PRIMARY KEY,
      passenger_id INTEGER REFERENCES passengers(id) NOT NULL,
      driver_id INTEGER REFERENCES drivers(id),
      status VARCHAR(20) DEFAULT 'pending' NOT NULL,
      pickup_latitude DECIMAL(10, 7),
      pickup_longitude DECIMAL(10, 7),
      pickup_address TEXT,
      destination_text TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      accepted_at TIMESTAMP,
      completed_at TIMESTAMP,
      version INTEGER DEFAULT 1 NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ride_notifications (
      id SERIAL PRIMARY KEY,
      ride_id INTEGER REFERENCES rides(id) NOT NULL,
      driver_id INTEGER REFERENCES drivers(id) NOT NULL,
      sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
      responded_at TIMESTAMP,
      response VARCHAR(20)
    );

    CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status) WHERE status = 'pending';
  `);

  console.log('✅ Tablas inicializadas en PostgreSQL correctamente.');
}
