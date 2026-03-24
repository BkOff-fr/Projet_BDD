import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatCurrency, getAccommodationTypeLabel } from '@/utils/helpers';
import type { Accommodation } from '@/types';

interface AccommodationCardProps {
  accommodation: Accommodation;
  variant?: 'default' | 'compact' | 'horizontal';
  className?: string;
}

export const AccommodationCard = ({
  accommodation,
  variant = 'default',
  className,
}: AccommodationCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isCompact = variant === 'compact';
  const isHorizontal = variant === 'horizontal';

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === accommodation.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? accommodation.images.length - 1 : prev - 1
    );
  };

  return (
    <Link
      to={`/listing/${accommodation.id}`}
      className={cn(
        'group block',
        isHorizontal && 'flex gap-4',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl bg-gray-200',
          isHorizontal ? 'w-72 h-48 flex-shrink-0' : 'aspect-square'
        )}
      >
        <img
          src={accommodation.images[currentImageIndex]}
          alt={accommodation.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {accommodation.isSuperhost && (
            <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-md text-xs font-semibold text-gray-800">
              Superhost
            </span>
          )}
          {accommodation.instantBook && (
            <span className="px-2 py-1 bg-primary/90 backdrop-blur-sm rounded-md text-xs font-semibold text-white">
              Instant Book
            </span>
          )}
        </div>

        {/* Like Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-black/10 transition-colors"
        >
          <Heart
            className={cn(
              'w-6 h-6 transition-colors',
              isLiked ? 'fill-primary text-primary' : 'text-white fill-black/20'
            )}
          />
        </button>

        {/* Image Navigation */}
        {accommodation.images.length > 1 && isHovered && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Image Dots */}
        {accommodation.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {accommodation.images.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  index === currentImageIndex
                    ? 'bg-white'
                    : 'bg-white/50'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn('pt-3', isHorizontal && 'pt-0 flex-1')}>
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500">
              {accommodation.location.city}, {accommodation.location.country}
            </p>
            <h3
              className={cn(
                'font-semibold text-gray-900 group-hover:text-primary transition-colors',
                isCompact ? 'text-sm' : 'text-base'
              )}
            >
              {accommodation.title}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="text-sm font-semibold">
              {accommodation.rating.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Details */}
        <p className="text-sm text-gray-500 mt-1">
          {getAccommodationTypeLabel(accommodation.type)} • {accommodation.bedrooms}{' '}
          {accommodation.bedrooms === 1 ? 'bedroom' : 'bedrooms'} •{' '}
          {accommodation.beds} {accommodation.beds === 1 ? 'bed' : 'beds'}
        </p>

        {/* Price */}
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-semibold text-gray-900">
            {formatCurrency(accommodation.pricePerNight)}
          </span>
          <span className="text-gray-500 text-sm">night</span>
        </div>

        {/* Total (shown on hover or for horizontal) */}
        {(isHovered || isHorizontal) && (
          <p className="text-sm text-gray-500 underline">
            {formatCurrency(accommodation.pricePerNight * 5)} total before taxes
          </p>
        )}
      </div>
    </Link>
  );
};
