import { getPool } from './connection.js';

/**
 * Crea las tablas e índices en PostgreSQL si no existen al iniciar la app,
 * y siembra los servicios iniciales por defecto.
 */
export async function initDb() {
  const pool = getPool();
  console.log('🔄 Verificando y creando estructura multi-servicio en PostgreSQL...');
  
  // 1. Crear tablas base
  await pool.query(`
    -- 1. Servicios
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      emoji VARCHAR(10) DEFAULT '📦' NOT NULL,
      description TEXT,
      prompt_detail TEXT NOT NULL,
      requires_location BOOLEAN DEFAULT true NOT NULL,
      is_active BOOLEAN DEFAULT true NOT NULL,
      display_order INTEGER DEFAULT 1 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    -- 2. Oferentes / Proveedores
    CREATE TABLE IF NOT EXISTS providers (
      id SERIAL PRIMARY KEY,
      service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
      phone VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      business_name VARCHAR(100),
      extra_info TEXT,
      is_active BOOLEAN DEFAULT true NOT NULL,
      latitude DECIMAL(10, 7),
      longitude DECIMAL(10, 7),
      location_updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    -- 3. Clientes
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100),
      current_step VARCHAR(50) DEFAULT 'IDLE' NOT NULL,
      selected_service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
      temp_detail TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    -- 4. Solicitudes de Servicio
    CREATE TABLE IF NOT EXISTS service_requests (
      id SERIAL PRIMARY KEY,
      service_id INTEGER REFERENCES services(id) NOT NULL,
      customer_id INTEGER REFERENCES customers(id) NOT NULL,
      provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
      status VARCHAR(20) DEFAULT 'pending' NOT NULL,
      request_detail TEXT,
      location_latitude DECIMAL(10, 7),
      location_longitude DECIMAL(10, 7),
      location_address TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      assigned_at TIMESTAMP,
      completed_at TIMESTAMP,
      version INTEGER DEFAULT 1 NOT NULL
    );

    -- 5. Notificaciones de Despacho (Auditoría)
    CREATE TABLE IF NOT EXISTS request_notifications (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
      provider_id INTEGER REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
      sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
      responded_at TIMESTAMP,
      response VARCHAR(20)
    );

    -- Índices para alto rendimiento y concurrencia
    CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status) WHERE status = 'pending';
    CREATE INDEX IF NOT EXISTS idx_providers_service ON providers(service_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  `);

  // 2. Sembrar servicios iniciales si no existen
  const existingServices = await pool.query('SELECT COUNT(*) as count FROM services');
  if (parseInt(existingServices.rows[0].count, 10) === 0) {
    console.log('🌱 Sembrando servicios iniciales...');
    await pool.query(`
      INSERT INTO services (slug, name, emoji, description, prompt_detail, requires_location, is_active, display_order)
      VALUES
        ('taxi', 'Pedir Taxi', '🚕', 'Servicio de transporte de pasajeros en taxi', '¿Hacia dónde te diriges? Escribe tu destino:', true, true, 1),
        ('pellet', 'Solicitar Pellet', '🪵', 'Venta y distribución de sacos de pellet para calefacción', '¿Cuántas bolsas de pellet necesitas y de qué tipo (ej. 5 bolsas eucalipto)?', true, true, 2),
        ('carne', 'Venta de Carne', '🥩', 'Cortes de carne seleccionada a domicilio', 'Indica el detalle de los cortes o kilos que deseas pedir:', true, true, 3),
        ('congelados', 'Productos Congelados', '❄️', 'Mariscos, verduras y productos congelados', 'Indica qué productos congelados deseas encargar:', true, true, 4)
      ON CONFLICT (slug) DO NOTHING;
    `);
    console.log('✅ 4 servicios iniciales creados.');
  }

  // 3. Migrar taxistas legacy si existen en la tabla antigua drivers
  try {
    const legacyDrivers = await pool.query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'drivers'
    `);
    if (legacyDrivers.rows.length > 0) {
      // Asociar taxistas antiguos al servicio taxi
      const taxiService = await pool.query("SELECT id FROM services WHERE slug = 'taxi' LIMIT 1");
      if (taxiService.rows.length > 0) {
        const taxiId = taxiService.rows[0].id;
        await pool.query(`
          INSERT INTO providers (service_id, phone, name, business_name, extra_info, is_active, latitude, longitude, created_at)
          SELECT ${taxiId}, phone, name, 'Taxi ' || name, car_model || ' (' || car_plate || ')', is_active, latitude, longitude, created_at
          FROM drivers
          ON CONFLICT (phone) DO NOTHING;
        `);
      }
    }
  } catch (e) {
    // Ignorar si no existe tabla legacy
  }

  console.log('✅ Base de datos multi-servicio inicializada correctamente.');
}
