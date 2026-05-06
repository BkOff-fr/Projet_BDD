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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const subtotal = accommodation.pricePerNight * nights;
    const cleaningFee = accommodation.cleaningFee ?? 0;
    const serviceFee = accommodation.serviceFee ?? 0;
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
   * Creates a booking and returns its id (or null if invalid). The actual
   * API call is wired up in P0-T3+; for now this is a stub that just
   * surfaces the validated form state so components can navigate to the
   * confirmation page. When the real API is wired, this will call
   * `bookingsAPI.create({ ... })`.
   */
  const createBooking = useCallback(async (): Promise<{
    accommodationId: number;
    checkIn: Date;
    checkOut: Date;
    guests: BookingFormData['guests'];
    nights: number;
    totalPrice: number;
  } | null> => {
    if (!isValid) return null;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);

    return {
      accommodationId: accommodation.id,
      checkIn: formData.checkIn!,
      checkOut: formData.checkOut!,
      guests: formData.guests,
      nights,
      totalPrice: pricing.total,
    };
  }, [isValid, accommodation, formData, nights, pricing.total]);

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
