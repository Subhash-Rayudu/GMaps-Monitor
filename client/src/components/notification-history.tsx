import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useNotification } from "@/hooks/use-notification";
import { Notification } from "@shared/schema";
import { formatRelativeTime } from "@/lib/google-maps";
import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function NotificationHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { showNotification, permission, requestPermission } = useNotification();
  const [latestNotificationId, setLatestNotificationId] = useState<number | null>(null);

  // Query to fetch notifications with auto-refresh
  const { data: notifications, isLoading, error } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true, // Refresh when window regains focus
  });

  // Mutation to clear all notifications
  const clearNotificationsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/notifications", undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Notifications Cleared",
        description: "All notifications have been cleared.",
      });
    },
    onError: (error) => {
      console.error("Failed to clear notifications:", error);
      toast({
        title: "Error",
        description: "Failed to clear notifications.",
        variant: "destructive",
      });
    },
  });

  // Check for new notifications and show browser notification
  useEffect(() => {
    if (!notifications || notifications.length === 0 || permission !== 'granted') return;

    const latestNotification = notifications[0];
    if (latestNotification && latestNotificationId !== null && latestNotification.id > latestNotificationId) {
      showNotification("GMaps Monitor", {
        body: latestNotification.message,
        icon: "/favicon.ico",
      });
    }

    if (notifications.length > 0) {
      setLatestNotificationId(notifications[0].id);
    }
  }, [notifications, permission, latestNotificationId, showNotification]);

  // Request notification permission if not granted
  useEffect(() => {
    if (permission === 'default') {
      // Wait for user interaction before requesting
      const handleInteraction = () => {
        requestPermission();
        // Clean up after requesting once
        document.removeEventListener('click', handleInteraction);
      };
      
      document.addEventListener('click', handleInteraction, { once: true });
      
      return () => {
        document.removeEventListener('click', handleInteraction);
      };
    }
  }, [permission, requestPermission]);

  // Helper function to get the icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'increase':
        return <span className="material-icons text-destructive mt-0.5 mr-2">arrow_upward</span>;
      case 'decrease':
        return <span className="material-icons text-accent mt-0.5 mr-2">arrow_downward</span>;
      case 'new':
        return <span className="material-icons text-primary mt-0.5 mr-2">add_circle</span>;
      case 'unchanged':
        return <span className="material-icons text-primary mt-0.5 mr-2">schedule</span>;
      default:
        return <span className="material-icons text-primary mt-0.5 mr-2">notifications</span>;
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-neutral-800">Recent Notifications</h2>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="p-4">
              <Skeleton className="h-20 w-full mb-2" />
              <Skeleton className="h-20 w-full mb-2" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-neutral-800">Recent Notifications</h2>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <span className="material-icons text-4xl text-destructive mb-2">error</span>
            <p className="text-muted-foreground">Error loading notifications. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-neutral-800">Recent Notifications</h2>
        
        {notifications && notifications.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-sm text-primary font-medium hover:text-primary/80 flex items-center">
                <span className="material-icons text-sm mr-1">delete_outline</span>
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Notifications</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to clear all notifications? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => clearNotificationsMutation.mutate()}>
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      
      <Card className="bg-white rounded-lg shadow-md overflow-hidden">
        {(!notifications || notifications.length === 0) ? (
          <CardContent className="p-6 text-center">
            <span className="material-icons text-4xl text-muted-foreground mb-2">notifications_none</span>
            <p className="text-muted-foreground">No notifications yet. They will appear here when route conditions change.</p>
          </CardContent>
        ) : (
          <ScrollArea className="max-h-64">
            {notifications.map((notification) => (
              <div key={notification.id} className="notification p-4 border-b border-neutral-200 last:border-b-0 hover:bg-neutral-50">
                <div className="flex justify-between items-start">
                  <div className="flex items-start flex-grow min-w-0">
                    {getNotificationIcon(notification.type)}
                    <div className="min-w-0">
                      <p className="text-neutral-800 font-medium">
                        {notification.type === 'increase' && 'Travel time increased'}
                        {notification.type === 'decrease' && 'Travel time decreased'}
                        {notification.type === 'new' && 'Started monitoring route'}
                        {notification.type === 'unchanged' && 'Travel time unchanged'}
                        {!['increase', 'decrease', 'new', 'unchanged'].includes(notification.type) && 'Notification'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 break-words">{notification.message}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(notification.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
