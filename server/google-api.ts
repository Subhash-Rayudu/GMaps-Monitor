import axios from 'axios';
import { z } from 'zod';

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
  try {
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
    
    // Log the response to debug traffic data
    console.log('Google Maps API Response:', JSON.stringify(response.data, null, 2));

    // Validate the response with Zod
    const validatedResponse = distanceMatrixResponseSchema.parse(response.data);

    if (
      validatedResponse.status !== 'OK' ||
      !validatedResponse.rows.length ||
      !validatedResponse.rows[0].elements.length ||
      validatedResponse.rows[0].elements[0].status !== 'OK'
    ) {
      console.error('Invalid response from Google Maps API:', response.data);
      return null;
    }

    const element = validatedResponse.rows[0].elements[0];
    if (!element.distance) {
      console.error('Missing distance in response:', element);
      return null;
    }

    // Use duration_in_traffic for real-time traffic data, fallback to duration
    const durationData = element.duration_in_traffic || element.duration;
    if (!durationData) {
      console.error('Missing duration data in response:', element);
      return null;
    }

    // Convert duration from seconds to minutes and round
    const durationMinutes = Math.round(durationData.value / 60);

    return {
      durationMinutes,
      durationText: durationData.text,
      distanceText: element.distance.text,
    };
  } catch (error) {
    console.error('Error fetching travel time:', error);
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
