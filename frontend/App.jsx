import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './navigation/AppNavigator';
import AlertProvider from './components/AlertProvider';
import SplashScreen from './components/SimpleSplashScreen';
import { getUser } from './api/api';
import appStateService from './services/appStateService';
import pushNotificationService from './services/pushNotificationService';
import backgroundWebSocketService from './services/backgroundWebSocketService';
import { FeatureProvider } from './context/FeatureContext';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState('SignUpLogin');

  useEffect(() => {
    appStateService.initialize();
    pushNotificationService.initialize();
    backgroundWebSocketService.initialize();

    return () => {
      backgroundWebSocketService.cleanup();
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('jwtToken');

      if (token) {
        try {
          const response = await getUser();
          const role = response?.data?.role || 'user';

          // persist role for use in other screens
          await AsyncStorage.setItem('userRole', role);

          if (role === 'admin') {
            setInitialRoute('AdminDashboard');
          } else if (role === 'doctor') {
            setInitialRoute('DoctorDashboard');
          } else {
            setInitialRoute('HomeScreen');
          }
        } catch (error) {
          console.log('Token invalid or expired, redirecting to login');
          await AsyncStorage.multiRemove(['jwtToken', 'userRole']);
          setInitialRoute('SignUpLogin');
        }
      } else {
        setInitialRoute('SignUpLogin');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setInitialRoute('SignUpLogin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
    checkAuthStatus();
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  return (
    <FeatureProvider>
      <SafeAreaProvider>
        <AlertProvider>
          <AppNavigator initialRouteName={initialRoute} />
        </AlertProvider>
      </SafeAreaProvider>
    </FeatureProvider>
  );
};

export default App;
