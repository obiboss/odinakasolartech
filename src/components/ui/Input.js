export default function Input(props) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none
                 focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15 transition"
    />
  );
}
