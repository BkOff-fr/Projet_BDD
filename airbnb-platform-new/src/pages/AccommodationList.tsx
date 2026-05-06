import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Map, Grid3X3, ChevronDown } from 'lucide-react';
import {
  AccommodationCard,
  FilterSidebar,
  LoadingState,
  ErrorState,
} from '@/components';
import { accommodationsAPI } from '@/services/api';
import { useSearch } from '@/hooks';
import { cn } from '@/utils/cn';
import type { Accommodation } from '@/types';

export const AccommodationList = () => {
  const [searchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [sortBy, setSortBy] = useState('recommended');

  // Filter UI state. The hook now ONLY manages local filter state — actual
  // filtering happens server-side via the API call below.
  const {
    filters,
    activeFiltersCount,
    updateFilters,
    clearFilters,
    setLocation,
    setGuests,
  } = useSearch();

  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Hydrate filter state from URL params once. The location/guests come from
  // the hero search bar; type comes from the Home category strip.
  useEffect(() => {
    const location = searchParams.get('location');
    const guests = searchParams.get('guests');
    const type = searchParams.get('type');

    if (location) setLocation(location);
    if (guests) {
      const guestCount = parseInt(guests);
      setGuests({
        adults: Math.min(guestCount, 16),
        children: 0,
        infants: 0,
        pets: 0,
      });
    }
    if (type) {
      updateFilters({ propertyTypes: [type as Accommodation['type']] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch from API whenever the relevant filter slice changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const checkInISO = filters.checkIn
      ? filters.checkIn.toISOString().split('T')[0]
      : undefined;
    const checkOutISO = filters.checkOut
      ? filters.checkOut.toISOString().split('T')[0]
      : undefined;
    const totalGuests = filters.guests
      ? filters.guests.adults +
        filters.guests.children +
        filters.guests.infants
      : undefined;

    accommodationsAPI
      .getAll({
        location: filters.location || undefined,
        checkIn: checkInISO,
        checkOut: checkOutISO,
        guests: totalGuests,
        minPrice: filters.priceRange?.min,
        maxPrice: filters.priceRange?.max,
        // The API only supports a single `type` filter — if the user picks
        // multiple property-type chips we send the first and apply the rest
        // client-side below. TODO: extend backend to accept arrays.
        type: filters.propertyTypes?.[0],
      })
      .then((list) => {
        if (cancelled) return;
        setAccommodations(list);
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
  }, [
    filters.location,
    filters.checkIn,
    filters.checkOut,
    filters.guests,
    filters.priceRange?.min,
    filters.priceRange?.max,
    filters.propertyTypes,
    reloadKey,
  ]);

  // Compute price range from the current result set so the sidebar slider has
  // sensible bounds. (Server-side global price range would require a separate
  // endpoint; using current results is a fine approximation for now.)
  const priceRange = useMemo(() => {
    if (accommodations.length === 0) return { min: 0, max: 1000 };
    const prices = accommodations.map((a) => a.pricePerNight);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [accommodations]);

  const sortOptions = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
  ];

  // Apply secondary client-side filters (multiple property types, amenities,
  // instant book) on top of the server response, then sort.
  const visibleAccommodations = useMemo(() => {
    let list = accommodations;

    if (filters.propertyTypes && filters.propertyTypes.length > 1) {
      const allowed = new Set(filters.propertyTypes);
      list = list.filter((a) => allowed.has(a.type));
    }

    if (filters.amenities && filters.amenities.length > 0) {
      const required = filters.amenities;
      list = list.filter((a) => {
        const ids = a.amenities.map((x) => String(x.id));
        return required.every((id) => ids.includes(id));
      });
    }

    if (filters.instantBook) {
      list = list.filter((a) => a.instantBook);
    }

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'price_low':
          return a.pricePerNight - b.pricePerNight;
        case 'price_high':
          return b.pricePerNight - a.pricePerNight;
        case 'rating':
          return (b.rating.average ?? 0) - (a.rating.average ?? 0);
        default:
          return 0;
      }
    });
  }, [accommodations, filters.propertyTypes, filters.amenities, filters.instantBook, sortBy]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header Bar */}
      <div className="sticky top-20 z-20 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Results Count */}
            <div>
              <p className="text-gray-600">
                {visibleAccommodations.length} stays
                {filters.location && (
                  <span>
                    {' '}
                    in <span className="font-semibold">{filters.location}</span>
                  </span>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Filter Button */}
              <button
                onClick={() => setIsFilterOpen(true)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 border rounded-lg font-medium transition-colors',
                  activeFiltersCount > 0
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Sort Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:border-gray-400 transition-colors">
                  Sort by
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-modal border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm hover:bg-gray-50',
                        sortBy === option.value && 'font-semibold text-primary'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 transition-colors',
                    viewMode === 'grid'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={cn(
                    'p-2 transition-colors',
                    viewMode === 'map'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Map className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <FilterSidebar
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            filters={filters}
            onUpdateFilters={updateFilters}
            onClearFilters={clearFilters}
            priceRange={priceRange}
          />

          {/* Results */}
          <div className="flex-1">
            {loading ? (
              <LoadingState label="Searching stays..." className="py-16 flex items-center justify-center" />
            ) : error ? (
              <ErrorState
                message={error}
                onRetry={() => setReloadKey((k) => k + 1)}
                className="py-16 flex items-center justify-center"
              />
            ) : visibleAccommodations.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SlidersHorizontal className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No results found
                </h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your filters to see more results
                </p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleAccommodations.map((accommodation) => (
                  <AccommodationCard
                    key={accommodation.id}
                    accommodation={accommodation}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
