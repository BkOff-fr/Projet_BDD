import { useState } from 'react';
import { X, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';
import { amenities } from '@/data/mockData';
import type { SearchFilters, PropertyType } from '@/types';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onUpdateFilters: (filters: Partial<SearchFilters>) => void;
  onClearFilters: () => void;
  priceRange: { min: number; max: number };
}

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: 'studio', label: 'Studio' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'condo', label: 'Condo' },
  { value: 'loft', label: 'Loft' },
];

export const FilterSidebar = ({
  isOpen,
  onClose,
  filters,
  onUpdateFilters,
  onClearFilters,
  priceRange,
}: FilterSidebarProps) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'price',
    'type',
    'amenities',
  ]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
    const currentRange = filters.priceRange || { min: 0, max: priceRange.max };
    onUpdateFilters({
      priceRange: {
        ...currentRange,
        [type]: numValue,
      },
    });
  };

  const togglePropertyType = (type: PropertyType) => {
    const currentTypes = filters.propertyTypes || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    onUpdateFilters({ propertyTypes: newTypes });
  };

  const toggleAmenity = (amenityId: string) => {
    const currentAmenities = filters.amenities || [];
    const newAmenities = currentAmenities.includes(amenityId)
      ? currentAmenities.filter((a) => a !== amenityId)
      : [...currentAmenities, amenityId];
    onUpdateFilters({ amenities: newAmenities });
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed lg:sticky top-0 lg:top-24 h-full lg:h-[calc(100vh-6rem)] w-80 bg-white z-50 lg:z-0 overflow-y-auto transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'border-r border-gray-200'
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-200 flex items-center justify-between lg:hidden">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Price Range */}
          <div>
            <button
              onClick={() => toggleSection('price')}
              className="w-full flex items-center justify-between py-2"
            >
              <h3 className="font-semibold text-gray-900">Price range</h3>
              {expandedSections.includes('price') ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.includes('price') && (
              <div className="mt-3 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Min</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <input
                        type="number"
                        value={filters.priceRange?.min || ''}
                        onChange={(e) => handlePriceChange('min', e.target.value)}
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Max</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <input
                        type="number"
                        value={filters.priceRange?.max || ''}
                        onChange={(e) => handlePriceChange('max', e.target.value)}
                        placeholder={priceRange.max.toString()}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Average price: ${Math.round((priceRange.min + priceRange.max) / 2)}
                </p>
              </div>
            )}
          </div>

          {/* Property Type */}
          <div>
            <button
              onClick={() => toggleSection('type')}
              className="w-full flex items-center justify-between py-2"
            >
              <h3 className="font-semibold text-gray-900">Property type</h3>
              {expandedSections.includes('type') ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.includes('type') && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {propertyTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => togglePropertyType(type.value)}
                    className={cn(
                      'px-4 py-3 rounded-lg border text-sm font-medium transition-colors',
                      filters.propertyTypes?.includes(type.value)
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amenities */}
          <div>
            <button
              onClick={() => toggleSection('amenities')}
              className="w-full flex items-center justify-between py-2"
            >
              <h3 className="font-semibold text-gray-900">Amenities</h3>
              {expandedSections.includes('amenities') ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.includes('amenities') && (
              <div className="mt-3 space-y-2">
                {amenities.slice(0, 10).map((amenity) => (
                  <label
                    key={amenity.id}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.amenities?.includes(amenity.id)}
                      onChange={() => toggleAmenity(amenity.id)}
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-gray-700">{amenity.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Booking Options */}
          <div>
            <button
              onClick={() => toggleSection('booking')}
              className="w-full flex items-center justify-between py-2"
            >
              <h3 className="font-semibold text-gray-900">Booking options</h3>
              {expandedSections.includes('booking') ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.includes('booking') && (
              <div className="mt-3 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700">Instant Book</span>
                  <input
                    type="checkbox"
                    checked={filters.instantBook}
                    onChange={() =>
                      onUpdateFilters({ instantBook: !filters.instantBook })
                    }
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700">Superhost</span>
                  <input
                    type="checkbox"
                    checked={filters.superhost}
                    onChange={() =>
                      onUpdateFilters({ superhost: !filters.superhost })
                    }
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
          <button
            onClick={onClearFilters}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Show results
          </button>
        </div>
      </div>
    </>
  );
};
