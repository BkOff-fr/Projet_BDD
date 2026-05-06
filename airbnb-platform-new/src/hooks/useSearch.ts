import { useState, useCallback, useMemo } from 'react';
import type { SearchFilters, AccommodationType } from '@/types';

/**
 * Filter-state hook for the listings page. Holds the in-flight `SearchFilters`
 * object plus convenience setters. Filtering itself now happens server-side
 * (the listing page sends these filters to `accommodationsAPI.getAll`), so
 * this hook no longer derives a `filteredAccommodations` list — it manages
 * UI state only.
 *
 * The previously-returned `filteredAccommodations` and `priceRange` were
 * removed in P0-T5 when mockData was deleted.
 */
export const useSearch = () => {
  const [filters, setFilters] = useState<SearchFilters>({});

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const setLocation = useCallback((location: string) => {
    setFilters((prev) => ({ ...prev, location }));
  }, []);

  const setDates = useCallback(
    (checkIn: Date | undefined, checkOut: Date | undefined) => {
      setFilters((prev) => ({ ...prev, checkIn, checkOut }));
    },
    []
  );

  const setGuests = useCallback((guests: SearchFilters['guests']) => {
    setFilters((prev) => ({ ...prev, guests }));
  }, []);

  const setPriceRange = useCallback((min: number, max: number) => {
    setFilters((prev) => ({ ...prev, priceRange: { min, max } }));
  }, []);

  const togglePropertyType = useCallback((propertyType: AccommodationType) => {
    setFilters((prev) => {
      const currentTypes = prev.propertyTypes || [];
      const newTypes = currentTypes.includes(propertyType)
        ? currentTypes.filter((t) => t !== propertyType)
        : [...currentTypes, propertyType];
      return { ...prev, propertyTypes: newTypes };
    });
  }, []);

  const toggleAmenity = useCallback((amenityId: string) => {
    setFilters((prev) => {
      const currentAmenities = prev.amenities || [];
      const newAmenities = currentAmenities.includes(amenityId)
        ? currentAmenities.filter((a) => a !== amenityId)
        : [...currentAmenities, amenityId];
      return { ...prev, amenities: newAmenities };
    });
  }, []);

  const toggleInstantBook = useCallback(() => {
    setFilters((prev) => ({ ...prev, instantBook: !prev.instantBook }));
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.location) count++;
    if (filters.checkIn || filters.checkOut) count++;
    if (filters.guests) count++;
    if (filters.priceRange) count++;
    if (filters.propertyTypes?.length) count++;
    if (filters.amenities?.length) count++;
    if (filters.instantBook) count++;
    return count;
  }, [filters]);

  return {
    filters,
    activeFiltersCount,
    updateFilters,
    clearFilters,
    setLocation,
    setDates,
    setGuests,
    setPriceRange,
    togglePropertyType,
    toggleAmenity,
    toggleInstantBook,
  };
};
