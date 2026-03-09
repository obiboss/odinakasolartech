export default function TrustSection() {
  return (
    <section className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 grid md:grid-cols-4 gap-6 text-center">
        <div>
          <div className="text-2xl">✔</div>
          <div className="mt-2 font-semibold">Verified Products</div>
        </div>

        <div>
          <div className="text-2xl">⚡</div>
          <div className="mt-2 font-semibold">Fast Delivery</div>
        </div>

        <div>
          <div className="text-2xl">💬</div>
          <div className="mt-2 font-semibold">WhatsApp Support</div>
        </div>

        <div>
          <div className="text-2xl">🔧</div>
          <div className="mt-2 font-semibold">Installation Support</div>
        </div>
      </div>
    </section>
  );
}
