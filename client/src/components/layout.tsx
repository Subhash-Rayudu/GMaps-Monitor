import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ApiKeyModal } from "./api-key-modal";
import { useQuery } from "@tanstack/react-query";
import { Setting } from "@shared/schema";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  
  // Get settings to check if API key is configured
  const { data: settings } = useQuery<Setting>({
    queryKey: ['/api/settings'],
  });
  
  // Automatically show API key modal if API key is not configured
  useEffect(() => {
    if (settings && !settings?.apiKey) {
      setIsApiKeyModalOpen(true);
    }
  }, [settings]);

  // Determine active tab
  const getTabClass = (path: string) => {
    const isActive = location === path;
    return isActive
      ? "px-4 py-2 border-b-2 border-primary font-medium text-primary"
      : "px-4 py-2 border-b-2 border-transparent font-medium text-muted-foreground hover:text-primary hover:border-primary/50";
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <span className="material-icons mr-2">map</span>
            <h1 className="text-xl font-semibold">GMaps Monitor</h1>
          </div>
          <div className="flex items-center">
            <button 
              className="bg-white text-primary px-3 py-1 rounded-md text-sm font-medium hover:bg-neutral-200 flex items-center"
              onClick={() => setIsApiKeyModalOpen(true)}
            >
              <span className="material-icons text-sm mr-1">key</span>
              API Key
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 flex-grow">
        {/* Tabs Navigation */}
        <div className="flex border-b border-neutral-200 mb-6">
          <Link href="/" className={getTabClass("/")}>
            Monitor
          </Link>
          <Link href="/saved-routes" className={getTabClass("/saved-routes")}>
            Saved Routes
          </Link>
          <Link href="/settings" className={getTabClass("/settings")}>
            Settings
          </Link>
        </div>

        {/* Page Content */}
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-neutral-800 text-neutral-400 py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>GMaps Monitor &copy; {new Date().getFullYear()} - A tool to monitor travel times between locations</p>
          <p className="mt-2">
            <a href="#" className="text-neutral-300 hover:text-white mr-4">Privacy Policy</a>
            <a href="#" className="text-neutral-300 hover:text-white mr-4">Terms of Service</a>
            <a href="#" className="text-neutral-300 hover:text-white">Help</a>
          </p>
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onClose={() => setIsApiKeyModalOpen(false)} 
      />
    </div>
  );
}
