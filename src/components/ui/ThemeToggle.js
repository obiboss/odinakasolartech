"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { setTheme } = useTheme();

  const onToggle = () => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Toggle theme"
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:rgba(var(--border),var(--borderA))] bg-[color:rgba(var(--panel),var(--panelA))] backdrop-blur hover:opacity-90"
    >
      {/* show Moon in light, Sun in dark (pure CSS, no state needed) */}
      <Moon className="h-5 w-5 dark:hidden" />
      <Sun className="hidden h-5 w-5 dark:block" />
    </button>
  );
}
