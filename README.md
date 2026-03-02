# Restaurant Staffing Assistant Demo

An AI-powered chat interface that helps NYC restaurant owners plan staffing based on weather forecasts, local events, and school calendars.

## Overview

This demo showcases a multi-turn conversational AI that:
1. Gathers context about a restaurant location using external APIs
2. Provides staffing recommendations based on synthesized data
3. Maintains conversation context for follow-up questions

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ChatInterface.tsx                                                  │
│  ├── Restaurant selection (demo restaurants)                        │
│  ├── Context gathering phase (tool calls visualized)                │
│  ├── Intent selection (weekly plan, weekend focus, etc.)            │
│  └── Multi-turn chat with conversation history                      │
│                                                                     │
│  sessionContext (React state)                                       │
│  ├── restaurant: { name, address, lat, lon }                        │
│  ├── weather: { summary, insights[] }                               │
│  ├── events: { summary, insights[] }                                │
│  └── schoolCalendar: { summary, insights[] }                        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API Route (/api/chat)                          │
├─────────────────────────────────────────────────────────────────────┤
│  • Streams responses using Vercel AI SDK                            │
│  • Supports custom system prompts (context-aware follow-ups)        │
│  • Persists messages and tool calls to database                     │
│  • Returns session ID in X-Session-Id header                        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AI Tools                                    │
├─────────────────────────────────────────────────────────────────────┤
│  lookupRestaurant  → Google Places API                              │
│  getWeather        → OpenWeather API                                │
│  getLocalEvents    → Ticketmaster API                               │
│  getSchoolCalendar → NYC DOE calendar (local DB)                    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Database (PostgreSQL)                          │
├─────────────────────────────────────────────────────────────────────┤
│  chat_sessions      │ id, status, model, startedAt                  │
│  chat_messages      │ sessionId, role, content, messageIndex        │
│  chat_tool_calls    │ sessionId, toolName, argsJson, resultJson     │
│  doe_calendar_days  │ calendarDate, eventType, isSchoolDay          │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Initial Context Gathering
```
User selects restaurant
        ↓
fetchContextData() sends context prompt
        ↓
AI calls tools: lookupRestaurant → getWeather → getLocalEvents → getSchoolCalendar
        ↓
Tool results cached in sessionContext (React state)
Tool results persisted to chat_tool_calls table
        ↓
User selects intent (e.g., "Plan This Week")
```

### Follow-up Messages
```
User types follow-up question
        ↓
sendMessageWithContext() builds request:
  - System message with cached context summaries
  - Full conversation history
  - Current user message
        ↓
AI responds using cached context (no new tool calls needed)
```

## Environment Variables

```bash
# AI Provider
OPENROUTER_API_KEY=
OPENROUTER_MODEL=anthropic/claude-sonnet-4

# External APIs
GOOGLE_PLACES_API_KEY=
OPENWEATHER_API_KEY=
TICKETMASTER_API_KEY=

# Database
DATABASE_URL=
```

## Running Locally

```bash
pnpm install
pnpm db:push    # Set up database schema
pnpm dev        # Start development server
```

## Current Limitations

### Session Persistence (Not Yet Implemented)

Currently, session context is stored only in React state and is lost on page refresh. The database stores all the data needed for recovery:

```
Database (persisted)              React State (volatile)
┌────────────────────┐            ┌────────────────────┐
│ chat_sessions      │            │ sessionContext     │
│ chat_tool_calls    │───────X────│   .weather         │
│   .resultJson      │  not       │   .events          │
│                    │  linked    │   .schoolCalendar  │
└────────────────────┘            └────────────────────┘
        ↑                                  ↑
   Survives refresh                 Lost on refresh
```

**The gap:**
- API returns `X-Session-Id` header but frontend doesn't capture it
- No mechanism to reload cached context from stored tool results
- Each page refresh creates a new session

## Roadmap

### Next: Session Recovery

Implement session persistence to survive page refreshes:

1. **Capture session ID** - Store `X-Session-Id` from API response in localStorage
2. **Session recovery endpoint** - Create `GET /api/chat/session/[id]` to return:
   - Session metadata
   - Conversation history from `chat_messages`
   - Cached context rebuilt from `chat_tool_calls.resultJson`
3. **Frontend recovery** - On page load, check localStorage for session ID and restore state

```typescript
// Proposed session recovery flow
const savedSessionId = localStorage.getItem('chatSessionId');
if (savedSessionId) {
  const session = await fetch(`/api/chat/session/${savedSessionId}`);
  setSessionContext(session.context);
  setMessages(session.messages);
  setPhase('chat');
}
```

### Future Enhancements

- **Real restaurant lookup** - Remove demo restaurants, allow any restaurant search
- **Date range selection** - Let users specify custom date ranges for planning
- **Notification system** - Alert users when conditions change significantly
- **Multi-restaurant support** - Manage staffing across multiple locations
