import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { bookingsAPI } from '@/services/api';
import { formatDate } from '@/utils/helpers';
import type { Booking } from '@/types';

interface CancelBookingModalProps {
  /** Booking to cancel. `null` means the modal is closed. */
  booking: Booking | null;
  /** Called when the user dismisses without cancelling (Escape, backdrop, "Keep booking"). */
  onClose: () => void;
  /** Called after `bookingsAPI.cancel` resolves successfully. Parent should refresh state. */
  onCancelled: () => void;
}

/**
 * Confirmation modal for guest-initiated booking cancellation.
 *
 * UX rules (P1-T2):
 * - Dismissible via Escape key, backdrop click, or "Keep booking" button.
 * - Confirm button is auto-focused on open (basic focus management — no a11y lib).
 * - On confirm: calls `bookingsAPI.cancel(id)`. Loading state on the button.
 * - On error: shows an inline message inside the modal; modal stays open so the
 *   user can retry or dismiss.
 * - On success: invokes `onCancelled` (parent refreshes) and `onClose` (closes).
 *
 * Refund eligibility is decided server-side per the property's cancellation
 * policy; the modal only surfaces a generic warning so we don't mislead the
 * user about a specific refund amount.
 */
export const CancelBookingModal = ({
  booking,
  onClose,
  onCancelled,
}: CancelBookingModalProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  // Focus the confirm button when the modal opens, and reset transient state
  // (loading/error) so a previous failed attempt doesn't bleed into a new one.
  useEffect(() => {
    if (!booking) return;
    setSubmitting(false);
    setError(null);
    // Defer focus to the next tick so the button is mounted.
    const t = window.setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [booking]);

  // Escape closes the modal (unless we're mid-submit — avoid yanking the UI
  // out from under an in-flight request).
  useEffect(() => {
    if (!booking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [booking, submitting, onClose]);

  if (!booking) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await bookingsAPI.cancel(booking.id);
      onCancelled();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to cancel booking';
      setError(message);
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    // Only close when the click target is the backdrop itself, not a child.
    if (e.target === e.currentTarget && !submitting) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-booking-title"
    >
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2
                id="cancel-booking-title"
                className="text-lg font-semibold text-gray-900"
              >
                Cancel this booking?
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 -mt-1 -mr-1 p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="font-medium text-gray-900 truncate">
              {booking.accommodation.title}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              {formatDate(booking.checkInDate, 'MMM d')} -{' '}
              {formatDate(booking.checkOutDate, 'MMM d, yyyy')}
            </p>
          </div>

          <p className="text-sm text-gray-700">
            Refund eligibility depends on the host&apos;s cancellation policy.
            You may not be refunded in full.
          </p>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
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
            Keep booking
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Cancelling...' : 'Yes, cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
