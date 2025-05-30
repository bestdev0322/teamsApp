import axios, { AxiosInstance } from 'axios';
import { Company, SuperUser, License, Course } from '../types';

// Get the API URL from environment or try common development ports
export const getAPIBaseURL = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL + '/api';
  }
  
  // In development, try common ports
  const defaultPort = 3001;
  const isDevelopment = window.location.hostname === 'localhost';
  return isDevelopment 
    ? `http://localhost:${defaultPort}/api`
    : 'https://app.teamscorecards.online/api';
};

const API_BASE_URL = getAPIBaseURL();




interface ApiInstance extends AxiosInstance {
  // ... existing interface properties ...
  
  // Training Courses
  getCourses(tenantId: string): Promise<any>;
  createCourse(data: { name: string; description: string; status: 'active' | 'inactive' }): Promise<any>;
  updateCourse(courseId: string, data: { name: string; description: string; status: 'active' | 'inactive' }): Promise<any>;
  deleteCourse(courseId: string): Promise<any>;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
}) as ApiInstance;

// Public API instance without auth requirements
export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false
});

// Implement training course methods
api.getCourses = (tenantId: string) => api.get<ApiResponse<Course[]>>(`/training-courses/${tenantId}`);
api.createCourse = (data: { name: string; description: string; status: 'active' | 'inactive' }) => 
  api.post<ApiResponse<Course>>('/training-courses', data);
api.updateCourse = (courseId: string, data: { name: string; description: string; status: 'active' | 'inactive' }) => 
  api.put<ApiResponse<Course>>(`/training-courses/${courseId}`, data);
api.deleteCourse = (courseId: string) => api.delete(`/training-courses/${courseId}`);

interface ApiResponse<T> {
  data: T;
}

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    if(config.url === '/auth/callback') {
      return config;
    } else {
      const token = sessionStorage.getItem('auth_token');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn(`No auth token available for request to: ${config.url}`);
      }
      
      return config;
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add retry logic for connection errors
api.interceptors.response.use(
  (response) => {
    if (response.data?.data) {
      return response;
    }
    return { ...response, data: { data: response.data } };
  },
  (error) => {
    if (error.response) {
      console.error(`API Error ${error.response.status} for ${error.config.url}:`, error.response.data);
      
      // Handle 401 Unauthorized errors
      if (error.response.status === 401) {
        console.error('Unauthorized request - check token validity');
        // Only clear token and redirect if it's an auth issue, not a missing token
        if (error.response.data?.message !== 'No token provided') {
          sessionStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
      }
      if (error.response.status === 403) {
        window.location.href = '/license-error';
        // Prevent further error handling
        return new Promise(() => {}); // This promise never resolves or rejects
      }
    }
    return Promise.reject(error);
  }
);

// Export the api instance for use in other files
export { api };

// Company API
export const companyAPI = {
  getAll: () => api.get<ApiResponse<Company[]>>('/companies'),
  create: (data: Omit<Company, '_id' | '__v'>) => api.post<ApiResponse<Company>>('/companies', data),
  update: (id: string, data: Partial<Omit<Company, '_id' | '__v'>>) => 
    api.put<ApiResponse<Company>>(`/companies/${id}`, data),
  delete: (id: string) => api.delete(`/companies/${id}`),
};

// SuperUser API
export const superUserAPI = {
  getAll: () => api.get<ApiResponse<SuperUser[]>>('/super-users'),
  create: (data: Omit<SuperUser, '_id' | '__v'>) => api.post<ApiResponse<SuperUser>>('/super-users', data),
  update: (id: string, data: Partial<Omit<SuperUser, '_id' | '__v'>>) => 
    api.put<ApiResponse<SuperUser>>(`/super-users/${id}`, data),
  delete: (id: string) => api.delete(`/super-users/${id}`),
};

// License API
export const licenseAPI = {
  getAll: () => api.get<ApiResponse<License[]>>('/licenses'),
  create: (data: Omit<License, '_id' | '__v'>) => api.post<ApiResponse<License>>('/licenses', data),
  update: (id: string, data: Partial<Omit<License, '_id' | '__v'>>) => 
    api.put<ApiResponse<License>>(`/licenses/${id}`, data),
  delete: (id: string) => api.delete(`/licenses/${id}`),
};

// Training Courses
export const courseAPI = {
  getAll: (tenantId: string) => api.get<ApiResponse<Course[]>>(`/training-courses/${tenantId}`),
  create: (data: Omit<Course, '_id' | 'createdAt' | 'updatedAt' | 'tenantId'>) => 
    api.post<ApiResponse<Course>>('/training-courses', data),
  update: (courseId: string, data: Partial<Omit<Course, '_id' | 'createdAt' | 'updatedAt' | 'tenantId'>>) => 
    api.put<ApiResponse<Course>>(`/training-courses/${courseId}`, data),
  delete: (courseId: string) => api.delete(`/training-courses/${courseId}`),
}; 

