import { eq, and } from 'drizzle-orm';
import { getDb, getPool } from '../db/connection.js';
import { rides, rideNotifications } from '../db/schema.js';

/**
 * Crea una nueva carrera en estado "pending".
 * @param {object} data
 * @param {number} data.passengerId
 * @param {number} data.pickupLatitude
 * @param {number} data.pickupLongitude
 * @param {string} data.pickupAddress
 * @param {string} data.destinationText
 * @returns {object} La carrera creada
 */
export async function createRide(data) {
  const db = getDb();
  const [ride] = await db
    .insert(rides)
    .values({
      passengerId: data.passengerId,
      pickupLatitude: data.pickupLatitude?.toString(),
      pickupLongitude: data.pickupLongitude?.toString(),
      pickupAddress: data.pickupAddress,
      destinationText: data.destinationText,
      status: 'pending',
    })
    .returning();

  return ride;
}

/**
 * Acepta una carrera con bloqueo por concurrencia.
 * Usa SELECT ... FOR UPDATE para garantizar que solo un taxista pueda aceptar.
 *
 * @param {number} rideId - ID de la carrera
 * @param {number} driverId - ID del taxista que acepta
 * @returns {{ success: boolean, ride: object|null, reason: string }}
 */
export async function acceptRide(rideId, driverId) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Bloquear la fila de la carrera
    const lockResult = await client.query(
      'SELECT * FROM rides WHERE id = $1 AND status = $2 FOR UPDATE',
      [rideId, 'pending']
    );

    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        ride: null,
        reason: 'La carrera ya fue tomada o cancelada.',
      };
    }

    // Actualizar la carrera
    const updateResult = await client.query(
      `UPDATE rides 
       SET status = 'accepted', 
           driver_id = $1, 
           accepted_at = NOW(), 
           version = version + 1 
       WHERE id = $2 
       RETURNING *`,
      [driverId, rideId]
    );

    // Registrar la respuesta del taxista
    await client.query(
      `UPDATE ride_notifications 
       SET responded_at = NOW(), response = 'accepted' 
       WHERE ride_id = $1 AND driver_id = $2`,
      [rideId, driverId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      ride: updateResult.rows[0],
      reason: 'Carrera aceptada exitosamente.',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Rechaza una carrera (un taxista dice NO).
 */
export async function rejectRide(rideId, driverId) {
  const db = getDb();
  await db
    .update(rideNotifications)
    .set({ respondedAt: new Date(), response: 'rejected' })
    .where(
      and(
        eq(rideNotifications.rideId, rideId),
        eq(rideNotifications.driverId, driverId)
      )
    );
}

/**
 * Completa una carrera.
 */
export async function completeRide(rideId) {
  const db = getDb();
  const [ride] = await db
    .update(rides)
    .set({
      status: 'completed',
      completedAt: new Date(),
    })
    .where(eq(rides.id, rideId))
    .returning();
  return ride;
}

/**
 * Cancela una carrera.
 */
export async function cancelRide(rideId) {
  const db = getDb();
  const [ride] = await db
    .update(rides)
    .set({ status: 'cancelled' })
    .where(eq(rides.id, rideId))
    .returning();
  return ride;
}

/**
 * Registra una notificación enviada a un taxista.
 */
export async function recordNotification(rideId, driverId) {
  const db = getDb();
  const [notification] = await db
    .insert(rideNotifications)
    .values({ rideId, driverId })
    .returning();
  return notification;
}

/**
 * Obtiene la carrera activa de un pasajero (pending o accepted).
 */
export async function getActiveRideForPassenger(passengerId) {
  const db = getDb();
  const result = await db
    .select()
    .from(rides)
    .where(
      and(
        eq(rides.passengerId, passengerId),
        eq(rides.status, 'pending')
      )
    )
    .limit(1);

  if (result.length > 0) return result[0];

  // También buscar accepted
  const accepted = await db
    .select()
    .from(rides)
    .where(
      and(
        eq(rides.passengerId, passengerId),
        eq(rides.status, 'accepted')
      )
    )
    .limit(1);

  return accepted.length > 0 ? accepted[0] : null;
}

/**
 * Obtiene la carrera activa de un taxista.
 */
export async function getActiveRideForDriver(driverId) {
  const db = getDb();
  const result = await db
    .select()
    .from(rides)
    .where(
      and(
        eq(rides.driverId, driverId),
        eq(rides.status, 'accepted')
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Obtiene el ride ID pendiente que fue notificado a un taxista.
 */
export async function getPendingRideForDriver(driverId) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT r.* FROM rides r
     INNER JOIN ride_notifications rn ON rn.ride_id = r.id
     WHERE rn.driver_id = $1 
       AND r.status = 'pending'
       AND rn.response IS NULL
     ORDER BY r.created_at DESC
     LIMIT 1`,
    [driverId]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}
