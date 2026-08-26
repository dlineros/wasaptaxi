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
  cancelServiceRequest,
  completeServiceRequest,
  getAuditNotifications,
  getSystemMetrics,
} from '../services/requestsManager.js';
import { getAllCustomers } from '../services/customersManager.js';

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

  // 6. Clientes
  fastify.get('/api/admin/customers', { preHandler: checkAuth }, async () => {
    return await getAllCustomers();
  });

  // 7. Auditoría de Notificaciones
  fastify.get('/api/admin/audit', { preHandler: checkAuth }, async () => {
    return await getAuditNotifications(100);
  });

  // 8. Interfaz Web del Administrador
  fastify.get('/admin', async (request, reply) => {
    reply.type('text/html');
    return renderAdminHtml();
  });
}
