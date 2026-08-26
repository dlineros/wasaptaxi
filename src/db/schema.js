import { pgTable, serial, varchar, text, boolean, decimal, integer, timestamp } from 'drizzle-orm/pg-core';

// ============================================================
// 1. Servicios (Categorías dinámicas: Taxi, Pellet, Carne...)
// ============================================================
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 50 }).unique().notNull(), // 'taxi', 'pellet', 'carne', 'congelados'
  name: varchar('name', { length: 100 }).notNull(), // 'Pedir Taxi', 'Solicitar Pellet'
  emoji: varchar('emoji', { length: 10 }).default('📦').notNull(), // '🚕', '🪵', '🥩', '❄️'
  description: text('description'),
  promptDetail: text('prompt_detail').notNull(), // Pregunta para el cliente: ej. "¿Qué cantidad de pellet necesitas y a qué dirección?"
  requiresLocation: boolean('requires_location').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// 2. Oferentes / Proveedores (Taxistas, Distribuidores, Carnicerías...)
// ============================================================
export const providers = pgTable('providers', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id').references(() => services.id).notNull(),
  phone: varchar('phone', { length: 20 }).unique().notNull(), // WhatsApp del oferente ej: +56912345678
  name: varchar('name', { length: 100 }).notNull(), // Nombre persona
  businessName: varchar('business_name', { length: 100 }), // Nombre local o negocio
  extraInfo: text('extra_info'), // Patente, auto, capacidad, etc.
  isActive: boolean('is_active').default(true).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  locationUpdatedAt: timestamp('location_updated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// 3. Clientes (Usuarios que piden servicios)
// ============================================================
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 100 }),
  currentStep: varchar('current_step', { length: 50 }).default('IDLE').notNull(), // IDLE, WAITING_DETAIL, WAITING_LOCATION, ACTIVE_REQUEST
  selectedServiceId: integer('selected_service_id').references(() => services.id),
  tempDetail: text('temp_detail'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// 4. Solicitudes / Pedidos de Servicio
// ============================================================
export const serviceRequests = pgTable('service_requests', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id').references(() => services.id).notNull(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  providerId: integer('provider_id').references(() => providers.id), // Oferente que ganó el pedido
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, assigned, completed, cancelled
  requestDetail: text('request_detail'), // Lo que pidió el cliente
  // Ubicación del servicio
  locationLatitude: decimal('location_latitude', { precision: 10, scale: 7 }),
  locationLongitude: decimal('location_longitude', { precision: 10, scale: 7 }),
  locationAddress: text('location_address'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  assignedAt: timestamp('assigned_at'),
  completedAt: timestamp('completed_at'),
  // Optimistic locking para concurrencia
  version: integer('version').default(1).notNull(),
});

// ============================================================
// 5. Notificaciones de Despacho a Oferentes (Auditoría)
// ============================================================
export const requestNotifications = pgTable('request_notifications', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id').references(() => serviceRequests.id).notNull(),
  providerId: integer('provider_id').references(() => providers.id).notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  respondedAt: timestamp('responded_at'),
  response: varchar('response', { length: 20 }), // 'accepted', 'rejected', 'timeout', null
});

// Retrocompatibilidad con nombres anteriores si alguna consulta legacy lo requiere
export const drivers = providers;
export const passengers = customers;
export const rides = serviceRequests;
export const rideNotifications = requestNotifications;
