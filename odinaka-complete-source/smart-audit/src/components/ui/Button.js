// src/components/ui/Button.js
import clsx from "clsx";

export default function Button({
  as: Comp = "button",
  variant = "ghost",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold cursor-pointer disabled:cursor-not-allowed " +
    "transition-transform duration-200 hover:-translate-y-[1px] active:translate-y-0 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

  const variants = {
    ghost:
      "bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 shadow-soft",
    primary:
      "bg-amber-500 border border-amber-500 text-slate-900 hover:bg-amber-400 shadow-soft",
    subtle:
      "bg-slate-900/5 border border-slate-200 text-slate-900 hover:bg-slate-900/10 shadow-soft",
  };

  return (
    <Comp
      className={clsx(base, variants[variant] || variants.ghost, className)}
      {...props}
    />
  );
}
