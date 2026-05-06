import { useState } from 'react';
import { Minus, Plus, Info, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatCurrency, formatDate, calculateNights } from '@/utils/helpers';
import { useBooking } from '@/hooks';
import type { Accommodation } from '@/types';

interface BookingFormProps {
  accommodation: Accommodation;
  onSubmit: (bookingData: ReturnType<typeof useBooking>['formData']) => void;
  className?: string;
}

export const BookingForm = ({ accommodation, onSubmit, className }: BookingFormProps) => {
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const {
    formData,
    nights,
    pricing,
    isValid,
    isSubmitting,
    setCheckIn,
    setCheckOut,
    updateGuests,
  } = useBooking({ accommodation });

  const totalGuests = formData.guests.adults + formData.guests.children;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSubmit(formData);
    }
  };

  return (
    <div className={cn('bg-white rounded-xl shadow-card border border-gray-200 p-6', className)}>
      {/* Price Header */}
      <div className="flex items-baseline justify-between mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">
            {formatCurrency(accommodation.pricePerNight)}
          </span>
          <span className="text-gray-500">night</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-primary">★</span>
          <span className="font-semibold">
            {accommodation.rating.average !== null
              ? accommodation.rating.average.toFixed(2)
              : 'New'}
          </span>
          <span className="text-gray-500 underline">
            {accommodation.rating.count} reviews
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Date Selection */}
        <div className="border border-gray-400 rounded-t-lg overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-gray-400">
            <div className="p-3 hover:bg-gray-50 cursor-pointer">
              <label className="block text-xs font-bold text-gray-800 uppercase">
                Check-in
              </label>
              <input
                type="date"
                value={formData.checkIn ? formData.checkIn.toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  setCheckIn(e.target.value ? new Date(e.target.value) : null)
                }
                className="w-full bg-transparent text-sm text-gray-600 outline-none"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="p-3 hover:bg-gray-50 cursor-pointer">
              <label className="block text-xs font-bold text-gray-800 uppercase">
                Check-out
              </label>
              <input
                type="date"
                value={formData.checkOut ? formData.checkOut.toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  setCheckOut(e.target.value ? new Date(e.target.value) : null)
                }
                className="w-full bg-transparent text-sm text-gray-600 outline-none"
                min={
                  formData.checkIn
                    ? new Date(formData.checkIn.getTime() + 86400000)
                        .toISOString()
                        .split('T')[0]
                    : new Date().toISOString().split('T')[0]
                }
              />
            </div>
          </div>
        </div>

        {/* Guest Selection */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowGuestDropdown(!showGuestDropdown)}
            className="w-full border border-t-0 border-gray-400 rounded-b-lg p-3 text-left hover:bg-gray-50 flex items-center justify-between"
          >
            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase">
                Guests
              </label>
              <span className="text-sm text-gray-600">
                {totalGuests > 0
                  ? `${totalGuests} guest${totalGuests > 1 ? 's' : ''}`
                  : 'Add guests'}
              </span>
            </div>
            <ChevronDown
              className={cn(
                'w-5 h-5 text-gray-500 transition-transform',
                showGuestDropdown && 'rotate-180'
              )}
            />
          </button>

          {showGuestDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-modal border border-gray-200 p-4 z-10">
              {[
                { key: 'adults', label: 'Adults', sublabel: 'Ages 13+' },
                { key: 'children', label: 'Children', sublabel: 'Ages 2-12' },
                { key: 'infants', label: 'Infants', sublabel: 'Under 2' },
                { key: 'pets', label: 'Pets', sublabel: '' },
              ].map(({ key, label, sublabel }) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-semibold text-gray-700">{label}</p>
                    {sublabel && <p className="text-sm text-gray-500">{sublabel}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateGuests(key as keyof typeof formData.guests, -1)
                      }
                      disabled={formData.guests[key as keyof typeof formData.guests] === 0}
                      className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-600"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-semibold">
                      {formData.guests[key as keyof typeof formData.guests]}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateGuests(key as keyof typeof formData.guests, 1)
                      }
                      disabled={
                        key === 'adults' &&
                        formData.guests.adults >= accommodation.maxGuests
                      }
                      className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center disabled:opacity-50 hover:border-gray-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className={cn(
            'w-full mt-4 py-3.5 rounded-lg font-semibold text-white transition-all',
            isValid && !isSubmitting
              ? 'bg-primary hover:bg-primary-dark hover:shadow-lg'
              : 'bg-gray-300 cursor-not-allowed'
          )}
        >
          {isSubmitting ? (
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
            <span>Reserve</span>
          )}
        </button>

        <p className="text-center text-sm text-gray-500 mt-3">
          You won&apos;t be charged yet
        </p>

        {/* Price Breakdown */}
        {nights > 0 && (
          <div className="mt-6 space-y-3 pt-6 border-t border-gray-200">
            <div className="flex justify-between">
              <span className="text-gray-700 underline">
                {formatCurrency(accommodation.pricePerNight)} x {nights} nights
              </span>
              <span className="text-gray-700">
                {formatCurrency(pricing.subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 underline">Cleaning fee</span>
              <span className="text-gray-700">
                {formatCurrency(pricing.cleaningFee)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 underline">Service fee</span>
              <span className="text-gray-700">
                {formatCurrency(pricing.serviceFee)}
              </span>
            </div>
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <span className="font-bold text-gray-900">Total before taxes</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(pricing.total)}
              </span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
