"use client";

export default function AppLoader({ visible = true }) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center overflow-hidden bg-linear-to-br from-[#f8fafc]/90 via-[#f1f5f9]/92 to-[#e2e8f0]/90 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/20 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/[0.04]" />
      </div>

      <div className="relative flex flex-col items-center">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-400/15 blur-2xl" />
          <div className="absolute inset-0 rounded-full border border-slate-200/80 bg-white/40 backdrop-blur-sm shadow-[0_18px_50px_rgba(15,23,42,0.08)]" />
          <div className="absolute inset-[6px] rounded-full border-[3px] border-transparent border-t-amber-500 border-r-amber-400 animate-spin" />
          <div className="absolute inset-[16px] rounded-full border-[3px] border-transparent border-b-slate-700 border-l-slate-500 animate-[spin_1.4s_linear_infinite_reverse]" />
          <div className="absolute inset-[28px] rounded-full bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_24px_rgba(15,23,42,0.08)]" />
          <div className="absolute h-3.5 w-3.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.45)] animate-pulse" />
        </div>

        <div className="mt-8 text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.34em] text-amber-600 sm:text-base">
            Odinaka Solar Tech
          </div>
          <div className="mt-2 text-base text-slate-700">
            Powering up your experience
          </div>
        </div>
      </div>
    </div>
  );
}
