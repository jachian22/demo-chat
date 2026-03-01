"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Brain, Sparkles } from "lucide-react";
import { ToolIcon } from "./ToolIcon";
import type { ToolCall } from "./types";

interface CurrentStepProps {
  activeTool: ToolCall | null;
  isRunning: boolean;
  reasoning?: string | null;
  isStreaming?: boolean;
}

export function CurrentStep({
  activeTool,
  isRunning,
  reasoning,
  isStreaming,
}: CurrentStepProps) {
  return (
    <div className="w-72">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">
        Current Step
      </p>

      <AnimatePresence mode="wait">
        {/* Tool call mode - during API calls */}
        {activeTool ? (
          <motion.div
            key={`tool-${activeTool.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-indigo-200 p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
              <p className="text-xs text-indigo-600 font-medium">
                {activeTool.source}
              </p>
            </div>
            <p className="text-sm font-medium text-slate-900 mb-3">
              {activeTool.action}
            </p>
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-xs text-slate-600 font-mono break-all">
                {activeTool.apiCall}
              </p>
            </div>
          </motion.div>
        ) : isStreaming && reasoning ? (
          /* Reasoning mode - during chat response streaming */
          <motion.div
            key="reasoning"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border-2 border-purple-200 p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center"
              >
                <Brain className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <p className="text-xs text-purple-600 font-medium">Analyzing</p>
                <p className="text-xs text-slate-400">Using cached data</p>
              </div>
            </div>
            <div className="bg-purple-50/50 rounded-lg px-3 py-2">
              <p className="text-sm text-slate-700 leading-relaxed">
                {reasoning}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block ml-0.5 w-2 h-4 bg-purple-400 align-middle"
                />
              </p>
            </div>
          </motion.div>
        ) : isStreaming ? (
          /* Streaming but no reasoning extracted yet */
          <motion.div
            key="streaming"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-purple-200 p-5"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center"
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Generating response
                </p>
                <p className="text-xs text-slate-400">Processing your request</p>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Idle state */
          <motion.div
            key="ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 p-5"
          >
            <p className="text-sm text-slate-400 text-center">
              {isRunning ? "Processing..." : "Ready"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface APICallLogProps {
  toolCalls: ToolCall[];
}

export function APICallLog({ toolCalls }: APICallLogProps) {
  const completedCalls = toolCalls
    .filter((c) => c.status === "completed")
    .slice(-5)
    .reverse();

  return (
    <div className="w-80">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">
        API Calls
      </p>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {completedCalls.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 p-5 text-center"
            >
              <p className="text-sm text-slate-400">Waiting for activity...</p>
            </motion.div>
          ) : (
            completedCalls.map((call) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                layout
                className="bg-white rounded-xl shadow-lg border border-slate-100 p-4"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <ToolIcon icon={call.icon} className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {call.source}
                    </p>
                    <p className="text-xs text-slate-500">{call.action}</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg px-2 py-1.5 mb-2">
                  <p className="text-xs text-slate-600 font-mono break-all line-clamp-2">
                    {call.apiCall}
                  </p>
                </div>
                {call.result && (
                  <p className="text-xs text-emerald-600 font-medium">
                    ✓ {call.result}
                  </p>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
