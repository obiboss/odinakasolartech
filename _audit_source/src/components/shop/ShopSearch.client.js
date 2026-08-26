"use client";

export default function ShopSearch({ value, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      <input
        className="w-full sm:w-[360px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none shadow-sm focus:ring-2 focus:ring-amber-300/60 focus:border-amber-300"
        placeholder="Search products (e.g. 550W, inverter, battery)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </form>
  );
}
