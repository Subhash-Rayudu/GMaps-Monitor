import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RouteHistory } from "@shared/schema";
import Chart from "chart.js/auto";
import { Skeleton } from "@/components/ui/skeleton";
import { browserHistoryStorage } from "@/lib/browser-storage";

interface RouteChartProps {
  routeId: number;
}

export function RouteChart({ routeId }: RouteChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart<"line", any, unknown> | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [browserHistory, setBrowserHistory] = useState<RouteHistory[]>([]);

  // Get settings to check storage preference
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
  });

  const usingBrowserStorage = settings?.storageLocation === 'browser';

  // Get route history data with auto-refresh (only for server storage)
  const { data: serverHistory, isLoading, error } = useQuery<RouteHistory[]>({
    queryKey: [`/api/routes/${routeId}/history`],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true, // Refresh when window regains focus
    enabled: !usingBrowserStorage, // Only fetch from server if not using browser storage
  });

  // For browser storage, load data from localStorage and set up polling
  useEffect(() => {
    if (!usingBrowserStorage) return;

    const loadBrowserHistory = () => {
      const history = browserHistoryStorage.getRouteHistories(routeId);
      setBrowserHistory(history);
    };

    // Load initial data
    loadBrowserHistory();

    // Poll for new data and add to browser storage
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/routes/${routeId}/current-data`);
        if (response.ok) {
          const data = await response.json();
          const newHistory = browserHistoryStorage.addRouteHistory(routeId, {
            routeId: data.routeId,
            travelTime: data.travelTime,
            change: data.change,
            timestamp: new Date(data.timestamp),
          });
          loadBrowserHistory(); // Refresh the display
        }
      } catch (error) {
        console.error('Failed to fetch current route data:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [routeId, usingBrowserStorage]);

  // Use appropriate history source
  const history = usingBrowserStorage ? browserHistory : serverHistory;

  // Set isClient to true on mount to avoid SSR issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create or update chart when data changes
  useEffect(() => {
    if (!isClient || !chartRef.current || !history || history.length === 0) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Sort history by timestamp
    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Prepare data for chart with unique timestamps  
    const labels = sortedHistory.map((item, index) => {
      const date = new Date(item.timestamp);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const seconds = date.getSeconds();
      
      // Create base time string
      const timeString = `${hours}:${minutes.toString().padStart(2, '0')}`;
      
      // Check for duplicates in the current array up to this point
      const previousLabels = sortedHistory.slice(0, index).map(h => {
        const d = new Date(h.timestamp);
        return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
      });
      
      const hasDuplicate = previousLabels.includes(timeString);
      
      if (hasDuplicate) {
        // Show seconds for duplicates
        return `${timeString}:${seconds.toString().padStart(2, '0')}`;
      } else {
        return timeString;
      }
    });

    const travelTimes = sortedHistory.map((item) => item.travelTime);

    // Calculate min and max values for better chart scaling
    const min = Math.max(0, Math.min(...travelTimes) - 5);
    const max = Math.max(...travelTimes) + 5;

    // Create chart
    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Travel Time (min)',
              data: travelTimes,
              borderColor: 'hsl(221, 83%, 53%)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
              ticks: {
                maxTicksLimit: 5,
                maxRotation: 0,
              }
            },
            y: {
              min,
              max,
              ticks: {
                stepSize: 5,
                callback: (value) => `${value} min`,
              },
              title: {
                display: false,
                text: 'Travel Time (minutes)',
              },
            },
          },
        },
      });
    }

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [history, isClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (error || !history) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <span className="material-icons mr-2">error_outline</span>
        <span>Error loading chart data</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <span className="material-icons mr-2">insert_chart</span>
        <span>No data available yet</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <canvas ref={chartRef} />
    </div>
  );
}
