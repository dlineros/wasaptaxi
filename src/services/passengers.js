import { eq } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { passengers } from '../db/schema.js';

/**
 * Busca o crea un pasajero por número de teléfono.
 * @param {string} phone - Número en formato WhatsApp (ej: "56930268900@s.whatsapp.net")
 * @returns {object} El registro del pasajero
 */
export async function findOrCreatePassenger(phone) {
  const db = getDb();
  // Normalizar: quitar el @s.whatsapp.net
  const cleanPhone = normalizePhone(phone);

  const existing = await db
    .select()
    .from(passengers)
    .where(eq(passengers.phone, cleanPhone))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [newPassenger] = await db
    .insert(passengers)
    .values({ phone: cleanPhone })
    .returning();

  return newPassenger;
}

/**
 * Actualiza el nombre de un pasajero.
 */
export async function updatePassengerName(passengerId, name) {
  const db = getDb();
  const [updated] = await db
    .update(passengers)
    .set({ name })
    .where(eq(passengers.id, passengerId))
    .returning();
  return updated;
}

/**
 * Normaliza un número de teléfono de WhatsApp.
 * Convierte "56930268900@s.whatsapp.net" → "+56930268900"
 */
export function normalizePhone(waId) {
  const num = waId.replace('@s.whatsapp.net', '').replace('@g.us', '');
  return num.startsWith('+') ? num : `+${num}`;
}
