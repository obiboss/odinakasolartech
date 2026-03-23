"use client";

import { Sun } from "lucide-react";

export default function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="Light theme"
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:rgba(var(--border),var(--borderA))] bg-[color:rgba(var(--panel),var(--panelA))] backdrop-blur hover:opacity-90 cursor-pointer"
    >
      <Sun className="h-5 w-5" />
    </button>
  );
}
