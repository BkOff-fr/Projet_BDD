import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  formatCurrency,
  getAccommodationTypeLabel,
  getAccommodationImage,
} from '@/utils/helpers';
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
  const [isLiked, setIsLiked] = useState(false);

  const isCompact = variant === 'compact';
  const isHorizontal = variant === 'horizontal';

  const image = getAccommodationImage(accommodation);
  const ratingAverage = accommodation.rating.average;

  return (
    <Link
      to={`/listing/${accommodation.id}`}
      className={cn(
        'group block',
        isHorizontal && 'flex gap-4',
        className
      )}
    >
      {/* Image Container */}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl bg-gray-200',
          isHorizontal ? 'w-72 h-48 flex-shrink-0' : 'aspect-square'
        )}
      >
        <img
          src={image}
          alt={accommodation.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
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
              {ratingAverage !== null ? ratingAverage.toFixed(2) : 'New'}
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
      </div>
    </Link>
  );
};
