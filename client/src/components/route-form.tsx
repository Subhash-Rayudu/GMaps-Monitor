import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { MapAutocomplete } from "@/components/ui/map-autocomplete";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Form schema for route
const routeFormSchema = z.object({
  name: z.string().min(1, "Route name is required"),
  source: z.string().min(1, "Source location is required"),
  destination: z.string().min(1, "Destination location is required"),
  interval: z.number().min(1).max(60),
  isActive: z.boolean().default(true),
  isSaved: z.boolean().default(false),
});

type RouteFormValues = z.infer<typeof routeFormSchema>;

const defaultValues: RouteFormValues = {
  name: "",
  source: "",
  destination: "",
  interval: 5,
  isActive: true,
  isSaved: false,
};

export function RouteForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [intervalDisplay, setIntervalDisplay] = useState("5 min");

  // Form setup
  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues,
  });

  // Create route mutation
  const createRouteMutation = useMutation({
    mutationFn: async (values: RouteFormValues) => {
      // Ensure names are not truncated on submission
      console.log("Submitting route with name:", values.name);
      return await apiRequest("POST", "/api/routes", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/routes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/routes/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/routes/saved'] });
      
      toast({
        title: "Route Added",
        description: "Your new route is now being monitored.",
      });
      
      form.reset(defaultValues);
    },
    onError: (error) => {
      console.error("Failed to add route:", error);
      toast({
        title: "Error",
        description: "Failed to add route. Please verify your API key is set up correctly.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: RouteFormValues) => {
    createRouteMutation.mutate(values);
  };

  // Handle interval slider change
  const handleIntervalChange = (value: number[]) => {
    form.setValue("interval", value[0]);
    setIntervalDisplay(`${value[0]} min`);
  };

  // Helper to generate a route name if not provided
  const generateRouteName = () => {
    const source = form.getValues("source");
    const destination = form.getValues("destination");
    
    if (source && destination) {
      // Extract location names before the first comma
      const getLocationName = (location: string) => {
        return location.split(',')[0].trim();
      };
      
      const sourceName = getLocationName(source);
      const destName = getLocationName(destination);
      
      return `${sourceName} to ${destName}`;
    }
    
    return "";
  };

  // Auto-generate route name when both locations are filled
  const handleLocationChange = () => {
    const source = form.getValues("source");
    const destination = form.getValues("destination");
    
    if (source && destination) {
      const routeName = `${source.split(',')[0]} to ${destination.split(',')[0]}`;
      form.setValue("name", routeName, { shouldDirty: true });
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow-md mb-6">
      <CardContent className="p-6">
        <h2 className="text-lg font-medium text-neutral-800 mb-4">Add New Route to Monitor</h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-medium">Source Location</FormLabel>
                    <FormControl>
                      <MapAutocomplete
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                        }}
                        placeholder="Enter starting location"
                        icon="location_on"
                        error={!!form.formState.errors.source}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-medium">Destination Location</FormLabel>
                    <FormControl>
                      <MapAutocomplete
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          // Generate route name when destination is entered and source exists
                          const formValues = form.getValues();
                          if (formValues.source && value) {
                            handleLocationChange();
                          }
                        }}
                        placeholder="Enter destination location"
                        icon="flag"
                        error={!!form.formState.errors.destination}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium">Route Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter a name for this route"
                      className={form.formState.errors.name ? "border-destructive" : ""}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium">Check Interval (minutes)</FormLabel>
                  <div className="flex items-center">
                    <FormControl>
                      <Slider
                        value={[field.value]}
                        min={1}
                        max={60}
                        step={1}
                        onValueChange={handleIntervalChange}
                        className="mr-3 h-2 w-full"
                      />
                    </FormControl>
                    <span className="text-sm font-medium w-10 text-muted-foreground">
                      {intervalDisplay}
                    </span>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
              <FormField
                control={form.control}
                name="isSaved"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="saveRoute"
                      />
                    </FormControl>
                    <label
                      htmlFor="saveRoute"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Save this route for future monitoring
                    </label>
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary/90"
                disabled={createRouteMutation.isPending}
              >
                <span className="material-icons text-sm mr-1">add_circle</span>
                {createRouteMutation.isPending ? "Adding..." : "Add Route"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
