/* eslint-disable @typescript-eslint/no-base-to-string */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ChefHat, MapPin, Loader2 } from "lucide-react";
import { PhoneMockup } from "./PhoneMockup";
import { AssistantMessage } from "./AssistantMessage";
import {
  DEMO_RESTAURANTS,
  STAFFING_INTENTS,
  type ToolCall,
  type Restaurant,
  type SessionContext,
  getToolDisplayInfo,
  formatApiCall,
  formatToolResult,
} from "./types";
import { TopicTracker, extractReasoning, type DataSource } from "./topicDetector";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type ChatPhase = "select-restaurant" | "loading-context" | "select-intent" | "chat";

interface ChatInterfaceProps {
  onToolCallStart?: (toolCall: ToolCall) => void;
  onToolCallComplete?: (toolCall: ToolCall) => void;
  onContextReady?: (context: SessionContext) => void;
  onPhaseChange?: (phase: ChatPhase) => void;
  onActiveSourcesChange?: (sources: Set<DataSource>) => void;
  onReasoningChange?: (reasoning: string | null) => void;
  onStreamingChange?: (isStreaming: boolean) => void;
}

// Stream event types
interface StreamEvent {
  type: string;
  id?: string;
  delta?: string;
  toolCallId?: string;
  toolName?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

// Track tool info by toolCallId for matching output events
interface ToolInfo {
  toolName: string;
  input?: Record<string, unknown>;
  apiCall: string;
}

export function ChatInterface({
  onToolCallStart,
  onToolCallComplete,
  onContextReady,
  onPhaseChange,
  onActiveSourcesChange,
  onReasoningChange,
  onStreamingChange,
}: ChatInterfaceProps) {
  const [phase, setPhase] = useState<ChatPhase>("select-restaurant");
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const toolInfoMapRef = useRef<Map<string, ToolInfo>>(new Map());
  const topicTrackerRef = useRef<TopicTracker>(new TopicTracker());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Notify parent of phase changes
  const updatePhase = useCallback((newPhase: ChatPhase) => {
    setPhase(newPhase);
    onPhaseChange?.(newPhase);
  }, [onPhaseChange]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial context data for the selected restaurant
  const fetchContextData = useCallback(async (restaurant: Restaurant) => {
    updatePhase("loading-context");
    setIsLoading(true);
    toolInfoMapRef.current.clear(); // Clear any stale tool info

    const contextPrompt = `I need to gather context for ${restaurant.name} at ${restaurant.address}, ${restaurant.neighborhood}.
Please look up this restaurant, then get the weather forecast, local events, and school calendar for this week.
Just gather the data - I'll ask my specific question next.`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: contextPrompt }],
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      const context: Partial<SessionContext> = {
        restaurant: {
          name: restaurant.name,
          address: restaurant.address,
          lat: 0,
          lon: 0,
        },
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as StreamEvent;

            // Track tool calls for visualization
            if (parsed.type === "tool-input-start" && parsed.toolName && parsed.toolCallId) {
              setActiveToolName(parsed.toolName);
              const displayInfo = getToolDisplayInfo(parsed.toolName);

              // Store tool info for later matching with output
              toolInfoMapRef.current.set(parsed.toolCallId, {
                toolName: parsed.toolName,
                apiCall: "Processing...",
              });

              const toolCall: ToolCall = {
                id: parsed.toolCallId,
                toolName: parsed.toolName,
                action: displayInfo.action,
                apiCall: "Processing...",
                status: "running",
                source: displayInfo.source,
                icon: displayInfo.icon,
              };
              onToolCallStart?.(toolCall);
            }

            if (parsed.type === "tool-input-available" && parsed.toolName && parsed.input && parsed.toolCallId) {
              const displayInfo = getToolDisplayInfo(parsed.toolName);
              const apiCall = formatApiCall(parsed.toolName, parsed.input);

              // Update stored tool info with input
              toolInfoMapRef.current.set(parsed.toolCallId, {
                toolName: parsed.toolName,
                input: parsed.input,
                apiCall,
              });

              const toolCall: ToolCall = {
                id: parsed.toolCallId,
                toolName: parsed.toolName,
                action: displayInfo.action,
                apiCall,
                status: "running",
                source: displayInfo.source,
                input: parsed.input,
                icon: displayInfo.icon,
              };
              onToolCallStart?.(toolCall);
            }

            // Capture tool outputs for context caching
            if (parsed.type === "tool-output-available" && parsed.toolCallId && parsed.output) {
              setActiveToolName(null);

              // Retrieve tool info from our map
              const storedInfo = toolInfoMapRef.current.get(parsed.toolCallId);
              const toolName = storedInfo?.toolName ?? "unknown";
              const apiCall = storedInfo?.apiCall ?? "";

              const displayInfo = getToolDisplayInfo(toolName);
              const toolCall: ToolCall = {
                id: parsed.toolCallId,
                toolName,
                action: displayInfo.action,
                apiCall,
                status: "completed",
                result: formatToolResult(toolName, parsed.output),
                source: displayInfo.source,
                output: parsed.output,
                icon: displayInfo.icon,
              };
              onToolCallComplete?.(toolCall);

              // Cache the data
              switch (toolName) {
                case "lookupRestaurant": {
                  const rest = parsed.output.restaurant as Record<string, unknown> | undefined;
                  if (rest) {
                    context.restaurant = {
                      name: String(rest.name ?? restaurant.name),
                      address: String(rest.address ?? restaurant.address),
                      lat: Number(rest.lat ?? 0),
                      lon: Number(rest.lon ?? 0),
                    };
                  }
                  break;
                }
                case "getWeather":
                  context.weather = parsed.output;
                  break;
                case "getLocalEvents":
                  context.events = parsed.output;
                  break;
                case "getSchoolCalendar":
                  context.schoolCalendar = parsed.output;
                  break;
              }
            }

            if (parsed.type === "finish-step") {
              setActiveToolName(null);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Context is ready
      const finalContext = context as SessionContext;
      setSessionContext(finalContext);
      onContextReady?.(finalContext);
      updatePhase("select-intent");
    } catch (error) {
      console.error("Context fetch error:", error);
      // Fall back to chat anyway
      updatePhase("select-intent");
    } finally {
      setIsLoading(false);
      setActiveToolName(null);
    }
  }, [onToolCallStart, onToolCallComplete, onContextReady, updatePhase]);

  // Handle restaurant selection
  const handleRestaurantSelect = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    void fetchContextData(restaurant);
  };

  // Handle intent selection - starts the chat with context
  const handleIntentSelect = (intent: typeof STAFFING_INTENTS[0]) => {
    updatePhase("chat");

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: intent.prompt,
    };
    setMessages([userMessage]);

    // Send to API with context
    void sendMessageWithContext(intent.prompt);
  };

  // Send message with pre-fetched context (no new API calls needed)
  const sendMessageWithContext = async (userPrompt: string) => {
    setIsLoading(true);
    onStreamingChange?.(true);
    topicTrackerRef.current.reset();

    // Build concise context using summaries only
    const weatherSummary = sessionContext?.weather?.summary as string | undefined ?? "No weather data";
    const eventsSummary = sessionContext?.events?.summary as string | undefined ?? "No events data";
    const calendarSummary = sessionContext?.schoolCalendar?.summary as string | undefined ?? "No calendar data";

    const restaurantName = sessionContext?.restaurant.name ?? "Unknown";
    const restaurantAddress = sessionContext?.restaurant.address ?? "Unknown";

    // Create a message that includes context so the model doesn't need to fetch again
    const systemContext = `You are a concise restaurant staffing assistant. Answer based on this pre-fetched data - DO NOT call any tools.

CONTEXT:
• Restaurant: ${restaurantName} at ${restaurantAddress}
• Weather: ${weatherSummary}
• Events: ${eventsSummary}
• Calendar: ${calendarSummary}

RESPONSE RULES:
1. One bold headline sentence
2. 3-4 bullet points MAX, each one line
3. Group similar days (e.g., "Tue-Wed")
4. End with a short follow-up question
5. Under 80 words total`;

    // Build conversation history from existing messages
    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemContext },
            ...conversationHistory,
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantMessageId = crypto.randomUUID();
      let hasAddedAssistantMessage = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as StreamEvent;

            if (parsed.type === "text-delta" && parsed.delta) {
              assistantContent += parsed.delta;

              // Track which data sources are being referenced
              const activeSources = topicTrackerRef.current.update(assistantContent);
              onActiveSourcesChange?.(activeSources);

              // Extract reasoning snippets
              const reasoning = extractReasoning(assistantContent);
              onReasoningChange?.(reasoning);

              if (!hasAddedAssistantMessage) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantMessageId,
                    role: "assistant",
                    content: assistantContent,
                  },
                ]);
                hasAddedAssistantMessage = true;
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: assistantContent }
                      : m
                  )
                );
              }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      onStreamingChange?.(false);
      // Clear reasoning after streaming ends
      onReasoningChange?.(null);
      // Keep active sources visible briefly, then clear
      setTimeout(() => {
        onActiveSourcesChange?.(new Set());
      }, 2000);
    }
  };

  // Handle follow-up messages in chat
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    await sendMessageWithContext(inputValue.trim());
  };

  // Reset to start
  const reset = () => {
    updatePhase("select-restaurant");
    setSelectedRestaurant(null);
    setSessionContext(null);
    setMessages([]);
    setInputValue("");
    toolInfoMapRef.current.clear();
    topicTrackerRef.current.reset();
    onActiveSourcesChange?.(new Set());
    onReasoningChange?.(null);
  };

  return (
    <PhoneMockup>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <ChefHat className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">Google Eats</p>
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {phase === "loading-context"
              ? activeToolName
                ? getToolDisplayInfo(activeToolName).action
                : "Gathering data..."
              : selectedRestaurant
                ? selectedRestaurant.name
                : "Select a restaurant"}
          </p>
        </div>
        {phase !== "select-restaurant" && (
          <button
            onClick={reset}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Reset
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {/* Phase 1: Select Restaurant */}
          {phase === "select-restaurant" && (
            <motion.div
              key="select-restaurant"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/20">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <p className="text-base font-medium text-slate-900">Select your restaurant</p>
                <p className="text-sm text-slate-500">Choose a location to get started</p>
              </div>
              <div className="space-y-2">
                {DEMO_RESTAURANTS.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    onClick={() => handleRestaurantSelect(restaurant)}
                    className="w-full p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all"
                  >
                    <p className="font-medium text-slate-900">{restaurant.name}</p>
                    <p className="text-sm text-slate-500">
                      {restaurant.address} • {restaurant.neighborhood}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{restaurant.type}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Phase 2: Loading Context */}
          {phase === "loading-context" && (
            <motion.div
              key="loading-context"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <p className="text-base font-medium text-slate-900 mb-1">
                Gathering context for {selectedRestaurant?.name}
              </p>
              <p className="text-sm text-slate-500">
                {activeToolName
                  ? getToolDisplayInfo(activeToolName).action
                  : "Preparing..."}
              </p>
            </motion.div>
          )}

          {/* Phase 3: Select Intent */}
          {phase === "select-intent" && (
            <motion.div
              key="select-intent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <div className="text-center mb-6">
                <p className="text-base font-medium text-slate-900">
                  {selectedRestaurant?.name}
                </p>
                <p className="text-sm text-slate-500">What would you like to know?</p>
              </div>
              <div className="space-y-2">
                {STAFFING_INTENTS.map((intent) => (
                  <button
                    key={intent.id}
                    onClick={() => handleIntentSelect(intent)}
                    className="w-full p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{intent.icon}</span>
                      <div>
                        <p className="font-medium text-slate-900">{intent.name}</p>
                        <p className="text-sm text-slate-500">{intent.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Phase 4: Chat */}
          {phase === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {messages.map((msg, msgIndex) => {
                const isLastMessage = msgIndex === messages.length - 1;
                const isStreamingThis = isLoading && isLastMessage && msg.role === "assistant";

                if (msg.role === "assistant") {
                  return (
                    <AssistantMessage
                      key={msg.id}
                      messageId={msg.id}
                      content={msg.content}
                      isStreaming={isStreamingThis}
                    />
                  );
                }

                // User message - simple bubble
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm">
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              {/* Show typing indicator only when loading but no assistant message yet */}
              {isLoading && (messages.length === 0 || messages[messages.length - 1]?.role !== "assistant") && (
                <div className="flex gap-1 px-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                      className="w-2 h-2 rounded-full bg-slate-300"
                    />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input - only show in chat phase */}
      {phase === "chat" && (
        <div className="p-4 border-t border-slate-100">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a follow-up question..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="w-11 h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center disabled:opacity-50 transition-opacity"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </PhoneMockup>
  );
}
