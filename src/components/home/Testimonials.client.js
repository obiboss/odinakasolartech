"use client";

export default function Testimonials({ reviews = [] }) {
  const approvedReviews = reviews.filter(
    (review) => review.status === "approved",
  );

  if (!approvedReviews.length) return null;

  return (
    <section className="border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-extrabold text-slate-900 text-center">
          What customers are saying
        </h2>

        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {approvedReviews.map((review) => {
            const rating = Math.max(
              1,
              Math.min(5, Number(review.rating || 5)),
            );

            return (
              <div
                key={review.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div
                  className="text-amber-500 text-lg"
                  aria-label={rating + " out of 5 stars"}
                >
                  {"★".repeat(rating)}
                  {"☆".repeat(5 - rating)}
                </div>

                <p className="mt-3 text-sm text-slate-700">
                  {review.content}
                </p>

                <div className="mt-4 text-sm font-semibold">
                  {review.display_name?.trim() || "Customer"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
