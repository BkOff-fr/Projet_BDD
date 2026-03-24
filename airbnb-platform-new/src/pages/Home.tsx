import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, Shield, Clock, Award } from 'lucide-react';
import { SearchBar, AccommodationCard } from '@/components';
import { accommodations, categories } from '@/data/mockData';
import { cn } from '@/utils/cn';

export const Home = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200;
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleSearch = (searchData: {
    location: string;
    checkIn: Date | null;
    checkOut: Date | null;
    guests: { adults: number; children: number; infants: number; pets: number };
  }) => {
    const params = new URLSearchParams();
    if (searchData.location) params.set('location', searchData.location);
    if (searchData.checkIn) params.set('checkIn', searchData.checkIn.toISOString());
    if (searchData.checkOut) params.set('checkOut', searchData.checkOut.toISOString());
    params.set('guests', (searchData.guests.adults + searchData.guests.children).toString());
    
    navigate(`/listings?${params.toString()}`);
  };

  const featuredAccommodations = accommodations.slice(0, 8);
  const topRated = accommodations
    .filter((acc) => acc.rating >= 4.9)
    .slice(0, 4);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-[600px] bg-gradient-to-r from-primary/90 to-primary">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&h=1080&fit=crop)',
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>
        
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Find your perfect stay
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl">
            Discover unique homes and experiences around the world. 
            From cozy cabins to luxury villas, find your next adventure.
          </p>
          <SearchBar variant="hero" onSearch={handleSearch} />
        </div>
      </div>

      {/* Categories */}
      <div className="sticky top-20 bg-white z-30 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="relative">
            <button
              onClick={() => scrollCategories('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div
              ref={categoryScrollRef}
              className="flex gap-8 overflow-x-auto scrollbar-hide px-10"
            >
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 pb-3 min-w-[64px] transition-colors',
                    activeCategory === category.id
                      ? 'text-gray-900 border-b-2 border-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <span className="text-sm font-medium whitespace-nowrap">
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => scrollCategories('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Featured Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Featured Stays</h2>
          <button 
            onClick={() => navigate('/listings')}
            className="text-primary font-semibold hover:underline"
          >
            View all
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredAccommodations.map((accommodation) => (
            <AccommodationCard
              key={accommodation.id}
              accommodation={accommodation}
            />
          ))}
        </div>
      </section>

      {/* Top Rated */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Top Rated Stays</h2>
              <p className="text-gray-600 mt-1">Properties with 4.9+ ratings from our guests</p>
            </div>
            <button 
              onClick={() => navigate('/listings')}
              className="text-primary font-semibold hover:underline"
            >
              Explore more
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topRated.map((accommodation) => (
              <AccommodationCard
                key={accommodation.id}
                accommodation={accommodation}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Why choose StayScape?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Secure Booking
            </h3>
            <p className="text-gray-600">
              Your payments are protected and your personal information is always secure.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              24/7 Support
            </h3>
            <p className="text-gray-600">
              Our dedicated support team is available around the clock to help you.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Verified Stays
            </h3>
            <p className="text-gray-600">
              All properties are verified and reviewed by our community of travelers.
            </p>
          </div>
        </div>
      </section>

      {/* Become a Host CTA */}
      <section className="bg-primary py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-white mb-4">
                Become a Host
              </h2>
              <p className="text-white/90 text-lg max-w-xl">
                Share your space and earn extra income. Join our community of hosts 
                and start welcoming guests from around the world.
              </p>
            </div>
            <button 
              onClick={() => navigate('/host')}
              className="px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Start Hosting
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
