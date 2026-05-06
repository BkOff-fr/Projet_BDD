import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Calendar,
  DollarSign,
  Star,
  Plus,
  Edit,
  Eye,
  MessageSquare,
  ChevronRight,
  BarChart3,
  Users,
} from 'lucide-react';
import {
  HostPropertyForm,
  LoadingState,
  ErrorState,
} from '@/components';
import { hostAPI } from '@/services/api';
import { cn } from '@/utils/cn';
import {
  formatCurrency,
  formatDate,
  PLACEHOLDER_IMAGE,
} from '@/utils/helpers';
import type {
  User,
  HostDashboardData,
  HostProperty,
  Accommodation,
} from '@/types';

interface HostDashboardProps {
  user: User;
}

// Visual status pulled from `HostProperty.listing_status` (computed server-side
// in `getHostProperties`). Tells the host why a listing is or isn't bookable
// — meets § 4d (security) + § 4e (validation gate).
const LISTING_STATUS_BADGES: Record<
  HostProperty['listing_status'],
  { label: string; className: string; tooltip: string }
> = {
  live: {
    label: 'Live',
    className: 'bg-green-100 text-green-700',
    tooltip: 'Bookable by guests.',
  },
  pending_validation: {
    label: 'Pending validation',
    className: 'bg-yellow-100 text-yellow-700',
    tooltip: 'Waiting for platform staff to validate this listing.',
  },
  missing_alarm: {
    label: 'Alarm required',
    className: 'bg-red-100 text-red-700',
    tooltip: 'Install an alarm system before this listing can be validated.',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-gray-100 text-gray-600',
    tooltip: 'You have deactivated this listing.',
  },
};

export const HostDashboard = ({ user }: HostDashboardProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'listings' | 'bookings' | 'earnings'
  >('overview');
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<
    Accommodation | undefined
  >();

  const [dashboard, setDashboard] = useState<HostDashboardData | null>(null);
  const [properties, setProperties] = useState<HostProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([hostAPI.getDashboard(), hostAPI.getProperties()])
      .then(([dash, props]) => {
        if (cancelled) return;
        setDashboard(dash);
        setProperties(props);
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
  }, [reloadKey]);

  if (loading) {
    return <LoadingState label="Loading host dashboard..." />;
  }

  if (error || !dashboard) {
    return (
      <ErrorState
        message={error ?? 'Could not load your dashboard.'}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'listings' as const, label: 'Listings', icon: Home },
    { id: 'bookings' as const, label: 'Bookings', icon: Calendar },
    { id: 'earnings' as const, label: 'Earnings', icon: DollarSign },
  ];

  const handleCreateListing = (_propertyData: unknown) => {
    // TODO: wire to accommodationsAPI.create when the form's payload shape
    // matches `CreateAccommodationInput`. See P0 task list.
    setShowPropertyForm(false);
    setEditingProperty(undefined);
  };

  const handleEditListing = (property: HostProperty) => {
    // The form expects a frontend-shaped Accommodation; cast for now until
    // the form is reworked against HostProperty.
    setEditingProperty(property as unknown as Accommodation);
    setShowPropertyForm(true);
  };

  const totalEarnings = Number(dashboard.earnings.total);
  const completedEarnings = Number(dashboard.earnings.completed_earnings);
  const avgRating = dashboard.rating.avg_rating
    ? Number(dashboard.rating.avg_rating)
    : 0;
  const totalReviews = dashboard.rating.total_reviews;

  // Compute tallest bar for relative scaling. Coerce earnings to number.
  const monthly = dashboard.monthlyStats.map((m) => ({
    month: m.month,
    bookings: Number(m.bookings),
    earnings: Number(m.earnings),
  }));
  const maxEarnings = monthly.reduce(
    (max, m) => (m.earnings > max ? m.earnings : max),
    0
  );

  const recent = dashboard.recentBookings;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Host Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {user.firstName}! Here&apos;s what&apos;s happening
              with your listings.
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
            <p className="text-2xl font-bold text-gray-900">
              {dashboard.properties.total}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-gray-600 text-sm">Average Rating</p>
            <p className="text-2xl font-bold text-gray-900">
              {avgRating > 0 ? avgRating.toFixed(2) : '—'}
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
                  onClick={() => setActiveTab(tab.id)}
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
                  {recent.length === 0 ? (
                    <p className="text-gray-600">No bookings yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {recent.slice(0, 3).map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                        >
                          <img
                            src={PLACEHOLDER_IMAGE}
                            alt={booking.accommodation_title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {booking.accommodation_title}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(booking.check_in_date, 'MMM d')} -{' '}
                              {formatDate(
                                booking.check_out_date,
                                'MMM d, yyyy'
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(
                                Number(booking.total_price ?? 0)
                              )}
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
                  )}
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
                      <p className="font-semibold text-gray-900">
                        Add New Listing
                      </p>
                      <p className="text-sm text-gray-600">
                        Create a new property listing
                      </p>
                    </button>
                    <button
                      onClick={() => setActiveTab('listings')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <Edit className="w-6 h-6 text-primary mb-2" />
                      <p className="font-semibold text-gray-900">
                        Manage Listings
                      </p>
                      <p className="text-sm text-gray-600">
                        Edit your existing properties
                      </p>
                    </button>
                    <button
                      onClick={() => navigate('/messages')}
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <MessageSquare className="w-6 h-6 text-primary mb-2" />
                      <p className="font-semibold text-gray-900">Messages</p>
                      <p className="text-sm text-gray-600">
                        View guest messages
                      </p>
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
                {properties.length === 0 ? (
                  <p className="text-gray-600">
                    You haven&apos;t created any listings yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {properties.map((listing) => {
                      const avg = listing.avg_rating
                        ? Number(listing.avg_rating)
                        : null;
                      const statusBadge = LISTING_STATUS_BADGES[
                        listing.listing_status
                      ] ?? LISTING_STATUS_BADGES.live;
                      return (
                        <div
                          key={listing.id}
                          className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <img
                            src={PLACEHOLDER_IMAGE}
                            alt={listing.title}
                            className="w-24 h-24 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Star className="w-4 h-4 fill-primary text-primary" />
                              <span className="font-semibold">
                                {avg !== null ? avg.toFixed(2) : 'New'}
                              </span>
                              <span className="text-gray-500">
                                ({listing.review_count} reviews)
                              </span>
                              <span
                                className={cn(
                                  'ml-2 text-xs px-2 py-0.5 rounded-full font-medium',
                                  statusBadge.className
                                )}
                                title={statusBadge.tooltip}
                              >
                                {statusBadge.label}
                              </span>
                            </div>
                            <p className="font-semibold text-gray-900">
                              {listing.title}
                            </p>
                            <p className="text-sm text-gray-600">
                              {listing.city}, {listing.country}
                            </p>
                            <p className="text-primary font-semibold mt-1">
                              {formatCurrency(
                                Number(listing.price_per_night)
                              )}{' '}
                              / night
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                navigate(`/listing/${listing.id}`)
                              }
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
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bookings' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Recent Bookings
                  </h3>
                </div>
                {/* TODO: drill into per-property bookings via
                    `hostAPI.getPropertyBookings(propertyId)`. For now we show
                    the dashboard's recent bookings list. */}
                {recent.length === 0 ? (
                  <p className="text-gray-600">No bookings yet.</p>
                ) : (
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
                        {recent.map((booking) => (
                          <tr
                            key={booking.id}
                            className="border-b border-gray-100"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={PLACEHOLDER_IMAGE}
                                  alt={booking.accommodation_title}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                                <span className="font-medium text-gray-900 truncate max-w-[150px]">
                                  {booking.accommodation_title}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-gray-700">
                                {booking.guest_first_name}{' '}
                                {booking.guest_last_name}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-gray-700">
                              {formatDate(booking.check_in_date, 'MMM d')} -{' '}
                              {formatDate(booking.check_out_date, 'MMM d')}
                            </td>
                            <td className="py-4 px-4 font-medium text-gray-900">
                              {formatCurrency(
                                Number(booking.total_price ?? 0)
                              )}
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
                )}
              </div>
            )}

            {activeTab === 'earnings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-green-700 text-sm">Completed earnings</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(completedEarnings)}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-blue-700 text-sm">Total earnings</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(totalEarnings)}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-purple-700 text-sm">Total bookings</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {dashboard.bookings.total}
                    </p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Earnings Overview
                  </h4>
                  {monthly.length === 0 ? (
                    <p className="text-gray-600 text-sm">
                      No monthly stats yet.
                    </p>
                  ) : (
                    <div className="flex items-end gap-2 h-64 px-2">
                      {monthly.map((m) => {
                        const heightPct =
                          maxEarnings > 0
                            ? Math.max(2, (m.earnings / maxEarnings) * 100)
                            : 2;
                        return (
                          <div
                            key={m.month}
                            className="flex-1 flex flex-col items-center justify-end gap-2"
                          >
                            <div
                              className="w-full bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-md relative group"
                              style={{ height: `${heightPct}%` }}
                            >
                              <div className="absolute inset-x-0 -top-7 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs text-gray-700 bg-white shadow rounded px-1 py-0.5">
                                  {formatCurrency(m.earnings)}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-500">
                              {m.month}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
              // The form drafts a `CreateAccommodationInput` payload while
              // `editingProperty` is a frontend `Accommodation` (with
              // `cleaningFee: number | null`). Cast through unknown until
              // the form's edit-mode is reworked against the API shape.
              property={editingProperty as unknown as undefined}
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
