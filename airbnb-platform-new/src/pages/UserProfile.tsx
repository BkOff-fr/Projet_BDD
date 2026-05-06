import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Star,
  Calendar,
  Edit,
  Check,
  Home,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { LoadingState, ErrorState, UserReviewsTab } from '@/components';
import { usersAPI, bookingsAPI, hostAPI } from '@/services/api';
import { cn } from '@/utils/cn';
import {
  formatDate,
  PLACEHOLDER_IMAGE,
  formatCurrency,
} from '@/utils/helpers';
import type {
  User,
  UserProfile as UserProfileType,
  Booking,
  HostProperty,
} from '@/types';

interface UserProfileProps {
  user: User;
}

export const UserProfile = ({ user }: UserProfileProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'about' | 'reviews' | 'listings'
  >('about');

  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<HostProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const tasks: Promise<unknown>[] = [
      usersAPI.getProfile().then((p) => {
        if (!cancelled) setProfile(p);
      }),
      bookingsAPI.getMyBookings().then((b) => {
        if (!cancelled) setBookings(b);
      }),
    ];
    if (user.isHost) {
      tasks.push(
        hostAPI.getProperties().then((l) => {
          if (!cancelled) setListings(l);
        })
      );
    } else {
      setListings([]);
    }

    Promise.all(tasks)
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user.isHost, reloadKey]);

  if (loading) {
    return <LoadingState label="Loading profile..." />;
  }

  if (error || !profile) {
    return (
      <ErrorState
        message={error ?? 'Could not load your profile.'}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  const tabs: Array<{
    id: 'about' | 'reviews' | 'listings';
    label: string;
    icon: typeof Star | null;
  }> = [
    { id: 'about', label: 'About', icon: null },
    { id: 'reviews', label: 'Reviews', icon: Star },
    ...((user.isHost
      ? [{ id: 'listings' as const, label: 'Listings', icon: Home }]
      : []) as Array<{
      id: 'about' | 'reviews' | 'listings';
      label: string;
      icon: typeof Star | null;
    }>),
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              {/* Profile Card */}
              <div className="border border-gray-200 rounded-xl p-6">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-32 h-32 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center text-3xl font-semibold text-gray-700">
                        {user.firstName.charAt(0)}
                        {user.lastName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mt-4">
                    {user.firstName}
                  </h1>
                  <p className="text-gray-500">
                    {user.isHost ? 'Host' : 'Guest'}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t space-y-3">
                  {user.isHost && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Properties</span>
                      <span className="font-semibold">
                        {profile.stats.propertyCount}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Trips</span>
                    <span className="font-semibold">
                      {profile.stats.tripCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Member since</span>
                    <span className="font-semibold">
                      {formatDate(profile.joinedAt, 'yyyy')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/settings')}
                  className="w-full mt-6 px-4 py-2 border border-gray-900 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>

              {/* Verified Info */}
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {user.firstName}&apos;s confirmed information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Email address</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">Phone number</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Links */}
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Quick Links
                </h3>
                <div className="space-y-2">
                  <Link
                    to="/bookings"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">My Trips</span>
                  </Link>
                  <Link
                    to="/messages"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Messages</span>
                  </Link>
                  {user.isHost && (
                    <Link
                      to="/host/dashboard"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Home className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-700">Host Dashboard</span>
                    </Link>
                  )}
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700">Settings</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <div className="flex gap-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'pb-4 text-sm font-medium transition-colors relative',
                      activeTab === tab.id
                        ? 'text-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'about' && (
              <div className="space-y-8">
                {/* About Section — bio/work/languages/location are not stored
                    in the BDD yet (see types/index.ts header). We just show a
                    "add a bio" CTA tied to a future task. */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    About
                  </h2>
                  <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center">
                    <p className="text-gray-600 mb-3">
                      Tell other guests and hosts a little about yourself.
                    </p>
                    <button
                      onClick={() => navigate('/settings')}
                      className="px-4 py-2 border border-gray-900 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      Add a bio
                    </button>
                  </div>
                </div>

                {/* Recent Trips */}
                {bookings.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Recent Trips
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {bookings.slice(0, 4).map((booking) => (
                        <div
                          key={booking.id}
                          onClick={() =>
                            navigate(`/listing/${booking.accommodation.id}`)
                          }
                          className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <img
                            src={PLACEHOLDER_IMAGE}
                            alt={booking.accommodation.title}
                            className="w-full h-32 object-cover"
                          />
                          <div className="p-3">
                            <p className="font-semibold text-gray-900 truncate">
                              {booking.accommodation.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(booking.checkInDate, 'MMM d')} -{' '}
                              {formatDate(booking.checkOutDate, 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Reviews
                </h2>
                <UserReviewsTab hasPastTrips={bookings.some((b) => b.status === 'completed')} />
              </div>
            )}

            {activeTab === 'listings' && user.isHost && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {user.firstName}&apos;s listings
                  </h2>
                  <button
                    onClick={() => navigate('/host/dashboard')}
                    className="text-primary font-semibold hover:underline"
                  >
                    Manage all
                  </button>
                </div>
                {listings.length === 0 ? (
                  <p className="text-gray-600">
                    You haven&apos;t created any listings yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {listings.map((listing) => {
                      const avg = listing.avg_rating
                        ? Number(listing.avg_rating)
                        : null;
                      return (
                        <div
                          key={listing.id}
                          onClick={() => navigate(`/listing/${listing.id}`)}
                          className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <img
                            src={PLACEHOLDER_IMAGE}
                            alt={listing.title}
                            className="w-full h-48 object-cover"
                          />
                          <div className="p-4">
                            <div className="flex items-center gap-1 mb-1">
                              <Star className="w-4 h-4 fill-primary text-primary" />
                              <span className="font-semibold">
                                {avg !== null ? avg.toFixed(2) : 'New'}
                              </span>
                              <span className="text-gray-500">
                                ({listing.review_count} reviews)
                              </span>
                            </div>
                            <p className="font-semibold text-gray-900 truncate">
                              {listing.title}
                            </p>
                            <p className="text-gray-600">
                              {listing.city}, {listing.country}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatCurrency(Number(listing.price_per_night))}{' '}
                              / night
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
