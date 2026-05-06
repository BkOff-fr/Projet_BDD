import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Eye, EyeOff, X } from 'lucide-react';
import { usersAPI } from '@/services/api';
import { cn } from '@/utils/cn';

interface DeleteAccountModalProps {
  /** Whether the modal is rendered. Parent controls open state. */
  open: boolean;
  /** Called when the user dismisses without deleting (Escape, backdrop, Cancel, X). */
  onClose: () => void;
  /** Called after `usersAPI.deleteAccount` resolves successfully. Parent
   *  is responsible for logging out and redirecting; this modal does not
   *  auto-close on success. */
  onDeleted: () => void;
}

/** The literal string the user must type to enable the destructive button. */
const REQUIRED_CONFIRMATION = 'DELETE';

/**
 * Destructive confirmation modal for account deletion.
 *
 * UX rules (P2-T2):
 * - Shell mirrors `CancelBookingModal`: portaled to body, role="dialog" on
 *   the inner panel, `inert` on `#root`, focus capture/restore.
 * - All dismiss paths (Escape, backdrop, X, Cancel) are guarded by `!submitting`.
 * - Submit is gated by BOTH the confirmation text matching `DELETE` AND a
 *   non-empty password.
 * - On error: inline message, modal stays open, password field is cleared so
 *   the user can retry without re-typing the confirmation.
 * - On success: invokes `onDeleted` and lets the parent handle the redirect
 *   (logout + navigate to home).
 */
export const DeleteAccountModal = ({
  open,
  onClose,
  onDeleted,
}: DeleteAccountModalProps) => {
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmationInputRef = useRef<HTMLInputElement | null>(null);

  // Focus the confirmation input when the modal opens, reset transient state,
  // mark the rest of the app inert so keyboard focus is trapped, and restore
  // focus on close.
  useEffect(() => {
    if (!open) return;
    setConfirmation('');
    setPassword('');
    setShowPassword(false);
    setSubmitting(false);
    setError(null);

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const root = document.getElementById('root');
    if (root) root.setAttribute('inert', '');

    const t = window.setTimeout(() => {
      confirmationInputRef.current?.focus();
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

  const confirmationOk = confirmation === REQUIRED_CONFIRMATION;
  const passwordOk = password.length > 0;
  const canSubmit = confirmationOk && passwordOk && !submitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await usersAPI.deleteAccount({ password });
      onDeleted();
      // Don't auto-close — parent handles redirect/cleanup.
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete account';
      setError(message);
      // Clear the password so the user must re-enter it. Keep the
      // confirmation text — it's already a deliberate gesture.
      setPassword('');
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
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-description"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2
                id="delete-account-title"
                className="text-lg font-semibold text-gray-900"
              >
                Delete your account?
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                This action is permanent.
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
          <p
            id="delete-account-description"
            className="text-sm text-gray-700"
          >
            This action is permanent. Your account will be deactivated and
            your personal information removed. You cannot do this if you have
            active bookings (as guest or host).
          </p>

          <div>
            <label
              htmlFor="delete-confirmation"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Type <span className="font-mono font-semibold">DELETE</span> to
              confirm
            </label>
            <input
              ref={confirmationInputRef}
              id="delete-confirmation"
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 font-mono',
                confirmation.length > 0 && !confirmationOk
                  ? 'border-red-300'
                  : 'border-gray-300'
              )}
              placeholder="DELETE"
            />
          </div>

          <div>
            <label
              htmlFor="delete-password"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Confirm with your password
            </label>
            <div className="relative">
              <input
                id="delete-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                autoComplete="current-password"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                disabled={submitting}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
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
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Deleting...' : 'Delete my account'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
