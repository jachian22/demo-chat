/* eslint-disable @typescript-eslint/no-base-to-string */

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ToolCall {
  id: string;
  toolName: string;
  action: string;
  apiCall: string;
  status: "running" | "completed";
  result?: string;
  source: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  icon: ToolIconType;
}

export type ToolIconType =
  | "search"
  | "weather"
  | "calendar"
  | "users"
  | "database"
  | "chart"
  | "calculator"
  | "check"
  | "events";

// Pre-defined NYC restaurants for demo
export interface Restaurant {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  type: string;
}

export const DEMO_RESTAURANTS: Restaurant[] = [
  {
    id: "joes-pizza",
    name: "Joe's Pizza",
    address: "7 Carmine St",
    neighborhood: "Greenwich Village",
    type: "Pizzeria",
  },
  {
    id: "lucali",
    name: "Lucali",
    address: "575 Henry St",
    neighborhood: "Carroll Gardens",
    type: "Pizzeria",
  },
  {
    id: "katz-deli",
    name: "Katz's Delicatessen",
    address: "205 E Houston St",
    neighborhood: "Lower East Side",
    type: "Deli",
  },
  {
    id: "russ-daughters",
    name: "Russ & Daughters",
    address: "179 E Houston St",
    neighborhood: "Lower East Side",
    type: "Appetizing",
  },
];

// Staffing intent options shown after restaurant is selected
export interface StaffingIntent {
  id: string;
  name: string;
  icon: string;
  description: string;
  prompt: string; // Will be appended to context
}

export const STAFFING_INTENTS: StaffingIntent[] = [
  {
    id: "weekly-plan",
    name: "Plan This Week",
    icon: "📅",
    description: "Get staffing recommendations for the week ahead",
    prompt: "Give me staffing recommendations for this week based on the weather, events, and school calendar data.",
  },
  {
    id: "weekend-focus",
    name: "Weekend Focus",
    icon: "🎉",
    description: "Optimize Friday through Sunday staffing",
    prompt: "Focus on this weekend - what staffing adjustments should I make for Friday, Saturday, and Sunday?",
  },
  {
    id: "watch-alerts",
    name: "Watch Alerts",
    icon: "⚠️",
    description: "Surface potential issues to monitor",
    prompt: "What should I watch out for this week? Are there any weather or event concerns that could impact staffing?",
  },
  {
    id: "opportunities",
    name: "Find Opportunities",
    icon: "💡",
    description: "Discover revenue opportunities",
    prompt: "Are there any opportunities I should capitalize on based on the events or weather patterns?",
  },
];

// Session context - cached data from initial fetch
export interface SessionContext {
  restaurant: {
    name: string;
    address: string;
    lat: number;
    lon: number;
  };
  weather?: Record<string, unknown>;
  events?: Record<string, unknown>;
  schoolCalendar?: Record<string, unknown>;
}

// Map tool names to display info
export function getToolDisplayInfo(toolName: string): {
  icon: ToolIconType;
  source: string;
  action: string;
} {
  switch (toolName) {
    case "lookupRestaurant":
      return {
        icon: "search",
        source: "Google Places API",
        action: "Looking up restaurant location",
      };
    case "getWeather":
      return {
        icon: "weather",
        source: "OpenWeather API",
        action: "Fetching weather forecast",
      };
    case "getLocalEvents":
      return {
        icon: "events",
        source: "Ticketmaster API",
        action: "Searching for local events",
      };
    case "getSchoolCalendar":
      return {
        icon: "calendar",
        source: "NYC DOE Calendar",
        action: "Checking school calendar",
      };
    default:
      return {
        icon: "database",
        source: "API",
        action: toolName,
      };
  }
}

// Format tool input as API call string
export function formatApiCall(
  toolName: string,
  input: Record<string, unknown>
): string {
  switch (toolName) {
    case "lookupRestaurant":
      return `POST /places:searchText { query: "${String(input.query ?? "")}" }`;
    case "getWeather":
      return `GET /forecast?lat=${String(input.lat ?? "")}&lon=${String(input.lon ?? "")}&days=${String(input.days ?? "")}`;
    case "getLocalEvents":
      return `GET /events?lat=${String(input.lat ?? "")}&lon=${String(input.lon ?? "")}&radius=${String(input.radius ?? "")}mi`;
    case "getSchoolCalendar":
      return `SELECT * FROM doe_calendar WHERE date BETWEEN '${String(input.startDate ?? "")}' AND '${String(input.endDate ?? "")}'`;
    default:
      return JSON.stringify(input);
  }
}

// Format tool result as human-readable string
export function formatToolResult(
  toolName: string,
  output: Record<string, unknown>
): string {
  switch (toolName) {
    case "lookupRestaurant": {
      const restaurant = output.restaurant as Record<string, unknown> | undefined;
      if (output.found && restaurant) {
        return `Found: ${String(restaurant.name ?? "")} at ${String(restaurant.address ?? "")}`;
      }
      return "Restaurant not found";
    }
    case "getWeather": {
      const insights = output.insights as Array<Record<string, unknown>> | undefined;
      if (insights?.length) {
        return `${String(insights.length)}-day forecast: ${String(output.overall_impact ?? "unknown")} impact`;
      }
      return "Weather data retrieved";
    }
    case "getLocalEvents": {
      const count = output.event_count;
      return `Found ${String(count ?? 0)} events nearby`;
    }
    case "getSchoolCalendar": {
      const days = output.days_checked;
      const holidays = output.holidays;
      if (days === 0) {
        return "No calendar data for this period";
      }
      return `${String(days ?? 0)} days checked, ${String(holidays ?? 0)} holidays`;
    }
    default:
      return "Completed";
  }
}
