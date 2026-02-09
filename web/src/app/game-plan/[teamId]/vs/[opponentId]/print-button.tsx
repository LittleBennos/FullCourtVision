"use client";

import { Printer } from "lucide-react";

export function GamePlanPrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
    >
      <Printer className="w-4 h-4" />
      Print Game Plan
    </button>
  );
}
