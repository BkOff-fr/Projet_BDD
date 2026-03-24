import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header, Footer } from '@/components';
import {
  Home,
  AccommodationList,
  AccommodationDetail,
  UserProfile,
  HostDashboard,
  BookingConfirmation,
  Messages,
} from '@/pages';
import { useAuth } from '@/hooks';
import { users } from '@/data/mockData';

function App() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header user={user} onLogout={logout} />
        
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/listings" element={<AccommodationList />} />
            <Route path="/listing/:id" element={<AccommodationDetail />} />
            <Route
              path="/profile"
              element={
                isAuthenticated ? (
                  <UserProfile user={user!} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/host/dashboard"
              element={
                isAuthenticated && user?.isHost ? (
                  <HostDashboard user={user!} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/host"
              element={
                isAuthenticated ? (
                  <HostDashboard user={user!} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/booking/confirm"
              element={
                isAuthenticated ? (
                  <BookingConfirmation />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/bookings"
              element={
                isAuthenticated ? (
                  <UserProfile user={user!} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/messages"
              element={
                isAuthenticated ? (
                  <Messages currentUser={user!} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
