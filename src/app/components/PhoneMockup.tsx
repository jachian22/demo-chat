"use client";

import type { ReactNode } from "react";

interface PhoneMockupProps {
  children: ReactNode;
}

export function PhoneMockup({ children }: PhoneMockupProps) {
  return (
    <div className="relative" style={{ width: 320, height: 660 }}>
      {/* Glow effect behind phone */}
      <div className="absolute -inset-8 bg-gradient-to-b from-indigo-100/50 to-purple-100/50 rounded-full blur-3xl opacity-60" />

      {/* Phone frame */}
      <div className="relative h-full bg-slate-900 rounded-[3rem] p-1 shadow-2xl shadow-slate-900/20">
        {/* Phone screen */}
        <div className="h-full bg-white rounded-[2.8rem] overflow-hidden">
          {/* Notch */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-2xl z-10" />

          {/* Content area */}
          <div className="h-full pt-8 flex flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
}
