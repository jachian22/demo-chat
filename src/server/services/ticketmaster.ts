/* eslint-disable @typescript-eslint/no-unsafe-return */
import { env } from "@/env";

const BASE_URL = "https://app.ticketmaster.com/discovery/v2";

interface SearchEventsParams {
  keyword?: string;
  city?: string;
  stateCode?: string;
  latlong?: string;
  radius?: number;
  unit?: "miles" | "km";
  startDateTime?: string;
  endDateTime?: string;
  classificationName?: string;
  size?: number;
  page?: number;
  sort?: string;
}

export async function searchEvents(params: SearchEventsParams) {
  const url = new URL(`${BASE_URL}/events.json`);
  url.searchParams.set("apikey", env.TICKETMASTER_API_KEY);

  if (params.keyword) url.searchParams.set("keyword", params.keyword);
  if (params.city) url.searchParams.set("city", params.city);
  if (params.stateCode) url.searchParams.set("stateCode", params.stateCode);
  if (params.latlong) url.searchParams.set("latlong", params.latlong);
  if (params.radius) url.searchParams.set("radius", params.radius.toString());
  if (params.unit) url.searchParams.set("unit", params.unit);
  if (params.startDateTime)
    url.searchParams.set("startDateTime", params.startDateTime);
  if (params.endDateTime)
    url.searchParams.set("endDateTime", params.endDateTime);
  if (params.classificationName)
    url.searchParams.set("classificationName", params.classificationName);
  if (params.size) url.searchParams.set("size", params.size.toString());
  if (params.page) url.searchParams.set("page", params.page.toString());
  if (params.sort) url.searchParams.set("sort", params.sort);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Ticketmaster API error: ${response.status}`);
  }
  return response.json();
}

export async function getEventById(eventId: string) {
  const url = new URL(`${BASE_URL}/events/${eventId}.json`);
  url.searchParams.set("apikey", env.TICKETMASTER_API_KEY);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Ticketmaster API error: ${response.status}`);
  }
  return response.json();
}

interface SearchVenuesParams {
  keyword?: string;
  city?: string;
  stateCode?: string;
  latlong?: string;
  radius?: number;
  size?: number;
  page?: number;
}

export async function searchVenues(params: SearchVenuesParams) {
  const url = new URL(`${BASE_URL}/venues.json`);
  url.searchParams.set("apikey", env.TICKETMASTER_API_KEY);

  if (params.keyword) url.searchParams.set("keyword", params.keyword);
  if (params.city) url.searchParams.set("city", params.city);
  if (params.stateCode) url.searchParams.set("stateCode", params.stateCode);
  if (params.latlong) url.searchParams.set("latlong", params.latlong);
  if (params.radius) url.searchParams.set("radius", params.radius.toString());
  if (params.size) url.searchParams.set("size", params.size.toString());
  if (params.page) url.searchParams.set("page", params.page.toString());

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Ticketmaster API error: ${response.status}`);
  }
  return response.json();
}
