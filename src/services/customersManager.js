import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db/connection.js';
import { customers, services } from '../db/schema.js';

/**
 * Busca o crea un cliente por su número de teléfono.
 */
export async function findOrCreateCustomer(phone, name = null) {
  const db = getDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, '');

  let customer = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, cleanPhone))
    .limit(1);

  if (customer.length > 0) {
    if (name && customer[0].name !== name) {
      const updated = await db
        .update(customers)
        .set({ name })
        .where(eq(customers.id, customer[0].id))
        .returning();
      return updated[0];
    }
    return customer[0];
  }

  const newCustomer = await db
    .insert(customers)
    .values({
      phone: cleanPhone,
      name,
      currentStep: 'IDLE',
    })
    .returning();

  return newCustomer[0];
}

/**
 * Actualiza el paso conversacional del cliente.
 */
export async function updateCustomerStep(phone, step, serviceId = null, tempDetail = null) {
  const db = getDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, '');

  const data = { currentStep: step };
  if (serviceId !== undefined) data.selectedServiceId = serviceId;
  if (tempDetail !== undefined) data.tempDetail = tempDetail;

  const result = await db
    .update(customers)
    .set(data)
    .where(eq(customers.phone, cleanPhone))
    .returning();

  return result[0];
}

/**
 * Obtiene el cliente por teléfono.
 */
export async function getCustomerByPhone(phone) {
  const db = getDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, cleanPhone))
    .limit(1);

  return result[0] || null;
}

/**
 * Obtiene todos los clientes para el panel admin.
 */
export async function getAllCustomers() {
  const db = getDb();
  return await db
    .select({
      id: customers.id,
      phone: customers.phone,
      name: customers.name,
      currentStep: customers.currentStep,
      selectedServiceId: customers.selectedServiceId,
      serviceName: services.name,
      serviceEmoji: services.emoji,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .leftJoin(services, eq(customers.selectedServiceId, services.id))
    .orderBy(desc(customers.createdAt));
}
