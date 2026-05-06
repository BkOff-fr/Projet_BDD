import { Spinner } from './Spinner';

interface LoadingStateProps {
  /** Optional label rendered next to the spinner. */
  label?: string;
  /** Tailwind classes for the wrapper. Default: full-page centered. */
  className?: string;
}

/**
 * Generic full-page loading state. Used by every page-level data fetch so the
 * loading UI is consistent across the app.
 */
export const LoadingState = ({
  label = 'Loading...',
  className = 'min-h-[60vh] flex items-center justify-center',
}: LoadingStateProps) => (
  <div className={className}>
    <div className="flex flex-col items-center gap-3 text-gray-600">
      <Spinner className="h-8 w-8 text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  </div>
);
