import { useState } from 'react';
import { Upload, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/utils/cn';
import { amenities } from '@/data/mockData';
import type { CreateAccommodationInput, AccommodationType } from '@/types';

/**
 * The form drafts a `CreateAccommodationInput` payload. Note: the BDD has
 * no images table; the photo step is a UI placeholder and its values are
 * not part of the input payload sent to the API.
 */
interface HostPropertyFormDraft extends Partial<CreateAccommodationInput> {
  /** Local-only — the API does not currently accept photo URLs. */
  images?: string[];
}

interface HostPropertyFormProps {
  property?: HostPropertyFormDraft;
  onSubmit: (propertyData: HostPropertyFormDraft) => void;
  onCancel: () => void;
}

const steps = [
  'Basic Info',
  'Location',
  'Details',
  'Amenities',
  'Photos',
  'Pricing',
];

const accommodationTypes: { value: AccommodationType; label: string }[] = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'condo', label: 'Condo' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'guesthouse', label: 'Guesthouse' },
  { value: 'studio', label: 'Studio' },
  { value: 'private_room', label: 'Private room' },
];

export const HostPropertyForm = ({
  property,
  onSubmit,
  onCancel,
}: HostPropertyFormProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<HostPropertyFormDraft>(
    property || {
      title: '',
      description: '',
      type: 'apartment',
      address: '',
      city: '',
      country: '',
      pricePerNight: 100,
      cleaningFee: 50,
      serviceFee: 25,
      maxGuests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      minimumNights: 1,
      cancellationPolicyId: 1,
      amenityIds: [],
      images: [],
      instantBook: false,
    }
  );

  const updateField = <K extends keyof HostPropertyFormDraft>(
    field: K,
    value: HostPropertyFormDraft[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAmenity = (amenityId: number) => {
    const currentAmenities = formData.amenityIds || [];
    const newAmenities = currentAmenities.includes(amenityId)
      ? currentAmenities.filter((a) => a !== amenityId)
      : [...currentAmenities, amenityId];
    updateField('amenityIds', newAmenities);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Property Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., Cozy Studio in Downtown"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe your property..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Property Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  updateField('type', e.target.value as AccommodationType)
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {accommodationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={formData.address ?? ''}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="e.g., 123 Main Street"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city ?? ''}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="City"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country ?? ''}
                  onChange={(e) => updateField('country', e.target.value)}
                  placeholder="Country"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max Guests
                </label>
                <input
                  type="number"
                  value={formData.maxGuests}
                  onChange={(e) =>
                    updateField('maxGuests', parseInt(e.target.value))
                  }
                  min={1}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bedrooms
                </label>
                <input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) =>
                    updateField('bedrooms', parseInt(e.target.value))
                  }
                  min={0}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Beds
                </label>
                <input
                  type="number"
                  value={formData.beds}
                  onChange={(e) => updateField('beds', parseInt(e.target.value))}
                  min={1}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bathrooms
                </label>
                <input
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) =>
                    updateField('bathrooms', parseFloat(e.target.value))
                  }
                  min={0.5}
                  step={0.5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Select the amenities your property offers
            </p>
            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              {amenities.map((amenity) => {
                const amenityId = Number(amenity.id);
                const isSelected = formData.amenityIds?.includes(amenityId) ?? false;
                return (
                  <label
                    key={amenity.id}
                    className={cn(
                      'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300 hover:border-gray-400'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAmenity(amenityId)}
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{amenity.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Drag and drop photos here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse from your computer
              </p>
              <button className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors">
                Upload Photos
              </button>
            </div>
            {formData.images && formData.images.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={image}
                      alt={`Property ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() =>
                        updateField(
                          'images',
                          (formData.images ?? []).filter((_, i) => i !== index)
                        )
                      }
                      className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Price per Night ($)
              </label>
              <input
                type="number"
                value={formData.pricePerNight}
                onChange={(e) =>
                  updateField('pricePerNight', parseInt(e.target.value))
                }
                min={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cleaning Fee ($)
                </label>
                <input
                  type="number"
                  value={formData.cleaningFee}
                  onChange={(e) =>
                    updateField('cleaningFee', parseInt(e.target.value))
                  }
                  min={0}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Service Fee ($)
                </label>
                <input
                  type="number"
                  value={formData.serviceFee}
                  onChange={(e) =>
                    updateField('serviceFee', parseInt(e.target.value))
                  }
                  min={0}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.instantBook}
                onChange={(e) => updateField('instantBook', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-gray-700">Enable Instant Book</span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {property ? 'Edit Property' : 'List Your Property'}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress */}
      <div className="px-6 py-4 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">{steps[currentStep]}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">{renderStep()}</div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors',
            currentStep === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        {currentStep === steps.length - 1 ? (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            {property ? 'Save Changes' : 'Create Listing'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
