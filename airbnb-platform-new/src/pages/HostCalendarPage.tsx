import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { hostAPI } from '@/services/api';
import { LoadingState, ErrorState } from '@/components';
import { cn } from '@/utils/cn';
import { parseLocalDate, formatLocalDate } from '@/utils/helpers';
import type {
  Availability,
  AvailabilityCalendar,
  BookingStatus,
  HostProperty,
} from '@/types';

// ---------------------------------------------------------------------------
// Date helpers
//
// Calendar date math is intentionally local. The backend stores dates as
// `YYYY-MM-DD` strings (calendar dates, not instants). We therefore work with
// LOCAL year/month/day values and never call `Date#toISOString` on a
// constructed Date — that would coerce through UTC and shift dates by a day
// near midnight in negative-offset timezones. Our `dateKey` helper formats the
// local Y/M/D directly, and `parseDateKey` parses a YYYY-MM-DD string into a
// LOCAL Date at noon (noon avoids any DST 1am→3am edge cases).
// ---------------------------------------------------------------------------

/** Format a Date as a local YYYY-MM-DD string. Does NOT touch UTC. */
const dateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Local alias kept for readability — see `parseLocalDate` in utils/helpers. */
const parseDateKey = parseLocalDate;

/** Returns YYYY-MM-DD strings for every day in [startKey, endKey]. */
const enumerateDateRange = (startKey: string, endKey: string): string[] => {
  const out: string[] = [];
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(dateKey(d));
  }
  return out;
};

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------------
// Per-day state
// ---------------------------------------------------------------------------

type DayKind = 'available' | 'host_blocked' | 'pending' | 'taken';

interface DayCellState {
  /** YYYY-MM-DD */
  key: string;
  /** Day-of-month number (1-31). */
  day: number;
  /** True when the cell belongs to leading/trailing month padding. */
  outside: boolean;
  /** Computed visual state. */
  kind: DayKind;
  /** When kind === 'host_blocked', the originating availability row. Used so
   *  clicking the cell can open an Unblock dialog for the WHOLE range. */
  block?: Availability;
}

/**
 * Build a 6-row x 7-col grid of cells covering the visible month. Leading/
 * trailing days from the adjacent months are included so the grid is always
 * rectangular; they're flagged `outside: true` so the UI can gray them out and
 * make them non-interactive.
 */
const buildMonthGrid = (
  year: number,
  /** 1-12 */
  month: number,
  data: AvailabilityCalendar | null
): DayCellState[] => {
  const firstOfMonth = new Date(year, month - 1, 1, 12, 0, 0, 0);
  // JS getDay(): 0 = Sunday. We want a Sunday-anchored grid, so subtract that
  // many days from the 1st of the month to get the grid's top-left date.
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startOffset);

  // Pre-index host blocks (is_available === false rows) by date. If multiple
  // rows overlap a given date, the highest-id row wins (per task guidance:
  // "the most recent (highest `id`) takes precedence").
  const blockByDate = new Map<string, Availability>();
  if (data) {
    // Sort ascending so the highest id ends up overwriting in the map.
    const sorted = [...data.availability].sort((a, b) => a.id - b.id);
    for (const row of sorted) {
      const isBlocked = row.is_available === false || row.is_available === 0;
      if (!isBlocked) continue;
      for (const d of enumerateDateRange(
        row.start_date.split('T')[0],
        row.end_date.split('T')[0]
      )) {
        blockByDate.set(d, row);
      }
    }
  }

  // Pre-index booking-occupied dates with their status. Bookings span
  // [check_in_date, check_out_date) — the checkout day is NOT occupied by
  // that booking (next guest can check in that day). Cancelled bookings are
  // ignored. We intentionally don't show 'completed' separately from
  // 'confirmed' — both render as red.
  const bookingByDate = new Map<string, BookingStatus>();
  if (data) {
    for (const b of data.bookings) {
      if (b.status === 'cancelled') continue;
      const inKey = b.check_in_date.split('T')[0];
      const outKey = b.check_out_date.split('T')[0];
      const start = parseDateKey(inKey);
      const end = parseDateKey(outKey);
      // Half-open interval: include check-in, exclude check-out.
      for (
        let d = new Date(start);
        d < end;
        d.setDate(d.getDate() + 1)
      ) {
        const k = dateKey(d);
        // pending should not downgrade an existing confirmed/completed cell.
        const existing = bookingByDate.get(k);
        if (
          existing === 'confirmed' ||
          existing === 'completed'
        ) {
          continue;
        }
        bookingByDate.set(k, b.status);
      }
    }
  }

  const cells: DayCellState[] = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const key = dateKey(cellDate);
    const outside = cellDate.getMonth() !== month - 1;
    const status = bookingByDate.get(key);
    const block = blockByDate.get(key);

    let kind: DayKind = 'available';
    if (status === 'confirmed' || status === 'completed') {
      kind = 'taken';
    } else if (status === 'pending') {
      kind = 'pending';
    } else if (block) {
      kind = 'host_blocked';
    }

    cells.push({
      key,
      day: cellDate.getDate(),
      outside,
      kind,
      block,
    });
  }
  return cells;
};

// ---------------------------------------------------------------------------
// Modals (inline — kept here to avoid sprinkling files for one-off use)
// ---------------------------------------------------------------------------

interface BlockDatesModalProps {
  open: boolean;
  /** Day the user clicked, used to default the form. */
  defaultStart: string | null;
  propertyId: number;
  onClose: () => void;
  onBlocked: () => void;
}

/**
 * "Block dates" form modal. Defaults `startDate` to the clicked day and
 * `endDate` to the next day so the simplest possible block (one night) is
 * one click + Enter. The backend rejects `endDate < startDate` and overlap
 * conflicts, so we only do shallow client-side validation here.
 */
const BlockDatesModal = ({
  open,
  defaultStart,
  propertyId,
  onClose,
  onBlocked,
}: BlockDatesModalProps) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startInputRef = useRef<HTMLInputElement | null>(null);

  // Reset form whenever the modal re-opens with a new clicked day.
  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    setError(null);
    if (defaultStart) {
      const start = defaultStart;
      // Default end = start + 1 day.
      const next = parseDateKey(defaultStart);
      next.setDate(next.getDate() + 1);
      setStartDate(start);
      setEndDate(dateKey(next));
    } else {
      setStartDate('');
      setEndDate('');
    }
    setReason('');

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    if (root) root.setAttribute('inert', '');
    const t = window.setTimeout(() => startInputRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(t);
      if (root) root.removeAttribute('inert');
      previouslyFocused?.focus();
    };
  }, [open, defaultStart]);

  // Escape closes (unless mid-submit).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !submitting) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startDate || !endDate) {
      setError('Pick a start and end date.');
      return;
    }
    if (endDate < startDate) {
      setError('End date must be on or after the start date.');
      return;
    }

    setSubmitting(true);
    try {
      await hostAPI.setAvailability(propertyId, {
        startDate,
        endDate,
        isAvailable: false,
        reason: reason.trim() || undefined,
      });
      onBlocked();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to block dates';
      setError(message);
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl max-w-md w-full shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-dates-title"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
          <div>
            <h2
              id="block-dates-title"
              className="text-lg font-semibold text-gray-900"
            >
              Block dates
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Guests won&apos;t be able to book during this period.
            </p>
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
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Start date
              </span>
              <input
                ref={startInputRef}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={submitting}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                End date
              </span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={submitting}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Reason{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              maxLength={200}
              placeholder="e.g. Personal use, maintenance"
              className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          {error && (
            <div
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
            >
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
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Blocking...' : 'Block dates'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

interface UnblockDatesModalProps {
  open: boolean;
  /** The Availability row whose entire range we will unblock. */
  block: Availability | null;
  propertyId: number;
  onClose: () => void;
  onUnblocked: () => void;
}

/**
 * "Unblock dates" confirmation modal. Calls `setAvailability` with the SAME
 * range as the existing block but with `isAvailable: true`. Per task spec we
 * unblock the WHOLE range, not just the clicked day.
 */
const UnblockDatesModal = ({
  open,
  block,
  propertyId,
  onClose,
  onUnblocked,
}: UnblockDatesModalProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    setError(null);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    if (root) root.setAttribute('inert', '');
    const t = window.setTimeout(() => confirmRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      if (root) root.removeAttribute('inert');
      previouslyFocused?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open || !block) return null;

  const handleBackdropClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !submitting) onClose();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await hostAPI.setAvailability(propertyId, {
        startDate: block.start_date.split('T')[0],
        endDate: block.end_date.split('T')[0],
        isAvailable: true,
      });
      onUnblocked();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to unblock dates';
      setError(message);
      setSubmitting(false);
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
        aria-labelledby="unblock-dates-title"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h2
                id="unblock-dates-title"
                className="text-lg font-semibold text-gray-900"
              >
                Unblock these dates?
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Guests will be able to book this period again.
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
            <p className="text-sm text-gray-600">Date range</p>
            <p className="font-medium text-gray-900">
              {formatLocalDate(block.start_date, 'MMM d')} -{' '}
              {formatLocalDate(block.end_date, 'MMM d, yyyy')}
            </p>
            {block.reason && (
              <>
                <p className="text-sm text-gray-600 mt-2">Reason</p>
                <p className="text-sm text-gray-900">{block.reason}</p>
              </>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
            >
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
            Keep blocked
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Unblocking...' : 'Yes, unblock'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * P4-T2: full-screen calendar for hosts to manage blackouts on a single
 * property. Refetches `getAvailabilityCalendar` whenever the visible month
 * changes or after a successful block/unblock mutation. We deliberately only
 * fetch the visible month — pre-fetching adjacent months wasn't asked for and
 * would just inflate request counts.
 *
 * Visual coding (see PRD):
 *   white  → available (clickable → Block modal)
 *   gray   → host-blocked (clickable → Unblock modal, for the WHOLE range)
 *   yellow → pending booking (not clickable; banner explains why)
 *   red    → confirmed/completed booking (taken; not clickable)
 */
export const HostCalendarPage = () => {
  const { propertyId: propertyIdRaw } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();

  // Coerce route param. Anything non-numeric → bail to dashboard via the
  // not-found error state below.
  const propertyId = Number(propertyIdRaw);
  const propertyIdValid = Number.isInteger(propertyId) && propertyId > 0;

  // Default to the current local month.
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => dateKey(today), [today]);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12

  const [property, setProperty] = useState<HostProperty | null>(null);
  const [ownershipLoading, setOwnershipLoading] = useState(true);
  const [calendar, setCalendar] = useState<AvailabilityCalendar | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Modal state. We separately track "which day was clicked" for the Block
  // form (defaults `startDate`) and "which existing block row" for Unblock.
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockModalDay, setBlockModalDay] = useState<string | null>(null);
  const [unblockTarget, setUnblockTarget] = useState<Availability | null>(null);
  const [transientNotice, setTransientNotice] = useState<string | null>(null);

  // Effect 1: ownership check. Runs only when the propertyId in the route
  // changes — getProperties() is cheap but unrelated to month navigation, so
  // there's no reason to re-fetch the host's property list every time the user
  // clicks prev/next.
  useEffect(() => {
    if (!propertyIdValid) {
      setOwnershipLoading(false);
      setError('Invalid property id.');
      return;
    }
    let cancelled = false;
    setOwnershipLoading(true);
    setError(null);
    hostAPI
      .getProperties()
      .then((props) => {
        if (cancelled) return;
        const match = props.find((p) => p.id === propertyId) ?? null;
        if (!match) {
          // Property doesn't belong to this host (or doesn't exist). The
          // backend would also 404 the calendar fetch in that case, but we
          // surface a friendlier message and skip the calendar request.
          setError('You do not have access to this property.');
          setProperty(null);
        } else {
          setProperty(match);
        }
        setOwnershipLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || 'Failed to verify property access');
        setProperty(null);
        setOwnershipLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, propertyIdValid, reloadKey]);

  // Effect 2: calendar fetch. Re-runs on month navigation and after a
  // mutation (reloadKey). Gated on `property` being resolved so we don't fire
  // the calendar request before ownership is confirmed (and don't fire it at
  // all when the user has no access).
  useEffect(() => {
    if (!propertyIdValid || !property) return;
    let cancelled = false;
    setCalendarLoading(true);
    hostAPI
      .getAvailabilityCalendar(propertyId, { year, month })
      .then((cal) => {
        if (cancelled) return;
        setCalendar(cal);
        setCalendarLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load calendar');
        setCalendarLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, propertyIdValid, property, year, month, reloadKey]);

  const loading = ownershipLoading || (property !== null && calendarLoading);

  // Auto-dismiss the booking-clicked notice after 3s.
  useEffect(() => {
    if (!transientNotice) return;
    const t = window.setTimeout(() => setTransientNotice(null), 3000);
    return () => window.clearTimeout(t);
  }, [transientNotice]);

  if (!propertyIdValid) {
    return (
      <ErrorState
        message="Invalid property id."
        onRetry={() => navigate('/host/dashboard')}
      />
    );
  }

  if (loading) {
    return <LoadingState label="Loading calendar..." />;
  }

  if (error || !property || !calendar) {
    return (
      <ErrorState
        message={error ?? 'Could not load this calendar.'}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  const cells = buildMonthGrid(year, month, calendar);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleCellClick = (cell: DayCellState) => {
    if (cell.outside) return;
    if (cell.kind === 'pending' || cell.kind === 'taken') {
      setTransientNotice('This date has a booking and cannot be modified.');
      return;
    }
    if (cell.kind === 'host_blocked' && cell.block) {
      setUnblockTarget(cell.block);
      return;
    }
    // available
    setBlockModalDay(cell.key);
    setBlockModalOpen(true);
  };

  const refetch = () => setReloadKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/host/dashboard"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Calendar — {property.title}
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            {property.city}, {property.country}
          </p>
        </div>

        {transientNotice && (
          <div
            role="status"
            className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm"
          >
            {transientNotice}
          </div>
        )}

        {/* Month nav + Legend */}
        <div className="bg-white rounded-xl shadow-card p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-lg font-semibold text-gray-900 min-w-[10ch] text-center">
                {MONTH_LABELS[month - 1]} {year}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
              <LegendSwatch className="bg-white border border-gray-300" label="Available" />
              <LegendSwatch className="bg-gray-200" label="Blocked" />
              <LegendSwatch className="bg-yellow-100" label="Pending" />
              <LegendSwatch className="bg-red-100" label="Booked" />
            </div>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
            {DOW_LABELS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-gray-500 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {cells.map((cell) => {
              const isToday = !cell.outside && cell.key === todayKey;
              const baseColor =
                cell.kind === 'host_blocked'
                  ? 'bg-gray-200 hover:bg-gray-300'
                  : cell.kind === 'pending'
                  ? 'bg-yellow-100'
                  : cell.kind === 'taken'
                  ? 'bg-red-100'
                  : 'bg-white hover:bg-gray-50';
              const dim = cell.outside ? 'opacity-40' : '';
              const cursor =
                cell.outside
                  ? 'cursor-default'
                  : cell.kind === 'pending' || cell.kind === 'taken'
                  ? 'cursor-not-allowed'
                  : 'cursor-pointer';

              const tooltip =
                cell.outside
                  ? undefined
                  : cell.kind === 'taken'
                  ? 'This date has a confirmed booking.'
                  : cell.kind === 'pending'
                  ? 'This date has a pending booking.'
                  : cell.kind === 'host_blocked'
                  ? cell.block?.reason
                    ? `Blocked: ${cell.block.reason}`
                    : 'Blocked by you'
                  : 'Click to block';

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => handleCellClick(cell)}
                  // We render outside-month cells as a normal button for layout
                  // but disable them so they don't take focus. Pending/taken
                  // booking cells stay clickable on purpose so they can fire the
                  // transient "this date has a booking" notice.
                  disabled={cell.outside}
                  aria-disabled={cell.outside ? true : undefined}
                  title={tooltip}
                  className={cn(
                    'relative aspect-square sm:aspect-auto sm:h-20 rounded-lg border text-left p-1.5 sm:p-2 text-xs sm:text-sm transition-colors',
                    baseColor,
                    dim,
                    cursor,
                    isToday
                      ? 'border-primary border-2 ring-1 ring-primary/30'
                      : 'border-gray-200',
                    cell.outside && 'pointer-events-none'
                  )}
                >
                  <span
                    className={cn(
                      'font-medium',
                      cell.outside ? 'text-gray-400' : 'text-gray-900',
                      isToday && 'text-primary font-bold'
                    )}
                  >
                    {cell.day}
                  </span>
                  {isToday && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Existing blocks list — handy when the host wants to see what's
            blocked across the visible month at a glance. Clicking a row
            opens the same Unblock modal. */}
        <div className="bg-white rounded-xl shadow-card p-4 sm:p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Blocked ranges
          </h2>
          {calendar.availability.filter(
            (a) => a.is_available === false || a.is_available === 0
          ).length === 0 ? (
            <p className="text-sm text-gray-600">
              No blocks yet. Click an available day above to add one.
            </p>
          ) : (
            <ul className="space-y-2">
              {calendar.availability
                .filter((a) => a.is_available === false || a.is_available === 0)
                .sort((a, b) =>
                  a.start_date.localeCompare(b.start_date)
                )
                .map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {formatLocalDate(row.start_date, 'MMM d')} -{' '}
                        {formatLocalDate(row.end_date, 'MMM d, yyyy')}
                      </p>
                      {row.reason && (
                        <p className="text-xs text-gray-600">{row.reason}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setUnblockTarget(row)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Unblock
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      <BlockDatesModal
        open={blockModalOpen}
        defaultStart={blockModalDay}
        propertyId={propertyId}
        onClose={() => {
          setBlockModalOpen(false);
          setBlockModalDay(null);
        }}
        onBlocked={refetch}
      />

      <UnblockDatesModal
        open={unblockTarget !== null}
        block={unblockTarget}
        propertyId={propertyId}
        onClose={() => setUnblockTarget(null)}
        onUnblocked={refetch}
      />
    </div>
  );
};

interface LegendSwatchProps {
  className: string;
  label: string;
}
const LegendSwatch = ({ className, label }: LegendSwatchProps) => (
  <span className="inline-flex items-center gap-1.5">
    <span
      className={cn('inline-block w-3 h-3 rounded border border-gray-300', className)}
      aria-hidden="true"
    />
    {label}
  </span>
);
