import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  MessageSquare,
  XCircle,
  Star,
  ChevronRight,
} from 'lucide-react';
import { CancelBookingModal, LoadingState, ErrorState } from '@/components';
import { bookingsAPI } from '@/services/api';
import { cn } from '@/utils/cn';
import {
  formatCurrency,
  formatDate,
  PLACEHOLDER_IMAGE,
  getAccommodationTypeLabel,
} from '@/utils/helpers';
import type { Booking, BookingStatus } from '@/types';

type TripTab = 'upcoming' | 'past' | 'cancelled';

// Status pill colors mirror the pattern used in HostDashboard.tsx (recent
// bookings table) so the visual language stays consistent across guest- and
// host-facing booking lists.
const statusPillClass = (status: BookingStatus): string => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'completed':
      return 'bg-blue-100 text-blue-700';
    case 'cancelled':
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

/** Today's date as YYYY-MM-DD for lexicographic comparison with ISO date strings.
 *  Uses UTC accessors so users outside UTC don't get bookings misclassified
 *  around midnight (the booking dates returned by the API are UTC ISO dates). */
const todayISO = (): string => {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const partition = (
  bookings: Booking[],
  today: string
): Record<TripTab, Booking[]> => {
  const upcoming: Booking[] = [];
  const past: Booking[] = [];
  const cancelled: Booking[] = [];

  for (const b of bookings) {
    if (b.status === 'cancelled') {
      cancelled.push(b);
    } else if (b.status === 'completed') {
      past.push(b);
    } else if (b.status === 'confirmed' && b.checkOutDate < today) {
      // Confirmed booking whose check-out has passed — surface it as past
      // even though the host hasn't flipped it to "completed" yet.
      past.push(b);
    } else {
      // pending or confirmed-with-future-checkout
      upcoming.push(b);
    }
  }

  // Sort: upcoming + cancelled by checkInDate DESC; past by checkOutDate DESC.
  upcoming.sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));
  cancelled.sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));
  past.sort((a, b) => b.checkOutDate.localeCompare(a.checkOutDate));

  return { upcoming, past, cancelled };
};

interface BookingCardProps {
  booking: Booking;
  tab: TripTab;
  onCancelClick: (booking: Booking) => void;
}

const BookingCard = ({ booking, tab, onCancelClick }: BookingCardProps) => {
  const navigate = useNavigate();
  // Pass the booking through navigation state so BookingDetailPage can render
  // immediately without re-fetching the list (state-first / API-fallback).
  const goToDetail = () =>
    navigate(`/bookings/${booking.id}`, { state: { booking } });

  const { accommodation } = booking;
  const hostName = `${accommodation.host.firstName} ${accommodation.host.lastName}`.trim();
  const canReview =
    tab === 'past' && booking.status === 'completed' && !booking.hasReview;

  return (
    <article
      className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-200 rounded-xl bg-white hover:shadow-md transition-shadow"
    >
      <img
        src={PLACEHOLDER_IMAGE}
        alt={accommodation.title}
        className="w-full sm:w-40 h-32 sm:h-32 rounded-lg object-cover flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-gray-900 truncate">
            {accommodation.title}
          </p>
          <span
            className={cn(
              'text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap',
              statusPillClass(booking.status)
            )}
          >
            {booking.status}
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-2">
          {getAccommodationTypeLabel(accommodation.type)} hosted by {hostName}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="truncate">
              {accommodation.location.city}, {accommodation.location.country}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span>
              {formatDate(booking.checkInDate, 'MMM d')} -{' '}
              {formatDate(booking.checkOutDate, 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span>
              {booking.numGuests} guest{booking.numGuests !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-gray-900">
            {formatCurrency(booking.totalPrice)} total
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          {tab === 'upcoming' && (
            <button
              type="button"
              onClick={() => onCancelClick(booking)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancel booking
            </button>
          )}
          {canReview && (
            <button
              type="button"
              onClick={() => {
                // TODO(P1-T3): open the review form modal seeded with this
                // booking id; on submit call bookingsAPI.createReview(...).
                // eslint-disable-next-line no-console
                console.log('TODO: review ' + booking.id);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
            >
              <Star className="w-4 h-4" />
              Leave a review
            </button>
          )}
          <button
            type="button"
            onClick={goToDetail}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ml-auto"
          >
            View details
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {booking.specialRequests && (
          <div className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
            <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{booking.specialRequests}</span>
          </div>
        )}
      </div>
    </article>
  );
};

interface EmptyStateProps {
  tab: TripTab;
}

const EmptyState = ({ tab }: EmptyStateProps) => {
  if (tab === 'upcoming') {
    return (
      <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
        <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          No upcoming trips
        </h3>
        <p className="text-gray-600 mb-4">
          Time to dust off the suitcase and start planning your next stay.
        </p>
        <Link
          to="/listings"
          className="inline-flex items-center gap-1 px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
        >
          Start exploring
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }
  if (tab === 'past') {
    return (
      <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
        <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          No past trips yet
        </h3>
        <p className="text-gray-600">
          Your travel history will show up here once you&apos;ve checked out.
        </p>
      </div>
    );
  }
  return (
    <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
      <XCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        No cancelled trips
      </h3>
      <p className="text-gray-600">Nothing here — and that&apos;s a good thing.</p>
    </div>
  );
};

export const MyTripsPage = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TripTab>('upcoming');
  // Lifted modal state so the cancel confirmation can refresh the list on
  // success (re-trigger the fetch via reloadKey).
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    bookingsAPI
      .getMyBookings()
      .then((b) => {
        if (cancelled) return;
        setBookings(b);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const partitioned = useMemo(() => partition(bookings, todayISO()), [bookings]);

  if (loading) {
    return <LoadingState label="Loading your trips..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  const tabs: Array<{ id: TripTab; label: string; count: number }> = [
    { id: 'upcoming', label: 'Upcoming', count: partitioned.upcoming.length },
    { id: 'past', label: 'Past', count: partitioned.past.length },
    { id: 'cancelled', label: 'Cancelled', count: partitioned.cancelled.length },
  ];

  const visible = partitioned[activeTab];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
          <p className="text-gray-600 mt-1">
            Manage your upcoming stays and revisit past adventures.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-card">
          <div className="border-b border-gray-200">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative',
                    activeTab === tab.id
                      ? 'text-primary'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="text-xs text-gray-500">({tab.count})</span>
                  )}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {visible.length === 0 ? (
              <EmptyState tab={activeTab} />
            ) : (
              <div className="space-y-4">
                {visible.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    tab={activeTab}
                    onCancelClick={setBookingToCancel}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CancelBookingModal
        booking={bookingToCancel}
        onClose={() => setBookingToCancel(null)}
        onCancelled={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
};
