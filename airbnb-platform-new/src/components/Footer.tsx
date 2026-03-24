import { Link } from 'react-router-dom';
import { Globe, Facebook, Twitter, Instagram } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Support */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  Safety Information
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  Cancellation Options
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  Report a Concern
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Community</h3>
            <ul className="space-y-3">
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  StayScape.org
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  Disaster Relief Housing
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  Combating Discrimination
                </Link>
              </li>
            </ul>
          </div>

          {/* Hosting */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Hosting</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/host" className="text-gray-600 hover:underline">
                  Try Hosting
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  AirCover for Hosts
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  Hosting Resources
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  Community Forum
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">About</h3>
            <ul className="space-y-3">
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  Newsroom
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  Investors
                </Link>
              </li>
              <li>
                <Link to="#" className="text-gray-600 hover:underline">
                  Gift Cards
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="py-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>&copy; {currentYear} StayScape, Inc.</span>
            <span className="hidden md:inline">·</span>
            <Link to="#" className="hover:underline">
              Privacy
            </Link>
            <span className="hidden md:inline">·</span>
            <Link to="#" className="hover:underline">
              Terms
            </Link>
            <span className="hidden md:inline">·</span>
            <Link to="#" className="hover:underline">
              Sitemap
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:underline">
              <Globe className="w-4 h-4" />
              English (US)
            </button>
            <button className="text-sm font-semibold text-gray-900 hover:underline">
              $ USD
            </button>
            <div className="flex items-center gap-4">
              <Link to="#" className="text-gray-600 hover:text-gray-900">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link to="#" className="text-gray-600 hover:text-gray-900">
                <Twitter className="w-5 h-5" />
              </Link>
              <Link to="#" className="text-gray-600 hover:text-gray-900">
                <Instagram className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
