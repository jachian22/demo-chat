/* eslint-disable @typescript-eslint/no-unsafe-return */
import { env } from "@/env";

const BASE_URL = "https://api.openweathermap.org/data/2.5";

export async function getCurrentWeather(
  lat: number,
  lon: number,
  units: "metric" | "imperial" = "imperial",
) {
  const url = new URL(`${BASE_URL}/weather`);
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lon.toString());
  url.searchParams.set("units", units);
  url.searchParams.set("appid", env.OPENWEATHER_API_KEY);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }
  return response.json();
}

export async function getWeatherByCity(
  city: string,
  units: "metric" | "imperial" = "imperial",
) {
  const url = new URL(`${BASE_URL}/weather`);
  url.searchParams.set("q", city);
  url.searchParams.set("units", units);
  url.searchParams.set("appid", env.OPENWEATHER_API_KEY);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }
  return response.json();
}

export async function getForecast(
  lat: number,
  lon: number,
  units: "metric" | "imperial" = "imperial",
) {
  const url = new URL(`${BASE_URL}/forecast`);
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lon.toString());
  url.searchParams.set("units", units);
  url.searchParams.set("appid", env.OPENWEATHER_API_KEY);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Forecast API error: ${response.status}`);
  }
  return response.json();
}
