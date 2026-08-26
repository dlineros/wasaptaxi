import { eq, asc } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { services } from '../db/schema.js';

/**
 * Obtiene todos los servicios activos ordenados por displayOrder.
 */
export async function getActiveServices() {
  const db = getDb();
  return await db
    .select()
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.displayOrder), asc(services.id));
}

/**
 * Obtiene todos los servicios (activos e inactivos) para el panel admin.
 */
export async function getAllServices() {
  const db = getDb();
  return await db
    .select()
    .from(services)
    .orderBy(asc(services.displayOrder), asc(services.id));
}

/**
 * Obtiene un servicio por su ID.
 */
export async function getServiceById(id) {
  const db = getDb();
  const result = await db
    .select()
    .from(services)
    .where(eq(services.id, id))
    .limit(1);
  return result[0] || null;
}

/**
 * Obtiene un servicio por su slug ('taxi', 'pellet', etc.)
 */
export async function getServiceBySlug(slug) {
  const db = getDb();
  const result = await db
    .select()
    .from(services)
    .where(eq(services.slug, slug))
    .limit(1);
  return result[0] || null;
}

/**
 * Crea un nuevo servicio.
 */
export async function createService({ slug, name, emoji, description, promptDetail, requiresLocation = true, isActive = true, displayOrder = 1 }) {
  const db = getDb();
  const result = await db
    .insert(services)
    .values({
      slug: slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, ''),
      name,
      emoji: emoji || '📦',
      description,
      promptDetail,
      requiresLocation,
      isActive,
      displayOrder,
    })
    .returning();
  return result[0];
}

/**
 * Actualiza un servicio existente.
 */
export async function updateService(id, data) {
  const db = getDb();
  const result = await db
    .update(services)
    .set(data)
    .where(eq(services.id, id))
    .returning();
  return result[0];
}

/**
 * Elimina un servicio.
 */
export async function deleteService(id) {
  const db = getDb();
  const result = await db
    .delete(services)
    .where(eq(services.id, id))
    .returning();
  return result[0];
}
