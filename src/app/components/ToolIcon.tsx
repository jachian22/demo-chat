"use client";

import {
  MapPin,
  Cloud,
  Calendar,
  Users,
  Database,
  BarChart3,
  Calculator,
  CheckCircle2,
  Ticket,
} from "lucide-react";
import type { ToolIconType } from "./types";

interface ToolIconProps {
  icon: ToolIconType;
  className?: string;
}

const iconMap = {
  search: MapPin,
  weather: Cloud,
  calendar: Calendar,
  users: Users,
  database: Database,
  chart: BarChart3,
  calculator: Calculator,
  check: CheckCircle2,
  events: Ticket,
};

export function ToolIcon({ icon, className }: ToolIconProps) {
  const Icon = iconMap[icon] || MapPin;
  return <Icon className={className} />;
}
