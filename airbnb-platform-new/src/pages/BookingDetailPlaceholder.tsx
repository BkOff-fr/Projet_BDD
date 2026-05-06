import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/**
 * Temporary placeholder for the booking detail page.
 *
 * P1-T1 introduced navigation targets pointing at `/bookings/:id` (from
 * MyTripsPage card actions), but the real BookingDetailPage isn't built yet.
 * Without this stub the route falls through to the wildcard redirect and
 * silently sends users back to Home. P1-T2 will replace this file with the
 * real implementation.
 */
export const BookingDetailPlaceholder = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-card p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Booking #{id}
          </h1>
          <p className="text-gray-600 mb-6">
            Detail page coming in P1-T2.
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
};
