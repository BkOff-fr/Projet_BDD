import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  /** Headline shown above the message. */
  title?: string;
  /** Error message body. */
  message: string;
  /** When provided, renders a "Try again" button wired to this callback. */
  onRetry?: () => void;
  /** Tailwind classes for the wrapper. Default: full-page centered. */
  className?: string;
}

/**
 * Generic error state used for page-level data-fetch failures. Pairs with
 * `LoadingState`. The retry button is optional — pages that can re-trigger
 * their fetch should pass `onRetry`; pages where retry isn't meaningful (e.g.
 * a 404 from `getById`) can omit it.
 */
export const ErrorState = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = 'min-h-[60vh] flex items-center justify-center px-4',
}: ErrorStateProps) => (
  <div className={className}>
    <div className="max-w-md w-full text-center bg-white border border-red-200 rounded-xl p-8">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-600" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-600 mb-6 break-words">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  </div>
);
