import { useState, useCallback, useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import type { Accommodation, AccommodationDetail } from '@/types';

interface BookingFormData {
  checkIn: Date | null;
  checkOut: Date | null;
  guests: {
    adults: number;
    children: number;
    infants: number;
    pets: number;
  };
}

interface UseBookingProps {
  accommodation: Accommodation | AccommodationDetail;
}

export const useBooking = ({ accommodation }: UseBookingProps) => {
  const [formData, setFormData] = useState<BookingFormData>({
    checkIn: null,
    checkOut: null,
    guests: {
      adults: 1,
      children: 0,
      infants: 0,
      pets: 0,
    },
  });
  const [isSubmitting] = useState(false);

  const nights = useMemo(() => {
    if (formData.checkIn && formData.checkOut) {
      return differenceInDays(formData.checkOut, formData.checkIn);
    }
    return 0;
  }, [formData.checkIn, formData.checkOut]);

  const pricing = useMemo(() => {
    if (nights === 0) {
      return {
        subtotal: 0,
        cleaningFee: 0,
        serviceFee: 0,
        total: 0,
      };
    }

    // Fees may be flat dollar amounts OR percentages of the subtotal — the
    // backend exposes `{ amount, isPercentage }` so the frontend can resolve
    // the actual dollar value the same way `bookingController.createBooking`
    // does on the server. Display the resolved amount in price breakdowns.
    const subtotal = accommodation.pricePerNight * nights;
    const resolveFee = (
      fee: { amount: number; isPercentage: boolean } | null
    ): number => {
      if (!fee) return 0;
      return fee.isPercentage ? (subtotal * fee.amount) / 100 : fee.amount;
    };
    const cleaningFee = resolveFee(accommodation.cleaningFee);
    const serviceFee = resolveFee(accommodation.serviceFee);
    const total = subtotal + cleaningFee + serviceFee;

    return {
      subtotal,
      cleaningFee,
      serviceFee,
      total,
    };
  }, [nights, accommodation]);

  const isValid = useMemo(() => {
    return (
      formData.checkIn !== null &&
      formData.checkOut !== null &&
      nights > 0 &&
      formData.guests.adults > 0
    );
  }, [formData, nights]);

  const setCheckIn = useCallback((date: Date | null) => {
    setFormData((prev) => ({ ...prev, checkIn: date }));
  }, []);

  const setCheckOut = useCallback((date: Date | null) => {
    setFormData((prev) => ({ ...prev, checkOut: date }));
  }, []);

  const updateGuests = useCallback((
    type: keyof BookingFormData['guests'],
    count: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      guests: { ...prev.guests, [type]: Math.max(0, count) },
    }));
  }, []);

  /**
   * Reserved for a future direct-booking flow. Today, the actual booking is
   * created from `BookingConfirmation.tsx` via `bookingsAPI.create(...)` —
   * this hook only surfaces validated form state. Kept on the returned API
   * so callers don't need to change when that direct flow lands.
   */
  const createBooking = useCallback(async () => {
    return null;
  }, []);

  return {
    formData,
    nights,
    pricing,
    isValid,
    isSubmitting,
    setCheckIn,
    setCheckOut,
    updateGuests,
    createBooking,
  };
};
