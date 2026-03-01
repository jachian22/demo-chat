/**
 * Seeds the NYC DOE school calendar with sample data for March 2026.
 * Run with: pnpm tsx scripts/seed-calendar.ts
 */

import { db } from "../src/server/db";
import { doeCalendarDays } from "../src/server/db/schema";

interface CalendarDay {
  calendarDate: string;
  eventType: string;
  isSchoolDay: boolean;
}

// March 2026 school calendar data
// Based on typical NYC DOE patterns
const marchDays: CalendarDay[] = [
  // Week 1: March 1-7
  { calendarDate: "2026-03-01", eventType: "Weekend", isSchoolDay: false },
  { calendarDate: "2026-03-02", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-03", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-04", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-05", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-06", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-07", eventType: "Weekend", isSchoolDay: false },

  // Week 2: March 8-14
  { calendarDate: "2026-03-08", eventType: "Weekend", isSchoolDay: false },
  { calendarDate: "2026-03-09", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-10", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-11", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-12", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-13", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-14", eventType: "Weekend", isSchoolDay: false },

  // Week 3: March 15-21
  { calendarDate: "2026-03-15", eventType: "Weekend", isSchoolDay: false },
  { calendarDate: "2026-03-16", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-17", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-18", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-19", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-20", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-21", eventType: "Weekend", isSchoolDay: false },

  // Week 4: March 22-28
  { calendarDate: "2026-03-22", eventType: "Weekend", isSchoolDay: false },
  { calendarDate: "2026-03-23", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-24", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-25", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-26", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-27", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-03-28", eventType: "Weekend", isSchoolDay: false },

  // Week 5: March 29-31
  { calendarDate: "2026-03-29", eventType: "Weekend", isSchoolDay: false },
  { calendarDate: "2026-03-30", eventType: "Spring Break", isSchoolDay: false },
  { calendarDate: "2026-03-31", eventType: "Spring Break", isSchoolDay: false },
];

// April 2026 (partial - spring break continues)
const aprilDays: CalendarDay[] = [
  { calendarDate: "2026-04-01", eventType: "Spring Break", isSchoolDay: false },
  { calendarDate: "2026-04-02", eventType: "Spring Break", isSchoolDay: false },
  { calendarDate: "2026-04-03", eventType: "Spring Break", isSchoolDay: false },
  { calendarDate: "2026-04-04", eventType: "Weekend", isSchoolDay: false },
  { calendarDate: "2026-04-05", eventType: "Weekend", isSchoolDay: false },
  { calendarDate: "2026-04-06", eventType: "School Day", isSchoolDay: true },
  { calendarDate: "2026-04-07", eventType: "School Day", isSchoolDay: true },
];

async function seed() {
  console.log("Seeding school calendar data...");

  const allDays = [...marchDays, ...aprilDays];

  for (const day of allDays) {
    try {
      await db
        .insert(doeCalendarDays)
        .values({
          calendarDate: day.calendarDate,
          eventType: day.eventType,
          isSchoolDay: day.isSchoolDay,
          sourceUpdatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: doeCalendarDays.calendarDate,
          set: {
            eventType: day.eventType,
            isSchoolDay: day.isSchoolDay,
            updatedAt: new Date(),
          },
        });
      console.log(`  Added: ${day.calendarDate} - ${day.eventType}`);
    } catch (error) {
      console.error(`  Error adding ${day.calendarDate}:`, error);
    }
  }

  console.log("Done seeding calendar data.");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
