import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// All Google Maps API loading will now be handled by the backend
// We'll load fonts and update title only
const setupPage = () => {
  // Update the page title
  document.title = "GMaps Monitor - Track Travel Times";
  
  // Add Roboto font
  const fontLink = document.createElement('link');
  fontLink.href = "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap";
  fontLink.rel = "stylesheet";
  document.head.appendChild(fontLink);
};

setupPage();

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <App />
    <Toaster />
  </TooltipProvider>
);
