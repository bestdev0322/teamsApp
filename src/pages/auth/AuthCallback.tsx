import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const AuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const { setIsAuthenticated, setUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent multiple processing attempts
      if (isProcessing) {
        console.log('Already processing callback');
        return;
      }

      try {
        setIsProcessing(true);
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        
        if (!code) {
          throw new Error('No authorization code found');
        }

        console.log('Processing auth callback with code');
        
        const response = await axios.post(`${API_URL}/api/v1/auth/callback`, {
          code,
          redirect_uri: `${window.location.origin}/auth/callback`
        });

        if (!response.data?.token) {
          console.error('No token received from server');
          throw new Error('No token received from server');
        }

        // Store token in sessionStorage
        sessionStorage.setItem('auth_token', response.data.token);
        
        // Update auth context
        if (response.data.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        }
        
        // Dispatch Redux actions
        dispatch({ 
          type: 'auth/setToken', 
          payload: response.data.token 
        });
        
        if (response.data.user) {
          dispatch({ 
            type: 'auth/setAuth', 
            payload: {
              isAuthenticated: true,
              user: response.data.user
            }
          });
        }

        // Use React Router's navigate
        navigate('/', { replace: true });
      } catch (error: any) {
        console.error('Authentication callback error:', {
          message: error.message,
          response: error.response?.data,
          stack: error.stack
        });
        navigate('/login', { replace: true });
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [location, navigate, dispatch, isProcessing, setIsAuthenticated, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Authenticating...</h2>
        <p className="text-gray-600">Please wait while we complete your sign-in.</p>
      </div>
    </div>
  );
}; 