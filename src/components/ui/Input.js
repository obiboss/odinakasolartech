export default function Input(props) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none
                 focus:border-solar-500/40 focus:ring-2 focus:ring-solar-500/15 transition"
    />
  );
}
