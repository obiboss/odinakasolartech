// src/components/shop/ProductReviews.server.js
import ReviewForm from "@/components/shop/ReviewForm.client";

export default async function ProductReviews({ productId, reviews = [] }) {
  return (
    <div className="space-y-4">
      {reviews.length ? (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">
                  Customer
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="mt-1 text-sm text-amber-600">
                {"★".repeat(Math.max(1, Math.min(5, Number(r.rating || 5))))}
              </div>

              <div className="mt-2 text-sm text-slate-700 whitespace-pre-line">
                {r.content}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-600">No reviews yet.</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">
          Leave a review
        </div>
        <div className="mt-1 text-xs text-slate-600">
          Reviews go through moderation before appearing publicly.
        </div>
        <div className="mt-3">
          <ReviewForm productId={productId} />
        </div>
      </div>
    </div>
  );
}
