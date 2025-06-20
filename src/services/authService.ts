import { getAPIBaseURL, api } from './api';

const API_URL = getAPIBaseURL() || 'http://localhost:3001/api/v1';
const TENANT_ID = process.env.REACT_APP_TENANT_ID;
const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const OAUTH_AUTHORITY = process.env.REACT_APP_OAUTH_AUTHORITY;

if (!TENANT_ID || !CLIENT_ID || !OAUTH_AUTHORITY) {
  throw new Error('Missing required Azure AD configuration. Please check your environment variables.');
}

interface AuthResponse {
  token: string;
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

class AuthService {
  async login(): Promise<void> {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const response = await api.get(`${API_URL}/auth/login?redirect_uri=${encodeURIComponent(redirectUri)}`);
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async handleCallback(code: string): Promise<void> {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const response = await api.post<AuthResponse>(`${API_URL}/auth/callback`, {
        code,
        redirect_uri: redirectUri
      });
      this.setToken(response.data.token);
    } catch (error) {
      console.error('Callback error:', error);
      throw error;
    }
  }

  async getProfile(): Promise<UserProfile> {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('No token found');
      }

      const response = await api.get<UserProfile>(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return response.data;
    } catch (error) {
      console.error('Profile error:', error);
      throw error;
    }
  }

  setToken(token: string): void {
    sessionStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return sessionStorage.getItem('auth_token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() < expiry;
    } catch {
      return false;
    }
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      api.post(`${API_URL}/auth/logout`, null, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(console.error);
    }
    sessionStorage.removeItem('auth_token');
    window.location.href = '/login';
  }
}

export const authService = new AuthService(); 