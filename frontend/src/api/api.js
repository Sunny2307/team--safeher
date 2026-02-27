import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../navigation/AppNavigator';
import { getServerURL } from '../utils/serverConfig';

// Use local backend URL during development
let BASE_URL = 'http://192.168.1.208:3000'; // Default fallback

// Initialize BASE_URL from serverConfig on app start
getServerURL().then(url => {
  BASE_URL = url;
  api.defaults.baseURL = BASE_URL;
  console.log('Backend URL set to:', BASE_URL);
}).catch(error => {
  console.warn('Failed to get server URL, using fallback:', error);
});

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor: add auth token and log requests
api.interceptors.request.use(async (config) => {
  // Add JWT token
  const token = await AsyncStorage.getItem('jwtToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Log request for debugging
  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);

  return config;
}, (error) => {
  console.error('[API Request Error]', error);
  return Promise.reject(error);
});

// Add an interceptor to handle errors and log responses
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    if (error.response) {
      // Server responded with error status
      console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error(`[API Error] No response from server - ${error.config?.baseURL}${error.config?.url}`);
      console.error('Troubleshooting:');
      console.error('1. Check your internet connection');
      console.error('2. Verify backend is accessible: curl https://safeher-backend-vercel.vercel.app/health');
      console.error('3. Check backend deployment status');
    } else {
      // Error setting up request
      console.error('[API Error]', error.message);
    }

    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('jwtToken');
      console.log('Token expired, redirecting to login');
      navigationRef.current?.navigate('SignUpLogin');
    }
    return Promise.reject(error);
  }
);

export const login = (phoneNumber, password) =>
  api.post('/api/login', { phoneNumber, password }).then((response) => {
    if (response.data.token) {
      AsyncStorage.setItem('jwtToken', response.data.token);
    }
    return response;
  });

export const register = (phoneNumber, password) =>
  api.post('/api/register', { phoneNumber, password }).then((response) => {
    if (response.data.token) {
      AsyncStorage.setItem('jwtToken', response.data.token);
    }
    return response;
  });

export const saveName = (name) =>
  api.post('/user/saveName', { name });

export const savePin = (pin, confirmPin) =>
  api.post('/user/savePin', { pin, confirmPin });

export const getUser = () =>
  api.get('/auth/getUser');

export const verifyPin = (pin) =>
  api.post('/user/verifyPin', { pin });

export const checkUser = (phoneNumber) =>
  api.post('/api/checkUser', { phoneNumber });

export const sendOTP = (phoneNumber) =>
  api.post('/api/send-otp', { phoneNumber });

export const verifyOTP = (sessionId, otp, phoneNumber) =>
  api.post('/api/verify-otp', phoneNumber ? { sessionId, otp, phoneNumber } : { sessionId, otp });

export const addFriend = (phoneNumber, isSOS, friendName) =>
  api.post('/user/addFriend', { phoneNumber, isSOS, name: friendName });

export const getFriends = () =>
  api.get('/user/getFriends');

export const getActiveLiveLocationSessions = () =>
  api.get('/api/live-location/active-sessions');

export const getAppointments = () =>
  api.get('/appointments/user');

export const cancelAppointment = (appointmentId) =>
  api.put(`/appointments/cancel/${appointmentId}`);

export const getDoctors = () =>
  api.get('/doctors');

// Forum (anonymous health community)
export const getForumPosts = (params) => api.get('/forum/posts', { params });
export const getForumPost = (id) => api.get(`/forum/posts/${id}`);
export const createForumPost = (data) => api.post('/forum/posts', data);
export const deleteForumPost = (id) => api.delete(`/forum/posts/${id}`);
export const getForumComments = (postId, params) => api.get(`/forum/comments/${postId}`, { params });
export const createForumComment = (postId, comment) => api.post('/forum/comments', { postId, comment });
export const toggleForumLike = (postId) => api.post(`/forum/like/${postId}`);
export const checkForumLiked = (postId) => api.get(`/forum/like/${postId}`);
export const reportForumPost = (postId, reason) => api.post(`/forum/report/${postId}`, { reason });
// Forum admin
export const getForumReportedPosts = (params) => api.get('/forum/admin/reported', { params });
export const getForumAdminPost = (id) => api.get(`/forum/admin/post/${id}`);
export const hideForumPost = (id) => api.post(`/forum/admin/post/${id}/hide`);
export const unhideForumPost = (id) => api.post(`/forum/admin/post/${id}/unhide`);

// PCOS resources
export const getPcosResources = (params) => api.get('/pcos/resources', { params });
export const createPcosResource = (data) => api.post('/pcos/resources', data);
export const updatePcosResource = (id, data) => api.put(`/pcos/resources/${id}`, data);
export const deletePcosResource = (id) => api.delete(`/pcos/resources/${id}`);

// Emergency locator (places proxy)
export const getEmergencyPlaces = (params) => api.get('/emergency/places', { params });

// Feature toggles
export const getAppFeatures = () => api.get('/config/features');
export const updateAppFeatures = (features) => api.put('/config/features', { features });

// Logout function to clear authentication state
export const logout = async () => {
  try {
    await AsyncStorage.removeItem('jwtToken');
    // Navigate to login screen
    navigationRef.current?.navigate('SignUpLogin');
  } catch (error) {
    console.error('Error during logout:', error);
  }
};

export default api;