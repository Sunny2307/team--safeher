import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Modal,
  FlatList,
  ScrollView,
  Linking,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import NetInfo from '@react-native-community/netinfo';
import { getUser, getFriends, getActiveLiveLocationSessions } from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import liveLocationService from '../services/liveLocationService';
import customAlertService from '../services/customAlertService';
import notificationService from '../services/notificationService';
import backgroundLocationService from '../services/backgroundLocationService';
import { useFeatures } from '../context/FeatureContext';

const HomeScreen = () => {
  const { width: screenWidth } = useWindowDimensions();
  const { features } = useFeatures();
  const isNarrow = screenWidth < 360;
  const quickCardWidth = isNarrow ? (screenWidth - 32) : ((screenWidth - 32 - 10) / 2);
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [debugMessage, setDebugMessage] = useState('Initializing...');
  const [modalVisible, setModalVisible] = useState(false);
  const [friends, setFriends] = useState([]);
  const [userData, setUserData] = useState(null);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingActiveSessions, setLoadingActiveSessions] = useState(false);
  const [showSessionsPopup, setShowSessionsPopup] = useState(false);
  const watchIdRef = useRef(null);
  const navigation = useNavigation();

  // Cache location data
  const LOCATION_CACHE_KEY = 'cached_location';
  const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  // Location caching functions
  const getCachedLocation = async () => {
    try {
      const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        const { location: cachedLocation, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          return cachedLocation;
        }
      }
    } catch (error) {
      console.warn('Error reading cached location:', error);
    }
    return null;
  };

  const setCachedLocation = async (locationData) => {
    try {
      const cacheData = {
        location: locationData,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error caching location:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      // First check if permission is already granted
      let currentStatus;
      if (Platform.OS === 'android') {
        currentStatus = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      } else if (Platform.OS === 'ios') {
        currentStatus = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      }

      if (currentStatus === RESULTS.GRANTED) {
        return true;
      }

      // If not granted, request permission
      let permissionStatus;
      if (Platform.OS === 'android') {
        permissionStatus = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      } else if (Platform.OS === 'ios') {
        permissionStatus = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      }

      if (permissionStatus === RESULTS.DENIED || permissionStatus === RESULTS.BLOCKED) {
        customAlertService.showConfirm(
          'Location Permission Required',
          'This app needs location permission to share your live location with friends. Please enable location permission in your device settings.',
          () => Linking.openSettings(),
          () => { }
        );
        return false;
      }

      return permissionStatus === RESULTS.GRANTED;
    } catch (err) {
      console.warn('Permission Error:', err);
      setDebugMessage('Permission error');
      return false;
    }
  };

  const startLiveLocationTracking = async () => {
    const startTime = Date.now();

    // First, try to get cached location
    setDebugMessage('Checking cached location...');
    const cachedLocation = await getCachedLocation();
    if (cachedLocation) {
      setLocation(cachedLocation);
      setDebugMessage(`Using cached location: ${cachedLocation.latitude}, ${cachedLocation.longitude}`);
      setLoadingLocation(false);
      // Start background tracking with cached location
      startBackgroundTracking();
      return;
    }

    setDebugMessage('Checking network status...');
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      customAlertService.showError('Network Error', 'No internet connection. Please check your network and try again.');
      setDebugMessage('No internet connection');
      setLoadingLocation(false);
      return;
    }

    setDebugMessage('Requesting location permission...');
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      customAlertService.showError('Permission Denied', 'Location permission is required to use this feature.');
      setDebugMessage('Location permission denied');
      setLoadingLocation(false);
      return;
    }

    setDebugMessage('Starting location fetch...');

    // Optimized location fetching with shorter timeout
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationData = { latitude, longitude };
        setLocation(locationData);
        setCachedLocation(locationData); // Cache the location
        setDebugMessage(`Initial: ${latitude}, ${longitude} (took ${Date.now() - startTime}ms)`);
        setLoadingLocation(false);
        startBackgroundTracking();
      },
      (error) => {
        console.error('Initial Location Error:', error);
        setDebugMessage(`Initial error: ${error.message} (took ${Date.now() - startTime}ms)`);

        // Quick fallback with reduced accuracy
        setDebugMessage('Retrying with low accuracy...');
        Geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const locationData = { latitude, longitude };
            setLocation(locationData);
            setCachedLocation(locationData);
            setDebugMessage(`Fallback: ${latitude}, ${longitude}`);
            setLoadingLocation(false);
            startBackgroundTracking();
          },
          (fallbackError) => {
            console.error('Fallback Location Error:', fallbackError);
            setDebugMessage(`Fallback error: ${fallbackError.message}`);
            customAlertService.showError('Location Error', 'Unable to fetch location. Please ensure location services are enabled.');
            setLoadingLocation(false);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000, // Reduced timeout
            maximumAge: 30000, // Accept older location data
          },
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Reduced from 30s to 15s
        maximumAge: 10000, // Accept location up to 10 seconds old
      },
    );
  };

  const startBackgroundTracking = () => {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = Geolocation.watchPosition(
      (newPosition) => {
        const { latitude, longitude } = newPosition.coords;
        const locationData = { latitude, longitude };
        setLocation(locationData);
        setCachedLocation(locationData); // Update cache
        setDebugMessage(`Live: ${latitude}, ${longitude}`);
      },
      (error) => {
        console.error('Watch Error:', error);
        setDebugMessage(`Watch error: ${error.message}`);
      },
      {
        enableHighAccuracy: false, // Use less battery
        distanceFilter: 50, // Only update if moved 50 meters
        interval: 10000, // Update every 10 seconds
        fastestInterval: 5000,
        showsBackgroundLocationIndicator: true,
        timeout: 15000,
        maximumAge: 30000,
      },
    );
  };

  const fetchUserData = async () => {
    try {
      const response = await getUser();
      setUserData(response.data);
    } catch (error) {
      console.error('Fetch User Error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to fetch user data';
      customAlertService.showError('Error', errorMessage);
    }
  };

  const fetchFriends = async () => {
    try {
      console.log('Fetching friends from API...');
      const response = await getFriends();
      console.log('Fetched Friends Response:', response);
      console.log('Friends Data:', response.data);

      // Check different possible response structures
      let friendsArray = [];
      if (response.data && Array.isArray(response.data)) {
        friendsArray = response.data;
      } else if (response.data && Array.isArray(response.data.friends)) {
        friendsArray = response.data.friends;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        friendsArray = response.data.data;
      }

      console.log('Friends Array:', friendsArray);
      console.log('Friends count:', friendsArray.length);

      // Use real friends data from API
      console.log('Using real friends from API:', friendsArray);

      console.log('Final friends array:', friendsArray);
      setFriends(friendsArray);
    } catch (error) {
      console.error('Fetch Friends Error:', error);
      console.error('Error details:', error.response?.data);
      setFriends([]);
      customAlertService.showError('Error', 'Failed to fetch friends. Please try again.');
    }
  };

  const fetchActiveSessions = async () => {
    try {
      setLoadingActiveSessions(true);
      const response = await getActiveLiveLocationSessions();
      console.log('Active sessions response:', response.data);

      if (response.data && response.data.sessions) {
        setActiveSessions(response.data.sessions);
        // Show popup if there are active sessions
        if (response.data.sessions.length > 0) {
          setShowSessionsPopup(true);
        }
      } else {
        setActiveSessions([]);
      }
    } catch (error) {
      console.error('Fetch Active Sessions Error:', error);
      setActiveSessions([]);
    } finally {
      setLoadingActiveSessions(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('jwtToken');
      navigation.navigate('SignUpLoginScreen');
    } catch (error) {
      console.error('Logout Error:', error);
      customAlertService.showError('Error', 'Failed to log out. Please try again.');
    }
  };

  useEffect(() => {
    startLiveLocationTracking();
    fetchUserData();
    fetchFriends();
    fetchActiveSessions();
    initializeLiveLocationService();

    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
      // Clean up live location service
      liveLocationService.disconnect();
      // Clean up background location service
      backgroundLocationService.stopLocationTracking();
      // Ensure modal is closed on cleanup
      setModalVisible(false);
      setMultiSelectMode(false);
      setSelectedFriends([]);
    };
  }, []);

  // Ensure friends are loaded when modal opens
  useEffect(() => {
    if (modalVisible) {
      console.log('Modal opened, fetching friends...');
      fetchFriends();

      // Auto-close modal after 30 seconds to prevent it from getting stuck
      const timeoutId = setTimeout(() => {
        console.log('Auto-closing modal after timeout');
        setModalVisible(false);
        setMultiSelectMode(false);
        setSelectedFriends([]);
      }, 30000);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [modalVisible]);

  const initializeLiveLocationService = async () => {
    try {
      await liveLocationService.connect();

      // Set up listener for incoming live location requests
      liveLocationService.on('friend-location-started', (data) => {
        const { sessionId, sharerId, duration } = data;
        // Navigate to the notification screen instead of showing alert
        navigation.navigate('LiveLocationNotificationScreen', {
          sessionId,
          sharerId,
          duration
        });
      });
    } catch (error) {
      console.error('Failed to initialize live location service:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFriends();
      fetchActiveSessions();
    }, [])
  );

  const handleAddFriend = () => navigation.navigate('AddFriendScreen');

  // Force close modal function
  const forceCloseModal = () => {
    console.log('Force closing modal...');
    setModalVisible(false);
    setMultiSelectMode(false);
    setSelectedFriends([]);
  };

  // Global force close function for any stuck modals
  const forceCloseAllModals = () => {
    console.log('Force closing all modals...');
    setModalVisible(false);
    setMultiSelectMode(false);
    setSelectedFriends([]);
    // Also try to close any custom alert service modals
    try {
      customAlertService.closeAlert();
    } catch (error) {
      console.log('Custom alert service not available or already closed');
    }
  };

  const handleResumeSession = async (session) => {
    try {
      // Connect to live location service if not connected
      if (!liveLocationService.isConnected) {
        await liveLocationService.connect();
      }

      // Determine friend name(s) for display
      let friendName = 'Friend';
      if (session.isSharer) {
        // User is sharing - show recipient names
        if (session.friendPhoneNumbers.length === 1) {
          const friend = friends.find(f => f.phoneNumber === session.friendPhoneNumbers[0]);
          friendName = friend?.name || session.friendPhoneNumbers[0];
        } else {
          friendName = `${session.friendPhoneNumbers.length} friends`;
        }
      } else {
        // User is viewing - show sharer name
        const friend = friends.find(f => f.phoneNumber === session.sharerId);
        friendName = friend?.name || session.sharerId;
      }

      // Navigate to LiveLocationScreen
      navigation.navigate('LiveLocationScreen', {
        sessionId: session.sessionId,
        friendName: friendName,
        isSharing: session.isSharer,
        friendCount: session.isSharer ? session.friendPhoneNumbers.length : 1
      });
    } catch (error) {
      console.error('Error resuming session:', error);
      customAlertService.showError('Error', 'Failed to resume live location session. Please try again.');
    }
  };

  const handleTrackMe = () => {
    if (!location) {
      Alert.alert('Location Unavailable', 'Please wait until your location is fetched.');
      return;
    }
    if (friends.length === 0) {
      Alert.alert(
        'No Friends',
        'Please add a friend to share your location with.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('AddFriendScreen')
          }
        ]
      );
      return;
    }

    // Show options for sharing using standard Alert
    Alert.alert(
      'Share Location',
      'How would you like to share your location?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            console.log('Share cancelled by user');
          }
        },
        {
          text: 'Share with One Friend',
          onPress: () => {
            console.log('User chose to share with one friend');
            setMultiSelectMode(false);
            setModalVisible(true);
          }
        },
        {
          text: 'Share with Multiple Friends',
          onPress: () => {
            console.log('User chose to share with multiple friends');
            setMultiSelectMode(true);
            setSelectedFriends([]);
            setModalVisible(true);
          }
        }
      ]
    );
  };

  const handleShareLocation = async (friendPhoneNumber) => {
    console.log('=== HANDLE SHARE LOCATION (SINGLE FRIEND) ===');
    console.log('Friend phone number:', friendPhoneNumber);

    if (!friendPhoneNumber) {
      Alert.alert('Error', 'Please select a friend to share your location with.');
      return;
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(friendPhoneNumber.replace('+91', ''))) {
      Alert.alert('Invalid Number', 'The selected friend has an invalid 10-digit Indian mobile number.');
      return;
    }

    // Close modal first
    setModalVisible(false);
    setMultiSelectMode(false);
    setSelectedFriends([]);

    // Show options for sharing location using standard Alert
    Alert.alert(
      'Share Location',
      'How would you like to share your location?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            console.log('Share cancelled by user');
          }
        },
        {
          text: 'Share Current Location',
          onPress: () => {
            console.log('User chose to share current location');
            shareCurrentLocation(friendPhoneNumber);
          }
        },
        {
          text: 'Share Live Location',
          onPress: () => {
            console.log('User chose to share live location');
            shareLiveLocation([friendPhoneNumber]);
          }
        }
      ]
    );
  };

  const shareCurrentLocation = async (friendPhoneNumber) => {
    console.log('=== SHARING CURRENT LOCATION ===');
    console.log('Friend phone number:', friendPhoneNumber);

    const formattedNumber = friendPhoneNumber.startsWith('+91') ? friendPhoneNumber : `+91${friendPhoneNumber}`;
    const mapUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    const message = `Here is my current location: ${mapUrl}`;
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(whatsappUrl);
      console.log('WhatsApp opened successfully');
      // Modal should already be closed from handleShareLocation
    } catch (error) {
      console.error('WhatsApp Error:', error);
      Alert.alert('Error', 'Unable to open WhatsApp. Please make sure it is installed.');
    }
  };

  const shareCurrentLocationWithMultiple = async (friendPhoneNumbers) => {
    try {
      const mapUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      const message = `Here is my current location: ${mapUrl}`;

      // For multiple friends, we'll share with the first friend and show a message
      const firstFriend = friendPhoneNumbers[0];
      const formattedNumber = firstFriend.startsWith('+91') ? firstFriend : `+91${firstFriend}`;
      const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;

      await Linking.openURL(whatsappUrl);

      // Show success message
      Alert.alert(
        'Location Shared',
        `Location shared with ${friendPhoneNumbers.length} friend(s). You can manually share the location with other friends.`
      );

      // Ensure modal is closed and state is reset
      setModalVisible(false);
      setSelectedFriends([]);
      setMultiSelectMode(false);
    } catch (error) {
      console.error('WhatsApp Error:', error);
      Alert.alert('Error', 'Unable to open WhatsApp. Please make sure it is installed.');
    }
  };

  const shareLiveLocation = async (friendPhoneNumbers) => {
    console.log('=== SHARING LIVE LOCATION ===');
    console.log('Friend phone numbers:', friendPhoneNumbers);
    console.log('Location available:', !!location);
    console.log('Live location service connected:', liveLocationService.isConnected);

    try {
      // Validate input
      if (!friendPhoneNumbers || friendPhoneNumbers.length === 0) {
        customAlertService.showError('No Friends Selected', 'Please select at least one friend to share your location with.');
        return;
      }

      if (!location) {
        customAlertService.showError('Location Unavailable', 'Please wait until your location is fetched.');
        return;
      }

      // Connect to live location service if not already connected
      if (!liveLocationService.isConnected) {
        console.log('Connecting to live location service...');
        await liveLocationService.connect();
        console.log('Connected to live location service');
      }

      // Start live location sharing
      console.log('Starting live location sharing...');
      liveLocationService.startLiveLocationSharing(friendPhoneNumbers, 3600000); // 1 hour
      console.log('Live location sharing started');

      // Navigate to live location screen
      const friendNames = friendPhoneNumbers.map(phone => {
        const friend = friends.find(f => f.phoneNumber === phone);
        return friend?.name || phone;
      });

      const sessionId = liveLocationService.getCurrentSession();
      console.log('Session ID:', sessionId);
      console.log('Friend names:', friendNames);

      const navigationParams = {
        sessionId: sessionId,
        friendName: friendNames.length === 1 ? friendNames[0] : `${friendNames.length} friends`,
        isSharing: true,
        friendCount: friendPhoneNumbers.length
      };

      console.log('Navigating to LiveLocationScreen with params:', navigationParams);
      navigation.navigate('LiveLocationScreen', navigationParams);

      // Ensure modal is closed and state is reset
      setModalVisible(false);
      setSelectedFriends([]);
      setMultiSelectMode(false);

      console.log('Live location sharing completed successfully');
    } catch (error) {
      console.error('Live location error:', error);
      Alert.alert(
        'Connection Error',
        'Failed to connect to live location service. Please check your internet connection and try again.',
        [
          {
            text: 'Try Again',
            onPress: () => shareLiveLocation(friendPhoneNumbers)
          }
        ]
      );
    }
  };

  const handleFriendSelection = (friendPhoneNumber) => {
    if (multiSelectMode) {
      const isSelected = selectedFriends.includes(friendPhoneNumber);
      if (isSelected) {
        setSelectedFriends(selectedFriends.filter(phone => phone !== friendPhoneNumber));
      } else {
        setSelectedFriends([...selectedFriends, friendPhoneNumber]);
      }
    } else {
      handleShareLocation(friendPhoneNumber);
    }
  };

  const handleMultiFriendShare = () => {
    console.log('=== HANDLE MULTI FRIEND SHARE CLICKED ===');
    console.log('Selected friends:', selectedFriends);
    console.log('Selected friends length:', selectedFriends.length);
    console.log('Location available:', !!location);

    if (selectedFriends.length === 0) {
      console.log('No friends selected, showing error');
      Alert.alert('No Friends Selected', 'Please select at least one friend to share your location with.');
      return;
    }

    console.log('Showing share options for', selectedFriends.length, 'friends');

    // Close the modal first
    setModalVisible(false);
    setMultiSelectMode(false);

    // Use standard Alert directly to ensure it works
    Alert.alert(
      'Share Location with Multiple Friends',
      `Share your location with ${selectedFriends.length} friend(s)?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            console.log('Share cancelled by user');
            // Reset selections
            setSelectedFriends([]);
          }
        },
        {
          text: 'Share Current Location',
          onPress: () => {
            console.log('User chose to share current location with multiple friends');
            shareCurrentLocationWithMultiple(selectedFriends);
          }
        },
        {
          text: 'Share Live Location',
          onPress: () => {
            console.log('User chose to share live location with multiple friends');
            shareLiveLocation(selectedFriends);
          }
        }
      ]
    );
  };

  // Memoized map region to prevent unnecessary re-renders
  const mapRegion = useMemo(() => {
    if (!location) return null;
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [location]);

  // Memoized friend item renderer
  const renderFriendItem = useCallback(({ item, index }) => {
    console.log(`Rendering friend item ${index}:`, item);
    console.log('Item name:', item.name);
    console.log('Item phone:', item.phoneNumber);
    console.log('Item isSOS:', item.isSOS);

    const isSelected = selectedFriends.includes(item.phoneNumber);
    const displayName = item.name || item.friendName || 'Unknown Friend';

    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          multiSelectMode && isSelected && styles.selectedFriendItem
        ]}
        onPress={() => {
          console.log('Friend item pressed:', item.phoneNumber);
          handleFriendSelection(item.phoneNumber);
        }}
      >
        {multiSelectMode && (
          <View style={[
            styles.checkbox,
            isSelected && styles.checkedBox
          ]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        <View style={styles.friendInfo}>
          <Text style={[
            styles.friendText,
            multiSelectMode && isSelected && styles.selectedFriendText
          ]}>
            {displayName} {item.isSOS ? '(SOS)' : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [multiSelectMode, selectedFriends, handleFriendSelection]);

  // Memoized MapView component
  const MapViewComponent = useMemo(() => {
    if (!location) return null;

    return (
      <MapView
        style={styles.map}
        initialRegion={mapRegion}
        region={mapRegion}
        liteMode={true}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsBuildings={false}
        showsIndoors={false}
        showsPointsOfInterest={false}
        showsTraffic={false}
        onMapReady={() => console.log('Map is ready')}
        moveOnMarkerPress={false}
        loadingEnabled={true}
        loadingIndicatorColor="#FF69B4"
        loadingBackgroundColor="#ffffff"
      >
        <Marker coordinate={location} />
      </MapView>
    );
  }, [location, mapRegion]);

  const quickActions = [
    ...(features?.stressAssessment !== false ? [{ id: 'stress', icon: '🧠', title: 'Stress Check', subtitle: 'Quick quiz', nav: 'RoleSelectionScreen', color: '#E8F4FD', accent: '#FF69B4' }] : []),
    ...(features?.cycleTracker !== false ? [{ id: 'cycle', icon: '🌸', title: 'Cycle Tracker', subtitle: 'Period & fertility', nav: 'CalendarCycle', color: '#FFF0F5', accent: '#E91E63' }] : []),
    ...(features?.appointment !== false ? [
      { id: 'doctor', icon: '👩‍⚕️', title: 'Consult Doctor', subtitle: 'Book & chat', nav: 'DoctorList', color: '#F3E8FF', accent: '#7C3AED' },
      { id: 'appointments', icon: '📋', title: 'Appointments', subtitle: 'View & join', nav: 'MyAppointments', color: '#E0F2FE', accent: '#0EA5E9' },
    ] : []),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: Map + Track me */}
        {features?.liveLocation !== false && (
          <View style={styles.heroSection}>
            <Text style={styles.welcomeTitle}>Track me</Text>
            <Text style={styles.welcomeSubtitle}>Share live location with friends</Text>
            <View style={styles.mapCard}>
              {loadingLocation ? (
                <View style={styles.loadingMap}>
                  <ActivityIndicator size="large" color="#FF69B4" />
                  <Text style={styles.loadingText}>Fetching location...</Text>
                </View>
              ) : location ? (
                MapViewComponent
              ) : (
                <View style={styles.loadingMap}>
                  <Text style={styles.loadingText}>Enable location to continue</Text>
                </View>
              )}
              <TouchableOpacity style={styles.trackButton} onPress={handleTrackMe}>
                <Text style={styles.trackButtonText}>Share my location</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Friends & Add friend - compact row */}
        {features?.friends !== false && (
          <View style={styles.friendSection}>
            <View style={styles.friendSectionLeft}>
              <Text style={styles.friendSectionLabel}>
                {friends.length > 0 ? `${friends.length} friend${friends.length !== 1 ? 's' : ''}` : 'No friends yet'}
              </Text>
              <Text style={styles.friendSectionHint}>Add friends for SOS & Track me</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={handleAddFriend}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick access grid */}
        <Text style={styles.sectionTitle}>Quick access</Text>
        <View style={[styles.quickGrid, isNarrow && styles.quickGridNarrow]}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.quickCard, { backgroundColor: action.color, width: quickCardWidth }]}
              onPress={() => navigation.navigate(action.nav)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickCardIcon}>{action.icon}</Text>
              <Text style={[styles.quickCardTitle, { color: action.accent }]} numberOfLines={1} ellipsizeMode="tail">{action.title}</Text>
              <Text style={styles.quickCardSubtitle} numberOfLines={1} ellipsizeMode="tail">{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Community & Health Support */}
        <Text style={styles.sectionTitle}>Community & Health Support</Text>
        <View style={[styles.quickGrid, isNarrow && styles.quickGridNarrow]}>
          {features?.forum !== false && (
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: '#FDF2F8', width: quickCardWidth }]}
              onPress={() => navigation.navigate('ForumHome')}
              activeOpacity={0.8}
            >
              <Text style={styles.quickCardIcon}>💬</Text>
              <Text style={[styles.quickCardTitle, { color: '#BE185D' }]} numberOfLines={1} ellipsizeMode="tail">Anonymous Forum</Text>
              <Text style={styles.quickCardSubtitle} numberOfLines={1} ellipsizeMode="tail">Health discussions</Text>
            </TouchableOpacity>
          )}
          {features?.pcos !== false && (
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: '#F0FDF4', width: quickCardWidth }]}
              onPress={() => navigation.navigate('PCOSSupport')}
              activeOpacity={0.8}
            >
              <Text style={styles.quickCardIcon}>🌸</Text>
              <Text style={[styles.quickCardTitle, { color: '#15803D' }]} numberOfLines={1} ellipsizeMode="tail">PCOS Support</Text>
              <Text style={styles.quickCardSubtitle} numberOfLines={1} ellipsizeMode="tail">Tips & guides</Text>
            </TouchableOpacity>
          )}
          {features?.emergencyLocator !== false && (
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: '#EFF6FF', width: quickCardWidth }]}
              onPress={() => navigation.navigate('EmergencyLocator')}
              activeOpacity={0.8}
            >
              <Text style={styles.quickCardIcon}>📍</Text>
              <Text style={[styles.quickCardTitle, { color: '#1D4ED8' }]} numberOfLines={1} ellipsizeMode="tail">Emergency Locator</Text>
              <Text style={styles.quickCardSubtitle} numberOfLines={1} ellipsizeMode="tail">Pharmacies & hospitals</Text>
            </TouchableOpacity>
          )}
          {userData?.role === 'admin' && (
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: '#FEF3C7', width: quickCardWidth }]}
              onPress={() => navigation.navigate('ForumAdmin')}
              activeOpacity={0.8}
            >
              <Text style={styles.quickCardIcon}>🛡️</Text>
              <Text style={[styles.quickCardTitle, { color: '#B45309' }]} numberOfLines={1} ellipsizeMode="tail">Moderate Forum</Text>
              <Text style={styles.quickCardSubtitle} numberOfLines={1} ellipsizeMode="tail">Admin only</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Friends list - compact, only if has friends */}
        {features?.friends !== false && friends.length > 0 ? (
          <View style={styles.friendsListContainer}>
            <Text style={styles.friendsListTitle}>Your friends</Text>
            <ScrollView
              style={styles.friendsList}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.friendsListContent}
            >
              {friends.map((item, index) => {
                const displayName = item.name || item.friendName || 'Unknown';
                return (
                  <View key={`friend-${index}`} style={styles.friendChip}>
                    <Text style={styles.friendChipText} numberOfLines={1}>
                      {displayName}{item.isSOS ? ' ★' : ''}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            console.log('Modal overlay pressed - closing modal');
            forceCloseModal();
          }}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => {
              // Prevent modal from closing when tapping inside content
              e.stopPropagation();
            }}
          >
            {/* Header with close button */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {multiSelectMode ? 'Select Multiple Friends' : 'Share Your Location'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  console.log('Manual close button pressed');
                  setModalVisible(false);
                  setMultiSelectMode(false);
                  setSelectedFriends([]);
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {multiSelectMode
                ? 'Select friends to share your location with:'
                : 'Select a friend to share your location with:'
              }
            </Text>
            <ScrollView style={styles.modalFriendsList} showsVerticalScrollIndicator={false}>
              {friends.length > 0 ? (
                friends.map((item, index) => {
                  const isSelected = selectedFriends.includes(item.phoneNumber);
                  const displayName = item.name || item.friendName || 'Unknown Friend';

                  return (
                    <TouchableOpacity
                      key={`friend-${index}`}
                      style={[
                        styles.friendItem,
                        isSelected && styles.selectedFriendItem
                      ]}
                      onPress={() => {
                        handleFriendSelection(item.phoneNumber);
                      }}
                    >
                      <Text style={[
                        styles.friendText,
                        isSelected && styles.selectedFriendText
                      ]}>
                        {displayName} {item.isSOS ? '(SOS)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No friends available.</Text>
                  <Text style={styles.emptySubtext}>Add friends to share your location.</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalButtonContainer}>
              {multiSelectMode ? (
                <>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setModalVisible(false);
                      setMultiSelectMode(false);
                      setSelectedFriends([]);
                    }}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.shareButton,
                      selectedFriends.length === 0 && styles.disabledButton
                    ]}
                    onPress={() => {
                      console.log('=== SHARE BUTTON PRESSED ===');
                      console.log('Button pressed, selected friends:', selectedFriends);
                      console.log('Button disabled:', selectedFriends.length === 0);

                      // Force close modal immediately
                      console.log('Force closing modal...');
                      setModalVisible(false);
                      setMultiSelectMode(false);
                      setSelectedFriends([]);

                      // Simple validation
                      if (selectedFriends.length === 0) {
                        console.log('No friends selected, button should be disabled');
                        return;
                      }

                      // Call the share function directly
                      console.log('Calling handleMultiFriendShare...');
                      handleMultiFriendShare();
                    }}
                    disabled={selectedFriends.length === 0}
                  >
                    <Text style={[
                      styles.modalButtonText,
                      selectedFriends.length === 0 && styles.disabledButtonText
                    ]}>
                      Share with {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''}
                    </Text>
                    {selectedFriends.length > 0 && (
                      <Text style={{ fontSize: 10, color: '#fff', marginTop: 2 }}>
                        ✓ Ready to share
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Active Sessions Popup Modal */}
      <Modal visible={showSessionsPopup} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>🔴 Active Live Location Sessions</Text>
              <TouchableOpacity
                style={styles.popupCloseButton}
                onPress={() => setShowSessionsPopup(false)}
              >
                <Text style={styles.popupCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.popupSubtitle}>
              You have {activeSessions.length} active session{activeSessions.length > 1 ? 's' : ''}
            </Text>

            <ScrollView style={styles.popupSessionsList} showsVerticalScrollIndicator={false}>
              {activeSessions.map((session, index) => {
                const remainingMinutes = Math.floor(session.remainingTime / 60000);
                const sessionType = session.isSharer ? 'Sharing with' : 'Viewing from';

                // Get friend name(s)
                let friendDisplay = '';
                if (session.isSharer) {
                  if (session.friendPhoneNumbers.length === 1) {
                    const friend = friends.find(f => f.phoneNumber === session.friendPhoneNumbers[0]);
                    friendDisplay = friend?.name || session.friendPhoneNumbers[0];
                  } else {
                    friendDisplay = `${session.friendPhoneNumbers.length} friends`;
                  }
                } else {
                  const friend = friends.find(f => f.phoneNumber === session.sharerId);
                  friendDisplay = friend?.name || session.sharerId;
                }

                return (
                  <View key={`popup-session-${index}`} style={styles.popupSessionCard}>
                    <View style={styles.popupSessionInfo}>
                      <Text style={styles.popupSessionType}>{sessionType}</Text>
                      <Text style={styles.popupSessionFriend}>{friendDisplay}</Text>
                      <Text style={styles.popupSessionTime}>⏱ {remainingMinutes} minutes remaining</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.popupResumeButton}
                      onPress={() => {
                        setShowSessionsPopup(false);
                        handleResumeSession(session);
                      }}
                    >
                      <Text style={styles.popupResumeButtonText}>View Location</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.popupDismissButton}
              onPress={() => setShowSessionsPopup(false)}
            >
              <Text style={styles.popupDismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNav location={location} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginTop: 4 },
  welcomeSubtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 12 },
  heroSection: { marginBottom: 16 },
  mapCard: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
  },
  friendSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  friendSectionLeft: { flex: 1 },
  friendSectionLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  friendSectionHint: { fontSize: 12, color: '#888', marginTop: 2 },
  addButton: {
    backgroundColor: '#4B1C46',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickGridNarrow: {
    justifyContent: 'flex-start',
  },
  quickCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    minHeight: 82,
    maxWidth: '100%',
  },
  quickCardIcon: { fontSize: 20, marginBottom: 4 },
  quickCardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  quickCardSubtitle: { fontSize: 10, color: '#666' },
  friendsListContainer: { marginBottom: 24 },
  friendsListTitle: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  friendsList: { marginHorizontal: -16 },
  friendsListContent: { paddingHorizontal: 16 },
  friendChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  friendChipText: { fontSize: 13, color: '#333', fontWeight: '500', maxWidth: 100 },
  friendItem: {
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  selectedFriendItem: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  friendInfo: {
    flex: 1,
  },
  friendText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    marginBottom: 0,
  },
  friendPhone: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  selectedFriendText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  shareButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledButtonText: {
    color: '#999',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 5,
    marginVertical: 10,
    alignSelf: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  mapContainer: { flex: 1, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  loadingMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#555',
    marginTop: 10,
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    fontSize: 14,
    color: '#555',
    marginTop: 8,
  },
  trackButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#FF69B4',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  trackButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalFriendsList: {
    maxHeight: 280,
    width: '100%',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 36,
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Active Sessions Popup Styles
  popupOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  popupContainer: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF1744',
    flex: 1,
  },
  popupCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupCloseText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  popupSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
  },
  popupSessionsList: {
    maxHeight: 300,
  },
  popupSessionCard: {
    backgroundColor: '#FFF5F7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF69B4',
  },
  popupSessionInfo: {
    marginBottom: 10,
  },
  popupSessionType: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  popupSessionFriend: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  popupSessionTime: {
    fontSize: 12,
    color: '#FF69B4',
    fontWeight: '500',
  },
  popupResumeButton: {
    backgroundColor: '#FF69B4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  popupResumeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  popupDismissButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  popupDismissButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen;