import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import './styles/globals.css';
import { ToastProvider } from './contexts/ToastContext';
import Main from './Main';
import { initializeTeams } from './utils/teamsUtils';
import { SocketProvider } from './contexts/SocketContext';
import LicenseError from './pages/LicenseError';
import FeedbackSubmission from './pages/feedback/submit';

// Lazy load components
const ConsentPage = lazy(() => import('./components/ConsentPage').then(module => ({ default: module.ConsentPage })));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback').then(module => ({ default: module.AuthCallback })));
const Login = lazy(() => import('./pages/auth/Login').then(module => ({ default: module.Login })));
const Unauthorized = lazy(() => import('./pages/auth/Unauthorized').then(module => ({ default: module.Unauthorized })));
const LogoutPage = lazy(() => import('./pages/logout/index').then(module => ({ default: module.default })));

// Loading component
const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div className="spinner"></div>
  </div>
);

const App: React.FC = () => {
  useEffect(() => {
    const initTeams = async () => {
      try {
        await initializeTeams();
      } catch (error) {
        console.error('Teams initialization failed:', error);
      }
    };

    initTeams();
  }, []);

  return (
    <Provider store={store}>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public routes */}
              <Route path="/consent" element={<ConsentPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth-end" element={<AuthCallback />} />
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/license-error" element={<LicenseError />} />
              <Route path="/logout" element={<LogoutPage />} />
              
              {/* Feedback submission - no auth required */}
              <Route path="/feedback/submit" element={<FeedbackSubmission />} />

              {/* Protected routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <SocketProvider>
                      <Main />
                    </SocketProvider>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </Provider>
  );
};

export default App; 
