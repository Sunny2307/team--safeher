import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getUser } from '../../api/api';
import Header from '../../components/Header';
import { useFeatures } from '../../context/FeatureContext';

const screenWidth = Dimensions.get('window').width;
const numColumns = 3;
const itemSpacing = 12;
const totalSpacing = itemSpacing * (numColumns + 1);
const itemSize = (screenWidth - totalSpacing) / numColumns;

const MenuScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { features } = useFeatures();

  const menuItems = [
    ...(features?.liveLocation !== false ? [{ name: 'Live Location', icon: 'location-outline', screen: 'LiveLocationScreen' }] : []),
    ...(features?.stressAssessment !== false ? [{ name: 'Stress Assessment', icon: 'heart-outline', screen: 'RoleSelectionScreen' }] : []),
    ...(features?.friends !== false ? [{ name: 'Friends', icon: 'people-outline', screen: 'AddFriendScreen' }] : []),
    { name: 'Log Out', icon: 'log-out-outline', action: () => handleLogout() },
  ];

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        // Prefer backend user with JWT if available
        try {
          const response = await getUser();
          if (mounted) setUser(response.data);
        } catch (e) {
          // Fallback: derive from last used phone number if present
          const lastPhone = await AsyncStorage.getItem('lastUsedPhoneNumber');
          if (mounted) setUser({ phoneNumber: lastPhone || '', name: '' });
        }
      } catch (err) {
        if (mounted) setError(err?.response?.data?.error || err?.message || 'Failed to load user');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleLogout = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'SignUpLogin' }],
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => {
        if (item.screen) {
          navigation.navigate(item.screen);
        } else if (item.action) {
          item.action();
        }
      }}
    >
      <View style={styles.iconContainer}>
        <Icon name={item.icon} size={32} color="#FF69B4" />
      </View>
      <Text style={styles.gridText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header />

      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? String(user.name).charAt(0).toUpperCase() : (user?.phoneNumber ? String(user.phoneNumber).slice(-1) : 'U')}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>
              {loading ? 'Loading…' : (user?.name && user.name.trim().length > 0 ? user.name : 'Your Profile')}
            </Text>
            <Text style={styles.phoneNumber}>
              {user?.phoneNumber ? `+91 ${String(user.phoneNumber).replace(/\D/g, '').slice(-10)}` : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editIcon} onPress={() => navigation.navigate('CompleteProfileScreen')}>
          <Icon name="pencil-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <FlatList
        data={menuItems}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        numColumns={numColumns}
        contentContainerStyle={styles.gridContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#FF69B4',
    borderRadius: 15,
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FF69B4',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  phoneNumber: {
    fontSize: 14,
    color: '#F5F7FA',
    opacity: 0.9,
  },
  editIcon: {
    padding: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  gridContainer: {
    paddingHorizontal: itemSpacing,
    paddingBottom: 20,
  },
  gridItem: {
    width: itemSize,
    aspectRatio: 1,
    backgroundColor: '#FFF',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    margin: itemSpacing / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  iconContainer: {
    padding: 10,
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderRadius: 15,
    marginBottom: 5,
  },
  gridText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default MenuScreen;