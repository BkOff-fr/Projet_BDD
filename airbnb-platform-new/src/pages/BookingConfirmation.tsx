import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Check,
  Shield,
  Lock,
  CreditCard,
  Calendar,
  Users,
  Star,
  AlertCircle,
} from 'lucide-react';
import { bookingsAPI } from '@/services/api';
import { cn } from '@/utils/cn';
import {
  formatCurrency,
  formatDate,
  calculateNights,
  getAccommodationTypeLabel,
  PLACEHOLDER_IMAGE,
} from '@/utils/helpers';
import type { AccommodationDetail } from '@/types';

interface BookingState {
  accommodation: AccommodationDetail;
  bookingData: {
    checkIn: Date | null;
    checkOut: Date | null;
    guests: { adults: number; children: number; infants: number; pets: number };
  };
}

/** Format a `Date` as `YYYY-MM-DD` (the shape the API expects). */
const toYMD = (d: Date) => d.toISOString().split('T')[0];

export const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const state = location.state as BookingState | null;
  const accommodation = state?.accommodation;
  const bookingData = state?.bookingData;

  if (
    !accommodation ||
    !bookingData ||
    !bookingData.checkIn ||
    !bookingData.checkOut
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            No booking information found
          </h1>
          <button
            onClick={() => navigate('/listings')}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Browse Listings
          </button>
        </div>
      </div>
    );
  }

  const nights = calculateNights(bookingData.checkIn, bookingData.checkOut);
  const cleaningFee = accommodation.cleaningFee ?? 0;
  const serviceFee = accommodation.serviceFee ?? 0;
  const subtotal = accommodation.pricePerNight * nights;
  const total = subtotal + cleaningFee + serviceFee;
  const numGuests =
    bookingData.guests.adults +
    bookingData.guests.children +
    bookingData.guests.infants;

  const handleConfirmBooking = async () => {
    setIsProcessing(true);
    setSubmitError(null);
    try {
      await bookingsAPI.create({
        accommodationId: accommodation.id,
        checkInDate: toYMD(bookingData.checkIn!),
        checkOutDate: toYMD(bookingData.checkOut!),
        numGuests: Math.max(1, numGuests),
        // The form has no special-requests field today; leave undefined.
      });
      setIsProcessing(false);
      setIsComplete(true);
    } catch (err) {
      setIsProcessing(false);
      setSubmitError(err instanceof Error ? err.message : 'Booking failed.');
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-card p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-gray-600 mb-6">
            Your reservation at {accommodation.title} has been confirmed.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/bookings')}
              className="w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              View My Trips
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold">
                <Check className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-900">Dates</span>
            </div>
            <div className="w-12 h-0.5 bg-primary" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <span className="text-sm font-medium text-gray-900">
                Confirm & Pay
              </span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <span className="text-sm font-medium text-gray-500">
                Confirmation
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Booking Details */}
          <div className="space-y-6">
            {/* Trip Details */}
            <div className="bg-white rounded-xl shadow-card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Your trip
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Dates</p>
                    <p className="text-gray-600">
                      {formatDate(bookingData.checkIn, 'EEE, MMM d')} -{' '}
                      {formatDate(bookingData.checkOut, 'EEE, MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Users className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Guests</p>
                    <p className="text-gray-600">
                      {bookingData.guests.adults +
                        bookingData.guests.children}{' '}
                      guests
                      {bookingData.guests.infants > 0 &&
                        `, ${bookingData.guests.infants} infant${
                          bookingData.guests.infants > 1 ? 's' : ''
                        }`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Pay with
              </h2>
              <div className="space-y-3">
                <label
                  className={cn(
                    'flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors',
                    paymentMethod === 'card'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="w-5 h-5 text-primary"
                  />
                  <CreditCard className="w-6 h-6 text-gray-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      Credit or debit card
                    </p>
                  </div>
                </label>
                <label
                  className={cn(
                    'flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors',
                    paymentMethod === 'paypal'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={() => setPaymentMethod('paypal')}
                    className="w-5 h-5 text-primary"
                  />
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                    Pp
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">PayPal</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="bg-white rounded-xl shadow-card p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Cancellation policy
              </h2>
              <p className="text-gray-700">
                <span className="font-semibold">
                  {accommodation.cancellationPolicy.name}
                </span>
                {accommodation.cancellationPolicy.description && (
                  <> — {accommodation.cancellationPolicy.description}</>
                )}
              </p>
            </div>
          </div>

          {/* Right Column - Price Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-28">
              <div className="bg-white rounded-xl shadow-card p-6">
                {/* Property Summary */}
                <div className="flex gap-4 pb-6 border-b border-gray-200">
                  <img
                    src={accommodation.coverImage ?? PLACEHOLDER_IMAGE}
                    alt={accommodation.title}
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                  <div>
                    <p className="text-sm text-gray-500">
                      {getAccommodationTypeLabel(accommodation.type)}
                    </p>
                    <p className="font-semibold text-gray-900 line-clamp-2">
                      {accommodation.title}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 fill-primary text-primary" />
                      <span className="text-sm">
                        {accommodation.rating.average !== null
                          ? accommodation.rating.average.toFixed(2)
                          : 'New'}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({accommodation.rating.count} reviews)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="py-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Price details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-700 underline">
                        {formatCurrency(accommodation.pricePerNight)} x {nights}{' '}
                        nights
                      </span>
                      <span className="text-gray-700">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 underline">
                        Cleaning fee
                      </span>
                      <span className="text-gray-700">
                        {formatCurrency(cleaningFee)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 underline">
                        Service fee
                      </span>
                      <span className="text-gray-700">
                        {formatCurrency(serviceFee)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="pt-6">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total (USD)</span>
                    <span className="font-bold text-xl text-gray-900">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                {/* Security Note */}
                <div className="mt-6 flex items-start gap-3 text-sm text-gray-600">
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <p>
                    Your booking is protected by our{' '}
                    <span className="font-semibold">Guest Refund Policy</span>
                  </p>
                </div>

                {/* Inline error from the API (e.g. dates already taken) */}
                {submitError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Confirm Button */}
                <button
                  onClick={handleConfirmBooking}
                  disabled={isProcessing}
                  className={cn(
                    'w-full mt-6 py-4 rounded-lg font-semibold text-white transition-all',
                    isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-dark hover:shadow-lg'
                  )}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" />
                      Confirm and pay
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
