import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  MapPin,
  MessageSquare,
  Star,
  Users,
  XCircle,
} from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import {
  CancelBookingModal,
  ErrorState,
  LeaveReviewModal,
  LoadingState,
} from '@/components';
import { bookingsAPI } from '@/services/api';
import { cn } from '@/utils/cn';
import {
  PLACEHOLDER_IMAGE,
  formatCurrency,
  formatDate,
  getAccommodationTypeLabel,
} from '@/utils/helpers';
import type { Booking, BookingStatus } from '@/types';

/**
 * Status banner classes mirror the pill colors used in MyTripsPage so the
 * visual language stays consistent between the list and the detail view.
 */
const statusBannerClass = (status: BookingStatus): string => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'pending':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'completed':
      return 'bg-blue-50 border-blue-200 text-blue-800';
    case 'cancelled':
    default:
      return 'bg-gray-50 border-gray-200 text-gray-700';
  }
};

const statusHeadline = (status: BookingStatus): string => {
  switch (status) {
    case 'confirmed':
      return 'Your booking is confirmed';
    case 'pending':
      return 'Awaiting host confirmation';
    case 'completed':
      return 'Trip completed';
    case 'cancelled':
      return 'Booking cancelled';
  }
};

/**
 * BookingDetailPage — the canonical "view a single booking" surface for guests.
 *
 * Data-loading strategy (because the backend has no `GET /bookings/:id`):
 *   1. State-first: if MyTripsPage navigated here with `state.booking`, render
 *      immediately — no spinner.
 *   2. API fallback: otherwise (direct nav, refresh, deep link) fetch the
 *      whole list via `bookingsAPI.getMyBookings()` and find by id.
 *   3. 404: if neither path produces a match, show a "Booking not found" card
 *      with a back link to /bookings.
 *
 * After a successful cancellation we optimistically flip the local status to
 * `cancelled` rather than re-fetching — the server has already confirmed and
 * the rest of the booking row stays the same shape.
 */
export const BookingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const stateBooking = (location.state as { booking?: Booking } | null)?.booking;
  // Tracks whether we still need to consume the navigation-state snapshot.
  // Set to true on the very first render when stateBooking is present, then
  // flipped to false the first time the data-fetch effect runs. This keeps
  // retry (reloadKey > 0) on the API path even though `stateBooking` itself
  // remains in the closure (replaceState doesn't trigger a router re-render).
  const hasSeededFromState = useRef(!!stateBooking);

  // Initial state from location.state for fast load on first navigation.
  // `hasSeededFromState` tracks whether we've already consumed it; subsequent
  // renders (retry, reloadKey increment) always fetch fresh data via the API.
  const [booking, setBooking] = useState<Booking | null>(stateBooking ?? null);
  // We only need to fetch when we don't already have the booking from
  // navigation state. `notFound` distinguishes the success-but-empty case
  // (fetch returned, no match) from the still-loading case.
  const [loading, setLoading] = useState<boolean>(!stateBooking);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Mount-only: if we have navigation state and this is the initial render
    // (reloadKey === 0), use it and don't fetch. Subsequent runs (retry,
    // refresh) always go through the API.
    if (hasSeededFromState.current && reloadKey === 0) {
      hasSeededFromState.current = false;
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    bookingsAPI
      .getMyBookings()
      .then((bookings) => {
        if (cancelled) return;
        const found = bookings.find((b) => String(b.id) === id);
        if (found) {
          setBooking(found);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load booking';
        setError(message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  if (loading) {
    return <LoadingState label="Loading your booking..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  if (notFound || !booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-xl shadow-card p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Booking not found
            </h1>
            <p className="text-gray-600 mb-6">
              We couldn&apos;t find a booking with that id under your account.
            </p>
            <Link
              to="/bookings"
              className="inline-flex items-center gap-1 px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to My Trips
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { accommodation } = booking;
  const hostName =
    `${accommodation.host.firstName} ${accommodation.host.lastName}`.trim();
  const nights = Math.max(
    1,
    differenceInCalendarDays(
      parseISO(booking.checkOutDate),
      parseISO(booking.checkInDate)
    )
  );
  const canCancel =
    booking.status === 'pending' || booking.status === 'confirmed';
  const canReview = booking.status === 'completed' && !booking.hasReview;
  const alreadyReviewed = booking.status === 'completed' && booking.hasReview;

  const handleCancelled = () => {
    // Optimistically flip status. The server has already accepted the cancel,
    // and the rest of the booking row hasn't changed — re-fetching the entire
    // list just to learn one field flipped would be wasteful.
    setBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
  };

  const handleReviewed = () => {
    // Same optimistic-update rationale as cancellation: the server confirmed,
    // we just flip `hasReview` so the "Leave a review" button gives way to
    // the "already reviewed" copy.
    setBooking((prev) => (prev ? { ...prev, hasReview: true } : prev));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/bookings"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to My Trips
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Trip to {accommodation.location.city}
          </h1>
          <p className="text-gray-600 mt-1">
            {formatDate(booking.checkInDate, 'MMM d, yyyy')} -{' '}
            {formatDate(booking.checkOutDate, 'MMM d, yyyy')}
          </p>
        </header>

        {/* Status banner */}
        <div
          className={cn(
            'border rounded-xl px-4 py-3 mb-6',
            statusBannerClass(booking.status)
          )}
        >
          <p className="font-semibold capitalize">
            {statusHeadline(booking.status)}
          </p>
          <p className="text-sm opacity-90 mt-0.5">
            Booking #{booking.id} - status:{' '}
            <span className="capitalize">{booking.status}</span>
          </p>
        </div>

        {/* Property card */}
        <section className="bg-white rounded-xl shadow-card p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Your stay
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <img
              src={PLACEHOLDER_IMAGE}
              alt={accommodation.title}
              className="w-full sm:w-40 h-32 sm:h-32 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {accommodation.title}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                {getAccommodationTypeLabel(accommodation.type)} hosted by{' '}
                {hostName}
              </p>
              <div className="flex items-start gap-1.5 text-sm text-gray-700 mb-3">
                <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <span>
                  {accommodation.location.address},{' '}
                  {accommodation.location.city},{' '}
                  {accommodation.location.country}
                </span>
              </div>
              <Link
                to={`/listing/${accommodation.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View listing
              </Link>
            </div>
          </div>
        </section>

        {/* Reservation details */}
        <section className="bg-white rounded-xl shadow-card p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Reservation details
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Check-in
              </dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {formatDate(booking.checkInDate, 'EEE, MMM d, yyyy')}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Check-out
              </dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {formatDate(booking.checkOutDate, 'EEE, MMM d, yyyy')}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Nights</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {nights} night{nights !== 1 ? 's' : ''}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Guests
              </dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {booking.numGuests} guest
                {booking.numGuests !== 1 ? 's' : ''}
              </dd>
            </div>
            <div className="sm:col-span-2 pt-3 border-t border-gray-100">
              <dt className="text-gray-500">Total price</dt>
              <dd className="text-xl font-bold text-gray-900 mt-0.5">
                {formatCurrency(booking.totalPrice)}
              </dd>
            </div>
          </dl>

          {booking.specialRequests && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                Special requests
              </p>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {booking.specialRequests}
              </p>
            </div>
          )}
        </section>

        {/* Actions */}
        {(canCancel || canReview || alreadyReviewed) && (
          <section className="bg-white rounded-xl shadow-card p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Actions
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel booking
                </button>
              )}
              {canReview && (
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  <Star className="w-4 h-4" />
                  Leave a review
                </button>
              )}
              {alreadyReviewed && (
                <p className="text-sm text-gray-600 inline-flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-primary" />
                  You&apos;ve already reviewed this stay.
                </p>
              )}
            </div>
          </section>
        )}
      </div>

      <CancelBookingModal
        booking={showCancelModal ? booking : null}
        onClose={() => setShowCancelModal(false)}
        onCancelled={handleCancelled}
      />

      <LeaveReviewModal
        booking={showReviewModal ? booking : null}
        onClose={() => setShowReviewModal(false)}
        onReviewed={handleReviewed}
      />
    </div>
  );
};
