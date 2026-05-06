import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, User, Globe, Search, Bell } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useClickOutside, useUnreadCount } from '@/hooks';
import type { User as UserType } from '@/types';

interface HeaderProps {
  user: UserType | null;
  onLogout: () => void;
  variant?: 'default' | 'transparent';
}

export const Header = ({ user, onLogout, variant = 'default' }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();

  const userMenuRef = useClickOutside<HTMLDivElement>(() => setIsUserMenuOpen(false));

  const isTransparent = variant === 'transparent';

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        isTransparent
          ? 'bg-transparent'
          : 'bg-white border-b border-gray-200'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center transform group-hover:scale-105 transition-transform">
              <svg
                viewBox="0 0 32 32"
                className="w-6 h-6 text-white"
                fill="currentColor"
              >
                <path d="M16 1c2.008 0 3.463.963 4.751 3.269l.533 1.025c1.954 3.83 6.114 12.54 7.1 14.836l.145.353c.667 1.591.91 2.472.96 3.396l.01.415.001.228c0 4.062-2.877 6.478-6.357 6.478-2.224 0-4.556-1.258-6.709-3.386l-.257-.26-.177-.179-.177.179-.257.26c-2.153 2.128-4.485 3.386-6.709 3.386-3.48 0-6.357-2.416-6.357-6.478l.001-.228.01-.415c.05-.924.293-1.805.96-3.396l.145-.353c.986-2.296 5.146-11.006 7.1-14.836l.533-1.025C12.537 1.963 13.992 1 16 1zm0 2c-1.239 0-2.053.539-2.987 2.152l-.523 1.006c-1.924 3.774-5.958 12.216-6.916 14.445l-.14.34c-.538 1.282-.733 1.991-.773 2.697l-.007.308-.001.194c0 2.843 1.94 4.478 4.357 4.478 1.73 0 3.786-1.1 5.729-3.023l.237-.239.237.239c1.943 1.923 4 3.023 5.729 3.023 2.417 0 4.357-1.635 4.357-4.478l-.001-.194-.007-.308c-.04-.706-.235-1.415-.773-2.697l-.14-.34c-.958-2.229-4.992-10.671-6.916-14.445l-.523-1.006C18.053 3.539 17.239 3 16 3z" />
              </svg>
            </div>
            <span
              className={cn(
                'text-xl font-bold hidden sm:block',
                isTransparent ? 'text-white' : 'text-primary'
              )}
            >
              StayScape
            </span>
          </Link>

          {/* Center Navigation - Desktop */}
          <nav className="hidden md:flex items-center">
            <button
              onClick={() => navigate('/listings')}
              className={cn(
                'px-4 py-2 rounded-full font-medium transition-colors',
                isTransparent
                  ? 'text-white hover:bg-white/10'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              Stays
            </button>
            <button
              onClick={() => navigate('/host')}
              className={cn(
                'px-4 py-2 rounded-full font-medium transition-colors',
                isTransparent
                  ? 'text-white hover:bg-white/10'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              Become a Host
            </button>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <button
              className={cn(
                'p-2 rounded-full transition-colors hidden sm:flex',
                isTransparent
                  ? 'text-white hover:bg-white/10'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Globe className="w-5 h-5" />
            </button>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={cn(
                  'relative flex items-center gap-2 px-2 py-1.5 rounded-full border transition-all',
                  isTransparent
                    ? 'border-white/30 text-white hover:bg-white/10'
                    : 'border-gray-300 text-gray-700 hover:shadow-md bg-white'
                )}
              >
                <Menu className="w-4 h-4" />
                {user ? (
                  user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700">
                      {user.firstName.charAt(0)}
                      {user.lastName.charAt(0)}
                    </div>
                  )
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                )}
                {user && unreadCount > 0 && (
                  <span
                    aria-live="polite"
                    aria-atomic="true"
                    aria-label={`${unreadCount} unread messages`}
                    className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-modal border border-gray-200 py-2 animate-scale-in">
                  {user ? (
                    <>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-semibold text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        to="/bookings"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        My Trips
                      </Link>
                      <Link
                        to="/messages"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Messages
                      </Link>
                      {user.isHost && (
                        <Link
                          to="/host/dashboard"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Host Dashboard
                        </Link>
                      )}
                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                          onClick={() => {
                            onLogout();
                            setIsUserMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          Log out
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/register"
                        className="block w-full text-left px-4 py-2 text-gray-900 font-semibold hover:bg-gray-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Sign up
                      </Link>
                      <Link
                        to="/login"
                        className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Log in
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
