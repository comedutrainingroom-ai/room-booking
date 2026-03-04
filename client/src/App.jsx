import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { SocketProvider } from './contexts/SocketContext';
import { ToastProvider } from './contexts/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import AdminGuard from './components/AdminGuard';
import { Suspense, lazy } from 'react';

// Lazy Load Pages
const Home = lazy(() => import('./pages/Home'));
const Calendar = lazy(() => import('./pages/Calendar'));
const AdminApprove = lazy(() => import('./pages/AdminApprove'));
const History = lazy(() => import('./pages/History'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const RoomManagement = lazy(() => import('./pages/RoomManagement'));

const RoomSelection = lazy(() => import('./pages/RoomSelection'));
const RoomBooking = lazy(() => import('./pages/RoomBooking'));
const Profile = lazy(() => import('./pages/Profile'));
const ReportIssue = lazy(() => import('./pages/ReportIssue'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const RoomRules = lazy(() => import('./pages/RoomRules'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const UserGuide = lazy(() => import('./pages/UserGuide'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <SocketProvider>
            <SettingsProvider>
              <ToastProvider>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Layout>
                          <Home />
                        </Layout>
                      </ProtectedRoute>
                    } />

                    <Route path="/bookings" element={<ProtectedRoute><Layout><div className="text-center py-20">My Bookings Page</div></Layout></ProtectedRoute>} />
                    <Route path="/calendar" element={<ProtectedRoute><Layout><Calendar /></Layout></ProtectedRoute>} />
                    <Route path="/rooms" element={<ProtectedRoute><Layout><RoomSelection /></Layout></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
                    <Route path="/report-issue" element={<ProtectedRoute><Layout><ReportIssue /></Layout></ProtectedRoute>} />
                    <Route path="/room-rules" element={<ProtectedRoute><Layout><RoomRules /></Layout></ProtectedRoute>} />
                    <Route path="/guide" element={<ProtectedRoute><Layout><UserGuide /></Layout></ProtectedRoute>} />

                    {/* Admin Routes */}
                    <Route path="/approve" element={<ProtectedRoute><Layout><AdminGuard><AdminApprove /></AdminGuard></Layout></ProtectedRoute>} />
                    <Route path="/admin/reports" element={<ProtectedRoute><Layout><AdminGuard><AdminReports /></AdminGuard></Layout></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute><Layout><AdminGuard><UserManagement /></AdminGuard></Layout></ProtectedRoute>} />
                    <Route path="/history" element={<ProtectedRoute><Layout><History /></Layout></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Layout><AdminGuard><Dashboard /></AdminGuard></Layout></ProtectedRoute>} />
                    <Route path="/rooms-manage" element={<ProtectedRoute><Layout><AdminGuard><RoomManagement /></AdminGuard></Layout></ProtectedRoute>} />

                    <Route path="/settings" element={<ProtectedRoute><Layout><AdminGuard><Settings /></AdminGuard></Layout></ProtectedRoute>} />
                    <Route path="/book-room/:id" element={<ProtectedRoute><Layout><RoomBooking /></Layout></ProtectedRoute>} />
                  </Routes>
                </Suspense>
              </ToastProvider>
            </SettingsProvider>
          </SocketProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
