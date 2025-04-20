import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Route } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteChart } from "./route-chart";
import { formatDuration, formatTimeChange, getTimeChangeColorClass, getTimeChangeIcon, formatRelativeTime } from "@/lib/google-maps";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function ActiveMonitoring() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch active routes with auto-refresh
  const { data: routes, isLoading, error } = useQuery<Route[]>({
    queryKey: ['/api/routes/active'],
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchOnWindowFocus: true, // Refresh when window regains focus
  });

  // Mutation to stop monitoring a route
  const stopMonitoringMutation = useMutation({
    mutationFn: async (routeId: number) => {
      await apiRequest("PATCH", `/api/routes/${routeId}`, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routes/active'] });
      toast({
        title: "Monitoring Stopped",
        description: "Route monitoring has been stopped.",
      });
    },
    onError: (error) => {
      console.error("Failed to stop monitoring:", error);
      toast({
        title: "Error",
        description: "Failed to stop monitoring route.",
        variant: "destructive",
      });
    },
  });

  // Mutation to manually check a route
  const checkRouteMutation = useMutation({
    mutationFn: async (routeId: number) => {
      await apiRequest("POST", `/api/routes/${routeId}/check`, {});
    },
    onSuccess: (_, routeId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/routes/active'] });
      queryClient.invalidateQueries({ queryKey: [`/api/routes/${routeId}/history`] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Route Checked",
        description: "Travel time has been updated.",
      });
    },
    onError: (error) => {
      console.error("Failed to check route:", error);
      toast({
        title: "Error",
        description: "Failed to check route travel time.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-medium text-neutral-800 mb-4">Active Monitoring</h2>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[250px] w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-medium text-neutral-800 mb-4">Active Monitoring</h2>
        <Card>
          <CardContent className="p-6 text-center">
            <span className="material-icons text-4xl text-destructive mb-2">error</span>
            <p className="text-muted-foreground">Error loading active routes. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium text-neutral-800 mb-4">Active Monitoring</h2>
      
      {/* Empty state */}
      {(!routes || routes.length === 0) && (
        <Card>
          <CardContent className="p-6 text-center">
            <span className="material-icons text-4xl text-muted-foreground mb-2">route</span>
            <p className="text-muted-foreground">No routes being monitored. Add a route above to begin monitoring.</p>
          </CardContent>
        </Card>
      )}
      
      {/* Active routes */}
      {routes && routes.map(route => (
        <Card key={route.id} className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex justify-between items-start">
            <div className="max-w-[80%]">
              <h3 className="font-medium text-neutral-800 break-words">{route.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">Checking every {route.interval} minutes</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-primary" 
                title="Check now"
                onClick={() => checkRouteMutation.mutate(route.id)}
                disabled={checkRouteMutation.isPending}
              >
                <span className="material-icons">refresh</span>
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive" 
                    title="Stop monitoring"
                  >
                    <span className="material-icons">stop_circle</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Stop Monitoring</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to stop monitoring this route? You can restart it later from the saved routes page.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => stopMonitoringMutation.mutate(route.id)}>
                      Stop Monitoring
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          <div className="mt-4 flex flex-col md:flex-row gap-4">
            {/* Current Travel Info */}
            <div className="bg-neutral-100 rounded-lg p-4 flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-neutral-700">Current Travel Time</span>
                <span className="text-xs text-muted-foreground">
                  {route.lastChecked ? `Last updated: ${formatRelativeTime(route.lastChecked)}` : 'Not checked yet'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-neutral-800">{route.currentTime || '-'}</span>
                  <span className="ml-1 text-muted-foreground">min</span>
                </div>
                {route.currentTime && (
                  <div className={`flex items-center ${getTimeChangeColorClass(route.change)}`}>
                    <span className="material-icons text-xl">{getTimeChangeIcon(route.change)}</span>
                    <span className="text-sm font-medium">{formatTimeChange(route.change)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Min/Max Info */}
            <div className="bg-neutral-100 rounded-lg p-4 flex-1">
              <div className="text-sm font-medium text-neutral-700 mb-3">Travel Time Range</div>
              <div className="flex justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Minimum</div>
                  <div className="flex items-center text-accent">
                    <span className="text-lg font-bold">{route.minTime || '-'}</span>
                    <span className="ml-1 text-sm">min</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Maximum</div>
                  <div className="flex items-center text-destructive">
                    <span className="text-lg font-bold">{route.maxTime || '-'}</span>
                    <span className="ml-1 text-sm">min</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Average</div>
                  <div className="flex items-center text-primary">
                    <span className="text-lg font-bold">{route.avgTime || '-'}</span>
                    <span className="ml-1 text-sm">min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Chart */}
          <div className="mt-4 chart-container h-48 bg-white border border-neutral-200 rounded-lg p-2">
            <RouteChart routeId={route.id} />
          </div>
          
          {/* Route Details */}
          <div className="mt-4 flex items-center text-sm text-muted-foreground">
            <span className="material-icons text-muted-foreground text-lg mr-1">location_on</span>
            <span>{route.source}</span>
            <span className="mx-2">→</span>
            <span className="material-icons text-muted-foreground text-lg mr-1">flag</span>
            <span>{route.destination}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
