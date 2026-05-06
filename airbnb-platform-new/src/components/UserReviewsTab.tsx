import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { usersAPI } from '@/services/api';
import { formatDate } from '@/utils/helpers';
import type { MyReviewRow } from '@/types';

/**
 * Renders a 5-star row, filling stars up to `Math.floor(rating)`.
 * Read-only visual — mirrors the pattern in `ReviewCard.tsx`.
 */
const StarRow = ({ rating, size = 'w-4 h-4' }: { rating: number; size?: string }) => (
  <div className="flex items-center gap-0.5">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`${size} ${
          i < Math.floor(rating)
            ? 'fill-primary text-primary'
            : 'text-gray-300'
        }`}
      />
    ))}
  </div>
);

const CATEGORY_LABELS: Array<{ key: keyof MyReviewRow; label: string }> = [
  { key: 'cleanliness_rating', label: 'Cleanliness' },
  { key: 'accuracy_rating', label: 'Accuracy' },
  { key: 'checkin_rating', label: 'Check-in' },
  { key: 'communication_rating', label: 'Communication' },
  { key: 'location_rating', label: 'Location' },
  { key: 'value_rating', label: 'Value' },
];

interface UserReviewsTabProps {
  /** Used only as a heuristic to decide which empty-state CTA to show. */
  hasPastTrips: boolean;
}

/**
 * Reviews tab body for `UserProfile`. Lists every review the signed-in user
 * has written as a guest (via `GET /users/me/reviews`). Read-only.
 *
 * Note: the API does not expose `accommodation_id` on these rows, so the
 * accommodation title is rendered as plain text. Adding navigation back to
 * the listing would require either widening the controller's SELECT or
 * fetching the booking separately — see the TODO below.
 */
export const UserReviewsTab = ({ hasPastTrips }: UserReviewsTabProps) => {
  const [reviews, setReviews] = useState<MyReviewRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    usersAPI
      .getMyReviews()
      .then((rows) => {
        if (cancelled) return;
        // Server already orders DESC, but re-sort defensively in case the
        // ordering ever changes.
        const sorted = [...rows].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setReviews(sorted);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading) {
    return <LoadingState label="Loading your reviews..." />;
  }

  if (error || !reviews) {
    return (
      <ErrorState
        message={error ?? 'Could not load your reviews.'}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 rounded-xl p-8 text-center">
        <p className="text-gray-700 font-medium mb-2">
          You haven&apos;t written any reviews yet
        </p>
        <p className="text-gray-500 text-sm mb-4">
          {hasPastTrips
            ? 'After your stay, share your experience with future guests.'
            : "Book a stay and you'll be able to leave a review when it's over."}
        </p>
        <Link
          to="/listings"
          className="inline-block px-4 py-2 border border-gray-900 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
        >
          Browse listings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => {
        const categories = CATEGORY_LABELS.filter(
          (c) => review[c.key] !== null && review[c.key] !== undefined
        );
        return (
          <article
            key={review.id}
            className="border border-gray-200 rounded-xl p-5 space-y-3"
          >
            {/* Top row: title + meta */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {/* TODO: link to /listing/:accommodationId once the API
                    surfaces accommodation_id on this row (currently only
                    booking_id is returned). */}
                <h3 className="font-semibold text-gray-900 truncate">
                  {review.accommodation_title}
                </h3>
                <p className="text-sm text-gray-500">
                  {review.accommodation_city} &middot;{' '}
                  {formatDate(review.created_at, 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StarRow rating={review.rating} />
                <span className="text-sm font-medium text-gray-900">
                  {review.rating}/5
                </span>
              </div>
            </div>

            {/* Comment */}
            {review.comment && (
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {review.comment}
              </p>
            )}

            {/* Category ratings (only render if at least one is set) */}
            {categories.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 pt-2 border-t border-gray-100 text-sm text-gray-600">
                {categories.map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between"
                  >
                    <span>{label}</span>
                    <span className="font-medium text-gray-900">
                      {review[key] as number}/5
                    </span>
                  </div>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};
