import { getPool } from '../db/connection.js';

/**
 * Guarda un mensaje en el historial de chat (de cliente, bot o admin).
 */
export async function saveChatMessage({ customerId, requestId = null, sender, messageType = 'text', content, latitude = null, longitude = null }) {
  if (!customerId) return null;
  const pool = getPool();
  const query = `
    INSERT INTO chat_messages (customer_id, request_id, sender, message_type, content, latitude, longitude, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *;
  `;
  const result = await pool.query(query, [
    customerId,
    requestId,
    sender,
    messageType,
    content,
    latitude,
    longitude,
  ]);
  return result.rows[0];
}

/**
 * Obtiene los mensajes asociados a una solicitud específica o al cliente de esa solicitud.
 */
export async function getChatMessagesByRequest(requestId, limit = 100) {
  const pool = getPool();
  
  // Buscar mensajes asociados al request_id o al customer_id de esa solicitud
  const query = `
    SELECT cm.*,
           c.name as customer_name, c.phone as customer_phone
    FROM chat_messages cm
    JOIN customers c ON c.id = cm.customer_id
    WHERE cm.request_id = $1
       OR (cm.customer_id = (SELECT customer_id FROM service_requests WHERE id = $1)
           AND cm.created_at >= (SELECT created_at - INTERVAL '30 minutes' FROM service_requests WHERE id = $1))
    ORDER BY cm.created_at ASC
    LIMIT $2;
  `;
  const result = await pool.query(query, [requestId, limit]);
  return result.rows;
}

/**
 * Obtiene el historial de mensajes de un cliente.
 */
export async function getChatMessagesByCustomer(customerId, limit = 100) {
  const pool = getPool();
  const query = `
    SELECT cm.*,
           c.name as customer_name, c.phone as customer_phone
    FROM chat_messages cm
    JOIN customers c ON c.id = cm.customer_id
    WHERE cm.customer_id = $1
    ORDER BY cm.created_at ASC
    LIMIT $2;
  `;
  const result = await pool.query(query, [customerId, limit]);
  return result.rows;
}
