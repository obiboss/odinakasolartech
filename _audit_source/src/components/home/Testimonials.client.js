"use client";

export default function Testimonials() {
  const reviews = [
    {
      name: "Chinedu",
      text: "Installed a 5kVA inverter system for my shop. Stable power now.",
    },
    {
      name: "Aisha",
      text: "Original solar panels and fast delivery.",
    },
    {
      name: "Tunde",
      text: "Professional installation team. Highly recommended.",
    },
  ];

  return (
    <section className="border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-extrabold text-slate-900 text-center">
          What customers are saying
        </h2>

        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="text-amber-500 text-lg">★★★★★</div>

              <p className="mt-3 text-sm text-slate-700">{r.text}</p>

              <div className="mt-4 text-sm font-semibold">{r.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
