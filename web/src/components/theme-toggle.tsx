"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button className="p-2 rounded-lg text-muted-foreground" aria-label="Toggle theme">
        <Moon className="w-5 h-5" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="w-5 h-5 transition-transform duration-300 rotate-0" />
      ) : (
        <Moon className="w-5 h-5 transition-transform duration-300 rotate-0" />
      )}
    </button>
  );
}
