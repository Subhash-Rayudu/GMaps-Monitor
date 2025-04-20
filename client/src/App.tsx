import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import Layout from "@/components/layout";
import Monitor from "@/pages/monitor";
import SavedRoutes from "@/pages/saved-routes";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { apiRequest } from "./lib/queryClient";

function Router() {
  // Initialize app on first load
  useEffect(() => {
    const initApp = async () => {
      try {
        await apiRequest("GET", "/api/init", undefined);
      } catch (error) {
        console.error("Failed to initialize app:", error);
      }
    };
    
    initApp();
  }, []);
  
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Monitor} />
        <Route path="/saved-routes" component={SavedRoutes} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;
