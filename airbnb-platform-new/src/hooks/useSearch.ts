import { useState, useCallback, useMemo } from 'react';
import type { SearchFilters, Accommodation } from '@/types';
import { filterAccommodations } from '@/utils/helpers';

interface UseSearchProps {
  accommodations: Accommodation[];
}

export const useSearch = ({ accommodations }: UseSearchProps) => {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [isSearching, setIsSearching] = useState(false);

  const filteredAccommodations = useMemo(() => {
    setIsSearching(true);
    const results = filterAccommodations(accommodations, filters);
    setIsSearching(false);
    return results;
  }, [accommodations, filters]);

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const setLocation = useCallback((location: string) => {
    setFilters((prev) => ({ ...prev, location }));
  }, []);

  const setDates = useCallback((checkIn: Date | undefined, checkOut: Date | undefined) => {
    setFilters((prev) => ({ ...prev, checkIn, checkOut }));
  }, []);

  const setGuests = useCallback((guests: SearchFilters['guests']) => {
    setFilters((prev) => ({ ...prev, guests }));
  }, []);

  const setPriceRange = useCallback((min: number, max: number) => {
    setFilters((prev) => ({ ...prev, priceRange: { min, max } }));
  }, []);

  const togglePropertyType = useCallback((propertyType: string) => {
    setFilters((prev) => {
      const currentTypes = prev.propertyTypes || [];
      const newTypes = currentTypes.includes(propertyType as never)
        ? currentTypes.filter((t) => t !== propertyType)
        : [...currentTypes, propertyType as never];
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

  const toggleSuperhost = useCallback(() => {
    setFilters((prev) => ({ ...prev, superhost: !prev.superhost }));
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
    if (filters.superhost) count++;
    return count;
  }, [filters]);

  return {
    filters,
    filteredAccommodations,
    isSearching,
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
    toggleSuperhost,
  };
};
