import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

// Type for Place prediction
export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
}

/**
 * Custom hook to fetch place predictions for autocomplete
 */
export function usePlacePredictions(input: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [`/api/place-autocomplete?input=${encodeURIComponent(input)}`],
    enabled: enabled && input.length > 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Check if the Google Maps API is loaded
 */
export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && window.google && window.google.maps;
}

/**
 * Format duration in minutes to a readable string
 */
export function formatDuration(minutes: number | undefined | null): string {
  if (minutes === undefined || minutes === null) return 'Unknown';
  
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${remainingMinutes} min`;
}

/**
 * Format distance change
 */
export function formatTimeChange(change: number | undefined | null): string {
  if (change === undefined || change === null) return '';
  
  if (change === 0) return 'No change';
  
  if (change > 0) {
    return `+${change} min`;
  }
  
  return `${change} min`;
}

/**
 * Get appropriate color class for time change
 */
export function getTimeChangeColorClass(change: number | undefined | null): string {
  if (change === undefined || change === null) return '';
  
  if (change === 0) return 'text-primary';
  
  if (change > 0) {
    return 'text-warning';
  }
  
  return 'text-accent';
}

/**
 * Get appropriate icon for time change
 */
export function getTimeChangeIcon(change: number | undefined | null): string {
  if (change === undefined || change === null) return 'schedule';
  
  if (change === 0) return 'schedule';
  
  if (change > 0) {
    return 'arrow_upward';
  }
  
  return 'arrow_downward';
}

/**
 * Format a date relative to now (e.g., "2 min ago")
 */
export function formatRelativeTime(date: Date | string | undefined): string {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) {
    return 'Just now';
  }
  
  const diffMin = Math.floor(diffSec / 60);
  
  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }
  
  const diffHr = Math.floor(diffMin / 60);
  
  if (diffHr < 24) {
    return `${diffHr} hr ago`;
  }
  
  const diffDays = Math.floor(diffHr / 24);
  
  if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }
  
  return dateObj.toLocaleDateString();
}
