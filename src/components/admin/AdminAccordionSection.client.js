"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function AdminAccordionSection({ title, summary, children, className = "" }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-900">{title}</span>
          {summary ? <span className="mt-0.5 block text-xs text-slate-500">{summary}</span> : null}
        </span>
        <ChevronDown aria-hidden="true" className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : "-rotate-90"}`} />
      </button>
      <div
        id={contentId}
        aria-hidden={!open}
        inert={!open ? "" : undefined}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-slate-200 p-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
