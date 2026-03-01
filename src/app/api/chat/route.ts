/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/prefer-nullish-coalescing */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, stepCountIs } from "ai";
import { env } from "@/env";
import { staffingTools } from "@/server/ai/tools";
import { db } from "@/server/db";
import { chatSessions, chatMessages, chatToolCalls } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

const SYSTEM_PROMPT = `You are a restaurant staffing assistant for NYC restaurants. Help owners plan staffing based on weather, events, and school calendars.

WORKFLOW:
1. When a user mentions a restaurant, ALWAYS call lookupRestaurant first to get its location
2. Once you have coordinates, use getWeather, getLocalEvents, and getSchoolCalendar to gather data
3. Synthesize insights into actionable staffing recommendations

RESPONSE FORMAT - CRITICAL:
You MUST keep responses short and scannable. Follow this structure:

**[One-sentence bottom line]**

• [Key adjustment 1 with specific numbers]
• [Key adjustment 2 with specific numbers]
• [Key adjustment 3 if needed]

[Optional: One sentence on what to watch for]

RULES:
- Maximum 4-5 bullet points per response
- Each bullet should be ONE line, not a paragraph
- Never repeat the same insight in multiple sections
- No lengthy introductions or conclusions
- No "General Notes" or "Summary" sections - just give the answer
- If days have similar recommendations, group them (e.g., "Tue-Wed: +2 drivers")
- End with a question to invite follow-up, not a wall of caveats

EXAMPLE GOOD RESPONSE:
"**This week: shift staffing from dine-in to delivery due to rain.**

• Mon-Wed: -1 host each night (cold/rain reducing walk-ins)
• Tue-Wed: +2 delivery drivers (rain driving delivery demand)
• No major events or school holidays affecting you

Want details on any specific day?"

EXAMPLE BAD RESPONSE:
Long paragraphs, multiple headers, repeating "rain will affect traffic" in every section, ending with "Remember to monitor conditions and adjust accordingly."

CONSTRAINTS:
- Only provide recommendations for the date range requested
- If you can't find the restaurant, ask for clarification
- Brief "why" explanations inline (e.g., "+2 drivers due to rain") not separate sections`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    messages: ChatMessage[];
    sessionId?: string;
  };
  const { messages, sessionId } = body;

  // Ensure session exists
  let currentSessionId = sessionId;
  if (!currentSessionId) {
    const [session] = await db
      .insert(chatSessions)
      .values({
        model: env.OPENROUTER_MODEL,
        status: "active",
      })
      .returning({ id: chatSessions.id });
    currentSessionId = session?.id;
  }

  // Get current message count for indexing
  const existingMessages = currentSessionId
    ? await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, currentSessionId))
    : [];
  let messageIndex = existingMessages.length;

  // Save user message
  const userMessage = messages[messages.length - 1];
  if (userMessage && currentSessionId) {
    await db.insert(chatMessages).values({
      sessionId: currentSessionId,
      messageIndex: messageIndex++,
      role: userMessage.role,
      content: userMessage.content,
    });
  }

  const result = streamText({
    model: openrouter(env.OPENROUTER_MODEL),
    system: SYSTEM_PROMPT,
    messages: messages as any,
    tools: staffingTools,
    stopWhen: stepCountIs(10),
    onStepFinish: async (step: any) => {
      // Save tool calls to database (AI SDK 6 uses `input` and `output` fields)
      if (step.toolCalls && currentSessionId) {
        for (const toolCall of step.toolCalls) {
          const toolResult = step.toolResults?.find(
            (r: any) => r.toolCallId === toolCall.toolCallId,
          );
          await db.insert(chatToolCalls).values({
            sessionId: currentSessionId,
            toolName: toolCall.toolName,
            argsJson: toolCall.input as Record<string, unknown>,
            resultJson: toolResult?.output as Record<string, unknown> | undefined,
            status: "ok",
          });
        }
      }
    },
    onFinish: async (result: any) => {
      // Save assistant response
      if (currentSessionId && result.text) {
        await db.insert(chatMessages).values({
          sessionId: currentSessionId,
          messageIndex: messageIndex++,
          role: "assistant",
          content: result.text,
        });
      }
    },
  } as any);

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Session-Id": currentSessionId || "",
    },
  });
}
