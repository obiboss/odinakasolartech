"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { revalidateReviewRoutes } from "@/app/admin/reviews.actions";
import { supabase } from "@/lib/supabase/client";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

export default function ReviewsPanel() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [reviews, setReviews] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setErr("");

    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          id,
          product_id,
          rating,
          content,
          display_name,
          image_url,
          status,
          featured,
          created_at,
          product:products (
            id,
            name
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReviews(data || []);
    } catch (error) {
      setErr(error?.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  async function updateReview(review, changes) {
    setUpdatingId(review.id);
    setErr("");

    try {
      const { error } = await supabase
        .from("reviews")
        .update(changes)
        .eq("id", review.id);

      if (error) throw error;

      setReviews((prev) =>
        prev.map((item) =>
          item.id === review.id ? { ...item, ...changes } : item,
        ),
      );

      try {
        await revalidateReviewRoutes(review.id);
      } catch {
        setErr(
          "Review updated, but public pages could not be refreshed. Please try the action again.",
        );
      }
    } catch (error) {
      setErr(error?.message || "Failed to update review.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-bold">Reviews</div>
            <div className="text-sm text-slate-600">
              Approve, reject, and feature customer reviews.
            </div>
          </div>

          <button
            type="button"
            onClick={loadReviews}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold hover:bg-slate-100 cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="text-sm text-slate-600">Loading reviews...</div>
      ) : reviews.length ? (
        <div className="grid grid-cols-1 gap-3">
          {reviews.map((review) => {
            const isUpdating = updatingId === review.id;
            const status = review.status || "pending";
            const rating = Math.max(
              1,
              Math.min(5, Number(review.rating || 5)),
            );

            return (
              <div
                key={review.id}
                className="rounded-2xl border border-slate-200 bg-white/90 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {review.display_name?.trim() || "Customer"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {review.product?.name || "Product unavailable"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(review.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-900"
                      aria-label={rating + " out of 5 stars"}
                    >
                      {"★".repeat(rating)}
                      {"☆".repeat(5 - rating)}
                    </span>
                    <span
                      className={cx(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        status === "approved"
                          ? "border-green-500/30 bg-green-500/10 text-green-700"
                          : status === "rejected"
                            ? "border-red-500/30 bg-red-500/10 text-red-700"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-900",
                      )}
                    >
                      {status}
                    </span>
                    <span
                      className={cx(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        review.featured
                          ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-800"
                          : "border-slate-200 bg-slate-50 text-slate-600",
                      )}
                    >
                      {review.featured ? "Featured" : "Not featured"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 whitespace-pre-line text-sm text-slate-700">
                  {review.content}
                </div>

                {review.image_url ? (
                  <Image
                    src={review.image_url}
                    alt={`${review.display_name?.trim() || "Customer"}'s review`}
                    width={256}
                    height={256}
                    className="mt-3 max-h-64 rounded-xl border border-slate-200 object-cover"
                  />
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => updateReview(review, { status: "approved" })}
                    className="rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => updateReview(review, { status: "rejected" })}
                    className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() =>
                      updateReview(review, { featured: !review.featured })
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {review.featured ? "Unfeature" : "Feature"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No reviews yet.
        </div>
      )}
    </div>
  );
}
