import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { drivers } from '../db/schema.js';
import { normalizePhone } from './passengers.js';

/**
 * Busca un taxista por número de teléfono.
 * @param {string} phone - Número en formato WhatsApp
 * @returns {object|null} El taxista o null
 */
export async function findDriverByPhone(phone) {
  const db = getDb();
  const cleanPhone = normalizePhone(phone);

  const result = await db
    .select()
    .from(drivers)
    .where(eq(drivers.phone, cleanPhone))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Obtiene todos los taxistas activos.
 * @returns {Array} Lista de taxistas activos
 */
export async function getActiveDrivers() {
  const db = getDb();
  return db
    .select()
    .from(drivers)
    .where(eq(drivers.isActive, true));
}

/**
 * Actualiza la ubicación de un taxista.
 */
export async function updateDriverLocation(driverId, latitude, longitude) {
  const db = getDb();
  const [updated] = await db
    .update(drivers)
    .set({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      locationUpdatedAt: new Date(),
    })
    .where(eq(drivers.id, driverId))
    .returning();
  return updated;
}

/**
 * Activa/desactiva un taxista.
 */
export async function setDriverActive(driverId, isActive) {
  const db = getDb();
  const [updated] = await db
    .update(drivers)
    .set({ isActive })
    .where(eq(drivers.id, driverId))
    .returning();
  return updated;
}

/**
 * Obtiene taxistas cercanos a una ubicación.
 * Usa fórmula de Haversine simplificada para distancia aproximada.
 * @param {number} lat - Latitud del pasajero
 * @param {number} lng - Longitud del pasajero
 * @param {number} radiusKm - Radio de búsqueda en km
 * @returns {Array} Taxistas dentro del radio
 */
export async function getNearbyDrivers(lat, lng, radiusKm = 5) {
  const db = getDb();

  // Obtener todos los activos con ubicación conocida
  const activeDrivers = await db
    .select()
    .from(drivers)
    .where(
      and(
        eq(drivers.isActive, true),
      )
    );

  // Filtrar por distancia usando Haversine
  return activeDrivers.filter((driver) => {
    if (!driver.latitude || !driver.longitude) return true; // Sin ubicación → incluir de todos modos
    const distance = haversineKm(
      lat, lng,
      parseFloat(driver.latitude),
      parseFloat(driver.longitude)
    );
    return distance <= radiusKm;
  });
}

/**
 * Calcula la distancia en km entre dos puntos usando Haversine.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}
