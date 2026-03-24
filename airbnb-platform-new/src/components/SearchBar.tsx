import { useState, useRef } from 'react';
import { Search, MapPin, Calendar, Users, Minus, Plus, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useClickOutside } from '@/hooks';
import { formatDate } from '@/utils/helpers';

interface SearchBarProps {
  onSearch: (searchData: {
    location: string;
    checkIn: Date | null;
    checkOut: Date | null;
    guests: { adults: number; children: number; infants: number; pets: number };
  }) => void;
  variant?: 'default' | 'compact' | 'hero';
  className?: string;
}

export const SearchBar = ({
  onSearch,
  variant = 'default',
  className,
}: SearchBarProps) => {
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState({
    adults: 1,
    children: 0,
    infants: 0,
    pets: 0,
  });
  const [activeField, setActiveField] = useState<string | null>(null);

  const searchRef = useClickOutside<HTMLDivElement>(() => setActiveField(null));

  const isCompact = variant === 'compact';
  const isHero = variant === 'hero';

  const totalGuests = guests.adults + guests.children;

  const updateGuests = (type: keyof typeof guests, delta: number) => {
    setGuests((prev) => ({
      ...prev,
      [type]: Math.max(0, prev[type] + delta),
    }));
  };

  const handleSearch = () => {
    onSearch({ location, checkIn, checkOut, guests });
    setActiveField(null);
  };

  const clearField = (field: string) => {
    switch (field) {
      case 'location':
        setLocation('');
        break;
      case 'checkIn':
        setCheckIn(null);
        break;
      case 'checkOut':
        setCheckOut(null);
        break;
      case 'guests':
        setGuests({ adults: 1, children: 0, infants: 0, pets: 0 });
        break;
    }
  };

  return (
    <div
      ref={searchRef}
      className={cn(
        'relative',
        isHero && 'w-full max-w-4xl mx-auto',
        className
      )}
    >
      <div
        className={cn(
          'bg-white rounded-full shadow-lg border border-gray-200 flex items-center transition-all duration-300',
          isHero ? 'p-2' : 'p-1',
          activeField && 'shadow-xl'
        )}
      >
        {/* Location */}
        <div
          className={cn(
            'flex-1 px-4 py-2 cursor-pointer rounded-full transition-colors relative',
            activeField === 'location' && 'bg-gray-100',
            'hover:bg-gray-100'
          )}
          onClick={() => setActiveField('location')}
        >
          <p className="text-xs font-semibold text-gray-800">Where</p>
          <input
            type="text"
            placeholder="Search destinations"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none"
          />
          {location && activeField === 'location' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearField('location');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </div>

        <div className="w-px h-8 bg-gray-300" />

        {/* Check In */}
        <div
          className={cn(
            'flex-1 px-4 py-2 cursor-pointer rounded-full transition-colors relative',
            activeField === 'dates' && 'bg-gray-100',
            'hover:bg-gray-100'
          )}
          onClick={() => setActiveField('dates')}
        >
          <p className="text-xs font-semibold text-gray-800">Check in</p>
          <p className="text-sm text-gray-600">
            {checkIn ? formatDate(checkIn, 'MMM d') : 'Add dates'}
          </p>
        </div>

        <div className="w-px h-8 bg-gray-300" />

        {/* Check Out */}
        <div
          className={cn(
            'flex-1 px-4 py-2 cursor-pointer rounded-full transition-colors relative',
            activeField === 'dates' && 'bg-gray-100',
            'hover:bg-gray-100'
          )}
          onClick={() => setActiveField('dates')}
        >
          <p className="text-xs font-semibold text-gray-800">Check out</p>
          <p className="text-sm text-gray-600">
            {checkOut ? formatDate(checkOut, 'MMM d') : 'Add dates'}
          </p>
        </div>

        <div className="w-px h-8 bg-gray-300" />

        {/* Guests */}
        <div
          className={cn(
            'flex-1 px-4 py-2 cursor-pointer rounded-full transition-colors relative flex items-center justify-between',
            activeField === 'guests' && 'bg-gray-100',
            'hover:bg-gray-100'
          )}
          onClick={() => setActiveField('guests')}
        >
          <div>
            <p className="text-xs font-semibold text-gray-800">Who</p>
            <p className="text-sm text-gray-600">
              {totalGuests > 0
                ? `${totalGuests} guest${totalGuests > 1 ? 's' : ''}`
                : 'Add guests'}
            </p>
          </div>
          <button
            onClick={handleSearch}
            className={cn(
              'bg-primary hover:bg-primary-dark text-white rounded-full flex items-center gap-2 transition-colors',
              isHero ? 'px-6 py-3' : 'px-4 py-2'
            )}
          >
            <Search className="w-4 h-4" />
            {!isCompact && <span className="font-semibold">Search</span>}
          </button>
        </div>
      </div>

      {/* Dropdowns */}
      {activeField === 'location' && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-modal border border-gray-200 p-4 animate-scale-in">
          <p className="text-sm font-semibold text-gray-700 mb-3">Suggested destinations</p>
          <div className="space-y-2">
            {['San Francisco', 'New York', 'Miami', 'Los Angeles', 'Seattle'].map(
              (city) => (
                <button
                  key={city}
                  onClick={() => {
                    setLocation(city);
                    setActiveField(null);
                  }}
                  className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-gray-500" />
                  </div>
                  <span className="text-gray-700">{city}</span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {activeField === 'dates' && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-2xl shadow-modal border border-gray-200 p-4 animate-scale-in">
          <div className="flex gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Check in</p>
              <input
                type="date"
                value={checkIn ? checkIn.toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  setCheckIn(e.target.value ? new Date(e.target.value) : null)
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Check out</p>
              <input
                type="date"
                value={checkOut ? checkOut.toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  setCheckOut(e.target.value ? new Date(e.target.value) : null)
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={() => setActiveField(null)}
            className="mt-4 w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Apply dates
          </button>
        </div>
      )}

      {activeField === 'guests' && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-modal border border-gray-200 p-4 animate-scale-in">
          <div className="space-y-4">
            {[
              { key: 'adults', label: 'Adults', sublabel: 'Ages 13+' },
              { key: 'children', label: 'Children', sublabel: 'Ages 2-12' },
              { key: 'infants', label: 'Infants', sublabel: 'Under 2' },
              { key: 'pets', label: 'Pets', sublabel: '' },
            ].map(({ key, label, sublabel }) => (
              <div
                key={key}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-semibold text-gray-700">{label}</p>
                  {sublabel && <p className="text-sm text-gray-500">{sublabel}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateGuests(key as keyof typeof guests, -1)}
                    disabled={guests[key as keyof typeof guests] === 0}
                    className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-600"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-semibold">
                    {guests[key as keyof typeof guests]}
                  </span>
                  <button
                    onClick={() => updateGuests(key as keyof typeof guests, 1)}
                    className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center hover:border-gray-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setActiveField(null)}
            className="mt-4 w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Apply guests
          </button>
        </div>
      )}
    </div>
  );
};
