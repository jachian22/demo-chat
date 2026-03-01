import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTableCreator,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `pathway_${name}`);

// =============================================================================
// CORE CHAT TABLES
// =============================================================================

export const chatSessions = createTable(
  "chat_sessions",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    startedAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    endedAt: d.timestamp({ withTimezone: true }),
    status: d.text().default("active").notNull(),
    model: d.text().notNull(),
    distinctId: d.text(),
    meta: d
      .jsonb()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
  }),
  (t) => [
    index("chat_sessions_started_at_idx").on(t.startedAt),
    index("chat_sessions_distinct_id_idx").on(t.distinctId),
    check(
      "chat_sessions_status_check",
      sql`${t.status} in ('active','ended','error')`,
    ),
  ],
);

export const chatMessages = createTable(
  "chat_messages",
  (d) => ({
    id: d.bigserial({ mode: "number" }).primaryKey(),
    sessionId: d
      .uuid()
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    messageIndex: d.integer().notNull(),
    role: d.text().notNull(),
    content: d.text(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    uniqueIndex("chat_messages_session_message_index_uidx").on(
      t.sessionId,
      t.messageIndex,
    ),
    check(
      "chat_messages_role_check",
      sql`${t.role} in ('user','assistant','tool','system')`,
    ),
  ],
);

// Simplified tool calls table for debugging and UI display
export const chatToolCalls = createTable(
  "chat_tool_calls",
  (d) => ({
    id: d.bigserial({ mode: "number" }).primaryKey(),
    sessionId: d
      .uuid()
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    toolName: d.text().notNull(),
    argsJson: d
      .jsonb()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    resultJson: d.jsonb().$type<Record<string, unknown>>(),
    status: d.text().default("ok").notNull(),
    latencyMs: d.integer(),
    errorMessage: d.text(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    index("chat_tool_calls_session_created_idx").on(t.sessionId, t.createdAt),
    check(
      "chat_tool_calls_status_check",
      sql`${t.status} in ('ok','error','timeout')`,
    ),
  ],
);


// =============================================================================
// USER PREFERENCES (cross-session persistence)
// =============================================================================

export const chatUserPreferences = createTable(
  "chat_user_preferences",
  (d) => ({
    id: d.bigserial({ mode: "number" }).primaryKey(),
    distinctId: d.text().notNull(),
    key: d.text().notNull(),
    valueJson: d.jsonb().$type<Record<string, unknown>>().notNull(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    uniqueIndex("chat_user_preferences_distinct_key_uidx").on(
      t.distinctId,
      t.key,
    ),
    index("chat_user_preferences_distinct_idx").on(t.distinctId),
  ],
);

// =============================================================================
// REFERENCE DATA
// =============================================================================

export const doeCalendarDays = createTable(
  "doe_calendar_days",
  (d) => ({
    id: d.bigserial({ mode: "number" }).primaryKey(),
    calendarDate: d.date().notNull(),
    eventType: d.text().notNull(),
    isSchoolDay: d.boolean().notNull(),
    sourceUpdatedAt: d.timestamp({ withTimezone: true }),
    meta: d
      .jsonb()
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    uniqueIndex("doe_calendar_days_date_uidx").on(t.calendarDate),
    index("doe_calendar_days_school_day_idx").on(t.isSchoolDay, t.calendarDate),
  ],
);
