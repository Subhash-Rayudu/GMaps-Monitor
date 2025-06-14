import { 
  User, InsertUser, 
  Route, InsertRoute, 
  RouteHistory, InsertRouteHistory, 
  Notification, InsertNotification,
  Setting, InsertSetting
} from "@shared/schema";

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Route operations
  getRoutes(): Promise<Route[]>;
  getActiveRoutes(): Promise<Route[]>;
  getSavedRoutes(): Promise<Route[]>;
  getRoute(id: number): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  updateRoute(id: number, route: Partial<Route>): Promise<Route | undefined>;
  deleteRoute(id: number): Promise<boolean>;

  // Route history operations
  getRouteHistories(routeId: number): Promise<RouteHistory[]>;
  createRouteHistory(history: InsertRouteHistory): Promise<RouteHistory>;
  deleteRouteHistories(routeId: number): Promise<boolean>;

  // Notification operations
  getNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  deleteNotifications(): Promise<boolean>;

  // Settings operations
  getSettings(): Promise<Setting | undefined>;
  updateSettings(settings: Partial<Setting>): Promise<Setting>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private routes: Map<number, Route>;
  private routeHistories: Map<number, RouteHistory>;
  private notifications: Map<number, Notification>;
  private settings: Setting | undefined;

  private userId: number;
  private routeId: number;
  private routeHistoryId: number;
  private notificationId: number;

  constructor() {
    this.users = new Map();
    this.routes = new Map();
    this.routeHistories = new Map();
    this.notifications = new Map();

    this.userId = 1;
    this.routeId = 1;
    this.routeHistoryId = 1;
    this.notificationId = 1;

    // Create default settings
    this.settings = {
      id: 1,
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
      enableNotifications: true,
      notificationType: "all",
      historyRetention: 30,
    };
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Route operations
  async getRoutes(): Promise<Route[]> {
    return Array.from(this.routes.values());
  }

  async getActiveRoutes(): Promise<Route[]> {
    return Array.from(this.routes.values()).filter(route => route.isActive);
  }

  async getSavedRoutes(): Promise<Route[]> {
    return Array.from(this.routes.values()).filter(route => route.isSaved);
  }

  async getRoute(id: number): Promise<Route | undefined> {
    return this.routes.get(id);
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const id = this.routeId++;
    const now = new Date();
    const route: Route = { 
      ...insertRoute, 
      id, 
      lastChecked: now,
      change: null, // Initialize change as null
    };
    this.routes.set(id, route);
    return route;
  }

  async updateRoute(id: number, updates: Partial<Route>): Promise<Route | undefined> {
    const route = this.routes.get(id);
    if (!route) return undefined;

    const updatedRoute = { ...route, ...updates };
    this.routes.set(id, updatedRoute);
    return updatedRoute;
  }

  async deleteRoute(id: number): Promise<boolean> {
    // Delete route histories first
    await this.deleteRouteHistories(id);
    
    return this.routes.delete(id);
  }

  // Route history operations
  async getRouteHistories(routeId: number): Promise<RouteHistory[]> {
    return Array.from(this.routeHistories.values())
      .filter(history => history.routeId === routeId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createRouteHistory(insertHistory: InsertRouteHistory): Promise<RouteHistory> {
    const id = this.routeHistoryId++;
    const history: RouteHistory = { 
      ...insertHistory, 
      id,
      timestamp: insertHistory.timestamp || new Date()
    };
    this.routeHistories.set(id, history);
    return history;
  }

  async deleteRouteHistories(routeId: number): Promise<boolean> {
    let success = true;
    for (const [id, history] of this.routeHistories.entries()) {
      if (history.routeId === routeId) {
        success = this.routeHistories.delete(id) && success;
      }
    }
    return success;
  }

  // Notification operations
  async getNotifications(): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.notificationId++;
    const notification: Notification = { 
      ...insertNotification, 
      id,
      timestamp: insertNotification.timestamp || new Date()
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }

  async deleteNotifications(): Promise<boolean> {
    this.notifications.clear();
    return true;
  }

  // Settings operations
  async getSettings(): Promise<Setting | undefined> {
    return this.settings;
  }

  async updateSettings(updates: Partial<Setting>): Promise<Setting> {
    if (!this.settings) {
      this.settings = {
        id: 1,
        ...updates,
        enableNotifications: updates.enableNotifications ?? true,
        notificationType: updates.notificationType ?? "all",
        historyRetention: updates.historyRetention ?? 30,
        storageLocation: updates.storageLocation ?? "server",
      };
    } else {
      this.settings = { ...this.settings, ...updates };
    }
    return this.settings;
  }
}

export const storage = new MemStorage();
