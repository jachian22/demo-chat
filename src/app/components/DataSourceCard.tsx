"use client";

import { motion } from "framer-motion";
import { Cloud, CalendarDays, GraduationCap, MapPin } from "lucide-react";
import type { DataSource } from "./topicDetector";

interface DataSourceCardProps {
  type: DataSource;
  active: boolean;
  summary: string;
  onHover?: () => void;
}

const ICONS: Record<DataSource, React.ReactNode> = {
  weather: <Cloud className="w-4 h-4" />,
  events: <CalendarDays className="w-4 h-4" />,
  calendar: <GraduationCap className="w-4 h-4" />,
  restaurant: <MapPin className="w-4 h-4" />,
};

const LABELS: Record<DataSource, string> = {
  weather: "Weather",
  events: "Events",
  calendar: "School Calendar",
  restaurant: "Location",
};

const COLORS: Record<DataSource, { active: string; icon: string; glow: string }> = {
  weather: {
    active: "border-sky-400",
    icon: "bg-sky-500",
    glow: "0 0 20px rgba(14, 165, 233, 0.4)",
  },
  events: {
    active: "border-amber-400",
    icon: "bg-amber-500",
    glow: "0 0 20px rgba(245, 158, 11, 0.4)",
  },
  calendar: {
    active: "border-emerald-400",
    icon: "bg-emerald-500",
    glow: "0 0 20px rgba(16, 185, 129, 0.4)",
  },
  restaurant: {
    active: "border-indigo-400",
    icon: "bg-indigo-500",
    glow: "0 0 20px rgba(99, 102, 241, 0.4)",
  },
};

export function DataSourceCard({ type, active, summary }: DataSourceCardProps) {
  const colors = COLORS[type];

  return (
    <motion.div
      animate={{
        boxShadow: active ? colors.glow : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        scale: active ? 1.02 : 1,
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`bg-white rounded-xl border-2 p-4 transition-colors duration-300 ${
        active ? colors.active : "border-slate-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <motion.div
          animate={{
            scale: active ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 0.6,
            repeat: active ? Infinity : 0,
            repeatDelay: 0.5,
          }}
          className={`w-8 h-8 rounded-lg ${colors.icon} flex items-center justify-center flex-shrink-0`}
        >
          <span className="text-white">{ICONS[type]}</span>
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-slate-900">
              {LABELS[type]}
            </span>
            {active && (
              <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-indigo-600 font-medium"
              >
                Reading...
              </motion.span>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{summary}</p>
        </div>
      </div>
    </motion.div>
  );
}
