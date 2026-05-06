import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star,
  Share,
  Heart,
  MapPin,
  Check,
  ChevronLeft,
  Shield,
  ShieldCheck,
  Flag,
  X,
} from 'lucide-react';
import {
  BookingForm,
  ReviewCard,
  LoadingState,
} from '@/components';
import { accommodationsAPI } from '@/services/api';
import { cn } from '@/utils/cn';
import {
  getAccommodationTypeLabel,
  PLACEHOLDER_IMAGE,
} from '@/utils/helpers';
import type { AccommodationDetail as AccommodationDetailType } from '@/types';

export const AccommodationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const [accommodation, setAccommodation] =
    useState<AccommodationDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    accommodationsAPI
      .getById(id)
      .then((data) => {
        if (cancelled) return;
        setAccommodation(data);
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
  }, [id, reloadKey]);

  if (loading) {
    return <LoadingState label="Loading listing..." />;
  }

  // 404-ish: detail endpoint rejected the request. Show the same not-found
  // screen the page used to render when `accommodations.find` returned undefined.
  if (error || !accommodation) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Accommodation not found
          </h1>
          {error && (
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              {error}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-6 py-3 border border-gray-900 text-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => navigate('/listings')}
              className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
            >
              Browse Listings
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TODO: When an `images` table exists, replace this stub with the real list.
  // For now we render the placeholder image multiple times to keep the
  // existing photo-grid layout intact.
  const galleryImages: string[] = Array.from(
    { length: 5 },
    () => accommodation.coverImage ?? PLACEHOLDER_IMAGE
  );
  const mainImage = galleryImages[0];
  const sideImages = galleryImages.slice(1, 5);

  const handleBookingSubmit = (bookingData: {
    checkIn: Date | null;
    checkOut: Date | null;
    guests: { adults: number; children: number; infants: number; pets: number };
  }) => {
    navigate('/booking/confirm', {
      state: {
        accommodation,
        bookingData,
      },
    });
  };

  const displayedReviews = showAllReviews
    ? accommodation.reviews
    : accommodation.reviews.slice(0, 6);

  const displayedAmenities = showAllAmenities
    ? accommodation.amenities
    : accommodation.amenities.slice(0, 10);

  // Compute average per-category rating from real reviews. If there are no
  // reviews at all, the categories block hides entirely.
  const categoryAverages = (() => {
    const reviews = accommodation.reviews;
    if (reviews.length === 0) return null;

    const sum = (key: keyof (typeof reviews)[number]['categories']) => {
      let total = 0;
      let count = 0;
      for (const r of reviews) {
        const v = r.categories[key];
        if (typeof v === 'number') {
          total += v;
          count += 1;
        }
      }
      return count > 0 ? total / count : null;
    };

    return [
      { label: 'Cleanliness', value: sum('cleanliness') },
      { label: 'Accuracy', value: sum('accuracy') },
      { label: 'Check-in', value: sum('checkIn') },
      { label: 'Communication', value: sum('communication') },
      { label: 'Location', value: sum('location') },
      { label: 'Value', value: sum('value') },
    ].filter((c): c is { label: string; value: number } => c.value !== null);
  })();

  if (showAllPhotos) {
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 px-6 py-4 flex items-center justify-between border-b">
          <button
            onClick={() => setShowAllPhotos(false)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <Heart
                className={cn('w-5 h-5', isLiked && 'fill-primary text-primary')}
              />
              Save
            </button>
            <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
              <Share className="w-5 h-5" />
              Share
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {galleryImages.map((image, index) => (
              <div
                key={index}
                className="aspect-[4/3] rounded-lg overflow-hidden"
              >
                <img
                  src={image}
                  alt={`${accommodation.title} - ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const ratingAverage = accommodation.rating.average;
  const ratingCount = accommodation.rating.count;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {accommodation.title}
          </h1>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="font-semibold">
                  {ratingAverage !== null ? ratingAverage.toFixed(2) : 'New'}
                </span>
                <span className="text-gray-500 underline">
                  {ratingCount} reviews
                </span>
              </div>
              <span className="text-gray-300">·</span>
              <span className="text-gray-700 underline">
                {accommodation.location.city}, {accommodation.location.country}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
              >
                <Heart
                  className={cn(
                    'w-5 h-5',
                    isLiked && 'fill-primary text-primary'
                  )}
                />
                Save
              </button>
              <button className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
                <Share className="w-5 h-5" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="relative mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-xl overflow-hidden h-[400px]">
            <div className="md:col-span-2 md:row-span-2 relative">
              <img
                src={mainImage}
                alt={accommodation.title}
                className="w-full h-full object-cover"
              />
            </div>
            {sideImages.map((image, index) => (
              <div key={index} className="relative hidden md:block">
                <img
                  src={image}
                  alt={`${accommodation.title} - ${index + 2}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowAllPhotos(true)}
            className="absolute bottom-4 right-4 px-4 py-2 bg-white rounded-lg font-semibold text-gray-900 shadow-md hover:shadow-lg transition-shadow flex items-center gap-2"
          >
            <GridIcon className="w-4 h-4" />
            Show all photos
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Host Info */}
            <div className="flex items-start justify-between pb-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {getAccommodationTypeLabel(accommodation.type)} hosted by{' '}
                  {accommodation.host.firstName}
                </h2>
                <p className="text-gray-600 mt-1">
                  {accommodation.maxGuests} guests · {accommodation.bedrooms}{' '}
                  {accommodation.bedrooms === 1 ? 'bedroom' : 'bedrooms'} ·{' '}
                  {accommodation.beds}{' '}
                  {accommodation.beds === 1 ? 'bed' : 'beds'} ·{' '}
                  {accommodation.bathrooms}{' '}
                  {accommodation.bathrooms === 1 ? 'bath' : 'baths'}
                </p>
              </div>
              {accommodation.host.profilePicture ? (
                <img
                  src={accommodation.host.profilePicture}
                  alt={accommodation.host.firstName}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-700">
                  {accommodation.host.firstName.charAt(0)}
                  {accommodation.host.lastName.charAt(0)}
                </div>
              )}
            </div>

            {/* Highlights */}
            <div className="py-6 border-b space-y-4">
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-gray-700 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Great location
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {accommodation.location.city},{' '}
                    {accommodation.location.country}.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-gray-700 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {accommodation.cancellationPolicy.name} cancellation policy
                  </h3>
                  {accommodation.cancellationPolicy.description && (
                    <p className="text-gray-600 text-sm">
                      {accommodation.cancellationPolicy.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="py-6 border-b">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {accommodation.description}
              </p>
            </div>

            {/* Amenities */}
            <div className="py-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                What this place offers
              </h2>
              {accommodation.amenities.length === 0 ? (
                <p className="text-gray-600">
                  No amenities listed for this stay yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {displayedAmenities.map((amenity) => (
                    <div
                      key={amenity.id}
                      className="flex items-center gap-3"
                    >
                      <Check className="w-5 h-5 text-gray-700" />
                      <span className="text-gray-700">{amenity.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {accommodation.amenities.length > 10 && (
                <button
                  onClick={() => setShowAllAmenities(!showAllAmenities)}
                  className="mt-6 px-6 py-3 border border-gray-900 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  Show {showAllAmenities ? 'less' : `all ${accommodation.amenities.length} amenities`}
                </button>
              )}
            </div>

            {/* Safety & security */}
            <div className="py-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Safety &amp; security
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  {accommodation.hasSmokeDetector ? (
                    <>
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700">Smoke detector</span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-500">No smoke detector</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {accommodation.hasAlarmSystem ? (
                    <>
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-gray-700">Alarm system</span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-500">No alarm system</span>
                    </>
                  )}
                </div>
                {accommodation.isValidated && (
                  <div className="flex items-start gap-3 md:col-span-2">
                    <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-gray-900 font-medium">
                        Verified by StayScape
                      </span>
                      <p className="text-gray-600 text-sm">
                        This listing has been reviewed and approved by our team
                        for safety and accuracy.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* House rules */}
            {accommodation.houseRules && accommodation.houseRules.trim() !== '' && (
              <div className="py-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  House rules
                </h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {accommodation.houseRules}
                </p>
              </div>
            )}

            {/* Cancellation policy */}
            <div className="py-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Cancellation policy
              </h2>
              {(() => {
                const policy = accommodation.cancellationPolicy;
                const fullDays = policy.fullRefundDaysBefore;
                const partialDays = policy.partialRefundDaysBefore;
                const partialPct = policy.partialRefundPercentage;

                const isNoRefund = policy.name === 'no_refund';
                const isAllOrNothing =
                  !isNoRefund &&
                  (fullDays === partialDays || partialPct === 100);

                return (
                  <div className="border border-gray-200 rounded-xl p-6">
                    <div className="mb-4">
                      <p className="text-sm font-bold tracking-wider text-gray-900 uppercase">
                        {policy.name.replace(/_/g, ' ')}
                      </p>
                      {policy.description && (
                        <p className="text-gray-600 text-sm mt-2">
                          {policy.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      {isNoRefund ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                          <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-gray-800 text-sm">
                              No refund regardless of cancellation date
                            </span>
                            <span className="font-semibold text-red-700 text-sm">
                              0% refund
                            </span>
                          </div>
                        </div>
                      ) : isAllOrNothing ? (
                        <>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-gray-800 text-sm">
                                Cancel ≥ {fullDays} days before check-in
                              </span>
                              <span className="font-semibold text-green-700 text-sm">
                                100% refund
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                            <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-gray-800 text-sm">
                                Less than {partialDays} days before check-in
                              </span>
                              <span className="font-semibold text-red-700 text-sm">
                                0% refund
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-gray-800 text-sm">
                                Cancel ≥ {fullDays} days before check-in
                              </span>
                              <span className="font-semibold text-green-700 text-sm">
                                100% refund
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                            <Shield className="w-5 h-5 text-yellow-700 flex-shrink-0" />
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-gray-800 text-sm">
                                Cancel ≥ {partialDays} days before check-in
                              </span>
                              <span className="font-semibold text-yellow-700 text-sm">
                                {partialPct}% refund
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                            <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-gray-800 text-sm">
                                Less than {partialDays} days before check-in
                              </span>
                              <span className="font-semibold text-red-700 text-sm">
                                0% refund
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      Refund eligibility depends on cancellation date relative
                      to check-in.
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Reviews */}
            <div className="py-6 border-b">
              <div className="flex items-center gap-2 mb-6">
                <Star className="w-6 h-6 fill-primary text-primary" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {ratingAverage !== null ? ratingAverage.toFixed(2) : 'New'} ·{' '}
                  {ratingCount} reviews
                </h2>
              </div>

              {/* Rating Categories — derived from real reviews */}
              {categoryAverages && categoryAverages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {categoryAverages.map((category) => (
                    <div
                      key={category.label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-gray-700">{category.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-900"
                            style={{
                              width: `${(category.value / 5) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-700">
                          {category.value.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Review Cards */}
              {accommodation.reviews.length === 0 ? (
                <p className="text-gray-600">
                  No reviews yet — be the first to leave one after your stay.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {displayedReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}

              {accommodation.reviews.length > 6 && (
                <button
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="mt-6 px-6 py-3 border border-gray-900 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  Show {showAllReviews ? 'less' : 'all reviews'}
                </button>
              )}
            </div>

            {/* Location */}
            <div className="py-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Where you&apos;ll be
              </h2>
              <div className="aspect-video bg-gray-200 rounded-xl overflow-hidden mb-4">
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <MapPin className="w-8 h-8 mr-2" />
                  Map View
                </div>
              </div>
              <p className="font-semibold text-gray-900">
                {accommodation.location.city}, {accommodation.location.country}
              </p>
              <p className="text-gray-600 mt-2">
                {accommodation.location.address}
              </p>
            </div>
          </div>

          {/* Right Column - Booking Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-28">
              <BookingForm
                accommodation={accommodation}
                onSubmit={handleBookingSubmit}
              />

              {/* Report Listing */}
              <button className="mt-4 flex items-center gap-2 text-gray-500 hover:text-gray-700 mx-auto">
                <Flag className="w-4 h-4" />
                <span className="underline">Report this listing</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper icon component
const GridIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

