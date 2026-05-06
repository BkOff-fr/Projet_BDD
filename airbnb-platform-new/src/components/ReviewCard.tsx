import { Star } from 'lucide-react';
import { formatDate } from '@/utils/helpers';
import type { Review } from '@/types';

interface ReviewCardProps {
  review: Review;
}

export const ReviewCard = ({ review }: ReviewCardProps) => {
  const initials = `${review.user.firstName.charAt(0)}${review.user.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-4">
      {/* User Info */}
      <div className="flex items-center gap-3">
        {review.user.profilePicture ? (
          <img
            src={review.user.profilePicture}
            alt={`${review.user.firstName} ${review.user.lastName}`}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-700">
            {initials}
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-900">
            {review.user.firstName} {review.user.lastName}
          </p>
          <p className="text-sm text-gray-500">Guest</p>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < Math.floor(review.rating)
                ? 'fill-primary text-primary'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {formatDate(review.createdAt, 'MMMM yyyy')}
        </span>
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-gray-700 leading-relaxed">{review.comment}</p>
      )}

      {/* Category Ratings */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
        {review.categories.cleanliness !== null && (
          <span>Cleanliness: {review.categories.cleanliness.toFixed(1)}</span>
        )}
        {review.categories.accuracy !== null && (
          <span>Accuracy: {review.categories.accuracy.toFixed(1)}</span>
        )}
        {review.categories.communication !== null && (
          <span>Communication: {review.categories.communication.toFixed(1)}</span>
        )}
        {review.categories.location !== null && (
          <span>Location: {review.categories.location.toFixed(1)}</span>
        )}
      </div>
    </div>
  );
};
