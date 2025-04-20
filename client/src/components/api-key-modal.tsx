import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
  });

  // Update API key mutation
  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/settings", { apiKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "API Key Updated",
        description: "Your Google Maps API key has been saved successfully.",
      });
      onClose();
    },
    onError: (error) => {
      console.error("Failed to update API key:", error);
      toast({
        title: "Error",
        description: "Failed to update API key. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!apiKey) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Google Maps API Key Setup</DialogTitle>
          <DialogDescription>
            To use GMaps Monitor, you need a Google Maps API key with the Distance Matrix API enabled.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="bg-neutral-100 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-neutral-700 mb-2">How to get an API key:</h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
              <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" className="text-primary hover:underline">Google Cloud Console</a></li>
              <li>Create a new project or select an existing one</li>
              <li>Navigate to APIs & Services &gt; Credentials</li>
              <li>Click "Create credentials" and select "API key"</li>
              <li>Copy your new API key</li>
              <li>Navigate to APIs & Services &gt; Library</li>
              <li>Search for and enable "Distance Matrix API"</li>
            </ol>
          </div>

          <div className="mb-4">
            <label htmlFor="apiKeyInput" className="block text-sm font-medium mb-1">Enter your API Key</label>
            <Input
              id="apiKeyInput"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter Google Maps API key"
              type="text"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Save API Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
