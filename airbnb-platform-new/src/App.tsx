import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header, Footer, RequireAuth } from '@/components';
import {
  Home,
  AccommodationList,
  AccommodationDetail,
  UserProfile,
  HostDashboard,
  BookingConfirmation,
  Messages,
  LoginPage,
  RegisterPage,
  MyTripsPage,
  BookingDetailPage,
} from '@/pages';
import { useAuth } from '@/hooks';

function App() {
  const { user, logout } = useAuth();

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header user={user} onLogout={logout} />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/listings" element={<AccommodationList />} />
            <Route path="/listing/:id" element={<AccommodationDetail />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <UserProfile user={user!} />
                </RequireAuth>
              }
            />
            <Route
              path="/host/dashboard"
              element={
                <RequireAuth requireHost>
                  <HostDashboard user={user!} />
                </RequireAuth>
              }
            />
            <Route
              path="/host"
              element={
                <RequireAuth requireHost>
                  <HostDashboard user={user!} />
                </RequireAuth>
              }
            />
            <Route
              path="/booking/confirm"
              element={
                <RequireAuth>
                  <BookingConfirmation />
                </RequireAuth>
              }
            />
            <Route
              path="/bookings"
              element={
                <RequireAuth>
                  <MyTripsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/bookings/:id"
              element={
                <RequireAuth>
                  <BookingDetailPage />
                </RequireAuth>
              }
            />
            <Route
              path="/messages"
              element={
                <RequireAuth>
                  <Messages currentUser={user!} />
                </RequireAuth>
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
