import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { bluetoothService } from '../services/BluetoothService';
import IncomingCallOverlay from '../components/IncomingCallOverlay';

import SignUpLoginScreen from '../../src/screens/auth/SignUpLoginScreen';
import OTPScreen from '../../src/screens/auth/OTPScreen';
import PinCreationScreen from '../../src/screens/auth/PinCreationScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';
import HomeScreen from '../screens/HomeScreen';
import PinLoginScreen from '../screens/auth/PinLoginScreen';
import AddFriendScreen from '../screens/emergency/AddFriendScreen';
import ContactSelectionScreen from '../screens/emergency/ContactSelectionScreen';
import RecordScreen from '../screens/support/RecordScreen';
import RecordingHistoryScreen from '../screens/support/RecordingHistoryScreen';
import MenuScreen from '../screens/support/MenuScreen';
import HelplineScreen from '../screens/emergency/HelplineScreen';
import FakeCallScreen from '../screens/support/FakeCallScreen';
import CallerDetailsScreen from '../screens/support/CallerDetailsScreen';
import IncomingCallScreen from '../screens/support/IncomingCallScreen';
import ShareVideoScreen from '../screens/support/ShareVideoScreen';
import RoleSelectionScreen from '../screens/stress/RoleSelectionScreen';
import QuizScreen from '../screens/stress/QuizScreen';
import ResultScreen from '../screens/stress/ResultScreen';
import LiveLocationScreen from '../screens/LiveLocationScreen';

import LiveLocationNotificationScreen from '../screens/LiveLocationNotificationScreen';
import TermsAndConditionsScreen from '../screens/legal/TermsAndConditionsScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';

import CycleLogScreen from '../screens/cycle/CycleLogScreen';
import CalendarCycleView from '../screens/cycle/CalendarCycleView';
import SymptomTrackerScreen from '../screens/cycle/SymptomTrackerScreen';
import CycleInsightsScreen from '../screens/cycle/CycleInsightsScreen';

// Gynecologist Consultation
import DoctorListScreen from '../screens/gynecologist/DoctorListScreen';
import DoctorProfileScreen from '../screens/gynecologist/DoctorProfileScreen';
import AppointmentBookingScreen from '../screens/gynecologist/AppointmentBookingScreen';
import MyAppointmentsScreen from '../screens/gynecologist/MyAppointmentsScreen';
import ChatScreen from '../screens/gynecologist/ChatScreen';
import VideoConsultationScreen from '../screens/gynecologist/VideoConsultationScreen';

// Admin
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AddDoctorScreen from '../screens/admin/AddDoctorScreen';
import AdminPCOSResourcesScreen from '../screens/admin/AdminPCOSResourcesScreen';

// Doctor
import DoctorDashboardScreen from '../screens/doctor/DoctorDashboardScreen';
import DoctorAppointmentsScreen from '../screens/doctor/DoctorAppointmentsScreen';
import AvailabilityEditorScreen from '../screens/doctor/AvailabilityEditorScreen';

// Community & Health Support
import ForumHomeScreen from '../screens/community/ForumHomeScreen';
import CreatePostScreen from '../screens/community/CreatePostScreen';
import PostDetailScreen from '../screens/community/PostDetailScreen';
import PCOSSupportScreen from '../screens/community/PCOSSupportScreen';
import EmergencyLocatorScreen from '../screens/community/EmergencyLocatorScreen';
import ForumAdminScreen from '../screens/community/ForumAdminScreen';

const Stack = createNativeStackNavigator();

// Create navigation reference for API interceptor
export const navigationRef = { current: null };

const AppNavigator = ({ initialRouteName }) => {
  useEffect(() => {
    // Initialize Bluetooth connection when the app starts
    bluetoothService.initialize();

    return () => {
      // Clean up Bluetooth connection when the app unmounts
      bluetoothService.disconnect();
    };
  }, []);

  return (
    <NavigationContainer ref={(ref) => { navigationRef.current = ref; }}>
      <Stack.Navigator initialRouteName={initialRouteName || 'SignUpLogin'}>
        <Stack.Screen
          name="SignUpLogin"
          component={SignUpLoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OTPScreen"
          component={OTPScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PinCreationScreen"
          component={PinCreationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PinLoginScreen"
          component={PinLoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CompleteProfileScreen"
          component={CompleteProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HomeScreen"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddFriendScreen"
          component={AddFriendScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ContactSelection"
          component={ContactSelectionScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RecordScreen"
          component={RecordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RecordingHistoryScreen"
          component={RecordingHistoryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MenuScreen"
          component={MenuScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HelplineScreen"
          component={HelplineScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FakeCallScreen"
          component={FakeCallScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CallerDetailsScreen"
          component={CallerDetailsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="IncomingCallScreen"
          component={IncomingCallScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ShareVideoScreen"
          component={ShareVideoScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RoleSelectionScreen"
          component={RoleSelectionScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="QuizScreen"
          component={QuizScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ResultScreen"
          component={ResultScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LiveLocationScreen"
          component={LiveLocationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LiveLocationNotificationScreen"
          component={LiveLocationNotificationScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TermsAndConditions"
          component={TermsAndConditionsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="CycleLog" component={CycleLogScreen} options={{ title: 'Log Period' }} />
        <Stack.Screen name="CalendarCycle" component={CalendarCycleView} options={{ title: 'Cycle Tracker', headerShown: false }} />
        <Stack.Screen name="SymptomTracker" component={SymptomTrackerScreen} options={{ title: 'Symptoms' }} />
        <Stack.Screen name="CycleInsights" component={CycleInsightsScreen} options={{ title: 'Insights' }} />

        {/* Gynecologist Consultation Module */}
        <Stack.Screen name="DoctorList" component={DoctorListScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DoctorProfile" component={DoctorProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AppointmentBooking" component={AppointmentBookingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MyAppointments" component={MyAppointmentsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="VideoConsultation" component={VideoConsultationScreen} options={{ headerShown: false }} />

        {/* Admin */}
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddDoctor" component={AddDoctorScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AdminPCOSResources" component={AdminPCOSResourcesScreen} options={{ headerShown: false }} />

        {/* Doctor */}
        <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DoctorAppointments" component={DoctorAppointmentsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AvailabilityEditor" component={AvailabilityEditorScreen} options={{ headerShown: false }} />

        {/* Community & Health Support */}
        <Stack.Screen name="ForumHome" component={ForumHomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PCOSSupport" component={PCOSSupportScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EmergencyLocator" component={EmergencyLocatorScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ForumAdmin" component={ForumAdminScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
      <IncomingCallOverlay />
    </NavigationContainer>
  );
};

export default AppNavigator;