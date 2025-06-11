import { pgTable, text, varchar, uuid, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  uid: varchar({ length: 255 }).notNull().unique(),
  email: varchar({ length: 255 }).notNull().unique(),
  displayName: varchar({ length: 255 }),
  photoURL: text(),
  provider: varchar({ length: 50 }).default('google').notNull(),
  requestsUsed: integer().default(0).notNull(),
  requestsLimit: integer().default(1000).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  lastLoginAt: timestamp(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export const apiKeysTable = pgTable("api_keys", {
  id: uuid().primaryKey().defaultRandom(),
  userId: varchar({ length: 255 }).notNull(),
  keyName: varchar({ length: 255 }).notNull(),
  keyValue: varchar({ length: 255 }).notNull().unique(),
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type ApiKey = typeof apiKeysTable.$inferSelect;
export type NewApiKey = typeof apiKeysTable.$inferInsert;
