import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRouteSchema, insertSettingsSchema } from "@shared/schema";
import { getTravelTime } from "./google-api";
import { ZodError } from "zod";
import schedule from "node-schedule";

// Map to store scheduled jobs
const scheduledJobs: Map<number, schedule.Job> = new Map();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize the app
  app.get("/api/init", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      const activeRoutes = await storage.getActiveRoutes();
      
      // Use environment variable for API key if available, otherwise fallback to settings
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || settings?.apiKey;
      
      // Update settings with environment API key if it exists
      if (process.env.GOOGLE_MAPS_API_KEY && (!settings?.apiKey || settings.apiKey !== process.env.GOOGLE_MAPS_API_KEY)) {
        await storage.updateSettings({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
      }
      
      // Schedule monitoring for active routes
      for (const route of activeRoutes) {
        scheduleRouteMonitoring(route.id);
      }
      
      return res.json({
        apiKeyConfigured: !!apiKey,
        activeRoutesCount: activeRoutes.length,
      });
    } catch (error) {
      console.error("Error initializing app:", error);
      return res.status(500).json({ message: "Failed to initialize app" });
    }
  });

  // Routes API
  app.get("/api/routes", async (_req, res) => {
    try {
      const routes = await storage.getRoutes();
      return res.json(routes);
    } catch (error) {
      console.error("Error fetching routes:", error);
      return res.status(500).json({ message: "Failed to fetch routes" });
    }
  });

  app.get("/api/routes/active", async (_req, res) => {
    try {
      const routes = await storage.getActiveRoutes();
      return res.json(routes);
    } catch (error) {
      console.error("Error fetching active routes:", error);
      return res.status(500).json({ message: "Failed to fetch active routes" });
    }
  });

  app.get("/api/routes/saved", async (_req, res) => {
    try {
      const routes = await storage.getSavedRoutes();
      return res.json(routes);
    } catch (error) {
      console.error("Error fetching saved routes:", error);
      return res.status(500).json({ message: "Failed to fetch saved routes" });
    }
  });

  app.get("/api/routes/:id", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      if (isNaN(routeId)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }

      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      return res.json(route);
    } catch (error) {
      console.error(`Error fetching route ${req.params.id}:`, error);
      return res.status(500).json({ message: "Failed to fetch route" });
    }
  });

  app.post("/api/routes", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings?.apiKey) {
        return res.status(400).json({ message: "API key not configured" });
      }

      // Ensure the route name is not truncated before saving
      const validatedData = insertRouteSchema.parse(req.body);
      
      // Create new route
      const route = await storage.createRoute(validatedData);
      
      // If the route is active, schedule monitoring
      if (route.isActive) {
        scheduleRouteMonitoring(route.id);
      }
      
      // Check initial travel time
      await checkRouteTime(route.id);
      
      return res.status(201).json(route);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating route:", error);
      return res.status(500).json({ message: "Failed to create route" });
    }
  });

  app.patch("/api/routes/:id", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      if (isNaN(routeId)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }

      const route = await storage.getRoute(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }

      // Update route
      const updatedRoute = await storage.updateRoute(routeId, req.body);
      
      // Handle scheduling based on isActive change
      if (req.body.isActive !== undefined) {
        if (req.body.isActive) {
          scheduleRouteMonitoring(routeId);
        } else {
          // Cancel scheduled job if route is no longer active
          const job = scheduledJobs.get(routeId);
          if (job) {
            job.cancel();
            scheduledJobs.delete(routeId);
          }
        }
      }
      
      // If the interval changed and the route is active, reschedule
      if (req.body.interval !== undefined && (updatedRoute?.isActive || false)) {
        const job = scheduledJobs.get(routeId);
        if (job) {
          job.cancel();
          scheduledJobs.delete(routeId);
        }
        scheduleRouteMonitoring(routeId);
      }
      
      return res.json(updatedRoute);
    } catch (error) {
      console.error(`Error updating route ${req.params.id}:`, error);
      return res.status(500).json({ message: "Failed to update route" });
    }
  });

  app.delete("/api/routes/:id", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      if (isNaN(routeId)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }

      // Cancel scheduled job if exists
      const job = scheduledJobs.get(routeId);
      if (job) {
        job.cancel();
        scheduledJobs.delete(routeId);
      }

      // Delete route
      const success = await storage.deleteRoute(routeId);
      if (!success) {
        return res.status(404).json({ message: "Route not found" });
      }

      return res.status(204).send();
    } catch (error) {
      console.error(`Error deleting route ${req.params.id}:`, error);
      return res.status(500).json({ message: "Failed to delete route" });
    }
  });

  // Route History API
  app.get("/api/routes/:id/history", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      if (isNaN(routeId)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }

      const history = await storage.getRouteHistories(routeId);
      return res.json(history);
    } catch (error) {
      console.error(`Error fetching history for route ${req.params.id}:`, error);
      return res.status(500).json({ message: "Failed to fetch route history" });
    }
  });

  app.post("/api/routes/:id/check", async (req, res) => {
    try {
      const routeId = parseInt(req.params.id);
      if (isNaN(routeId)) {
        return res.status(400).json({ message: "Invalid route ID" });
      }

      const result = await checkRouteTime(routeId);
      if (!result) {
        return res.status(404).json({ message: "Route not found or check failed" });
      }

      return res.json(result);
    } catch (error) {
      console.error(`Error checking route ${req.params.id}:`, error);
      return res.status(500).json({ message: "Failed to check route" });
    }
  });

  // Notifications API
  app.get("/api/notifications", async (_req, res) => {
    try {
      const notifications = await storage.getNotifications();
      return res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.delete("/api/notifications", async (_req, res) => {
    try {
      await storage.deleteNotifications();
      return res.status(204).send();
    } catch (error) {
      console.error("Error clearing notifications:", error);
      return res.status(500).json({ message: "Failed to clear notifications" });
    }
  });

  // Settings API
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      return res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      return res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const validatedData = insertSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSettings(validatedData);
      return res.json(settings);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating settings:", error);
      return res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Place autocomplete proxy to help with CORS
  app.get("/api/place-autocomplete", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings?.apiKey) {
        return res.status(400).json({ message: "API key not configured" });
      }

      const { input } = req.query;
      if (!input || typeof input !== "string") {
        return res.status(400).json({ message: "Input parameter is required" });
      }

      // Import dynamically to avoid circular dependencies
      const { getPlacePredictions } = await import("./google-api");
      const predictions = await getPlacePredictions(input, settings.apiKey);
      
      if (!predictions) {
        return res.status(500).json({ message: "Failed to fetch place predictions" });
      }

      return res.json(predictions);
    } catch (error) {
      console.error("Error fetching place predictions:", error);
      return res.status(500).json({ message: "Failed to fetch place predictions" });
    }
  });

  return httpServer;
}

// Helper function to schedule route monitoring
function scheduleRouteMonitoring(routeId: number): void {
  // Cancel any existing job for this route
  const existingJob = scheduledJobs.get(routeId);
  if (existingJob) {
    existingJob.cancel();
  }

  // Create a new job
  storage.getRoute(routeId).then(route => {
    if (!route || !route.isActive) {
      return;
    }

    // Schedule job to run every X minutes based on route interval
    const job = schedule.scheduleJob(`*/${route.interval} * * * *`, async () => {
      await checkRouteTime(routeId);
    });

    scheduledJobs.set(routeId, job);
    console.log(`Scheduled monitoring for route ${routeId} every ${route.interval} minutes`);
  }).catch(error => {
    console.error(`Error scheduling monitoring for route ${routeId}:`, error);
  });
}

// Helper function to check route travel time
async function checkRouteTime(routeId: number): Promise<{ route: any; history: any; notification: any } | null> {
  try {
    const route = await storage.getRoute(routeId);
    if (!route) {
      return null;
    }

    const settings = await storage.getSettings();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || settings?.apiKey;
    if (!apiKey) {
      console.error(`Cannot check route ${routeId}: API key not configured`);
      return null;
    }

    // Call Google Maps API to get travel time
    const travelTimeResult = await getTravelTime(route.source, route.destination, apiKey);
    if (!travelTimeResult) {
      console.error(`Failed to get travel time for route ${routeId}`);
      return null;
    }

    const { durationMinutes } = travelTimeResult;

    // Always use latest duration from Google Maps
    const previousTime = route.currentTime;
    const timeChange = previousTime !== null ? durationMinutes - previousTime : null;
    
    // Create route history entry
    const history = await storage.createRouteHistory({
      routeId,
      travelTime: durationMinutes,
      timestamp: new Date(),
      change: timeChange,
    });

    // Update route with new travel time and min/max/avg
    const minTime = route.minTime ? Math.min(route.minTime, durationMinutes) : durationMinutes;
    const maxTime = route.maxTime ? Math.max(route.maxTime, durationMinutes) : durationMinutes;
    
    // Calculate average from all histories
    const allHistories = await storage.getRouteHistories(routeId);
    const sum = allHistories.reduce((acc, h) => acc + h.travelTime, 0);
    const avgTime = Math.round(sum / allHistories.length);
    
    // Update route with new information
    const updatedRoute = await storage.updateRoute(routeId, {
      currentTime: durationMinutes,
      minTime,
      maxTime,
      avgTime,
      change: timeChange,
      lastChecked: new Date(),
    });

    // Create notification if there's a change in travel time
    let notification = null;
    if (timeChange !== null) {
      let notificationType: string;
      let message: string;
      
      // Format route name to avoid truncation in notifications
      const routeName = route.name;
      
      if (timeChange > 0) {
        notificationType = "increase";
        message = `${routeName}: Travel time increased to ${durationMinutes} min (+${timeChange} min)`;
      } else if (timeChange < 0) {
        notificationType = "decrease";
        message = `${routeName}: Travel time decreased to ${durationMinutes} min (${timeChange} min)`;
      } else {
        notificationType = "unchanged";
        message = `${routeName}: Travel time unchanged at ${durationMinutes} min`;
      }
      
      // Check notification preferences
      let shouldNotify = false;
      
      if (settings.enableNotifications) {
        switch (settings.notificationType) {
          case "all":
            shouldNotify = true;
            break;
          case "significant":
            shouldNotify = Math.abs(timeChange) >= 5;
            break;
          case "increase":
            shouldNotify = timeChange > 0;
            break;
        }
      }
      
      if (shouldNotify) {
        notification = await storage.createNotification({
          routeId,
          type: notificationType,
          message,
          timestamp: new Date(),
          isRead: false,
        });
      }
    } else {
      // This is the first check for this route
      const routeName = route.name;
      notification = await storage.createNotification({
        routeId,
        type: "new",
        message: `${routeName}: Started monitoring route. Initial travel time: ${durationMinutes} min`,
        timestamp: new Date(),
        isRead: false,
      });
    }

    return {
      route: updatedRoute,
      history,
      notification,
    };
  } catch (error) {
    console.error(`Error checking route ${routeId}:`, error);
    return null;
  }
}
