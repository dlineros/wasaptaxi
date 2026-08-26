import { eq, and, desc } from 'drizzle-orm';
import { getDb, getPool } from '../db/connection.js';
import { providers, services } from '../db/schema.js';

/**
 * Busca un oferente por su número de teléfono.
 */
export async function findProviderByPhone(phone) {
  const db = getDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const result = await db
    .select({
      id: providers.id,
      serviceId: providers.serviceId,
      phone: providers.phone,
      name: providers.name,
      businessName: providers.businessName,
      extraInfo: providers.extraInfo,
      isActive: providers.isActive,
      latitude: providers.latitude,
      longitude: providers.longitude,
      serviceName: services.name,
      serviceEmoji: services.emoji,
      serviceSlug: services.slug,
    })
    .from(providers)
    .leftJoin(services, eq(providers.serviceId, services.id))
    .where(eq(providers.phone, cleanPhone))
    .limit(1);

  return result[0] || null;
}

/**
 * Obtiene todos los oferentes de un servicio específico.
 */
export async function getProvidersByService(serviceId, onlyActive = true) {
  const db = getDb();
  const conditions = [eq(providers.serviceId, serviceId)];
  if (onlyActive) {
    conditions.push(eq(providers.isActive, true));
  }

  return await db
    .select()
    .from(providers)
    .where(and(...conditions));
}

/**
 * Encuentra oferentes cercanos para un servicio usando la fórmula de Haversine en SQL.
 * Si no tienen GPS registrado, los retorna al final para no excluir a nadie.
 */
export async function findNearbyProviders(serviceId, latitude, longitude, radiusKm = 20) {
  const pool = getPool();

  if (latitude && longitude) {
    const query = `
      SELECT id, service_id, phone, name, business_name, extra_info, is_active, latitude, longitude,
        (6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )) AS distance_km
      FROM providers
      WHERE service_id = $3 AND is_active = true
      ORDER BY
        CASE WHEN latitude IS NOT NULL THEN 0 ELSE 1 END,
        distance_km ASC NULLS LAST
      LIMIT 15;
    `;
    const result = await pool.query(query, [latitude, longitude, serviceId]);
    return result.rows;
  } else {
    // Si no hay coordenadas de origen, despachar a todos los activos del servicio
    const query = `
      SELECT id, service_id, phone, name, business_name, extra_info, is_active, latitude, longitude, NULL as distance_km
      FROM providers
      WHERE service_id = $1 AND is_active = true
      ORDER BY id ASC
      LIMIT 15;
    `;
    const result = await pool.query(query, [serviceId]);
    return result.rows;
  }
}

/**
 * Actualiza la ubicación GPS de un oferente.
 */
export async function updateProviderLocation(phone, latitude, longitude) {
  const db = getDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const result = await db
    .update(providers)
    .set({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      locationUpdatedAt: new Date(),
    })
    .where(eq(providers.phone, cleanPhone))
    .returning();

  return result[0];
}

/**
 * Crea un nuevo oferente.
 */
export async function createProvider({ serviceId, phone, name, businessName, extraInfo, isActive = true }) {
  const db = getDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const result = await db
    .insert(providers)
    .values({
      serviceId,
      phone: cleanPhone,
      name,
      businessName,
      extraInfo,
      isActive,
    })
    .returning();

  return result[0];
}

/**
 * Actualiza un oferente.
 */
export async function updateProvider(id, data) {
  const db = getDb();
  if (data.phone) {
    data.phone = data.phone.replace(/[^0-9+]/g, '');
  }
  const result = await db
    .update(providers)
    .set(data)
    .where(eq(providers.id, id))
    .returning();

  return result[0];
}

/**
 * Elimina un oferente.
 */
export async function deleteProvider(id) {
  const db = getDb();
  const result = await db
    .delete(providers)
    .where(eq(providers.id, id))
    .returning();

  return result[0];
}

/**
 * Obtiene todos los oferentes con datos de su servicio para el panel web.
 */
export async function getAllProviders(serviceId = null) {
  const db = getDb();
  let query = db
    .select({
      id: providers.id,
      serviceId: providers.serviceId,
      serviceName: services.name,
      serviceEmoji: services.emoji,
      phone: providers.phone,
      name: providers.name,
      businessName: providers.businessName,
      extraInfo: providers.extraInfo,
      isActive: providers.isActive,
      latitude: providers.latitude,
      longitude: providers.longitude,
      locationUpdatedAt: providers.locationUpdatedAt,
      createdAt: providers.createdAt,
    })
    .from(providers)
    .leftJoin(services, eq(providers.serviceId, services.id))
    .orderBy(desc(providers.createdAt));

  if (serviceId) {
    query = query.where(eq(providers.serviceId, serviceId));
  }

  return await query;
}
