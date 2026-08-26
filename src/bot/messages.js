/**
 * Genera el menú principal de servicios dinámicos.
 */
export function menuMessage(customerName, activeServices) {
  const greeting = customerName ? `¡Hola, *${customerName}*! 👋` : '¡Hola! 👋';
  
  if (!activeServices || activeServices.length === 0) {
    return `${greeting}\n\nActualmente no hay servicios disponibles. Por favor intenta más tarde.`;
  }

  let text = `${greeting}\nBienvenido a nuestra *Red de Servicios* 🇨🇱\n\n¿Qué necesitas hoy? Elige una opción:\n\n`;

  activeServices.forEach((svc, index) => {
    text += `*${index + 1}* - ${svc.emoji} ${svc.name}\n`;
  });

  text += `\n_Responde con el número de tu opción (ej: 1, 2...)._`;
  return text;
}

/**
 * Mensaje de solicitud de detalle según el servicio seleccionado.
 */
export function promptDetailMessage(service) {
  return `${service.emoji} *${service.name}*\n\n${service.promptDetail}\n\n_(Escribe tu respuesta a continuación o escribe *cancelar* para volver al menú)_`;
}

/**
 * Mensaje para solicitar ubicación GPS o dirección.
 */
export function promptLocationMessage(service) {
  return `📍 *Ubicación del Servicio*\n\nPor favor, *comparte tu ubicación actual* por WhatsApp (📎 Ubicación → Enviar mi ubicación actual) o escribe tu dirección exacta con comuna:\n\n_(O escribe *cancelar* para volver)_`;
}

/**
 * Mensaje de confirmación al cliente tras registrar su pedido.
 */
export function requestCreatedClientMessage(service, requestId, detail, address) {
  return `✅ *¡Solicitud #${requestId} Registrada con Éxito!*\n\n` +
    `📦 *Servicio:* ${service.emoji} ${service.name}\n` +
    `📝 *Detalle:* ${detail}\n` +
    (address ? `📍 *Dirección/Origen:* ${address}\n` : '') +
    `\nEstamos notificando a los proveedores disponibles en tu zona. Te avisaremos apenas uno tome tu pedido. ⏳`;
}

/**
 * Notificación enviada a los oferentes/proveedores del rubro.
 */
export function notifyProviderMessage(service, requestId, detail, address, distanceKm) {
  const distText = distanceKm !== null && distanceKm !== undefined ? ` (~${distanceKm.toFixed(1)} km de ti)` : '';
  return `🔔 *NUEVA SOLICITUD DISPONIBLE #${requestId}* 🔔\n\n` +
    `🏷️ *Servicio:* ${service.emoji} ${service.name}\n` +
    `📝 *Detalle:* ${detail}\n` +
    (address ? `📍 *Ubicación:* ${address}${distText}\n` : '') +
    `\n👉 Responde *1* o *tomar ${requestId}* para tomar este pedido inmediatamente.`;
}

/**
 * Mensaje de felicitaciones al oferente que ganó el pedido.
 */
export function providerWonRequestMessage(service, requestId, detail, address, customerName, customerPhone) {
  return `🎉 *¡Tomaste el pedido #${requestId}!* 🎉\n\n` +
    `🏷️ *Servicio:* ${service.emoji} ${service.name}\n` +
    `📝 *Detalle:* ${detail}\n` +
    (address ? `📍 *Dirección:* ${address}\n` : '') +
    `👤 *Cliente:* ${customerName || 'Cliente'}\n` +
    `📞 *Teléfono:* https://wa.me/${customerPhone.replace(/[^0-9]/g, '')}\n\n` +
    `Por favor ponte en contacto con el cliente para coordinar la entrega o el viaje.`;
}

/**
 * Mensaje al oferente si el pedido ya fue tomado por otro.
 */
export function requestAlreadyTakenMessage(requestId) {
  return `⚠️ *Pedido #${requestId} no disponible*\n\nEste pedido ya fue tomado por otro proveedor. ¡Gracias por tu rapidez! Te avisaremos para el próximo. 👍`;
}

/**
 * Mensaje al cliente informando qué oferente tomó su solicitud.
 */
export function clientAssignedMessage(service, requestId, provider) {
  const bizText = provider.businessName ? ` (${provider.businessName})` : '';
  const extra = provider.extraInfo ? `\n🚗 *Datos:* ${provider.extraInfo}` : '';
  return `🎉 *¡Tu solicitud #${requestId} ha sido asignada!* 🎉\n\n` +
    `🏷️ *Servicio:* ${service.emoji} ${service.name}\n` +
    `👤 *Proveedor:* *${provider.name}*${bizText}\n` +
    `📞 *Contacto:* https://wa.me/${provider.phone.replace(/[^0-9]/g, '')}${extra}\n\n` +
    `El proveedor se comunicará contigo en breve. ¡Muchas gracias por preferirnos!`;
}

/**
 * Mensaje de cancelación.
 */
export function requestCancelledMessage(requestId) {
  return `❌ La solicitud #${requestId} ha sido cancelada. Si necesitas otro servicio, escribe *hola*.`;
}

/**
 * Mensaje de ayuda / desconocido.
 */
export function helpMessage() {
  return `ℹ️ Para iniciar una nueva solicitud escribe *hola* o *menú*.\nSi deseas cancelar tu solicitud activa escribe *cancelar*.`;
}
