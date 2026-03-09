// src/components/reviews/ReviewsBlock.server.js
import { getApprovedReviewsForProduct } from "@/lib/products.server";

export default async function ReviewsBlock({ productId }) {
  const reviews = await getApprovedReviewsForProduct(productId, { limit: 10 });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Reviews</h2>
        <span className="text-xs text-white/60">
          Showing approved reviews only
        </span>
      </div>

      {reviews.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-white/10 bg-black/25 p-4"
            >
              <div className="text-sm font-semibold text-white">
                {r.author_name || "Customer"}
              </div>
              <div className="mt-2 text-sm text-white/75 leading-relaxed">
                {r.content}
              </div>
              <div className="mt-3 text-xs text-white/50">
                {new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 text-sm text-white/60">No reviews yet.</div>
      )}
    </div>
  );
}
