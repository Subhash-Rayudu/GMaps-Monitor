import axios from 'axios';
import { z } from 'zod';
import logger from './logger';

// Google Maps Distance Matrix API response schema
const distanceMatrixResponseSchema = z.object({
  status: z.string(),
  rows: z.array(
    z.object({
      elements: z.array(
        z.object({
          status: z.string(),
          duration: z
            .object({
              value: z.number(),
              text: z.string(),
            })
            .optional(),
          duration_in_traffic: z
            .object({
              value: z.number(),
              text: z.string(),
            })
            .optional(),
          distance: z
            .object({
              value: z.number(),
              text: z.string(),
            })
            .optional(),
        })
      ),
    })
  ),
});

type DistanceMatrixResponse = z.infer<typeof distanceMatrixResponseSchema>;

/**
 * Get travel time between two locations using Google Maps Distance Matrix API
 */
export async function getTravelTime(
  origin: string,
  destination: string,
  apiKey: string
): Promise<{ durationMinutes: number; durationText: string; distanceText: string } | null> {
  const startTime = Date.now();
  try {
    logger.debug("Requesting Google Maps travel time", {
      service: "google-api",
      origin: origin.substring(0, 50) + "...",
      destination: destination.substring(0, 50) + "..."
    });
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json`;
    const params = {
      origins: origin,
      destinations: destination,
      mode: 'driving',
      traffic_model: 'best_guess',
      departure_time: Math.floor(Date.now() / 1000).toString(), // Current timestamp
      key: apiKey,
    };

    const response = await axios.get(url, { params });
    
    // Log API response for debugging
    logger.debug("Google Maps API response received", {
      service: "google-api",
      status: response.data.status,
      duration: Date.now() - startTime
    });

    // Validate the response with Zod
    const validatedResponse = distanceMatrixResponseSchema.parse(response.data);

    if (
      validatedResponse.status !== 'OK' ||
      !validatedResponse.rows.length ||
      !validatedResponse.rows[0].elements.length ||
      validatedResponse.rows[0].elements[0].status !== 'OK'
    ) {
      logger.error('Invalid Google Maps API response', {
        service: "google-api",
        apiStatus: validatedResponse.status,
        elementStatus: validatedResponse.rows[0]?.elements[0]?.status,
        duration: Date.now() - startTime
      });
      return null;
    }

    const element = validatedResponse.rows[0].elements[0];
    if (!element.distance) {
      logger.error('Missing distance data in Google Maps response', {
        service: "google-api",
        element: JSON.stringify(element),
        duration: Date.now() - startTime
      });
      return null;
    }

    // Use duration_in_traffic for real-time traffic data, fallback to duration
    const durationData = element.duration_in_traffic || element.duration;
    if (!durationData) {
      logger.error('Missing duration data in Google Maps response', {
        service: "google-api",
        element: JSON.stringify(element),
        duration: Date.now() - startTime
      });
      return null;
    }

    // Convert duration from seconds to minutes and round
    const durationMinutes = Math.round(durationData.value / 60);

    logger.info("Travel time retrieved successfully", {
      service: "google-api",
      durationMinutes: durationMinutes,
      durationText: durationData.text,
      distanceText: element.distance.text,
      hasTrafficData: !!element.duration_in_traffic,
      duration: Date.now() - startTime
    });

    return {
      durationMinutes,
      durationText: durationData.text,
      distanceText: element.distance.text,
    };
  } catch (error: any) {
    logger.error('Failed to fetch travel time from Google Maps', {
      service: "google-api",
      error: error?.message || "Unknown error",
      duration: Date.now() - startTime
    });
    return null;
  }
}

// Google Maps Places Autocomplete API response schema
const placesAutocompleteResponseSchema = z.object({
  status: z.string(),
  predictions: z.array(
    z.object({
      place_id: z.string(),
      description: z.string(),
      structured_formatting: z.object({
        main_text: z.string(),
        secondary_text: z.string().optional(),
      }),
    })
  ),
});

type PlacesAutocompleteResponse = z.infer<typeof placesAutocompleteResponseSchema>;

/**
 * Get place predictions for autocomplete
 */
export async function getPlacePredictions(
  input: string,
  apiKey: string
): Promise<Array<{ placeId: string; description: string; mainText: string }> | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json`;
    const params = {
      input,
      types: 'address',
      key: apiKey,
    };

    const response = await axios.get(url, { params });

    // Validate the response with Zod
    const validatedResponse = placesAutocompleteResponseSchema.parse(response.data);

    if (validatedResponse.status !== 'OK') {
      console.error('Invalid response from Google Maps Places API:', response.data);
      return null;
    }

    return validatedResponse.predictions.map((prediction) => ({
      placeId: prediction.place_id,
      description: prediction.description,
      mainText: prediction.structured_formatting.main_text,
    }));
  } catch (error) {
    console.error('Error fetching place predictions:', error);
    return null;
  }
}

// Google Maps Place Details API response schema
const placeDetailsResponseSchema = z.object({
  status: z.string(),
  result: z.object({
    place_id: z.string(),
    formatted_address: z.string(),
    geometry: z.object({
      location: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    }),
  }),
});

type PlaceDetailsResponse = z.infer<typeof placeDetailsResponseSchema>;

/**
 * Get place details by place ID
 */
export async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<{
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
} | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json`;
    const params = {
      place_id: placeId,
      fields: 'place_id,formatted_address,geometry',
      key: apiKey,
    };

    const response = await axios.get(url, { params });

    // Validate the response with Zod
    const validatedResponse = placeDetailsResponseSchema.parse(response.data);

    if (validatedResponse.status !== 'OK') {
      console.error('Invalid response from Google Maps Place Details API:', response.data);
      return null;
    }

    const { result } = validatedResponse;
    return {
      placeId: result.place_id,
      formattedAddress: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    };
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
}
