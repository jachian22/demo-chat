/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing */
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/server/db";
import { doeCalendarDays } from "@/server/db/schema";
import { and, gte, lte } from "drizzle-orm";
import { env } from "@/env";

// =============================================================================
// LOOKUP RESTAURANT
// =============================================================================

export const lookupRestaurant = tool({
  description:
    "Look up a restaurant by name and/or address to get its location and details. Call this FIRST before other tools to get coordinates.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Restaurant name and/or address, e.g. 'Osteria Rosa SoHo NYC'"),
  }),
  execute: async function ({ query }: { query: string }) {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours",
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 1,
        }),
      },
    );

    if (!response.ok) {
      return { error: "Failed to look up restaurant", found: false };
    }

    const data: any = await response.json();
    const place = data.places?.[0];

    if (!place) {
      return {
        found: false,
        message: `Could not find a restaurant matching "${query}". Please check the name or address.`,
      };
    }

    return {
      found: true,
      restaurant: {
        name: place.displayName?.text,
        address: place.formattedAddress,
        lat: place.location?.latitude,
        lon: place.location?.longitude,
        rating: place.rating,
        reviewCount: place.userRatingCount,
        priceLevel: place.priceLevel,
        isOpen: place.regularOpeningHours?.openNow,
      },
      message: `Found ${place.displayName?.text} at ${place.formattedAddress}`,
    };
  },
});

// =============================================================================
// GET WEATHER
// =============================================================================

export const getWeather = tool({
  description:
    "Get weather forecast with staffing insights for a location. Use coordinates from lookupRestaurant.",
  inputSchema: z.object({
    lat: z.number().describe("Latitude from restaurant lookup"),
    lon: z.number().describe("Longitude from restaurant lookup"),
    days: z
      .number()
      .min(1)
      .max(5)
      .default(3)
      .describe("Number of days to forecast"),
  }),
  execute: async function ({ lat, lon, days }: { lat: number; lon: number; days: number }) {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${env.OPENWEATHER_API_KEY}`,
    );

    if (!response.ok) {
      return { error: "Failed to fetch weather data" };
    }

    const data: any = await response.json();

    const dailyForecasts = new Map<
      string,
      { temps: number[]; conditions: string[]; rain: boolean }
    >();

    const forecastList = data.list?.slice(0, days * 8) || [];
    for (const item of forecastList) {
      const date = item.dt_txt.split(" ")[0];
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, { temps: [], conditions: [], rain: false });
      }
      const day = dailyForecasts.get(date)!;
      day.temps.push(item.main.temp);
      day.conditions.push(item.weather[0]?.main || "Unknown");
      if (item.pop > 0.3) day.rain = true;
    }

    const insights: any[] = [];
    let overallImpact: "low" | "medium" | "high" = "low";

    for (const [date, forecast] of dailyForecasts) {
      const avgTemp = Math.round(
        forecast.temps.reduce((a, b) => a + b, 0) / forecast.temps.length,
      );
      const highTemp = Math.round(Math.max(...forecast.temps));
      const lowTemp = Math.round(Math.min(...forecast.temps));
      const mainCondition = forecast.conditions[0];

      let impact: "low" | "medium" | "high" = "low";
      let recommendation = "";

      if (forecast.rain) {
        impact = "medium";
        recommendation =
          "Rain expected - fewer walk-ins likely, but delivery demand may increase.";
      } else if (avgTemp < 35) {
        impact = "medium";
        recommendation =
          "Cold weather - expect slower foot traffic, comfort food demand up.";
      } else if (avgTemp > 80) {
        impact = "medium";
        recommendation =
          "Hot weather - outdoor seating in demand, cold drinks priority.";
      } else if (avgTemp >= 55 && avgTemp <= 75 && !forecast.rain) {
        impact = "high";
        recommendation =
          "Ideal weather - expect higher walk-in traffic and outdoor seating demand.";
        overallImpact = "high";
      } else {
        recommendation = "Standard weather conditions - normal traffic expected.";
      }

      if (impact === "high" || (impact === "medium" && overallImpact === "low")) {
        overallImpact = impact;
      }

      insights.push({
        date,
        high: highTemp,
        low: lowTemp,
        condition: mainCondition,
        rain: forecast.rain,
        impact,
        recommendation,
      });
    }

    // Generate concise summary
    const summary = generateWeatherSummary(insights, overallImpact);

    return {
      location: data.city?.name,
      forecast_days: insights.length,
      overall_impact: overallImpact,
      insights,
      summary,
    };
  },
});

// Private helper - generates concise weather summary
function generateWeatherSummary(
  insights: Array<{ date: string; high: number; low: number; rain: boolean; condition: string }>,
  impact: string
): string {
  if (insights.length === 0) return "No forecast data.";

  const rainyDays = insights.filter(d => d.rain).map(d => formatDayName(d.date));
  const temps = insights.map(d => d.high);
  const avgHigh = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);

  const parts: string[] = [];

  // Temperature summary
  if (avgHigh < 40) parts.push(`Cold (${Math.min(...temps)}-${Math.max(...temps)}°F)`);
  else if (avgHigh > 80) parts.push(`Hot (${Math.min(...temps)}-${Math.max(...temps)}°F)`);
  else parts.push(`Mild (${Math.min(...temps)}-${Math.max(...temps)}°F)`);

  // Rain summary
  if (rainyDays.length > 0) {
    parts.push(`rain ${rainyDays.join(", ")}`);
  }

  // Impact
  if (impact === "high") parts.push("good foot traffic expected");
  else if (impact === "medium" && rainyDays.length > 0) parts.push("shift to delivery likely");
  else if (impact === "medium") parts.push("slower foot traffic");

  return parts.join(", ") + ".";
}

function formatDayName(dateStr: string): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const date = new Date(dateStr + "T12:00:00");
  return days[date.getDay()] ?? dateStr;
}

// =============================================================================
// GET LOCAL EVENTS
// =============================================================================

export const getLocalEvents = tool({
  description:
    "Get nearby events that could impact restaurant traffic. Use coordinates from lookupRestaurant.",
  inputSchema: z.object({
    lat: z.number().describe("Latitude from restaurant lookup"),
    lon: z.number().describe("Longitude from restaurant lookup"),
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
    radius: z.number().default(5).describe("Search radius in miles"),
  }),
  execute: async function ({
    lat,
    lon,
    startDate,
    endDate,
    radius,
  }: {
    lat: number;
    lon: number;
    startDate: string;
    endDate: string;
    radius: number;
  }) {
    const startDateTime = `${startDate}T00:00:00Z`;
    const endDateTime = `${endDate}T23:59:59Z`;

    const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
    url.searchParams.set("apikey", env.TICKETMASTER_API_KEY);
    url.searchParams.set("latlong", `${lat},${lon}`);
    url.searchParams.set("radius", radius.toString());
    url.searchParams.set("unit", "miles");
    url.searchParams.set("startDateTime", startDateTime);
    url.searchParams.set("endDateTime", endDateTime);
    url.searchParams.set("size", "20");
    url.searchParams.set("sort", "date,asc");

    const response = await fetch(url);

    if (!response.ok) {
      return { error: "Failed to fetch events data" };
    }

    const data: any = await response.json();
    const events = data._embedded?.events || [];

    if (events.length === 0) {
      return {
        event_count: 0,
        overall_impact: "low",
        insights: [] as any[],
        summary: "No major events nearby. Normal traffic expected.",
      };
    }

    const insights: any[] = [];
    let overallImpact: "low" | "medium" | "high" = "low";
    let totalExpectedAttendance = 0;

    for (const event of events) {
      const venue = event._embedded?.venues?.[0];
      const distance = venue?.distance || 0;
      const category = event.classifications?.[0]?.segment?.name || "Other";

      let estimatedAttendance = 1000;
      if (category === "Sports") estimatedAttendance = 15000;
      else if (category === "Music") estimatedAttendance = 5000;
      else if (category === "Arts & Theatre") estimatedAttendance = 2000;

      totalExpectedAttendance += estimatedAttendance;

      let impact: "low" | "medium" | "high" = "low";
      let recommendation = "";

      if (distance < 0.5 && estimatedAttendance > 5000) {
        impact = "high";
        recommendation = `Major event very close by (~${estimatedAttendance.toLocaleString()} attendees). Expect significant pre/post-event traffic. Consider +2-3 staff.`;
        overallImpact = "high";
      } else if (distance < 1 && estimatedAttendance > 2000) {
        impact = "medium";
        recommendation =
          "Nearby event may drive walk-in traffic. Good opportunity for pre-event dining.";
        if (overallImpact === "low") overallImpact = "medium";
      } else if (distance < 2) {
        impact = "low";
        recommendation =
          "Event is close but may have limited direct impact. Monitor for spillover traffic.";
      } else {
        recommendation = `Event is ${distance.toFixed(1)} miles away - minimal expected impact.`;
      }

      const eventDate = event.dates?.start?.localDate;
      const eventTime = event.dates?.start?.localTime || "TBD";

      let timeWindow = "";
      if (eventTime !== "TBD") {
        const [hours] = eventTime.split(":").map(Number);
        if (hours && hours >= 17) {
          timeWindow = "Pre-event dinner rush likely 16:00-19:00";
        } else if (hours && hours >= 12) {
          timeWindow = "Pre-event lunch/afternoon traffic likely";
        } else {
          timeWindow = "Morning event - may affect brunch service";
        }
      }

      insights.push({
        event: event.name,
        date: eventDate,
        time: eventTime,
        venue: venue?.name,
        distance_miles: distance,
        category,
        estimated_attendance: estimatedAttendance,
        impact,
        time_window: timeWindow,
        recommendation,
      });
    }

    // Generate concise summary
    const summary = generateEventsSummary(insights.slice(0, 5), overallImpact, totalExpectedAttendance);

    return {
      event_count: events.length,
      total_expected_attendance: totalExpectedAttendance,
      overall_impact: overallImpact,
      insights: insights.slice(0, 5),
      summary,
    };
  },
});

// Private helper - generates concise events summary
function generateEventsSummary(
  insights: Array<{ event: string; date: string; distance_miles: number; estimated_attendance: number; time_window: string }>,
  impact: string,
  totalAttendance: number
): string {
  if (insights.length === 0) return "No major events nearby.";

  // Find the highest impact event
  const closest = insights.reduce((a, b) => a.distance_miles < b.distance_miles ? a : b);

  if (impact === "high") {
    return `${closest.event} (${(closest.estimated_attendance / 1000).toFixed(0)}k attendees, ${closest.distance_miles.toFixed(1)}mi away). Staff up for ${closest.time_window.toLowerCase().includes("dinner") ? "dinner rush" : "event traffic"}.`;
  } else if (impact === "medium") {
    return `${insights.length} events nearby (~${(totalAttendance / 1000).toFixed(0)}k total). Some spillover traffic possible.`;
  } else {
    return `${insights.length} events in area but minimal direct impact expected.`;
  }
}

// =============================================================================
// GET SCHOOL CALENDAR
// =============================================================================

export const getSchoolCalendar = tool({
  description:
    "Check NYC public school calendar for holidays and school days that affect family dining patterns.",
  inputSchema: z.object({
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
  }),
  execute: async function ({ startDate, endDate }: { startDate: string; endDate: string }) {
    const days = await db
      .select()
      .from(doeCalendarDays)
      .where(
        and(
          gte(doeCalendarDays.calendarDate, startDate),
          lte(doeCalendarDays.calendarDate, endDate),
        ),
      )
      .orderBy(doeCalendarDays.calendarDate);

    if (days.length === 0) {
      return {
        days_checked: 0,
        school_days: 0,
        holidays: 0,
        overall_impact: "low",
        insights: [] as any[],
        summary: "No school calendar data for this period.",
      };
    }

    const schoolDays = days.filter((d) => d.isSchoolDay);
    const holidays = days.filter((d) => !d.isSchoolDay);

    const insights: any[] = [];
    let overallImpact: "low" | "medium" | "high" = "low";

    for (const day of days) {
      const dayOfWeek = new Date(day.calendarDate).toLocaleDateString("en-US", {
        weekday: "long",
      });
      const isWeekend = dayOfWeek === "Saturday" || dayOfWeek === "Sunday";

      let impact: "low" | "medium" | "high" = "low";
      let recommendation = "";

      if (!day.isSchoolDay && !isWeekend) {
        impact = "high";
        recommendation = `School holiday (${day.eventType}) - expect increased family dining, especially lunch. Kids menus and early dinner service in demand.`;
        overallImpact = "high";
      } else if (!day.isSchoolDay && isWeekend) {
        impact = "medium";
        recommendation =
          "Weekend with school holiday context - extended family gatherings likely.";
        if (overallImpact === "low") overallImpact = "medium";
      } else if (day.isSchoolDay) {
        recommendation = "Regular school day - standard weekday patterns expected.";
      }

      insights.push({
        date: day.calendarDate,
        day_of_week: dayOfWeek,
        is_school_day: day.isSchoolDay,
        event_type: day.eventType,
        impact,
        recommendation,
      });
    }

    // Generate concise summary
    const summary = generateCalendarSummary(insights, holidays.length, overallImpact);

    return {
      days_checked: days.length,
      school_days: schoolDays.length,
      holidays: holidays.length,
      overall_impact: overallImpact,
      insights,
      summary,
    };
  },
});

// Private helper - generates concise calendar summary
function generateCalendarSummary(
  insights: Array<{ date: string; event_type: string; is_school_day: boolean; day_of_week: string }>,
  holidayCount: number,
  impact: string
): string {
  if (insights.length === 0) return "No calendar data.";

  // Find holiday types
  const holidayTypes = insights
    .filter(d => !d.is_school_day && d.day_of_week !== "Saturday" && d.day_of_week !== "Sunday")
    .map(d => d.event_type);

  const uniqueHolidays = [...new Set(holidayTypes)];

  if (impact === "high" && uniqueHolidays.length > 0) {
    const holidayName = uniqueHolidays[0];
    return `${holidayName} - more families expected, especially lunch.`;
  } else if (impact === "medium") {
    return `${holidayCount} days off school. Some family traffic increase.`;
  } else {
    return "Regular school days. Standard weekday patterns.";
  }
}

// =============================================================================
// EXPORT ALL TOOLS
// =============================================================================

export const staffingTools = {
  lookupRestaurant,
  getWeather,
  getLocalEvents,
  getSchoolCalendar,
};
