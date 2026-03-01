"use client";

import { useState, useCallback } from "react";
import { ChefHat } from "lucide-react";
import { ChatInterface } from "./components/ChatInterface";
import { CurrentStep, APICallLog } from "./components/ToolVisualization";
import type { ToolCall } from "./components/types";

export default function Home() {
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [activeTool, setActiveTool] = useState<ToolCall | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleToolCallStart = useCallback((toolCall: ToolCall) => {
    setIsRunning(true);
    setActiveTool(toolCall);
    setToolCalls((prev) => {
      // Update existing or add new
      const exists = prev.find((t) => t.id === toolCall.id);
      if (exists) {
        return prev.map((t) => (t.id === toolCall.id ? toolCall : t));
      }
      return [...prev, toolCall];
    });
  }, []);

  const handleToolCallComplete = useCallback((toolCall: ToolCall) => {
    setActiveTool(null);
    setToolCalls((prev) =>
      prev.map((t) => (t.id === toolCall.id ? toolCall : t))
    );
    // Keep isRunning true - will be set false when all tools complete
    setTimeout(() => {
      setIsRunning(false);
    }, 500);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-slate-900">Google Eats</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Staffing Intelligence
          </h1>
          <p className="text-lg text-slate-500">
            Watch the agent reason through your request
          </p>
        </div>

        {/* Three Column Layout */}
        <div className="relative flex justify-center items-start gap-8">
          {/* Left - Current Step Spotlight */}
          <div className="pt-12">
            <CurrentStep activeTool={activeTool} isRunning={isRunning} />
          </div>

          {/* Center - Phone with Chat */}
          <ChatInterface
            onToolCallStart={handleToolCallStart}
            onToolCallComplete={handleToolCallComplete}
          />

          {/* Right - API Call Log */}
          <div className="pt-12">
            <APICallLog toolCalls={toolCalls} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-sm text-slate-400">
          Powered by Google Places API, OpenWeather, Ticketmaster & NYC DOE
          Calendar
        </p>
      </footer>
    </div>
  );
}
