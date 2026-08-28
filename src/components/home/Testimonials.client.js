"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

export default function Testimonials({ reviews = [] }) {
  const approvedReviews = reviews.filter(
    (review) => review.status === "approved",
  );
  const carouselRef = useRef(null);

  if (!approvedReviews.length) return null;

  function moveCarousel(direction) {
    carouselRef.current?.scrollBy({
      left: direction * carouselRef.current.clientWidth,
      behavior: "smooth",
    });
  }

  return (
    <section className="border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-extrabold text-slate-900">
            What customers are saying
          </h2>

          {approvedReviews.length > 1 ? (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => moveCarousel(-1)}
                aria-label="Previous testimonials"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => moveCarousel(1)}
                aria-label="Next testimonials"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        <div
          ref={carouselRef}
          className="mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-3 overscroll-x-contain scrollbar-none"
          aria-label="Customer testimonials"
        >
          {approvedReviews.map((review) => {
            const rating = Math.max(1, Math.min(5, Number(review.rating || 5)));

            return (
              <div
                key={review.id}
                className="w-full shrink-0 snap-start rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
              >
                <div
                  className="text-amber-500 text-lg"
                  aria-label={rating + " out of 5 stars"}
                >
                  {"★".repeat(rating)}
                  {"☆".repeat(5 - rating)}
                </div>

                <p className="mt-3 text-sm text-slate-700">{review.content}</p>

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
