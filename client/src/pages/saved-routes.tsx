import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Route } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function SavedRoutes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch saved routes
  const { data: routes, isLoading, error } = useQuery<Route[]>({
    queryKey: ['/api/routes/saved'],
  });

  // Mutation to start monitoring a route
  const startMonitoringMutation = useMutation({
    mutationFn: async (routeId: number) => {
      await apiRequest("PATCH", `/api/routes/${routeId}`, { isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routes/saved'] });
      queryClient.invalidateQueries({ queryKey: ['/api/routes/active'] });
      toast({
        title: "Monitoring Started",
        description: "Route monitoring has been started.",
      });
    },
    onError: (error) => {
      console.error("Failed to start monitoring:", error);
      toast({
        title: "Error",
        description: "Failed to start monitoring route.",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a route
  const deleteRouteMutation = useMutation({
    mutationFn: async (routeId: number) => {
      await apiRequest("DELETE", `/api/routes/${routeId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routes/saved'] });
      toast({
        title: "Route Deleted",
        description: "The route has been deleted.",
      });
    },
    onError: (error) => {
      console.error("Failed to delete route:", error);
      toast({
        title: "Error",
        description: "Failed to delete route.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="tab-content">
        <Card className="bg-white rounded-lg shadow-md mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-medium text-neutral-800 mb-4">Your Saved Routes</h2>
            <Skeleton className="h-20 w-full mb-4" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tab-content">
        <Card className="bg-white rounded-lg shadow-md mb-6">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-medium text-neutral-800 mb-4">Your Saved Routes</h2>
            <span className="material-icons text-4xl text-destructive mb-2">error</span>
            <p className="text-muted-foreground">Error loading saved routes. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <Card className="bg-white rounded-lg shadow-md mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-medium text-neutral-800 mb-4">Your Saved Routes</h2>
          
          {(!routes || routes.length === 0) ? (
            <div className="py-8 text-center">
              <span className="material-icons text-4xl text-muted-foreground mb-2">bookmark_border</span>
              <p className="text-muted-foreground">No saved routes yet. Save a route while monitoring to add it here.</p>
            </div>
          ) : (
            routes.map((route) => (
              <div 
                key={route.id} 
                className="border-b border-neutral-200 last:border-b-0 py-4 flex flex-col sm:flex-row justify-between items-start gap-4"
              >
                <div className="max-w-[80%]">
                  <h3 className="font-medium text-neutral-800 break-words">{route.name}</h3>
                  <div className="flex items-center mt-1 text-sm text-muted-foreground flex-wrap">
                    <span className="material-icons text-muted-foreground text-sm mr-1">location_on</span>
                    <span className="mr-2">{route.source}</span>
                    <span className="mx-2">→</span>
                    <span className="material-icons text-muted-foreground text-sm mr-1">flag</span>
                    <span>{route.destination}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    className="bg-primary text-white hover:bg-primary/90 flex items-center"
                    onClick={() => startMonitoringMutation.mutate(route.id)}
                    disabled={startMonitoringMutation.isPending || route.isActive}
                  >
                    <span className="material-icons text-sm mr-1">play_arrow</span>
                    {route.isActive ? "Monitoring" : "Monitor"}
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive" 
                        title="Delete route"
                      >
                        <span className="material-icons">delete</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Route</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this route? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteRouteMutation.mutate(route.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
