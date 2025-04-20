import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RouteHistory } from "@shared/schema";
import Chart from "chart.js/auto";
import { Skeleton } from "@/components/ui/skeleton";

interface RouteChartProps {
  routeId: number;
}

export function RouteChart({ routeId }: RouteChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart<"line", any, unknown> | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Get route history data with auto-refresh
  const { data: history, isLoading, error } = useQuery<RouteHistory[]>({
    queryKey: [`/api/routes/${routeId}/history`],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true, // Refresh when window regains focus
  });

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

    // Prepare data for chart
    const labels = sortedHistory.map((item) => {
      const date = new Date(item.timestamp);
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
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
