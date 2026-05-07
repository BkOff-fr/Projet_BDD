import {
  useEffect,
  useId,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ModalShellProps {
  /** Whether the modal is rendered. */
  open: boolean;
  /** Called when the user dismisses (Escape, backdrop click, X). Guarded by `submitting`. */
  onClose: () => void;
  /** Modal title — rendered as the `<h2>` and wired to `aria-labelledby`. */
  title: string;
  /** Optional short description rendered below the title and wired to `aria-describedby`. */
  description?: string;
  /**
   * Optional decorative icon rendered to the left of the title (e.g., a
   * lucide icon wrapped in a colored circle). Provide the full element so the
   * caller controls colors/sizing — ModalShell only positions it.
   */
  icon?: ReactNode;
  /** When true, dismissals (Escape, backdrop, X) are blocked. */
  submitting?: boolean;
  /**
   * Focus this element on open if provided (e.g., the primary action button or
   * the first interactive form field). If not provided, ModalShell focuses the
   * close button as a sensible default.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Optional extra class for the inner panel (e.g., max-width adjustments). */
  panelClassName?: string;
  children: ReactNode;
}

/**
 * Shared dialog scaffold for all modals.
 *
 * Centralises the a11y boilerplate that was previously duplicated across 8
 * modals: portal to body, role="dialog" + aria-modal, aria-labelledby /
 * aria-describedby via stable `useId()` ids, `inert` on `#root` to trap focus,
 * focus capture/restore, Escape handling, and backdrop click — all guarded by
 * `submitting` so we don't yank the UI out from under an in-flight request.
 *
 * The visual shell is intentionally fixed (white rounded panel, header bar
 * with optional icon + title + close button). Modal-specific content (body,
 * action buttons, error messages) goes in `children`.
 */
export const ModalShell = ({
  open,
  onClose,
  title,
  description,
  icon,
  submitting = false,
  initialFocusRef,
  panelClassName,
  children,
}: ModalShellProps) => {
  const reactId = useId();
  const titleId = `modal-shell-title-${reactId}`;
  const descId = `modal-shell-desc-${reactId}`;
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Focus management + inert root + state restoration on open/close.
  useEffect(() => {
    if (!open) return;

    // Capture the element that had focus when the modal opened so we can
    // restore it on close (typically the trigger button).
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Mark #root inert so Tab/Shift+Tab can't reach background controls.
    // The modal itself is portaled to document.body, so it stays interactive.
    const root = document.getElementById('root');
    if (root) root.setAttribute('inert', '');

    // Defer focus to the next tick so the target element is mounted.
    const t = window.setTimeout(() => {
      const target = initialFocusRef?.current ?? closeButtonRef.current;
      target?.focus();
    }, 0);

    return () => {
      window.clearTimeout(t);
      if (root) root.removeAttribute('inert');
      previouslyFocused?.focus();
    };
  }, [open, initialFocusRef]);

  // Escape closes the modal (unless mid-submit — avoid yanking the UI out
  // from under an in-flight request).
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

  const handleBackdropClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    // Only close when the click target is the backdrop itself, not a child.
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
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'bg-white rounded-xl w-full shadow-xl',
          panelClassName ?? 'max-w-md'
        )}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
          <div className="flex items-start gap-3 min-w-0">
            {icon}
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
              {description && (
                <p id={descId} className="text-sm text-gray-500 mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 -mt-1 -mr-1 p-1 flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};
