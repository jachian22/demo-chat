/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { env } from "@/env";

const BASE_URL = "https://places.googleapis.com/v1";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.types",
  "places.regularOpeningHours",
  "places.photos",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.reviews",
].join(",");

interface SearchPlacesParams {
  query: string;
  location?: { lat: number; lon: number };
  radius?: number;
  type?: string;
  maxResults?: number;
}

export async function searchPlaces(params: SearchPlacesParams) {
  const response = await fetch(`${BASE_URL}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: params.query,
      maxResultCount: params.maxResults ?? 10,
      ...(params.location && {
        locationBias: {
          circle: {
            center: {
              latitude: params.location.lat,
              longitude: params.location.lon,
            },
            radius: params.radius ?? 5000,
          },
        },
      }),
      ...(params.type && { includedType: params.type }),
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();
  return data.places ?? [];
}

interface NearbyPlacesParams {
  lat: number;
  lon: number;
  radius?: number;
  type?: string;
  maxResults?: number;
}

export async function getNearbyPlaces(params: NearbyPlacesParams) {
  const response = await fetch(`${BASE_URL}/places:searchNearby`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      locationRestriction: {
        circle: {
          center: {
            latitude: params.lat,
            longitude: params.lon,
          },
          radius: params.radius ?? 1000,
        },
      },
      maxResultCount: params.maxResults ?? 10,
      ...(params.type && { includedTypes: [params.type] }),
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();
  return data.places ?? [];
}

export async function getPlaceDetails(placeId: string) {
  const response = await fetch(`${BASE_URL}/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": FIELD_MASK.replace("places.", ""),
    },
  });

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  return response.json();
}

export function getPhotoUrl(photoName: string, maxWidth = 400): string {
  return `${BASE_URL}/${photoName}/media?maxWidthPx=${maxWidth}&key=${env.GOOGLE_PLACES_API_KEY}`;
}
