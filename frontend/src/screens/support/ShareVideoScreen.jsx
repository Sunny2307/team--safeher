import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, SafeAreaView, FlatList, Animated } from 'react-native';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import { getFriends } from '../../api/api';
import { useNavigation } from '@react-navigation/native';

const ShareVideoScreen = ({ route }) => {
  const { videoUrl } = route.params;
  const [friends, setFriends] = useState([]);
  const navigation = useNavigation();
  const [scaleAnims, setScaleAnims] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  console.log('Received videoUrl in ShareVideoScreen:', videoUrl);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await getFriends();
        console.log('Fetched Friends:', response.data);
        const fetchedFriends = Array.isArray(response.data.friends) ? response.data.friends : [];
        setFriends(fetchedFriends);
        // Initialize scale animations for each friend
        setScaleAnims(fetchedFriends.map(() => new Animated.Value(1)));
        // Start fade-in animation for friend list
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error('Fetch Friends Error:', error);
        const errorMessage = error.response?.data?.error || 'Failed to fetch friends';
        Alert.alert('Error', errorMessage);
      }
    };

    fetchFriends();
  }, []);

  const handleShare = async (friendPhoneNumber, index) => {
    if (scaleAnims[index]) {
      Animated.sequence([
        Animated.timing(scaleAnims[index], {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnims[index], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (!friendPhoneNumber) {
      Alert.alert('Error', 'Please select a friend to share the video with.');
      return;
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(friendPhoneNumber.replace('+91', ''))) {
      Alert.alert('Invalid Number', 'The selected friend has an invalid 10-digit Indian mobile number.');
      return;
    }

    if (!videoUrl || !videoUrl.startsWith('http')) {
      Alert.alert('Error', 'Invalid video URL. Please try recording and uploading again.');
      return;
    }

    const formattedNumber = friendPhoneNumber.startsWith('+91') ? friendPhoneNumber : `+91${friendPhoneNumber}`;
    const whatsappUrl = `whatsapp://send?phone=${formattedNumber}&text=Check out this video: ${encodeURIComponent(videoUrl)}`;

    try {
      await Linking.openURL(whatsappUrl);
    } catch (error) {
      console.error('WhatsApp Error:', error);
      Alert.alert('Error', 'Unable to open WhatsApp. Please make sure it is installed.');
    }
  };

  const handleAddFriend = () => {
    navigation.navigate('AddFriendScreen');
  };

  const renderFriendItem = ({ item, index }) => (
    <Animated.View style={{ transform: [{ scale: scaleAnims[index] || 1 }], opacity: fadeAnim }}>
      <TouchableOpacity
        style={styles.friendItem}
        onPress={() => handleShare(item.phoneNumber, index)}
      >
        <Text style={styles.friendText}>
          {item.name || item.phoneNumber} {item.isSOS ? '(SOS)' : ''}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundOverlay} />
      <Header />
      <View style={styles.mainContent}>
        <Text style={styles.title}>Video Uploaded!</Text>
        {friends.length > 0 ? (
          <Animated.View style={[styles.friendsListContainer, { opacity: fadeAnim }]}>
            <Text style={styles.friendsListTitle}>Share with a Friend</Text>
            <FlatList
              data={friends}
              renderItem={renderFriendItem}
              keyExtractor={(item) => item.phoneNumber}
              style={styles.friendsList}
              ListEmptyComponent={<Text style={styles.noFriendsText}>No friends available.</Text>}
            />
          </Animated.View>
        ) : (
          <View style={styles.noFriendsContainer}>
            <Text style={styles.noFriendsText}>
              No friends available. Add friends to share your video!
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddFriend}>
              <Text style={styles.addButtonText}>Add Friends</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <BottomNav />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 105, 180, 0.08)',
  },
  mainContent: {
    flex: 1,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FF69B4',
    marginBottom: 40,
    textAlign: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    letterSpacing: 0.5,
  },
  friendsListContainer: {
    width: '100%',
    marginBottom: 30,
  },
  friendsListTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FF69B4',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  friendsList: {
    maxHeight: 350,
  },
  friendItem: {
    padding: 16,
    backgroundColor: 'rgba(255, 105, 180, 0.12)',
    borderRadius: 14,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  friendText: {
    fontSize: 17,
    color: '#333',
    fontWeight: '500',
  },
  noFriendsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noFriendsText: {
    fontSize: 17,
    color: '#555',
    textAlign: 'center',
    marginBottom: 25,
    fontWeight: '500',
    lineHeight: 24,
  },
  addButton: {
    backgroundColor: '#FF69B4',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default ShareVideoScreen;