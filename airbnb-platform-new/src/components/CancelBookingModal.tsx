import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { bookingsAPI } from '@/services/api';
import { formatDate } from '@/utils/helpers';
import { ModalShell } from './ModalShell';
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

  // Reset transient state whenever a new booking opens the modal. The
  // a11y shell (focus capture, inert root, escape, etc.) lives in ModalShell.
  useEffect(() => {
    if (!booking) return;
    setSubmitting(false);
    setError(null);
  }, [booking]);

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

  return (
    <ModalShell
      open={booking !== null}
      onClose={onClose}
      title="Cancel this booking?"
      description="This action cannot be undone."
      submitting={submitting}
      initialFocusRef={confirmButtonRef}
      icon={
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
      }
    >
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
    </ModalShell>
  );
};
