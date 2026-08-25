import { pgTable, serial, varchar, text, boolean, decimal, integer, timestamp } from 'drizzle-orm/pg-core';

// ============================================================
// Pasajeros
// ============================================================
export const passengers = pgTable('passengers', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// Taxistas
// ============================================================
export const drivers = pgTable('drivers', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  carModel: varchar('car_model', { length: 100 }),
  carPlate: varchar('car_plate', { length: 20 }),
  isActive: boolean('is_active').default(true).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  locationUpdatedAt: timestamp('location_updated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// Carreras
// ============================================================
export const rides = pgTable('rides', {
  id: serial('id').primaryKey(),
  passengerId: integer('passenger_id').references(() => passengers.id).notNull(),
  driverId: integer('driver_id').references(() => drivers.id),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  // Ubicación de recogida
  pickupLatitude: decimal('pickup_latitude', { precision: 10, scale: 7 }),
  pickupLongitude: decimal('pickup_longitude', { precision: 10, scale: 7 }),
  pickupAddress: text('pickup_address'),
  // Destino
  destinationText: text('destination_text'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at'),
  completedAt: timestamp('completed_at'),
  // Optimistic locking para concurrencia
  version: integer('version').default(1).notNull(),
});

// ============================================================
// Notificaciones enviadas a taxistas (tracking)
// ============================================================
export const rideNotifications = pgTable('ride_notifications', {
  id: serial('id').primaryKey(),
  rideId: integer('ride_id').references(() => rides.id).notNull(),
  driverId: integer('driver_id').references(() => drivers.id).notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  respondedAt: timestamp('responded_at'),
  response: varchar('response', { length: 20 }), // 'accepted', 'rejected', null (sin respuesta)
});
