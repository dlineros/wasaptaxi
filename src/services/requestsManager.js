import { getPool } from '../db/connection.js';

/**
 * Crea una nueva solicitud de servicio.
 */
export async function createServiceRequest({ customerId, serviceId, requestDetail, locationLatitude, locationLongitude, locationAddress }) {
  const pool = getPool();
  const query = `
    INSERT INTO service_requests (service_id, customer_id, request_detail, location_latitude, location_longitude, location_address, status, created_at, version)
    VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), 1)
    RETURNING *;
  `;
  const result = await pool.query(query, [
    serviceId,
    customerId,
    requestDetail,
    locationLatitude || null,
    locationLongitude || null,
    locationAddress || null,
  ]);
  return result.rows[0];
}

/**
 * Acepta una solicitud de forma segura con control de concurrencia (SELECT ... FOR UPDATE).
 * Solo el primer oferente en ejecutar la transacción gana la orden.
 */
export async function acceptServiceRequest(requestId, providerId) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock de la fila con FOR UPDATE
    const selectQuery = `
      SELECT sr.*, s.name as service_name, s.emoji as service_emoji,
             c.phone as customer_phone, c.name as customer_name
      FROM service_requests sr
      JOIN services s ON s.id = sr.service_id
      JOIN customers c ON c.id = sr.customer_id
      WHERE sr.id = $1
      FOR UPDATE;
    `;
    const result = await client.query(selectQuery, [requestId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, reason: 'not_found' };
    }

    const request = result.rows[0];

    // Verificar si ya fue asignada o cancelada
    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return { success: false, reason: 'already_taken', currentStatus: request.status };
    }

    // Actualizar estado y asignar al oferente
    const updateQuery = `
      UPDATE service_requests
      SET status = 'assigned',
          provider_id = $1,
          assigned_at = NOW(),
          version = version + 1
      WHERE id = $2
      RETURNING *;
    `;
    const updated = await client.query(updateQuery, [providerId, requestId]);

    // Registrar en auditoría que este oferente aceptó
    await client.query(`
      UPDATE request_notifications
      SET responded_at = NOW(), response = 'accepted'
      WHERE request_id = $1 AND provider_id = $2;
    `, [requestId, providerId]);

    // Registrar rechazo/timeout para los demás que tenían pendiente
    await client.query(`
      UPDATE request_notifications
      SET responded_at = NOW(), response = 'taken_by_other'
      WHERE request_id = $1 AND provider_id != $2 AND response IS NULL;
    `, [requestId, providerId]);

    await client.query('COMMIT');

    return {
      success: true,
      request: {
        ...updated.rows[0],
        serviceName: request.service_name,
        serviceEmoji: request.service_emoji,
        customerPhone: request.customer_phone,
        customerName: request.customer_name,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Obtiene una solicitud por su ID con todos sus detalles.
 */
export async function getRequestById(id) {
  const pool = getPool();
  const query = `
    SELECT sr.*,
           s.name as service_name, s.emoji as service_emoji, s.slug as service_slug,
           c.name as customer_name, c.phone as customer_phone,
           p.name as provider_name, p.business_name as provider_business, p.phone as provider_phone
    FROM service_requests sr
    JOIN services s ON s.id = sr.service_id
    JOIN customers c ON c.id = sr.customer_id
    LEFT JOIN providers p ON p.id = sr.provider_id
    WHERE sr.id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Actualiza los campos de una solicitud (detalle, dirección, oferente asignado, estado).
 */
export async function updateServiceRequest(id, { requestDetail, locationAddress, locationLatitude, locationLongitude, providerId, status }) {
  const pool = getPool();

  const updates = [];
  const params = [];
  let pIndex = 1;

  if (requestDetail !== undefined) {
    updates.push(`request_detail = $${pIndex++}`);
    params.push(requestDetail);
  }
  if (locationAddress !== undefined) {
    updates.push(`location_address = $${pIndex++}`);
    params.push(locationAddress);
  }
  if (locationLatitude !== undefined) {
    updates.push(`location_latitude = $${pIndex++}`);
    params.push(locationLatitude ? locationLatitude.toString() : null);
  }
  if (locationLongitude !== undefined) {
    updates.push(`location_longitude = $${pIndex++}`);
    params.push(locationLongitude ? locationLongitude.toString() : null);
  }
  if (providerId !== undefined) {
    updates.push(`provider_id = $${pIndex++}`);
    params.push(providerId ? parseInt(providerId, 10) : null);
    if (providerId) {
      updates.push(`assigned_at = NOW()`);
    }
  }
  if (status !== undefined) {
    updates.push(`status = $${pIndex++}`);
    params.push(status);
    if (status === 'completed' || status === 'cancelled') {
      updates.push(`completed_at = NOW()`);
    }
  }

  updates.push(`version = version + 1`);
  params.push(id);

  const query = `
    UPDATE service_requests
    SET ${updates.join(', ')}
    WHERE id = $${pIndex}
    RETURNING *;
  `;

  const result = await pool.query(query, params);
  return result.rows[0];
}

/**
 * Registra el envío de una notificación a un oferente.
 */
export async function logNotification(requestId, providerId) {
  const pool = getPool();
  await pool.query(`
    INSERT INTO request_notifications (request_id, provider_id, sent_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT DO NOTHING;
  `, [requestId, providerId]);
}

/**
 * Obtiene la solicitud activa más reciente de un cliente.
 */
export async function getActiveRequestForCustomer(customerId) {
  const pool = getPool();
  const query = `
    SELECT sr.*, s.name as service_name, s.emoji as service_emoji,
           p.name as provider_name, p.business_name as provider_business, p.phone as provider_phone
    FROM service_requests sr
    JOIN services s ON s.id = sr.service_id
    LEFT JOIN providers p ON p.id = sr.provider_id
    WHERE sr.customer_id = $1 AND sr.status IN ('pending', 'assigned')
    ORDER BY sr.created_at DESC
    LIMIT 1;
  `;
  const result = await pool.query(query, [customerId]);
  return result.rows[0] || null;
}

/**
 * Obtiene la solicitud más reciente ofrecida a un oferente que esté pendiente.
 */
export async function getLatestPendingOfferForProvider(providerId) {
  const pool = getPool();
  const query = `
    SELECT sr.*, s.name as service_name, s.emoji as service_emoji,
           c.phone as customer_phone, c.name as customer_name
    FROM service_requests sr
    JOIN request_notifications rn ON rn.request_id = sr.id
    JOIN services s ON s.id = sr.service_id
    JOIN customers c ON c.id = sr.customer_id
    WHERE rn.provider_id = $1 AND sr.status = 'pending'
    ORDER BY rn.sent_at DESC
    LIMIT 1;
  `;
  const result = await pool.query(query, [providerId]);
  return result.rows[0] || null;
}

/**
 * Cancela una solicitud.
 */
export async function cancelServiceRequest(requestId, reason = 'cancelled_by_user') {
  const pool = getPool();
  const result = await pool.query(`
    UPDATE service_requests
    SET status = 'cancelled', completed_at = NOW(), version = version + 1
    WHERE id = $1
    RETURNING *;
  `, [requestId]);
  return result.rows[0];
}

/**
 * Marca una solicitud como completada.
 */
export async function completeServiceRequest(requestId) {
  const pool = getPool();
  const result = await pool.query(`
    UPDATE service_requests
    SET status = 'completed', completed_at = NOW(), version = version + 1
    WHERE id = $1
    RETURNING *;
  `, [requestId]);
  return result.rows[0];
}

/**
 * Obtiene todas las solicitudes con filtros para el panel admin.
 */
export async function getAllRequests({ serviceId, status, limit = 50 } = {}) {
  const pool = getPool();
  let conditions = [];
  let params = [];
  let pIndex = 1;

  if (serviceId) {
    conditions.push(`sr.service_id = $${pIndex++}`);
    params.push(serviceId);
  }
  if (status) {
    conditions.push(`sr.status = $${pIndex++}`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);

  const query = `
    SELECT sr.*,
           s.name as service_name, s.emoji as service_emoji, s.slug as service_slug,
           c.name as customer_name, c.phone as customer_phone,
           p.name as provider_name, p.business_name as provider_business, p.phone as provider_phone
    FROM service_requests sr
    JOIN services s ON s.id = sr.service_id
    JOIN customers c ON c.id = sr.customer_id
    LEFT JOIN providers p ON p.id = sr.provider_id
    ${whereClause}
    ORDER BY sr.created_at DESC
    LIMIT $${pIndex};
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Obtiene logs de auditoría de notificaciones.
 */
export async function getAuditNotifications(limit = 100) {
  const pool = getPool();
  const query = `
    SELECT rn.*,
           sr.status as request_status, sr.request_detail,
           s.name as service_name, s.emoji as service_emoji,
           p.name as provider_name, p.business_name as provider_business, p.phone as provider_phone,
           c.phone as customer_phone
    FROM request_notifications rn
    JOIN service_requests sr ON sr.id = rn.request_id
    JOIN services s ON s.id = sr.service_id
    JOIN providers p ON p.id = rn.provider_id
    JOIN customers c ON c.id = sr.customer_id
    ORDER BY rn.sent_at DESC
    LIMIT $1;
  `;
  const result = await pool.query(query, [limit]);
  return result.rows;
}

/**
 * Retorna métricas generales del sistema.
 */
export async function getSystemMetrics() {
  const pool = getPool();

  const [servicesCount, providersCount, activeProvidersCount, todayRequests, pendingRequests, completedRequests] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM services WHERE is_active = true;'),
    pool.query('SELECT COUNT(*) FROM providers;'),
    pool.query('SELECT COUNT(*) FROM providers WHERE is_active = true;'),
    pool.query("SELECT COUNT(*) FROM service_requests WHERE created_at >= CURRENT_DATE;"),
    pool.query("SELECT COUNT(*) FROM service_requests WHERE status = 'pending';"),
    pool.query("SELECT COUNT(*) FROM service_requests WHERE status = 'completed' AND created_at >= CURRENT_DATE;"),
  ]);

  return {
    activeServices: parseInt(servicesCount.rows[0].count, 10),
    totalProviders: parseInt(providersCount.rows[0].count, 10),
    activeProviders: parseInt(activeProvidersCount.rows[0].count, 10),
    todayRequests: parseInt(todayRequests.rows[0].count, 10),
    pendingRequests: parseInt(pendingRequests.rows[0].count, 10),
    completedToday: parseInt(completedRequests.rows[0].count, 10),
  };
}
