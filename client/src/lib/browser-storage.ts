import type { RouteHistory, InsertRouteHistory } from '@/../../shared/schema';

const ROUTE_HISTORY_KEY = 'route_monitoring_history';
const STORAGE_VERSION = '1.0';

interface StoredHistoryData {
  version: string;
  histories: Record<number, RouteHistory[]>; // routeId -> RouteHistory[]
}

class BrowserHistoryStorage {
  private getStorageData(): StoredHistoryData {
    try {
      const data = localStorage.getItem(ROUTE_HISTORY_KEY);
      if (!data) {
        return { version: STORAGE_VERSION, histories: {} };
      }
      
      const parsed = JSON.parse(data) as StoredHistoryData;
      
      // Handle version migrations if needed
      if (parsed.version !== STORAGE_VERSION) {
        return { version: STORAGE_VERSION, histories: {} };
      }
      
      return parsed;
    } catch (error) {
      console.error('Error reading browser storage:', error);
      return { version: STORAGE_VERSION, histories: {} };
    }
  }

  private setStorageData(data: StoredHistoryData): void {
    try {
      localStorage.setItem(ROUTE_HISTORY_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error writing to browser storage:', error);
    }
  }

  getRouteHistories(routeId: number): RouteHistory[] {
    const data = this.getStorageData();
    return data.histories[routeId] || [];
  }

  addRouteHistory(routeId: number, history: InsertRouteHistory): RouteHistory {
    const data = this.getStorageData();
    
    if (!data.histories[routeId]) {
      data.histories[routeId] = [];
    }

    // Generate a unique ID based on timestamp and random
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const newHistory: RouteHistory = {
      id,
      routeId,
      timestamp: new Date(),
      travelTime: history.travelTime,
      change: history.change ?? null,
    };

    data.histories[routeId].unshift(newHistory);
    
    // Limit history to prevent storage bloat (keep last 1000 entries per route)
    if (data.histories[routeId].length > 1000) {
      data.histories[routeId] = data.histories[routeId].slice(0, 1000);
    }

    this.setStorageData(data);
    return newHistory;
  }

  deleteRouteHistories(routeId: number): void {
    const data = this.getStorageData();
    delete data.histories[routeId];
    this.setStorageData(data);
  }

  clearAllHistories(): void {
    const data: StoredHistoryData = { version: STORAGE_VERSION, histories: {} };
    this.setStorageData(data);
  }

  getStorageSize(): number {
    try {
      const data = localStorage.getItem(ROUTE_HISTORY_KEY);
      return data ? new Blob([data]).size : 0;
    } catch {
      return 0;
    }
  }

  exportHistories(): string {
    const data = this.getStorageData();
    return JSON.stringify(data, null, 2);
  }

  importHistories(jsonData: string): boolean {
    try {
      const parsed = JSON.parse(jsonData) as StoredHistoryData;
      if (parsed.version && parsed.histories) {
        this.setStorageData(parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const browserHistoryStorage = new BrowserHistoryStorage();