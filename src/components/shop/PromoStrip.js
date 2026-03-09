import { getPromos } from "@/lib/content.server";

function isActive(item) {
  const now = new Date();
  const s = item.starts ? new Date(item.starts) : null;
  const e = item.ends ? new Date(item.ends) : null;
  if (s && now < s) return false;
  if (e && now > e) return false;
  return true;
}

export default function PromoStrip() {
  const promos = getPromos();
  if (!promos.active) return null;

  const active = (promos.items || []).filter(isActive);
  if (!active.length) return null;

  const p = active[0];
  return (
    <div className="rounded-2xl border border-solar-500/25 bg-solar-500/10 px-4 py-1">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-solar-500/20 border border-solar-500/30 px-2 py-1 text-[11px] font-bold text-solar-500">
          {p.badge || "PROMO"}
        </span>
        <div>
          <div className="font-semibold">{p.title}</div>
          <div className="text-sm text-white/70">{p.subtitle}</div>
        </div>
      </div>
    </div>
  );
}
