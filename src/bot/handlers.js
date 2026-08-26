import { getActiveServices, getServiceById } from '../services/servicesManager.js';
import {
  findProviderByPhone,
  updateProviderLocation,
  findNearbyProviders,
} from '../services/providersManager.js';
import {
  findOrCreateCustomer,
  updateCustomerStep,
} from '../services/customersManager.js';
import {
  createServiceRequest,
  acceptServiceRequest,
  cancelServiceRequest,
  getActiveRequestForCustomer,
  getLatestPendingOfferForProvider,
  logNotification,
} from '../services/requestsManager.js';
import { geocodeAddress, reverseGeocode } from '../services/geocoding.js';
import { sendMessage, sendLocation } from './whatsapp.js';
import * as msg from './messages.js';

/**
 * Enrutador principal de mensajes de WhatsApp.
 */
export async function handleMessage(msgObj) {
  const jid = msgObj.key.remoteJid;
  const phone = jid.replace('@s.whatsapp.net', '');
  const pushName = msgObj.pushName || 'Usuario';

  // Extraer texto o ubicación del payload de Baileys
  const messageContent = msgObj.message;
  const text = (
    messageContent?.conversation ||
    messageContent?.extendedTextMessage?.text ||
    ''
  ).trim();

  const locationMsg =
    messageContent?.locationMessage ||
    messageContent?.liveLocationMessage;

  const lowerText = text.toLowerCase();

  // ============================================================
  // 1. ¿Es un Oferente / Proveedor registrado?
  // ============================================================
  const provider = await findProviderByPhone(phone);

  if (provider) {
    // Si el oferente envía ubicación GPS, actualizar su posición
    if (locationMsg) {
      const { degreesLatitude: lat, degreesLongitude: lng } = locationMsg;
      await updateProviderLocation(phone, lat, lng);
      await sendMessage(jid, `📍 Ubicación actualizada como proveedor de *${provider.serviceEmoji} ${provider.serviceName}*. ¡Gracias!`);
      return;
    }

    // Si el oferente escribe "1" o "tomar [id]" o "aceptar [id]"
    if (text === '1' || lowerText.startsWith('tomar') || lowerText.startsWith('aceptar')) {
      let targetRequestId = null;

      const parts = text.split(/\s+/);
      if (parts.length > 1 && !isNaN(parseInt(parts[1], 10))) {
        targetRequestId = parseInt(parts[1], 10);
      } else {
        // Si solo escribió "1", buscar la oferta pendiente más reciente para este proveedor
        const pendingOffer = await getLatestPendingOfferForProvider(provider.id);
        if (pendingOffer) {
          targetRequestId = pendingOffer.id;
        }
      }

      if (!targetRequestId) {
        await sendMessage(jid, '⚠️ No tienes solicitudes pendientes activas en este momento o el pedido ya expiró.');
        return;
      }

      // Intentar aceptar con transacción y lock
      const acceptResult = await acceptServiceRequest(targetRequestId, provider.id);

      if (acceptResult.success) {
        const req = acceptResult.request;
        const service = await getServiceById(req.service_id);

        // Notificar al oferente ganador
        await sendMessage(
          jid,
          msg.providerWonRequestMessage(
            service,
            req.id,
            req.request_detail,
            req.location_address,
            req.customerName,
            req.customerPhone
          )
        );

        // Si el pedido tiene coordenadas GPS, enviarle el pin de ubicación al oferente
        if (req.location_latitude && req.location_longitude) {
          await sendLocation(
            jid,
            parseFloat(req.location_latitude),
            parseFloat(req.location_longitude),
            `Ubicación Pedido #${req.id}`
          );
        }

        // Notificar al cliente
        const customerJid = `${req.customerPhone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        await sendMessage(
          customerJid,
          msg.clientAssignedMessage(service, req.id, provider)
        );

        // Actualizar paso del cliente a IDLE
        await updateCustomerStep(req.customerPhone, 'IDLE');
        return;
      } else {
        // Pedido tomado por otro
        await sendMessage(jid, msg.requestAlreadyTakenMessage(targetRequestId));
        return;
      }
    }
  }

  // ============================================================
  // 2. Flujo de Clientes (Solicitudes de Servicios)
  // ============================================================
  const customer = await findOrCreateCustomer(phone, pushName);
  const activeServices = await getActiveServices();

  // Comando global: CANCELAR
  if (lowerText === 'cancelar' || lowerText === 'salir') {
    const activeReq = await getActiveRequestForCustomer(customer.id);
    if (activeReq && activeReq.status === 'pending') {
      await cancelServiceRequest(activeReq.id);
      await sendMessage(jid, msg.requestCancelledMessage(activeReq.id));
    } else {
      await sendMessage(jid, 'ℹ️ Operación cancelada. Escribe *hola* para ver el menú.');
    }
    await updateCustomerStep(phone, 'IDLE', null, null);
    return;
  }

  // Comando global: HOLA o MENÚ
  if (lowerText === 'hola' || lowerText === 'menu' || lowerText === 'menú' || lowerText === 'inicio' || customer.currentStep === 'IDLE') {
    await updateCustomerStep(phone, 'MENU', null, null);
    await sendMessage(jid, msg.menuMessage(customer.name || pushName, activeServices));
    return;
  }

  // ------------------------------------------------------------
  // PASO 1: SELECCIÓN DEL MENÚ
  // ------------------------------------------------------------
  if (customer.currentStep === 'MENU') {
    const selectionIndex = parseInt(text, 10) - 1;

    if (!isNaN(selectionIndex) && selectionIndex >= 0 && selectionIndex < activeServices.length) {
      const chosenService = activeServices[selectionIndex];

      // Avanzar al paso de detalle
      await updateCustomerStep(phone, 'WAITING_DETAIL', chosenService.id, null);
      await sendMessage(jid, msg.promptDetailMessage(chosenService));
      return;
    } else {
      await sendMessage(jid, `⚠️ Opción no válida. Por favor responde con un número del 1 al ${activeServices.length}.\n\n` + msg.menuMessage(customer.name, activeServices));
      return;
    }
  }

  // ------------------------------------------------------------
  // PASO 2: RECIBIR DETALLE DEL PEDIDO / DESTINO
  // ------------------------------------------------------------
  if (customer.currentStep === 'WAITING_DETAIL') {
    const service = await getServiceById(customer.selectedServiceId);
    if (!service) {
      await updateCustomerStep(phone, 'IDLE');
      await sendMessage(jid, '⚠️ El servicio ya no está disponible. Escribe *hola* para reiniciar.');
      return;
    }

    if (!text || text.length < 2) {
      await sendMessage(jid, '⚠️ Por favor ingresa una descripción o detalle válido para tu solicitud.');
      return;
    }

    const detailText = text;

    if (service.requiresLocation) {
      // Guardar detalle y pedir ubicación
      await updateCustomerStep(phone, 'WAITING_LOCATION', service.id, detailText);
      await sendMessage(jid, msg.promptLocationMessage(service));
      return;
    } else {
      // Si el servicio no requiere ubicación GPS, crear la solicitud de inmediato
      await finalizeAndDispatchService(jid, customer, service, detailText, null, null, null);
      return;
    }
  }

  // ------------------------------------------------------------
  // PASO 3: RECIBIR UBICACIÓN GPS O DIRECCIÓN EN TEXTO
  // ------------------------------------------------------------
  if (customer.currentStep === 'WAITING_LOCATION') {
    const service = await getServiceById(customer.selectedServiceId);
    if (!service) {
      await updateCustomerStep(phone, 'IDLE');
      await sendMessage(jid, '⚠️ Error en la sesión. Escribe *hola* para reiniciar.');
      return;
    }

    let lat = null;
    let lng = null;
    let address = null;

    if (locationMsg) {
      lat = locationMsg.degreesLatitude;
      lng = locationMsg.degreesLongitude;
      const rev = await reverseGeocode(lat, lng);
      address = rev.formattedAddress || 'Ubicación GPS compartida';
    } else if (text && text.length > 3) {
      address = text;
      const geo = await geocodeAddress(address);
      if (geo.latitude && geo.longitude) {
        lat = geo.latitude;
        lng = geo.longitude;
        address = geo.formattedAddress;
      }
    } else {
      await sendMessage(jid, '⚠️ Por favor comparte tu ubicación actual o escribe tu dirección.');
      return;
    }

    await finalizeAndDispatchService(jid, customer, service, customer.tempDetail, lat, lng, address);
    return;
  }

  // Respuesta por defecto
  await sendMessage(jid, msg.helpMessage());
}

/**
 * Crea la solicitud en la base de datos y la despacha a los oferentes del rubro.
 */
async function finalizeAndDispatchService(jid, customer, service, detailText, lat, lng, address) {
  // 1. Crear solicitud en estado 'pending'
  const newRequest = await createServiceRequest({
    customerId: customer.id,
    serviceId: service.id,
    requestDetail: detailText,
    locationLatitude: lat,
    locationLongitude: lng,
    locationAddress: address,
  });

  // 2. Actualizar estado del cliente
  await updateCustomerStep(customer.phone, 'ACTIVE_REQUEST', service.id, null);

  // 3. Confirmar al cliente
  await sendMessage(
    jid,
    msg.requestCreatedClientMessage(service, newRequest.id, detailText, address)
  );

  // 4. Buscar oferentes activos de este servicio
  const nearbyProviders = await findNearbyProviders(service.id, lat, lng);
  console.log(`📢 Despachando solicitud #${newRequest.id} (${service.name}) a ${nearbyProviders.length} proveedores.`);

  // 5. Notificar a cada oferente por WhatsApp
  for (const prov of nearbyProviders) {
    try {
      const provJid = `${prov.phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      await sendMessage(
        provJid,
        msg.notifyProviderMessage(service, newRequest.id, detailText, address, prov.distance_km)
      );

      // Si hay ubicación GPS, enviar también el pin
      if (lat && lng) {
        await sendLocation(
          provJid,
          parseFloat(lat),
          parseFloat(lng),
          `Ubicación Pedido #${newRequest.id}`
        );
      }

      // Registrar notificación en auditoría
      await logNotification(newRequest.id, prov.id);
    } catch (err) {
      console.error(`Error notificando a proveedor ${prov.phone}:`, err.message);
    }
  }
}
