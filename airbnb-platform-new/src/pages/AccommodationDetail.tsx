import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star,
  Share,
  Heart,
  MapPin,
  Home,
  Bed,
  Bath,
  Users,
  Check,
  ChevronLeft,
  ChevronRight,
  Shield,
  Award,
  Flag,
} from 'lucide-react';
import { BookingForm, ReviewCard } from '@/components';
import { accommodations, amenities } from '@/data/mockData';
import { cn } from '@/utils/cn';
import { formatCurrency, getPropertyTypeLabel, getAccommodationTypeLabel } from '@/utils/helpers';

export const AccommodationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const accommodation = accommodations.find((acc) => acc.id === id);

  if (!accommodation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Accommodation not found
          </h1>
          <button
            onClick={() => navigate('/listings')}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Browse Listings
          </button>
        </div>
      </div>
    );
  }

  const mainImage = accommodation.images[0];
  const sideImages = accommodation.images.slice(1, 5);

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
            {accommodation.images.map((image, index) => (
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
                  {accommodation.rating.toFixed(2)}
                </span>
                <span className="text-gray-500 underline">
                  {accommodation.reviewCount} reviews
                </span>
              </div>
              <span className="text-gray-300">·</span>
              <span className="text-gray-700 underline">
                {accommodation.isSuperhost && 'Superhost'}
              </span>
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
                  {accommodation.beds} {accommodation.beds === 1 ? 'bed' : 'beds'} ·{' '}
                  {accommodation.bathrooms}{' '}
                  {accommodation.bathrooms === 1 ? 'bath' : 'baths'}
                </p>
              </div>
              <img
                src={accommodation.host.avatar}
                alt={accommodation.host.firstName}
                className="w-14 h-14 rounded-full object-cover"
              />
            </div>

            {/* Highlights */}
            <div className="py-6 border-b space-y-4">
              {accommodation.isSuperhost && (
                <div className="flex items-start gap-4">
                  <Award className="w-6 h-6 text-gray-700 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {accommodation.host.firstName} is a Superhost
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Superhosts are experienced, highly rated hosts who are committed
                      to providing great stays for guests.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-gray-700 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">Great location</h3>
                  <p className="text-gray-600 text-sm">
                    95% of recent guests gave the location a 5-star rating.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-gray-700 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Free cancellation for 48 hours
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Get a full refund if you change your mind.
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="py-6 border-b">
              <p className="text-gray-700 leading-relaxed">
                {accommodation.description}
              </p>
              <button className="mt-4 flex items-center gap-2 font-semibold text-gray-900 underline">
                Show more
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Amenities */}
            <div className="py-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                What this place offers
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {displayedAmenities.map((amenityId) => {
                  const amenity = amenities.find((a) => a.id === amenityId);
                  if (!amenity) return null;
                  return (
                    <div key={amenityId} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-gray-700" />
                      <span className="text-gray-700">{amenity.name}</span>
                    </div>
                  );
                })}
              </div>
              {accommodation.amenities.length > 10 && (
                <button
                  onClick={() => setShowAllAmenities(!showAllAmenities)}
                  className="mt-6 px-6 py-3 border border-gray-900 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  Show {showAllAmenities ? 'less' : 'all 20+ amenities'}
                </button>
              )}
            </div>

            {/* Reviews */}
            <div className="py-6 border-b">
              <div className="flex items-center gap-2 mb-6">
                <Star className="w-6 h-6 fill-primary text-primary" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {accommodation.rating.toFixed(2)} · {accommodation.reviewCount} reviews
                </h2>
              </div>

              {/* Rating Categories */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Cleanliness', value: 4.9 },
                  { label: 'Accuracy', value: 4.8 },
                  { label: 'Check-in', value: 4.9 },
                  { label: 'Communication', value: 5.0 },
                  { label: 'Location', value: 4.7 },
                  { label: 'Value', value: 4.8 },
                ].map((category) => (
                  <div key={category.label} className="flex items-center justify-between">
                    <span className="text-gray-700">{category.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-900"
                          style={{ width: `${(category.value / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700">
                        {category.value.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Review Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayedReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>

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
                Located in a vibrant neighborhood with easy access to local
                attractions, restaurants, and public transportation.
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
