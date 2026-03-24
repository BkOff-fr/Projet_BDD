import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Calendar,
  DollarSign,
  Star,
  TrendingUp,
  Plus,
  Edit,
  Eye,
  MessageSquare,
  ChevronRight,
  BarChart3,
  Users,
  Clock,
} from 'lucide-react';
import { HostPropertyForm } from '@/components';
import { accommodations, bookings } from '@/data/mockData';
import { cn } from '@/utils/cn';
import { formatCurrency, formatDate } from '@/utils/helpers';
import type { User, Accommodation } from '@/types';

interface HostDashboardProps {
  user: User;
}

export const HostDashboard = ({ user }: HostDashboardProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'bookings' | 'earnings'>('overview');
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Accommodation | undefined>();

  // Get host's listings
  const hostListings = accommodations.filter((a) => a.hostId === user.id);

  // Get bookings for host's listings
  const hostBookings = bookings.filter((b) =>
    hostListings.some((l) => l.id === b.accommodationId)
  );

  // Calculate stats
  const totalEarnings = hostBookings
    .filter((b) => b.status === 'completed' || b.status === 'confirmed')
    .reduce((acc, b) => acc + b.totalPrice, 0);

  const totalReviews = hostListings.reduce((acc, l) => acc + l.reviewCount, 0);
  const averageRating =
    hostListings.reduce((acc, l) => acc + l.rating, 0) / hostListings.length || 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'listings', label: 'Listings', icon: Home },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
  ];

  const handleCreateListing = (propertyData: Partial<Accommodation>) => {
    console.log('Creating listing:', propertyData);
    setShowPropertyForm(false);
    // In a real app, this would create the listing
  };

  const handleEditListing = (property: Accommodation) => {
    setEditingProperty(property);
    setShowPropertyForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Host Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {user.firstName}! Here&apos;s what&apos;s happening with your listings.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingProperty(undefined);
              setShowPropertyForm(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Listing
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +12%
              </span>
            </div>
            <p className="text-gray-600 text-sm">Total Earnings</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalEarnings)}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm">Active Listings</p>
            <p className="text-2xl font-bold text-gray-900">{hostListings.length}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm">Average Rating</p>
            <p className="text-2xl font-bold text-gray-900">
              {averageRating.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm">Total Reviews</p>
            <p className="text-2xl font-bold text-gray-900">{totalReviews}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-card mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative',
                    activeTab === tab.id
                      ? 'text-primary'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Recent Bookings */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Recent Bookings
                    </h3>
                    <button
                      onClick={() => setActiveTab('bookings')}
                      className="text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      View all
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {hostBookings.slice(0, 3).map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <img
                          src={booking.accommodation.images[0]}
                          alt={booking.accommodation.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {booking.accommodation.title}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(booking.checkIn, 'MMM d')} -{' '}
                            {formatDate(booking.checkOut, 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(booking.totalPrice)}
                          </p>
                          <span
                            className={cn(
                              'text-xs px-2 py-1 rounded-full',
                              booking.status === 'confirmed'
                                ? 'bg-green-100 text-green-700'
                                : booking.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            )}
                          >
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      onClick={() => setShowPropertyForm(true)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <Plus className="w-6 h-6 text-primary mb-2" />
                      <p className="font-semibold text-gray-900">Add New Listing</p>
                      <p className="text-sm text-gray-600">Create a new property listing</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('listings')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <Edit className="w-6 h-6 text-primary mb-2" />
                      <p className="font-semibold text-gray-900">Manage Listings</p>
                      <p className="text-sm text-gray-600">Edit your existing properties</p>
                    </button>
                    <button
                      onClick={() => navigate('/messages')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <MessageSquare className="w-6 h-6 text-primary mb-2" />
                      <p className="font-semibold text-gray-900">Messages</p>
                      <p className="text-sm text-gray-600">View guest messages</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'listings' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Your Listings
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {hostListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="w-4 h-4 fill-primary text-primary" />
                          <span className="font-semibold">
                            {listing.rating.toFixed(2)}
                          </span>
                          <span className="text-gray-500">
                            ({listing.reviewCount} reviews)
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900">{listing.title}</p>
                        <p className="text-sm text-gray-600">
                          {listing.location.city}, {listing.location.country}
                        </p>
                        <p className="text-primary font-semibold mt-1">
                          {formatCurrency(listing.pricePerNight)} / night
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/listing/${listing.id}`)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="View"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEditListing(listing)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'bookings' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    All Bookings
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Property
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Guest
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Dates
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Amount
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {hostBookings.map((booking) => (
                        <tr key={booking.id} className="border-b border-gray-100">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={booking.accommodation.images[0]}
                                alt={booking.accommodation.title}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                              <span className="font-medium text-gray-900 truncate max-w-[150px]">
                                {booking.accommodation.title}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <img
                                src={booking.guest.avatar}
                                alt={booking.guest.firstName}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <span className="text-gray-700">
                                {booking.guest.firstName}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-700">
                            {formatDate(booking.checkIn, 'MMM d')} -{' '}
                            {formatDate(booking.checkOut, 'MMM d')}
                          </td>
                          <td className="py-4 px-4 font-medium text-gray-900">
                            {formatCurrency(booking.totalPrice)}
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={cn(
                                'text-xs px-3 py-1 rounded-full font-medium',
                                booking.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : booking.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : booking.status === 'completed'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              )}
                            >
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'earnings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-green-700 text-sm">This Month</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(totalEarnings * 0.3)}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-blue-700 text-sm">This Year</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(totalEarnings)}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-purple-700 text-sm">All Time</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(totalEarnings * 1.5)}
                    </p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Earnings Overview
                  </h4>
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">Chart visualization would go here</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property Form Modal */}
      {showPropertyForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <HostPropertyForm
              property={editingProperty}
              onSubmit={handleCreateListing}
              onCancel={() => {
                setShowPropertyForm(false);
                setEditingProperty(undefined);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
