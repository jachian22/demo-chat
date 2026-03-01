/* eslint-disable @typescript-eslint/no-base-to-string */
"use client";

import { motion } from "framer-motion";
import { DataSourceCard } from "./DataSourceCard";
import type { DataSource } from "./topicDetector";
import type { SessionContext } from "./types";

interface DataSourcePanelProps {
  context: SessionContext;
  activeSources: Set<DataSource>;
}

/**
 * Generates a human-readable summary from weather data
 */
function summarizeWeather(weather: Record<string, unknown> | undefined): string {
  if (!weather) return "No weather data";

  const insights = weather.insights as Array<Record<string, unknown>> | undefined;
  if (!insights || insights.length === 0) {
    return "Weather data available";
  }

  const conditions = insights.slice(0, 3).map((day) => {
    const date = String(day.date ?? "").split("-")[2]; // Get day number
    const condition = String(day.condition ?? "Clear");
    const rain = day.rain ? "rain" : "";
    return `${date}: ${condition}${rain ? " (rain)" : ""}`;
  });

  const impact = String(weather.overall_impact ?? "low");
  return `${conditions.join(", ")} | ${impact} impact`;
}

/**
 * Generates a human-readable summary from events data
 */
function summarizeEvents(events: Record<string, unknown> | undefined): string {
  if (!events) return "No events data";

  const count = events.event_count as number | undefined;
  const attendance = events.total_expected_attendance as number | undefined;
  const impact = String(events.overall_impact ?? "low");

  if (count === 0) {
    return "No major events nearby";
  }

  const attendanceStr = attendance
    ? ` | ~${attendance.toLocaleString()} attendees`
    : "";

  return `${count} events found${attendanceStr} | ${impact} impact`;
}

/**
 * Generates a human-readable summary from school calendar data
 */
function summarizeCalendar(
  calendar: Record<string, unknown> | undefined
): string {
  if (!calendar) return "No calendar data";

  const daysChecked = calendar.days_checked as number | undefined;
  const schoolDays = calendar.school_days as number | undefined;
  const holidays = calendar.holidays as number | undefined;

  if (daysChecked === 0) {
    return "No calendar data for this period";
  }

  const parts: string[] = [];
  if (schoolDays !== undefined) parts.push(`${schoolDays} school days`);
  if (holidays !== undefined && holidays > 0) parts.push(`${holidays} holidays`);

  const impact = String(calendar.overall_impact ?? "low");
  return `${parts.join(", ")} | ${impact} impact`;
}

/**
 * Generates a summary for restaurant data
 */
function summarizeRestaurant(
  restaurant: SessionContext["restaurant"] | undefined
): string {
  if (!restaurant) return "No restaurant selected";
  return `${restaurant.name} at ${restaurant.address}`;
}

export function DataSourcePanel({ context, activeSources }: DataSourcePanelProps) {
  return (
    <div className="w-80">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">
        Data Sources
      </p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-3"
      >
        <DataSourceCard
          type="restaurant"
          active={activeSources.has("restaurant")}
          summary={summarizeRestaurant(context.restaurant)}
        />

        <DataSourceCard
          type="weather"
          active={activeSources.has("weather")}
          summary={summarizeWeather(context.weather)}
        />

        <DataSourceCard
          type="events"
          active={activeSources.has("events")}
          summary={summarizeEvents(context.events)}
        />

        <DataSourceCard
          type="calendar"
          active={activeSources.has("calendar")}
          summary={summarizeCalendar(context.schoolCalendar)}
        />
      </motion.div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          Cards glow when referenced in response
        </p>
      </div>
    </div>
  );
}
