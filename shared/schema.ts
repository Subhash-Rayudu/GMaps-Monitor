import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Routes schema for storing route information
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  destination: text("destination").notNull(),
  interval: integer("interval").notNull().default(5), // in minutes
  isActive: boolean("is_active").notNull().default(false),
  isSaved: boolean("is_saved").notNull().default(false),
  lastChecked: timestamp("last_checked"),
  currentTime: integer("current_time"), // in minutes
  minTime: integer("min_time"), // in minutes
  maxTime: integer("max_time"), // in minutes
  avgTime: integer("avg_time"), // in minutes
  change: integer("change"), // change from previous check in minutes (positive = increase, negative = decrease)
  sourceDetails: jsonb("source_details"), // details like lat/lng, formatted_address
  destinationDetails: jsonb("destination_details"), // details like lat/lng, formatted_address
});

export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
  lastChecked: true,
});

// Route history schema for storing historical travel time data
export const routeHistories = pgTable("route_histories", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  travelTime: integer("travel_time").notNull(), // in minutes
  change: integer("change"), // change from previous check in minutes, can be positive or negative
});

export const insertRouteHistorySchema = createInsertSchema(routeHistories).omit({
  id: true,
});

// Notifications schema for storing notification history
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  type: text("type").notNull(), // 'increase', 'decrease', 'new', etc.
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
});

// Settings schema for storing user preferences
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  apiKey: text("api_key"),
  enableNotifications: boolean("enable_notifications").notNull().default(true),
  notificationType: text("notification_type").notNull().default("all"), // 'all', 'significant', 'increase'
  historyRetention: integer("history_retention").notNull().default(30), // in days
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Route = typeof routes.$inferSelect;
export type InsertRoute = z.infer<typeof insertRouteSchema>;

export type RouteHistory = typeof routeHistories.$inferSelect;
export type InsertRouteHistory = z.infer<typeof insertRouteHistorySchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingsSchema>;

// Extended schemas for form validation
export const routeFormSchema = insertRouteSchema.extend({
  name: z.string().min(1, "Route name is required"),
  source: z.string().min(1, "Source location is required"),
  destination: z.string().min(1, "Destination location is required"),
  interval: z.number().min(1).max(60),
});

export const settingsFormSchema = insertSettingsSchema.extend({
  apiKey: z.string().min(1, "API key is required"),
});
