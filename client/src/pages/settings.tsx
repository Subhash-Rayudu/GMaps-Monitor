import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Setting } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNotification } from "@/hooks/use-notification";

// Form schema for settings
const settingsFormSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  enableNotifications: z.boolean().default(true),
  notificationType: z.enum(["all", "significant", "increase"]),
  historyRetention: z.string(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const { isSupported, permission, requestPermission } = useNotification();

  // Query to fetch settings
  const { data: settings, isLoading, error } = useQuery<Setting>({
    queryKey: ['/api/settings'],
  });

  // Form setup
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      apiKey: settings?.apiKey || "",
      enableNotifications: settings?.enableNotifications ?? true,
      notificationType: settings?.notificationType as "all" | "significant" | "increase" || "all",
      historyRetention: settings?.historyRetention?.toString() || "30",
    },
    values: settings ? {
      apiKey: settings.apiKey || "",
      enableNotifications: settings.enableNotifications,
      notificationType: settings.notificationType as "all" | "significant" | "increase",
      historyRetention: settings.historyRetention?.toString() || "30",
    } : undefined,
  });

  // Mutation to update settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (values: Partial<SettingsFormValues>) => {
      // Convert historyRetention to number if present
      const payload: any = { ...values };
      if (payload.historyRetention) {
        payload.historyRetention = parseInt(payload.historyRetention);
      }
      await apiRequest("PATCH", "/api/settings", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (error) => {
      console.error("Failed to update settings:", error);
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to clear all data
  const clearDataMutation = useMutation({
    mutationFn: async () => {
      // Clear notifications
      await apiRequest("DELETE", "/api/notifications", undefined);
      // We could add more clearing operations here if needed
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Data Cleared",
        description: "All notifications and historical data have been cleared.",
      });
    },
    onError: (error) => {
      console.error("Failed to clear data:", error);
      toast({
        title: "Error",
        description: "Failed to clear data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission for API key form
  const onSubmitApiKey = (values: Partial<SettingsFormValues>) => {
    updateSettingsMutation.mutate({ apiKey: values.apiKey });
  };

  // Handle form submission for notification settings
  const onSubmitNotificationSettings = (values: Partial<SettingsFormValues>) => {
    // Request notification permission if not granted and enabling notifications
    if (isSupported && permission !== "granted" && values.enableNotifications) {
      requestPermission();
    }
    
    updateSettingsMutation.mutate({
      enableNotifications: values.enableNotifications,
      notificationType: values.notificationType,
    });
  };

  // Handle form submission for data settings
  const onSubmitDataSettings = (values: Partial<SettingsFormValues>) => {
    updateSettingsMutation.mutate({
      historyRetention: values.historyRetention,
    });
  };

  if (isLoading) {
    return (
      <div className="tab-content">
        <Card className="bg-white rounded-lg shadow-md mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-medium text-neutral-800 mb-4">Settings</h2>
            <Skeleton className="h-[400px] w-full" />
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
            <h2 className="text-lg font-medium text-neutral-800 mb-4">Settings</h2>
            <span className="material-icons text-4xl text-destructive mb-2">error</span>
            <p className="text-muted-foreground">Error loading settings. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-medium text-neutral-800 mb-4">Settings</h2>
        
        {/* API Configuration */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-neutral-700 mb-3">Google Maps API Configuration</h3>
          <div className="bg-neutral-100 rounded-lg p-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitApiKey)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <div className="flex">
                        <FormControl>
                          <Input
                            {...field}
                            type={showApiKey ? "text" : "password"}
                            placeholder="Enter your Google Maps API key"
                            className="rounded-r-none"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-l-none px-3"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          <span className="material-icons">
                            {showApiKey ? "visibility_off" : "visibility"}
                          </span>
                        </Button>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        To obtain a Google Maps API key, visit the{" "}
                        <a
                          href="https://developers.google.com/maps/documentation/javascript/get-api-key"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Google Maps Platform
                        </a>.
                        <br />
                        <strong>Important:</strong> Make sure to enable both the{" "}
                        <a
                          href="https://console.cloud.google.com/apis/library/distance-matrix-backend.googleapis.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Distance Matrix API
                        </a>{" "}
                        and{" "}
                        <a
                          href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Places API
                        </a>{" "}
                        in your Google Cloud Console.
                      </p>
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90"
                  disabled={updateSettingsMutation.isPending}
                >
                  Update API Key
                </Button>
              </form>
            </Form>
          </div>
        </div>
        
        {/* Notification Settings */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-neutral-700 mb-3">Notification Settings</h3>
          <div className="bg-neutral-100 rounded-lg p-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitNotificationSettings)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="enableNotifications"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormLabel>Enable Browser Notifications</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!isSupported}
                          />
                        </FormControl>
                      </div>
                      <div className="text-sm space-y-1">
                        {!isSupported && (
                          <p className="text-destructive">Browser notifications are not supported on this device.</p>
                        )}
                        {isSupported && permission === 'denied' && (
                          <p className="text-destructive">
                            Notification permission was denied. Please allow notifications in your browser settings to receive alerts.
                          </p>
                        )}
                        {isSupported && permission === 'default' && (
                          <p className="text-muted-foreground">
                            Click to enable notifications and you'll be prompted to allow them.
                          </p>
                        )}
                        {isSupported && permission === 'granted' && (
                          <p className="text-green-600">
                            ✓ Notifications are enabled and will work even when this tab is in the background.
                          </p>
                        )}
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notificationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Preference</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex flex-col space-y-2"
                          disabled={!form.watch("enableNotifications") || !isSupported}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="all" />
                            <label htmlFor="all" className="text-sm">All changes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="significant" id="significant" />
                            <label htmlFor="significant" className="text-sm">Only significant changes (&gt;5 min)</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="increase" id="increase" />
                            <label htmlFor="increase" className="text-sm">Only increases in travel time</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary/90"
                  disabled={updateSettingsMutation.isPending}
                >
                  Save Settings
                </Button>
              </form>
            </Form>
          </div>
        </div>
        
        {/* Data Management */}
        <div>
          <h3 className="text-md font-medium text-neutral-700 mb-3">Data Management</h3>
          <div className="bg-neutral-100 rounded-lg p-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitDataSettings)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="historyRetention"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>History Retention</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select retention period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <div className="flex space-x-3">
                  <Button 
                    type="submit" 
                    className="bg-primary hover:bg-primary/90"
                    disabled={updateSettingsMutation.isPending}
                  >
                    Save Settings
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        type="button" 
                        variant="destructive"
                      >
                        Clear All Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Data</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all notifications and historical data. Are you sure you want to continue?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => clearDataMutation.mutate()}>
                          Clear All Data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </Card>
    </div>
  );
}
