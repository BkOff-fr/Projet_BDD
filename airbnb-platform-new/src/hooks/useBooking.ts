import { useState, useCallback, useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import type { Accommodation, Booking } from '@/types';
import { bookings as mockBookings } from '@/data/mockData';

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
  accommodation: Accommodation;
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
    const cleaningFee = accommodation.cleaningFee;
    const serviceFee = accommodation.serviceFee;
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

  const createBooking = useCallback(async (): Promise<Booking | null> => {
    if (!isValid) return null;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const newBooking: Booking = {
      id: `b${Date.now()}`,
      accommodationId: accommodation.id,
      accommodation,
      guestId: 'u1', // Current user
      guest: mockBookings[0].guest,
      hostId: accommodation.hostId,
      checkIn: formData.checkIn!,
      checkOut: formData.checkOut!,
      guests: formData.guests,
      totalNights: nights,
      pricePerNight: accommodation.pricePerNight,
      cleaningFee: accommodation.cleaningFee,
      serviceFee: accommodation.serviceFee,
      totalPrice: pricing.total,
      status: 'pending',
      createdAt: new Date(),
      paymentStatus: 'pending',
    };

    setIsSubmitting(false);
    return newBooking;
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
