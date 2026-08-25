import { sendMessage } from './whatsapp.js';
import { passengerMessages, driverMessages } from './messages.js';
import { findOrCreatePassenger } from '../services/passengers.js';
import { findDriverByPhone, getActiveDrivers, getNearbyDrivers, updateDriverLocation, setDriverActive } from '../services/drivers.js';
import { createRide, acceptRide, rejectRide, completeRide, cancelRide, recordNotification, getActiveRideForPassenger, getActiveRideForDriver, getPendingRideForDriver } from '../services/rides.js';
import { reverseGeocode } from '../services/geocoding.js';
import { config } from '../config/env.js';

// ============================================================
// Estado de conversación en memoria (para el piloto es suficiente)
// ============================================================
// Mapa: jid → { step, data }
// Steps: 'idle', 'waiting_location', 'waiting_destination'
const conversationState = new Map();

function getState(jid) {
  return conversationState.get(jid) || { step: 'idle', data: {} };
}

function setState(jid, step, data = {}) {
  conversationState.set(jid, { step, data: { ...getState(jid).data, ...data } });
}

function clearState(jid) {
  conversationState.delete(jid);
}

// ============================================================
// Handler principal de mensajes
// ============================================================

/**
 * Procesa un mensaje entrante de WhatsApp.
 * Determina si es pasajero o taxista y delega al flujo correspondiente.
 */
export async function handleMessage(msg) {
  const jid = msg.key.remoteJid;

  // Verificar si es un taxista registrado
  const driver = await findDriverByPhone(jid);

  if (driver) {
    await handleDriverMessage(msg, jid, driver);
  } else {
    await handlePassengerMessage(msg, jid);
  }
}

// ============================================================
// Flujo del PASAJERO
// ============================================================

async function handlePassengerMessage(msg, jid) {
  const state = getState(jid);
  const text = extractText(msg)?.trim().toUpperCase();
  const location = extractLocation(msg);

  // Obtener o crear pasajero
  const passenger = await findOrCreatePassenger(jid);

  // Verificar si tiene carrera activa
  const activeRide = await getActiveRideForPassenger(passenger.id);

  // --- Comandos especiales ---
  if (text === 'CANCELAR' && activeRide) {
    await cancelRide(activeRide.id);
    clearState(jid);
    await sendMessage(jid, passengerMessages.rideCancelled());
    return;
  }

  if (text === 'ESTADO' && activeRide) {
    await sendMessage(jid, passengerMessages.rideStatus(activeRide, null));
    return;
  }

  if (activeRide) {
    await sendMessage(jid, passengerMessages.alreadyHaveActiveRide());
    return;
  }

  // --- Flujo normal ---
  switch (state.step) {
    case 'idle':
    case 'waiting_location':
      if (location) {
        // Recibió ubicación → geocodificar y pedir destino
        const address = await reverseGeocode(location.lat, location.lng);
        setState(jid, 'waiting_destination', {
          pickupLat: location.lat,
          pickupLng: location.lng,
          pickupAddress: address,
          passengerId: passenger.id,
        });
        await sendMessage(jid, passengerMessages.locationReceived(address));
      } else {
        // Mensaje de texto sin ubicación → dar bienvenida
        await sendMessage(jid, passengerMessages.welcome());
        setState(jid, 'waiting_location');
      }
      break;

    case 'waiting_destination':
      if (text) {
        // Recibió destino → crear carrera y buscar taxista
        const rawText = extractText(msg)?.trim(); // Sin uppercase para el destino
        const data = state.data;

        await sendMessage(jid, passengerMessages.searchingDriver(rawText));

        // Crear carrera
        const ride = await createRide({
          passengerId: data.passengerId,
          pickupLatitude: data.pickupLat,
          pickupLongitude: data.pickupLng,
          pickupAddress: data.pickupAddress,
          destinationText: rawText,
        });

        // Buscar taxistas cercanos
        const nearbyDrivers = await getNearbyDrivers(
          data.pickupLat,
          data.pickupLng,
          config.bot.searchRadiusKm
        );

        if (nearbyDrivers.length === 0) {
          await cancelRide(ride.id);
          clearState(jid);
          await sendMessage(jid, passengerMessages.noDriversAvailable());
          return;
        }

        // Notificar a taxistas cercanos
        for (const driver of nearbyDrivers) {
          const driverJid = phoneToJid(driver.phone);
          await recordNotification(ride.id, driver.id);
          await sendMessage(driverJid, driverMessages.newRide(ride, data.pickupAddress));
        }

        clearState(jid);
      } else if (location) {
        // Enviaron otra ubicación en vez de texto → asumir que es nueva ubicación
        const address = await reverseGeocode(location.lat, location.lng);
        setState(jid, 'waiting_destination', {
          ...state.data,
          pickupLat: location.lat,
          pickupLng: location.lng,
          pickupAddress: address,
        });
        await sendMessage(jid, passengerMessages.locationReceived(address));
      } else {
        await sendMessage(jid, '✍️ Escríbeme tu destino (ej: "Mall Plaza Oeste")');
      }
      break;

    default:
      clearState(jid);
      await sendMessage(jid, passengerMessages.welcome());
      break;
  }
}

// ============================================================
// Flujo del TAXISTA
// ============================================================

async function handleDriverMessage(msg, jid, driver) {
  const text = extractText(msg)?.trim().toUpperCase();
  const location = extractLocation(msg);

  // --- Ubicación → actualizar posición ---
  if (location) {
    await updateDriverLocation(driver.id, location.lat, location.lng);
    const address = await reverseGeocode(location.lat, location.lng);
    await sendMessage(jid, driverMessages.locationUpdated(address));
    return;
  }

  // --- Comandos del taxista ---
  switch (text) {
    case 'SI':
    case 'SÍ':
    case 'ACEPTAR': {
      const pendingRide = await getPendingRideForDriver(driver.id);
      if (!pendingRide) {
        await sendMessage(jid, driverMessages.noActiveRide());
        return;
      }

      const result = await acceptRide(pendingRide.id, driver.id);

      if (result.success) {
        // Notificar al taxista
        const passenger = await getPassengerById(result.ride.passenger_id);
        await sendMessage(jid, driverMessages.rideAccepted(passenger));

        // Notificar al pasajero
        const passengerJid = phoneToJid(passenger.phone);
        await sendMessage(passengerJid, passengerMessages.rideAccepted(driver));

        // Enviar ubicación del pasajero al taxista
        if (result.ride.pickup_latitude && result.ride.pickup_longitude) {
          const { sendLocation } = await import('./whatsapp.js');
          await sendLocation(
            jid,
            parseFloat(result.ride.pickup_latitude),
            parseFloat(result.ride.pickup_longitude),
            'Punto de recogida'
          );
        }
      } else {
        await sendMessage(jid, driverMessages.rideAlreadyTaken());
      }
      break;
    }

    case 'NO':
    case 'RECHAZAR': {
      const pendingRide = await getPendingRideForDriver(driver.id);
      if (pendingRide) {
        await rejectRide(pendingRide.id, driver.id);
      }
      await sendMessage(jid, driverMessages.rideRejected());
      break;
    }

    case 'COMPLETAR':
    case 'FINALIZAR': {
      const activeRide = await getActiveRideForDriver(driver.id);
      if (!activeRide) {
        await sendMessage(jid, driverMessages.noActiveRide());
        return;
      }
      await completeRide(activeRide.id);
      await sendMessage(jid, driverMessages.rideCompleted());

      // Notificar al pasajero
      const passenger = await getPassengerById(activeRide.passenger_id || activeRide.passengerId);
      if (passenger) {
        const passengerJid = phoneToJid(passenger.phone);
        await sendMessage(passengerJid, passengerMessages.rideCompleted());
      }
      break;
    }

    case 'CANCELAR': {
      const activeRide = await getActiveRideForDriver(driver.id);
      if (!activeRide) {
        await sendMessage(jid, driverMessages.noActiveRide());
        return;
      }
      await cancelRide(activeRide.id);
      await sendMessage(jid, driverMessages.rideCancelled());

      // Notificar al pasajero
      const passenger = await getPassengerById(activeRide.passenger_id || activeRide.passengerId);
      if (passenger) {
        const passengerJid = phoneToJid(passenger.phone);
        await sendMessage(passengerJid, passengerMessages.rideCancelled());
      }
      break;
    }

    case 'ACTIVO':
      await setDriverActive(driver.id, true);
      await sendMessage(jid, driverMessages.activated());
      break;

    case 'INACTIVO':
      await setDriverActive(driver.id, false);
      await sendMessage(jid, driverMessages.deactivated());
      break;

    case 'ESTADO': {
      const activeRide = await getActiveRideForDriver(driver.id);
      await sendMessage(jid, driverMessages.status(activeRide));
      break;
    }

    case 'AYUDA':
    case 'HELP':
      await sendMessage(jid, driverMessages.help());
      break;

    default:
      await sendMessage(jid, driverMessages.help());
      break;
  }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Extrae el texto de un mensaje de WhatsApp.
 */
function extractText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    null
  );
}

/**
 * Extrae la ubicación de un mensaje de WhatsApp.
 * @returns {{ lat: number, lng: number } | null}
 */
function extractLocation(msg) {
  const loc =
    msg.message?.locationMessage ||
    msg.message?.liveLocationMessage ||
    null;

  if (loc) {
    return {
      lat: loc.degreesLatitude,
      lng: loc.degreesLongitude,
    };
  }
  return null;
}

/**
 * Convierte un teléfono normalizado a JID de WhatsApp.
 * "+56930268900" → "56930268900@s.whatsapp.net"
 */
function phoneToJid(phone) {
  const clean = phone.replace('+', '');
  return `${clean}@s.whatsapp.net`;
}

/**
 * Obtiene un pasajero por ID.
 */
async function getPassengerById(passengerId) {
  const { eq } = await import('drizzle-orm');
  const { getDb } = await import('../db/connection.js');
  const { passengers } = await import('../db/schema.js');
  const db = getDb();
  const result = await db.select().from(passengers).where(eq(passengers.id, passengerId)).limit(1);
  return result.length > 0 ? result[0] : null;
}
