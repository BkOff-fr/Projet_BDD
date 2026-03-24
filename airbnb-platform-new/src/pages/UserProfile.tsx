import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Star,
  Shield,
  Award,
  MapPin,
  Briefcase,
  Globe,
  Calendar,
  Edit,
  Check,
  Home,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { accommodations, bookings } from '@/data/mockData';
import { cn } from '@/utils/cn';
import { formatDate, getInitials } from '@/utils/helpers';
import type { User } from '@/types';

interface UserProfileProps {
  user: User;
}

export const UserProfile = ({ user }: UserProfileProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'listings'>('about');
  const [isEditing, setIsEditing] = useState(false);

  // Get user's bookings
  const userBookings = bookings.filter((b) => b.guestId === user.id);

  // Get user's listings if they're a host
  const userListings = user.isHost
    ? accommodations.filter((a) => a.hostId === user.id)
    : [];

  const tabs = [
    { id: 'about', label: 'About', icon: null },
    { id: 'reviews', label: 'Reviews', icon: Star },
    ...(user.isHost ? [{ id: 'listings', label: 'Listings', icon: Home }] : []),
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
                    <img
                      src={user.avatar}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-32 h-32 rounded-full object-cover"
                    />
                    {user.isHost && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        Superhost
                      </div>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mt-4">
                    {user.firstName}
                  </h1>
                  <p className="text-gray-500">{user.isHost ? 'Host' : 'Guest'}</p>
                </div>

                <div className="mt-6 pt-6 border-t space-y-3">
                  {user.isHost && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Reviews</span>
                      <span className="font-semibold">{userListings.reduce((acc, l) => acc + l.reviewCount, 0)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Trips</span>
                    <span className="font-semibold">{userBookings.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Member since</span>
                    <span className="font-semibold">
                      {formatDate(user.createdAt, 'yyyy')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditing(!isEditing)}
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
                    <span className="text-gray-700">Identity verified</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Email address</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">Phone number</span>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
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
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
                {/* About Section */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    About
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    {user.about || 'No bio yet.'}
                  </p>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {user.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-700">Lives in {user.location}</span>
                    </div>
                  )}
                  {user.work && (
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-700">Work: {user.work}</span>
                    </div>
                  )}
                  {user.languages && user.languages.length > 0 && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-700">
                        Speaks: {user.languages.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Recent Trips */}
                {userBookings.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Recent Trips
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {userBookings.slice(0, 4).map((booking) => (
                        <div
                          key={booking.id}
                          onClick={() => navigate(`/listing/${booking.accommodationId}`)}
                          className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <img
                            src={booking.accommodation.images[0]}
                            alt={booking.accommodation.title}
                            className="w-full h-32 object-cover"
                          />
                          <div className="p-3">
                            <p className="font-semibold text-gray-900 truncate">
                              {booking.accommodation.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(booking.checkIn, 'MMM d')} -{' '}
                              {formatDate(booking.checkOut, 'MMM d, yyyy')}
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
                <p className="text-gray-600">Reviews from hosts and guests will appear here.</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userListings.map((listing) => (
                    <div
                      key={listing.id}
                      onClick={() => navigate(`/listing/${listing.id}`)}
                      className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <div className="flex items-center gap-1 mb-1">
                          <Star className="w-4 h-4 fill-primary text-primary" />
                          <span className="font-semibold">
                            {listing.rating.toFixed(2)}
                          </span>
                          <span className="text-gray-500">
                            ({listing.reviewCount} reviews)
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900 truncate">
                          {listing.title}
                        </p>
                        <p className="text-gray-600">
                          {listing.location.city}, {listing.location.country}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
