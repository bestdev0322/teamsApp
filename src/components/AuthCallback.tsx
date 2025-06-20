import React, { useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AuthCallback: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      
      if (code) {
        try {
          const response = await fetch('/api/v1/auth/callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
          });

          if (response.ok) {
            const { token } = await response.json();
            sessionStorage.setItem('auth_token', token);
            window.location.href = '/';
          } else {
            console.error('Auth callback failed');
            window.location.href = '/';
          }
        } catch (error) {
          console.error('Auth callback error:', error);
          window.location.href = '/';
        }
      }
    };

    handleCallback();
  }, [location]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <div>Processing authentication...</div>;
}; 