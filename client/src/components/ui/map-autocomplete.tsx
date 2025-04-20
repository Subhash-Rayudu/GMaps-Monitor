import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { FormControl } from './form';
import { usePlacePredictions, PlacePrediction } from '@/lib/google-maps';

interface MapAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  icon?: string;
  className?: string;
}

export function MapAutocomplete({ 
  value, 
  onChange, 
  placeholder = 'Enter location', 
  error = false,
  icon,
  className
}: MapAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch predictions when input value changes
  const { data: predictions, isLoading } = usePlacePredictions(
    inputValue, 
    showSuggestions && inputValue.length > 2
  ) as { data: PlacePrediction[] | undefined, isLoading: boolean };

  // Update internal input value when prop changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '');
    }
  }, [value]);

  // Handle clicks outside the component to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue); // Propagate change to parent
    
    if (newValue.length > 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectPrediction = (prediction: string) => {
    setInputValue(prediction);
    onChange(prediction);
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        {icon && (
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <span className="material-icons text-muted-foreground text-lg">{icon}</span>
          </span>
        )}
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`${icon ? 'pl-10' : ''} ${error ? 'border-destructive' : ''} ${className}`}
          onFocus={() => inputValue.length > 2 && setShowSuggestions(true)}
        />
      </div>
      
      {showSuggestions && (inputValue.length > 2) && (
        <div 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-background rounded-md border border-input shadow-md"
        >
          <div className="p-0">
            {isLoading ? (
              <div className="p-2 text-sm text-center text-muted-foreground">Loading...</div>
            ) : !Array.isArray(predictions) || predictions.length === 0 ? (
              <div className="p-2 text-sm text-center text-muted-foreground">No locations found</div>
            ) : (
              <div className="max-h-60 overflow-auto">
                {predictions.map((prediction: PlacePrediction, index: number) => (
                  <div
                    key={`${prediction.placeId}-${index}`}
                    onClick={() => handleSelectPrediction(prediction.description)}
                    className="p-2 text-sm flex items-center hover:bg-accent cursor-pointer"
                  >
                    <span className="material-icons mr-2 text-muted-foreground text-base">location_on</span>
                    <span>{prediction.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
