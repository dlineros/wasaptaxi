/**
 * Templates de mensajes en español (Chile) para el bot de WasapTaxi.
 * Todos los mensajes se definen aquí para facilitar cambios.
 */

// ============================================================
// Mensajes para PASAJEROS
// ============================================================

export const passengerMessages = {
  welcome: () =>
    `🚕 *¡Hola! Soy WasapTaxi*\n\n` +
    `Puedo ayudarte a pedir un taxi.\n\n` +
    `📍 *Envíame tu ubicación* para comenzar.\n` +
    `_(Toca el clip 📎 → Ubicación → Ubicación en tiempo real o actual)_`,

  welcomeBack: (name) =>
    `🚕 *¡Hola de nuevo${name ? ', ' + name : ''}!*\n\n` +
    `¿Necesitas otro taxi?\n` +
    `📍 Envíame tu ubicación para comenzar.`,

  locationReceived: (address) =>
    `✅ *Ubicación recibida*\n` +
    `📍 ${address}\n\n` +
    `🏁 ¿A dónde vas? Escríbeme tu destino.`,

  searchingDriver: (destination) =>
    `🔍 *Buscando taxista cerca de ti...*\n` +
    `🏁 Destino: ${destination}\n\n` +
    `Te aviso apenas encuentre uno. ⏳`,

  driverFound: (driver) =>
    `🚕 *¡Taxista encontrado!*\n\n` +
    `👤 *${driver.name}*\n` +
    `🚗 ${driver.carModel || 'Auto'} — ${driver.carPlate || 'S/P'}\n` +
    `📱 ${driver.phone}\n\n` +
    `Tu taxista viene en camino. 🎉`,

  noDriversAvailable: () =>
    `😔 *No hay taxistas disponibles en este momento.*\n\n` +
    `Intenta de nuevo en unos minutos.\n` +
    `Envíame tu ubicación cuando quieras volver a intentar.`,

  rideAccepted: (driver) =>
    `✅ *¡Carrera confirmada!*\n\n` +
    `Tu taxista *${driver.name}* viene en camino.\n` +
    `🚗 ${driver.carModel || 'Auto'} — ${driver.carPlate || 'S/P'}\n` +
    `📱 ${driver.phone}\n\n` +
    `Escribe *CANCELAR* si necesitas cancelar.`,

  rideCancelled: () =>
    `❌ *Carrera cancelada.*\n\n` +
    `Si necesitas otro taxi, envíame tu ubicación. 📍`,

  rideCompleted: () =>
    `✅ *¡Carrera finalizada!*\n\n` +
    `Gracias por usar WasapTaxi. 🚕\n` +
    `¿Necesitas otro taxi? Envíame tu ubicación.`,

  alreadyHaveActiveRide: () =>
    `⚠️ Ya tienes una carrera activa.\n\n` +
    `Escribe *CANCELAR* para cancelarla antes de pedir otra.\n` +
    `Escribe *ESTADO* para ver el estado de tu carrera.`,

  rideStatus: (ride, driver) => {
    const statusMap = {
      pending: '🔍 Buscando taxista...',
      accepted: `🚕 Taxista en camino — *${driver?.name || 'Asignado'}*`,
    };
    return `📋 *Estado de tu carrera*\n\n` +
      `${statusMap[ride.status] || ride.status}\n` +
      `🏁 Destino: ${ride.destination_text || ride.destinationText || 'No definido'}`;
  },

  unknownMessage: () =>
    `🤔 No entendí tu mensaje.\n\n` +
    `Puedes:\n` +
    `📍 Enviar tu *ubicación* para pedir un taxi\n` +
    `✍️ Escribir *CANCELAR* para cancelar una carrera\n` +
    `📋 Escribir *ESTADO* para ver tu carrera activa`,
};

// ============================================================
// Mensajes para TAXISTAS
// ============================================================

export const driverMessages = {
  newRide: (ride, address) =>
    `🚕 *¡Nueva carrera disponible!*\n\n` +
    `📍 Origen: ${address || 'Ubicación compartida'}\n` +
    `🏁 Destino: ${ride.destinationText || ride.destination_text || 'Por confirmar'}\n\n` +
    `¿Aceptas? Responde *SI* o *NO*`,

  rideAccepted: (passenger) =>
    `✅ *¡Carrera aceptada!*\n\n` +
    `📱 Pasajero: ${passenger.phone}\n` +
    `${passenger.name ? '👤 ' + passenger.name + '\n' : ''}` +
    `\nDirígete al punto de recogida. 🚗\n\n` +
    `Escribe *COMPLETAR* cuando termines la carrera.\n` +
    `Escribe *CANCELAR* para cancelar.`,

  rideAlreadyTaken: () =>
    `⚠️ *Lo siento, esta carrera ya fue tomada por otro taxista.*\n\n` +
    `Te avisaré cuando haya otra carrera disponible.`,

  rideRejected: () =>
    `👍 Entendido. Te avisaré de la próxima carrera.`,

  rideCompleted: () =>
    `✅ *¡Carrera finalizada!*\n\n` +
    `Gracias, estás disponible para nuevas carreras.`,

  rideCancelled: () =>
    `❌ *Carrera cancelada.*\n\n` +
    `Estás disponible para nuevas carreras.`,

  activated: () =>
    `✅ *Estás activo.* Recibirás notificaciones de carreras.`,

  deactivated: () =>
    `⏸️ *Estás inactivo.* No recibirás más carreras.\n` +
    `Escribe *ACTIVO* para volver a recibir.`,

  locationUpdated: (address) =>
    `📍 Ubicación actualizada${address ? ': ' + address : ''}.`,

  help: () =>
    `🚕 *Comandos disponibles:*\n\n` +
    `📍 Envía tu *ubicación* para actualizar tu posición\n` +
    `*SI* / *NO* — Aceptar o rechazar carrera\n` +
    `*COMPLETAR* — Finalizar carrera actual\n` +
    `*CANCELAR* — Cancelar carrera actual\n` +
    `*ACTIVO* — Activarte para recibir carreras\n` +
    `*INACTIVO* — Desactivarte temporalmente\n` +
    `*ESTADO* — Ver tu carrera actual`,

  noActiveRide: () =>
    `ℹ️ No tienes ninguna carrera activa en este momento.`,

  status: (ride) => {
    if (!ride) return driverMessages.noActiveRide();
    return `📋 *Tu carrera actual*\n\n` +
      `🏁 Destino: ${ride.destination_text || ride.destinationText}\n` +
      `📊 Estado: En curso`;
  },
};
