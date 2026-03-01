/**
 * Topic detection utility for identifying which data sources
 * are being referenced in the streaming response.
 */

export type DataSource = "weather" | "events" | "calendar" | "restaurant";

const TOPIC_PATTERNS: Record<DataSource, RegExp> = {
  weather: /\b(rain|rainy|sunny|cold|hot|temperature|forecast|weather|degrees|umbrella|snow|wind|humid|clear|cloudy|storm|precipitation)\b/i,
  events: /\b(event|concert|game|attendees|madison square|ticket|crowd|venue|sports|music|show|performance|match|stadium)\b/i,
  calendar: /\b(school|holiday|spring break|family|kids|students|DOE|vacation|break|children|parents)\b/i,
  restaurant: /\b(pizza|location|carmine|address|rating|restaurant|capacity|seating|tables|covers)\b/i,
};

// Reasoning indicator patterns - sentences that show analytical thinking
const REASONING_PATTERNS = [
  /\b(this means|therefore|because|due to|as a result|considering|given that|which suggests|indicates that|correlates with|expect|recommend|should|likely|impact|affect|increase|decrease|higher|lower|more|fewer)\b/i,
];

/**
 * Detects which data sources are being referenced in a text chunk.
 * Uses a sliding window approach to detect recent mentions.
 */
export function detectActiveTopics(text: string): Set<DataSource> {
  const active = new Set<DataSource>();

  for (const [source, pattern] of Object.entries(TOPIC_PATTERNS)) {
    if (pattern.test(text)) {
      active.add(source as DataSource);
    }
  }

  return active;
}

/**
 * Extracts reasoning/analytical snippets from text.
 * Returns the most recent sentence that contains analytical language.
 */
export function extractReasoning(text: string): string | null {
  // Split into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

  // Find sentences with reasoning indicators
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i]?.trim();
    if (!sentence) continue;

    for (const pattern of REASONING_PATTERNS) {
      if (pattern.test(sentence)) {
        // Truncate if too long
        if (sentence.length > 100) {
          return sentence.slice(0, 100) + "...";
        }
        return sentence;
      }
    }
  }

  return null;
}

/**
 * Tracks topic activity over a sliding window of text.
 * Topics stay "active" for a short duration after being mentioned.
 */
export class TopicTracker {
  private lastMentioned = new Map<DataSource, number>();
  private activeWindow = 2000; // ms to keep topic active after mention

  update(text: string): Set<DataSource> {
    const now = Date.now();
    const mentioned = detectActiveTopics(text);

    // Update last mentioned times
    for (const source of mentioned) {
      this.lastMentioned.set(source, now);
    }

    // Return all recently active sources
    const active = new Set<DataSource>();
    for (const [source, time] of this.lastMentioned) {
      if (now - time < this.activeWindow) {
        active.add(source);
      }
    }

    return active;
  }

  reset() {
    this.lastMentioned.clear();
  }
}

/**
 * Maps data sources to display labels
 */
export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  weather: "Weather Forecast",
  events: "Local Events",
  calendar: "School Calendar",
  restaurant: "Restaurant Info",
};

/**
 * Maps data sources to icons (lucide icon names)
 */
export const DATA_SOURCE_ICONS: Record<DataSource, string> = {
  weather: "cloud",
  events: "calendar-days",
  calendar: "graduation-cap",
  restaurant: "map-pin",
};
