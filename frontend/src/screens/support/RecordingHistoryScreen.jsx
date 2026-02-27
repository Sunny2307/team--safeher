import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import Video from 'react-native-video';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';

const RecordingHistoryScreen = () => {
  const [recordings, setRecordings] = useState([]);

  // Fetch recordings from AsyncStorage
  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const storedRecordings = await AsyncStorage.getItem('recordings');
        if (storedRecordings) {
          setRecordings(JSON.parse(storedRecordings));
        }
      } catch (error) {
        console.error('Error fetching recordings:', error);
      }
    };

    fetchRecordings();
  }, []);

  const renderRecordingItem = ({ item }) => (
    <View style={styles.recordingItem}>
      <Text style={styles.timestamp}>
        Recorded on: {new Date(item.timestamp).toLocaleString()}
      </Text>
      <Video
        source={{ uri: item.uri }}
        style={styles.video}
        controls={true}
        resizeMode="contain"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.mainContent}>
        <Text style={styles.title}>Recording History</Text>
        {recordings.length > 0 ? (
          <FlatList
            data={recordings}
            renderItem={renderRecordingItem}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <Text style={styles.noVideoText}>No recordings available.</Text>
        )}
      </View>
      {/* Bottom Navigation */}
      <BottomNav />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  mainContent: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  recordingItem: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  timestamp: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  video: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
  },
  noVideoText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default RecordingHistoryScreen;