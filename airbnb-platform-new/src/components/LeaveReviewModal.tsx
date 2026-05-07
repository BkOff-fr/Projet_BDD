import { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { bookingsAPI } from '@/services/api';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/helpers';
import { ModalShell } from './ModalShell';
import type { Booking, CreateReviewInput } from '@/types';

interface LeaveReviewModalProps {
  /** Booking to review. `null` means the modal is closed. */
  booking: Booking | null;
  /** Called when the user dismisses without submitting. */
  onClose: () => void;
  /** Called after `bookingsAPI.createReview` resolves successfully. */
  onReviewed: () => void;
}

const COMMENT_MAX_LENGTH = 1000;

/** Category fields wired to the API payload's `*Rating` properties.
 *  Order here is the rendered order in the modal. */
const CATEGORIES: Array<{
  key:
    | 'cleanlinessRating'
    | 'accuracyRating'
    | 'checkinRating'
    | 'communicationRating'
    | 'locationRating'
    | 'valueRating';
  label: string;
}> = [
  { key: 'cleanlinessRating', label: 'Cleanliness' },
  { key: 'accuracyRating', label: 'Accuracy' },
  { key: 'checkinRating', label: 'Check-in' },
  { key: 'communicationRating', label: 'Communication' },
  { key: 'locationRating', label: 'Location' },
  { key: 'valueRating', label: 'Value' },
];

type CategoryKey = (typeof CATEGORIES)[number]['key'];

interface StarSelectorProps {
  /** Current committed rating (0 = unset). */
  value: number;
  /** Called when user clicks a star. */
  onChange: (next: number) => void;
  /** Accessible label prefix, e.g. "Overall rating" or "Cleanliness". */
  ariaLabel: string;
  /** Optional ref for the first star (used to focus on modal open). */
  firstStarRef?: React.RefObject<HTMLButtonElement>;
  disabled?: boolean;
}

/** 5 star buttons in a row with hover preview. The committed value is shown
 *  when no star is hovered; the hovered star drives the visual state otherwise.
 *  Each star is a real `<button type="button">` so it's keyboard-accessible. */
const StarSelector = ({
  value,
  onChange,
  ariaLabel,
  firstStarRef,
  disabled,
}: StarSelectorProps) => {
  const [hovered, setHovered] = useState(0);
  const display = hovered > 0 ? hovered : value;

  return (
    <div
      className="flex items-center gap-1"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= display;
        // Only one star per row participates in the Tab order: the currently
        // selected star, or the first star if no value is set yet. This keeps
        // total Tab stops manageable (7 selectors x 1 stop instead of x 5).
        // The other stars remain reachable via mouse and programmatic .focus().
        const isInTabOrder = value === 0 ? n === 1 : n === value;
        return (
          <button
            key={n}
            ref={n === 1 ? firstStarRef : undefined}
            type="button"
            tabIndex={isInTabOrder ? 0 : -1}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            // Hover state is driven by both pointer (onMouseEnter/onMouseLeave)
            // and keyboard (onFocus/onBlur) events to keep the preview
            // consistent across input modes. On click, focus and click events
            // fire in sequence; hovered === value at that point so the visual
            // remains stable.
            onFocus={() => setHovered(n)}
            onBlur={() => setHovered(0)}
            disabled={disabled}
            aria-label={`${ariaLabel}: ${n} star${n !== 1 ? 's' : ''}`}
            className={cn(
              'p-1 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1'
            )}
          >
            <Star
              className={cn(
                'w-6 h-6 transition-colors',
                filled ? 'text-primary fill-primary' : 'text-gray-300'
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

/**
 * Modal letting a guest submit a review for a completed booking.
 *
 * UX rules (P1-T3):
 * - Dismissible via Escape, backdrop click, "Cancel", and the close (X) button.
 * - All dismissals are guarded against `submitting` — we don't yank the UI out
 *   from under an in-flight POST.
 * - Overall rating is required (1-5). The 6 category ratings are optional and
 *   only included in the payload if the user explicitly picked them.
 * - Comment is optional, trimmed before send, capped at 1000 chars client-side
 *   (the server has its own validation).
 * - Focus lands on the first overall-rating star on open (via ModalShell's
 *   `initialFocusRef`); restoration on close is handled by ModalShell.
 * - On success: `onReviewed()` then `onClose()`. On failure: inline error,
 *   modal stays open so the user can retry without losing their input.
 */
export const LeaveReviewModal = ({
  booking,
  onClose,
  onReviewed,
}: LeaveReviewModalProps) => {
  const [overall, setOverall] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<
    Record<CategoryKey, number>
  >({
    cleanlinessRating: 0,
    accuracyRating: 0,
    checkinRating: 0,
    communicationRating: 0,
    locationRating: 0,
    valueRating: 0,
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstStarRef = useRef<HTMLButtonElement | null>(null);

  // Reset transient state whenever a new booking opens the modal. The
  // a11y shell (focus capture, inert root, escape, etc.) lives in ModalShell.
  useEffect(() => {
    if (!booking) return;
    setOverall(0);
    setCategoryRatings({
      cleanlinessRating: 0,
      accuracyRating: 0,
      checkinRating: 0,
      communicationRating: 0,
      locationRating: 0,
      valueRating: 0,
    });
    setComment('');
    setSubmitting(false);
    setError(null);
  }, [booking]);

  if (!booking) return null;

  const handleSubmit = async () => {
    if (overall < 1) return;
    setSubmitting(true);
    setError(null);

    const payload: CreateReviewInput = {
      bookingId: booking.id,
      rating: overall,
    };

    // Only send categories the user actually picked. Sending 0 would be a lie
    // ("I rate this 0 stars") rather than "no opinion".
    for (const { key } of CATEGORIES) {
      const v = categoryRatings[key];
      if (v > 0) {
        payload[key] = v;
      }
    }

    const trimmed = comment.trim();
    if (trimmed.length > 0) {
      payload.comment = trimmed;
    }

    try {
      await bookingsAPI.createReview(payload);
      onReviewed();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit review';
      setError(message);
      setSubmitting(false);
    }
  };

  const setCategory = (key: CategoryKey, value: number) => {
    setCategoryRatings((prev) => ({ ...prev, [key]: value }));
  };

  const subtitle = `${booking.accommodation.title} · ${formatDate(
    booking.checkInDate,
    'MMM d'
  )} → ${formatDate(booking.checkOutDate, 'MMM d, yyyy')}`;

  return (
    <ModalShell
      open={booking !== null}
      onClose={onClose}
      title="Rate your stay"
      description={subtitle}
      submitting={submitting}
      initialFocusRef={firstStarRef}
      panelClassName="max-w-lg max-h-[90vh] overflow-y-auto"
    >
      <div className="px-6 py-4 space-y-5">
        {/* Overall rating — required */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="text-sm font-semibold text-gray-900">
              Overall rating
              <span className="text-red-600 ml-1" aria-hidden="true">
                *
              </span>
            </label>
            {overall > 0 && (
              <span className="text-sm text-gray-600">
                {overall} / 5
              </span>
            )}
          </div>
          <StarSelector
            value={overall}
            onChange={setOverall}
            ariaLabel="Overall rating"
            firstStarRef={firstStarRef}
            disabled={submitting}
          />
        </div>

        {/* Category ratings — optional */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">
            Rate by category
            <span className="text-xs text-gray-500 font-normal ml-2">
              (optional)
            </span>
          </p>
          <div className="space-y-2">
            {CATEGORIES.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm text-gray-700">{label}</span>
                <StarSelector
                  value={categoryRatings[key]}
                  onChange={(v) => setCategory(key, v)}
                  ariaLabel={label}
                  disabled={submitting}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Comment — optional */}
        <div className="border-t border-gray-100 pt-4">
          <label
            htmlFor="review-comment"
            className="block text-sm font-semibold text-gray-900 mb-1.5"
          >
            Comment
            <span className="text-xs text-gray-500 font-normal ml-2">
              (optional)
            </span>
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) =>
              setComment(e.target.value.slice(0, COMMENT_MAX_LENGTH))
            }
            disabled={submitting}
            maxLength={COMMENT_MAX_LENGTH}
            rows={4}
            placeholder="Share more about your experience..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-50 disabled:opacity-70 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1 text-right">
            {comment.length} / {COMMENT_MAX_LENGTH}
          </p>
        </div>

        {error && (
          <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-6 pb-6 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || overall < 1}
          className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit review'}
        </button>
      </div>
    </ModalShell>
  );
};
