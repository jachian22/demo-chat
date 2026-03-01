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

const SYSTEM_PROMPT = `You are a helpful restaurant staffing assistant for NYC restaurants. Your job is to help restaurant owners and managers plan their staffing based on weather, local events, and school calendars.

WORKFLOW:
1. When a user mentions a restaurant, ALWAYS call lookupRestaurant first to get its location
2. Once you have coordinates, use getWeather, getLocalEvents, and getSchoolCalendar to gather data
3. Synthesize the insights from all tools into actionable staffing recommendations

COMMUNICATION STYLE:
- Be concise and actionable
- Lead with the most important recommendations
- Reference specific events, weather conditions, or calendar dates when explaining your reasoning
- Use bullet points for staffing recommendations
- Include specific numbers when suggesting staff adjustments (e.g., "+2 servers for lunch")

CONSTRAINTS:
- Only provide recommendations for the date range requested
- If you can't find the restaurant, ask for clarification
- Always explain WHY you're making a recommendation (e.g., "due to the NYU graduation nearby")`;

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
