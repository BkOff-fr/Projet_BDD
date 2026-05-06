import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Home, X } from 'lucide-react';
import { usersAPI } from '@/services/api';

interface BecomeHostFlowProps {
  /** Whether the modal is rendered. Parent controls open state. */
  open: boolean;
  /** Called when the user dismisses without submitting. */
  onClose: () => void;
  /** Called after `usersAPI.becomeHost` resolves successfully. Parent should
   *  update auth context and surface a success banner. */
  onCompleted: () => void;
}

/**
 * Modal flow that lets a regular user upgrade to a host account.
 *
 * UX rules (P2-T2):
 * - Shell mirrors `CancelBookingModal`: portaled to body, role="dialog" on
 *   the inner panel, `inert` on `#root`, focus capture/restore.
 * - All dismiss paths (Escape, backdrop, X, Cancel) are guarded by `!submitting`.
 * - Submit is gated by the agreement checkbox.
 * - On error: inline message, modal stays open.
 * - On success: invokes `onCompleted`. Parent closes the modal AND patches
 *   the auth user with `isHost: true` so the header / nav updates immediately.
 */
export const BecomeHostFlow = ({
  open,
  onClose,
  onCompleted,
}: BecomeHostFlowProps) => {
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkboxRef = useRef<HTMLInputElement | null>(null);

  // Focus the checkbox when the modal opens, reset transient state, mark
  // the rest of the app inert, and restore focus on close.
  useEffect(() => {
    if (!open) return;
    setAgreeToTerms(false);
    setSubmitting(false);
    setError(null);

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const root = document.getElementById('root');
    if (root) root.setAttribute('inert', '');

    const t = window.setTimeout(() => {
      checkboxRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(t);
      if (root) root.removeAttribute('inert');
      previouslyFocused?.focus();
    };
  }, [open]);

  // Escape closes the modal (unless mid-submit).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const canSubmit = agreeToTerms && !submitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // The API requires the literal `true` per BecomeHostInput.
      await usersAPI.becomeHost({ agreeToTerms: true });
      onCompleted();
      // Parent closes the modal and updates auth context.
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to upgrade your account';
      setError(message);
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !submitting) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-xl max-w-md w-full shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="become-host-title"
        aria-describedby="become-host-desc"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2
                id="become-host-title"
                className="text-lg font-semibold text-gray-900"
              >
                Become a host
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Open your space to guests on StayScape.
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

        <div className="px-6 py-4 space-y-4">
          <p id="become-host-desc" className="text-sm text-gray-600">
            By continuing, your account will be upgraded to host status,
            allowing you to list properties and accept bookings.
          </p>
          <p className="text-sm text-gray-700">
            By becoming a host, you agree to take on the following
            responsibilities:
          </p>

          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5"
              >
                1
              </span>
              <span>
                <span className="font-semibold text-gray-900">
                  List your space
                </span>{' '}
                — describe your property, photos, amenities, and pricing.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5"
              >
                2
              </span>
              <span>
                <span className="font-semibold text-gray-900">
                  Manage bookings
                </span>{' '}
                — confirm, communicate, and welcome your guests.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5"
              >
                3
              </span>
              <span>
                <span className="font-semibold text-gray-900">
                  Comply with house and safety rules
                </span>{' '}
                — including required smoke detector and alarm system for
                validated listings.
              </span>
            </li>
          </ul>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">
              I agree to the host terms and house rules.
            </span>
          </label>

          {error && (
            <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : 'Become a host'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
