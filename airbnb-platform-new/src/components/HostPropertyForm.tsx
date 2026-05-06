import { useEffect, useState } from 'react';
import { Upload, X, ChevronRight, ChevronLeft, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';
import { accommodationsAPI } from '@/services/api';
import { Spinner } from './Spinner';
import type {
  Amenity,
  CreateAccommodationInput,
  AccommodationType,
  CancellationPolicyDetail,
} from '@/types';

/**
 * The form drafts a `CreateAccommodationInput` payload. Note: the BDD has
 * no images table; the photo step is a UI placeholder and its values are
 * not part of the input payload sent to the API.
 *
 * TODO(P4-T?): when an `images` table is introduced, plumb `images` from
 * the photos step (step 4) through to the create payload. For now the
 * field is local-only and is dropped on submission in `handleSubmit`.
 */
interface HostPropertyFormDraft extends Partial<CreateAccommodationInput> {
  /** Local-only — the API does not currently accept photo URLs. */
  images?: string[];
}

interface HostPropertyFormProps {
  property?: HostPropertyFormDraft;
  /**
   * Called with the validated `CreateAccommodationInput` payload. Returns a
   * promise so the parent can `await` the API call and surface errors via
   * `submitError`. Resolution closes the form (parent's responsibility);
   * rejection leaves the form open with the error displayed.
   */
  onSubmit: (propertyData: CreateAccommodationInput) => Promise<void> | void;
  onCancel: () => void;
  /** When true, the final submit button shows a spinner and is disabled. */
  submitting?: boolean;
  /** Error message to display below the footer if the API rejected. */
  submitError?: string | null;
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
  submitting = false,
  submitError = null,
}: HostPropertyFormProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [policies, setPolicies] = useState<CancellationPolicyDetail[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      accommodationsAPI.getAmenities(),
      accommodationsAPI.getCancellationPolicies(),
    ])
      .then(([amenityList, policyList]) => {
        if (cancelled) return;
        setAmenities(amenityList);
        setPolicies(policyList);
      })
      .catch(() => {
        if (cancelled) return;
        setAmenities([]);
        setPolicies([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      cancellationPolicyId: undefined as number | undefined,
      hasAlarmSystem: false,
      hasSmokeDetector: false,
      amenityIds: [],
      images: [],
      instantBook: false,
      houseRules: '',
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

  /**
   * Build a strict `CreateAccommodationInput` from the draft and forward it
   * to the parent. Drops local-only fields (`images`) that the API does not
   * accept, and runs client-side validation that mirrors the backend Zod
   * schema (see `createAccommodationSchema` in `accommodationController.ts`).
   * Server-side errors come back via the `submitError` prop.
   */
  const handleSubmit = async () => {
    if (submitting) return;
    setValidationError(null);

    // Required-field guards mirroring the backend Zod schema.
    const title = (formData.title ?? '').trim();
    const description = (formData.description ?? '').trim();
    const address = (formData.address ?? '').trim();
    const city = (formData.city ?? '').trim();
    const country = (formData.country ?? '').trim();
    if (!title || !description || !address || !city || !country) {
      setValidationError(
        'Please fill in title, description, address, city, and country.'
      );
      return;
    }
    if (!formData.type) {
      setValidationError('Please select a property type.');
      return;
    }
    if (!(Number(formData.cancellationPolicyId) > 0)) {
      setValidationError('Please select a cancellation policy.');
      return;
    }
    const maxGuests = Number(formData.maxGuests ?? 0);
    const bedrooms = Number(formData.bedrooms ?? 0);
    const beds = Number(formData.beds ?? 0);
    const bathrooms = Number(formData.bathrooms ?? 0);
    const pricePerNight = Number(formData.pricePerNight ?? 0);
    const minimumNights = Number(formData.minimumNights ?? 0);
    if (
      !Number.isFinite(maxGuests) ||
      maxGuests < 1 ||
      !Number.isFinite(bedrooms) ||
      bedrooms < 0 ||
      !Number.isFinite(beds) ||
      beds < 1 ||
      !Number.isFinite(bathrooms) ||
      bathrooms < 0
    ) {
      setValidationError(
        'Check the room details: guests >= 1, beds >= 1, bedrooms/bathrooms >= 0.'
      );
      return;
    }
    if (!Number.isFinite(pricePerNight) || pricePerNight <= 0) {
      setValidationError('Price per night must be greater than 0.');
      return;
    }
    if (!Number.isFinite(minimumNights) || minimumNights < 1) {
      setValidationError('Minimum nights must be at least 1.');
      return;
    }
    if (
      formData.maximumNights != null &&
      formData.maximumNights < minimumNights
    ) {
      setValidationError(
        'Maximum nights must be greater than or equal to minimum nights.'
      );
      return;
    }

    // Strip local-only fields and undefined optionals before sending. The
    // backend Zod schema rejects unknown keys via `.parse`, so being explicit
    // here is safer than spreading the whole draft.
    const payload: CreateAccommodationInput = {
      title,
      description,
      type: formData.type,
      address,
      city,
      country,
      maxGuests,
      bedrooms,
      beds,
      bathrooms,
      pricePerNight,
      minimumNights,
      cancellationPolicyId: Number(formData.cancellationPolicyId),
      instantBook: !!formData.instantBook,
      hasAlarmSystem: !!formData.hasAlarmSystem,
      hasSmokeDetector: !!formData.hasSmokeDetector,
      ...(formData.cleaningFee != null && { cleaningFee: Number(formData.cleaningFee) }),
      ...(formData.serviceFee != null && { serviceFee: Number(formData.serviceFee) }),
      ...(formData.maximumNights != null && {
        maximumNights: Number(formData.maximumNights),
      }),
      ...(formData.houseRules && formData.houseRules.trim().length > 0 && {
        houseRules: formData.houseRules.trim(),
      }),
      ...(formData.amenityIds && formData.amenityIds.length > 0 && {
        amenityIds: formData.amenityIds,
      }),
    };

    try {
      await onSubmit(payload);
    } catch {
      // The parent surfaces the message via the `submitError` prop. Swallow
      // here so React doesn't see an unhandled promise rejection.
    }
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                House Rules{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={formData.houseRules ?? ''}
                onChange={(e) => updateField('houseRules', e.target.value)}
                placeholder="e.g., No smoking, no parties, quiet hours after 10pm..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
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

            {/* Security equipment — alarm system is mandatory for the listing
                to be validated by the platform (cf. backend trigger
                `trg_booking_validate_before_insert`, § 4d). */}
            <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-amber-700" />
                <h4 className="font-semibold text-amber-900">Safety equipment</h4>
              </div>
              <p className="text-xs text-amber-800 mb-3">
                An alarm system is required by the platform to accept bookings.
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.hasAlarmSystem}
                  onChange={(e) =>
                    updateField('hasAlarmSystem', e.target.checked)
                  }
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-gray-800">Alarm system installed</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={!!formData.hasSmokeDetector}
                  onChange={(e) =>
                    updateField('hasSmokeDetector', e.target.checked)
                  }
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-gray-800">Smoke detector installed</span>
              </label>
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
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
              Photo uploads are not yet saved. This feature is coming soon.
            </p>
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
                  updateField('pricePerNight', parseFloat(e.target.value) || 0)
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
                    updateField('cleaningFee', parseFloat(e.target.value) || 0)
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
                    updateField('serviceFee', parseFloat(e.target.value) || 0)
                  }
                  min={0}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Minimum Nights
                </label>
                <input
                  type="number"
                  value={formData.minimumNights ?? 1}
                  onChange={(e) =>
                    updateField('minimumNights', parseInt(e.target.value, 10))
                  }
                  min={1}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Maximum Nights{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  value={formData.maximumNights ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    updateField(
                      'maximumNights',
                      raw === '' ? undefined : parseInt(raw, 10)
                    );
                  }}
                  min={1}
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

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cancellation Policy
              </label>
              <select
                value={formData.cancellationPolicyId ?? ''}
                onChange={(e) =>
                  updateField(
                    'cancellationPolicyId',
                    parseInt(e.target.value, 10)
                  )
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {policies.length === 0 && (
                  <option value="">Loading policies…</option>
                )}
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name.charAt(0).toUpperCase() + p.name.slice(1)}
                    {' — '}full refund up to {p.fullRefundDaysBefore}d before
                  </option>
                ))}
              </select>
              {policies.find(
                (p) => p.id === formData.cancellationPolicyId
              )?.description && (
                <p className="mt-2 text-xs text-gray-500">
                  {
                    policies.find(
                      (p) => p.id === formData.cancellationPolicyId
                    )?.description
                  }
                </p>
              )}
            </div>
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
          disabled={currentStep === 0 || submitting}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors',
            currentStep === 0 || submitting
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
            disabled={submitting}
            className={cn(
              'flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold transition-colors',
              submitting
                ? 'opacity-70 cursor-not-allowed'
                : 'hover:bg-primary-dark'
            )}
          >
            {submitting && <Spinner className="h-4 w-4" />}
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

      {/* Inline error display — shown on validation failure or API
          rejection. Two distinct sources:
          - `validationError` is set client-side by `handleSubmit` when a
            required field is missing or out of range.
          - `submitError` is the message bubbled up from the parent after a
            failed `accommodationsAPI.create` call. */}
      {(validationError || submitError) && (
        <div
          role="alert"
          className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm"
        >
          {validationError ?? submitError}
        </div>
      )}
    </div>
  );
};
