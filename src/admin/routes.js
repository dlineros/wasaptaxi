import { config } from '../config/env.js';
import { renderAdminHtml } from './views/admin.html.js';
import {
  getAllServices,
  createService,
  updateService,
  deleteService,
} from '../services/servicesManager.js';
import {
  getAllProviders,
  createProvider,
  updateProvider,
  deleteProvider,
} from '../services/providersManager.js';
import {
  getAllRequests,
  getRequestById,
  updateServiceRequest,
  cancelServiceRequest,
  completeServiceRequest,
  getAuditNotifications,
  getSystemMetrics,
} from '../services/requestsManager.js';
import {
  saveChatMessage,
  getChatMessagesByRequest,
  getChatMessagesByCustomer,
} from '../services/chatManager.js';
import { getAllCustomers } from '../services/customersManager.js';
import { sendMessage } from '../bot/whatsapp.js';

/**
 * Registra todas las rutas del panel de administración en Fastify.
 */
export async function registerAdminRoutes(fastify) {
  // Middleware de autenticación simple para endpoints API de admin
  const checkAuth = async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      reply.status(401).send({ error: 'No autorizado' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    // El token es una firma simple de la clave de administrador
    if (token !== `admin_${config.adminPassword}`) {
      reply.status(401).send({ error: 'Token inválido' });
      return;
    }
  };

  // 1. Login
  fastify.post('/api/admin/login', async (request, reply) => {
    const { password } = request.body || {};
    if (password === config.adminPassword) {
      return {
        success: true,
        token: `admin_${config.adminPassword}`,
      };
    } else {
      reply.status(401);
      return { success: false, error: 'Contraseña incorrecta' };
    }
  });

  // 2. Métricas Dashboard
  fastify.get('/api/admin/metrics', { preHandler: checkAuth }, async () => {
    return await getSystemMetrics();
  });

  // 3. CRUD Servicios
  fastify.get('/api/admin/services', { preHandler: checkAuth }, async () => {
    return await getAllServices();
  });

  fastify.post('/api/admin/services', { preHandler: checkAuth }, async (request) => {
    return await createService(request.body);
  });

  fastify.put('/api/admin/services/:id', { preHandler: checkAuth }, async (request) => {
    const id = parseInt(request.params.id, 10);
    return await updateService(id, request.body);
  });

  fastify.delete('/api/admin/services/:id', { preHandler: checkAuth }, async (request) => {
    const id = parseInt(request.params.id, 10);
    return await deleteService(id);
  });

  // 4. CRUD Oferentes
  fastify.get('/api/admin/providers', { preHandler: checkAuth }, async (request) => {
    const serviceId = request.query.serviceId ? parseInt(request.query.serviceId, 10) : null;
    return await getAllProviders(serviceId);
  });

  fastify.post('/api/admin/providers', { preHandler: checkAuth }, async (request) => {
    return await createProvider(request.body);
  });

  fastify.put('/api/admin/providers/:id', { preHandler: checkAuth }, async (request) => {
    const id = parseInt(request.params.id, 10);
    return await updateProvider(id, request.body);
  });

  fastify.delete('/api/admin/providers/:id', { preHandler: checkAuth }, async (request) => {
    const id = parseInt(request.params.id, 10);
    return await deleteProvider(id);
  });

  // 5. Solicitudes / Pedidos
  fastify.get('/api/admin/requests', { preHandler: checkAuth }, async (request) => {
    const { status, serviceId } = request.query;
    return await getAllRequests({
      status,
      serviceId: serviceId ? parseInt(serviceId, 10) : null,
      limit: 100,
    });
  });

  fastify.get('/api/admin/requests/:id', { preHandler: checkAuth }, async (request) => {
    const id = parseInt(request.params.id, 10);
    return await getRequestById(id);
  });

  // Edición completa de una solicitud (Detalle, Ubicación, Oferente asignado, Estado)
  fastify.put('/api/admin/requests/:id', { preHandler: checkAuth }, async (request) => {
    const id = parseInt(request.params.id, 10);
    return await updateServiceRequest(id, request.body);
  });

  fastify.put('/api/admin/requests/:id/status', { preHandler: checkAuth }, async (request) => {
    const id = parseInt(request.params.id, 10);
    const { status } = request.body || {};
    if (status === 'completed') {
      return await completeServiceRequest(id);
    } else if (status === 'cancelled') {
      return await cancelServiceRequest(id, 'admin_cancelled');
    }
    return { success: false, error: 'Estado no soportado' };
  });

  // 6. Live Chat (Mensajes y Respuesta en Vivo)
  fastify.get('/api/admin/requests/:id/messages', { preHandler: checkAuth }, async (request) => {
    const id = parseInt(request.params.id, 10);
    return await getChatMessagesByRequest(id);
  });

  fastify.get('/api/admin/customers/:id/messages', { preHandler: checkAuth }, async (request) => {
    const id = parseInt(request.params.id, 10);
    return await getChatMessagesByCustomer(id);
  });

  // Enviar mensaje directo de WhatsApp desde el panel de administración al cliente
  fastify.post('/api/admin/chat/send', { preHandler: checkAuth }, async (request, reply) => {
    const { phone, customerId, requestId, message } = request.body || {};
    if ((!phone && !customerId && !requestId) || !message || !message.trim()) {
      reply.status(400);
      return { success: false, error: 'Destinatario y mensaje son requeridos' };
    }

    try {
      let targetPhone = phone;
      let targetCustomerId = customerId;

      if (!targetPhone && requestId) {
        const req = await getRequestById(parseInt(requestId, 10));
        if (req) {
          targetPhone = req.customer_phone;
          targetCustomerId = req.customer_id;
        }
      }

      if (!targetCustomerId && targetPhone) {
        const cust = await findOrCreateCustomer(targetPhone);
        targetCustomerId = cust?.id;
      }

      if (!targetPhone) {
        reply.status(400);
        return { success: false, error: 'No se encontró el teléfono del cliente' };
      }

      const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
      const jid = `${cleanPhone}@s.whatsapp.net`;

      // 1. Enviar vía Baileys socket
      await sendMessage(jid, message.trim());

      // 2. Guardar en base de datos con sender: 'admin'
      const saved = await saveChatMessage({
        customerId: targetCustomerId ? parseInt(targetCustomerId, 10) : null,
        requestId: requestId ? parseInt(requestId, 10) : null,
        sender: 'admin',
        content: message.trim(),
      });

      return { success: true, message: saved };
    } catch (error) {
      console.error('Error enviando mensaje manual desde admin:', error);
      reply.status(400);
      return { success: false, error: error.message };
    }
  });

  // 7. Clientes
  fastify.get('/api/admin/customers', { preHandler: checkAuth }, async () => {
    return await getAllCustomers();
  });

  // 8. Auditoría de Notificaciones
  fastify.get('/api/admin/audit', { preHandler: checkAuth }, async () => {
    return await getAuditNotifications(100);
  });

  // 9. Interfaz Web del Administrador
  fastify.get('/admin', async (request, reply) => {
    reply.type('text/html');
    return renderAdminHtml();
  });
}
