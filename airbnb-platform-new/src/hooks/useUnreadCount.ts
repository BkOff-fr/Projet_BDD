import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { messagesAPI } from '@/services/api';

const POLL_INTERVAL_MS = 30_000;

/**
 * Polls the unread-message count for the authenticated user.
 *
 * - Returns 0 (and fires no requests) when there is no logged-in user.
 * - Fetches once on mount, then every 30s.
 * - Refetches when the location pathname changes (e.g. after the user
 *   visits /messages and reads messages, the count drops on next refresh).
 * - Errors are logged but never thrown; the previous count is preserved.
 */
export const useUnreadCount = (): number => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      // Logged out: clear any stale count and skip polling entirely.
      setCount(0);
      return;
    }

    let cancelled = false;

    const fetchCount = async () => {
      try {
        const result = await messagesAPI.getUnreadCount();
        if (!cancelled) {
          setCount(result.count);
        }
      } catch (err) {
        // Keep previous count on failure; just log for debugging.
        console.error('Failed to fetch unread message count:', err);
      }
    };

    fetchCount();
    const interval = window.setInterval(fetchCount, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user, pathname]);

  return count;
};
