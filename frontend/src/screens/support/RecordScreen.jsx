import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Animated, Alert, Platform, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { request, PERMISSIONS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';
import axios from 'axios';
import { Video } from 'react-native-compressor';
import RNFS from 'react-native-fs';

const RecordScreen = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [canStopRecording, setCanStopRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const navigation = useNavigation();
  const cameraRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const historyScaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const device = useCameraDevice('back');

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const cameraStatus = await request(
          Platform.OS === 'ios'
            ? PERMISSIONS.IOS.CAMERA
            : PERMISSIONS.ANDROID.CAMERA
        );
        const micStatus = await request(
          Platform.OS === 'ios'
            ? PERMISSIONS.IOS.MICROPHONE
            : PERMISSIONS.ANDROID.RECORD_AUDIO
        );

        if (cameraStatus === 'granted' && micStatus === 'granted') {
          setHasPermission(true);
        } else {
          Alert.alert(
            'Permissions Denied',
            'Camera and microphone permissions are required to record videos.'
          );
        }
      } catch (error) {
        console.error('Permission request error:', error);
      }
    };

    requestPermissions();
  }, []);

  useEffect(() => {
    if (isProcessing) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      rotateAnim.setValue(0);
    }
  }, [isProcessing]);

  const saveRecording = async (videoPath) => {
    try {
      const existingRecordings = await AsyncStorage.getItem('recordings');
      const recordings = existingRecordings ? JSON.parse(existingRecordings) : [];
      
      recordings.push({
        uri: videoPath,
        timestamp: new Date().toISOString(),
      });

      await AsyncStorage.setItem('recordings', JSON.stringify(recordings));
    } catch (error) {
      console.error('Error saving recording to AsyncStorage:', error);
    }
  };

  const uploadToDriveAndShare = async (videoPath) => {
    try {
      setIsProcessing(true);
      setProcessingStatus('Analyzing video size...');
      
      // Check file size first
      const fileInfo = await RNFS.stat(videoPath);
      const fileSizeMB = fileInfo.size / (1024 * 1024);
      console.log(`Original video size: ${fileSizeMB.toFixed(2)} MB`);
      
      setProcessingStatus('Compressing video...');
      console.log('Compressing video:', videoPath);
      // Dynamic compression based on file size
      let compressionSettings = {
        compressionMethod: 'auto',
        maxSize: 720,
        bitrate: 800000,
        outputFormat: 'mp4',
        codec: 'h264',
        minimumBitrate: 400000,
        getCancellationId: (cancellationId) => {
          console.log('Compression cancellation ID:', cancellationId);
        }
      };

      // More aggressive compression for large files
      if (fileSizeMB > 50) {
        compressionSettings.maxSize = 480;
        compressionSettings.bitrate = 400000;
        compressionSettings.minimumBitrate = 200000;
        console.log('Large file detected, using aggressive compression');
      } else if (fileSizeMB > 20) {
        compressionSettings.maxSize = 640;
        compressionSettings.bitrate = 600000;
        compressionSettings.minimumBitrate = 300000;
        console.log('Medium file detected, using moderate compression');
      }

      const compressedVideoPath = await Video.compress(
        videoPath,
        compressionSettings,
        (progress) => {
          console.log('Compression progress:', progress);
          setProcessingStatus(`Compressing video... ${Math.round(progress * 100)}%`);
        }
      );
      console.log('Compressed video path:', compressedVideoPath);
      
      // Check compressed file size
      const compressedFileInfo = await RNFS.stat(compressedVideoPath);
      const compressedSizeMB = compressedFileInfo.size / (1024 * 1024);
      console.log(`Compressed video size: ${compressedSizeMB.toFixed(2)} MB`);
      console.log(`Size reduction: ${((fileSizeMB - compressedSizeMB) / fileSizeMB * 100).toFixed(1)}%`);
      
      setProcessingStatus(`Compression complete (${compressedSizeMB.toFixed(1)}MB). Uploading...`);

      const formData = new FormData();
      formData.append('video', {
        uri: compressedVideoPath,
        type: 'video/mp4',
        name: `compressed_recording_${new Date().toISOString()}.mp4`,
      });

      console.log('Uploading compressed video to server with path:', compressedVideoPath);

      // First, check if server is reachable
      setProcessingStatus('Checking server connection...');
      try {
        const serverCheck = await axios.get('https://safeher-backend-vercel.vercel.app/health', { timeout: 5000 });
        console.log('Server is reachable:', serverCheck.status);
      } catch (serverError) {
        console.error('Server connectivity check failed:', serverError.message);
        // Try to ping the server with a simple request
        try {
          await axios.get('https://safeher-backend-vercel.vercel.app/', { timeout: 3000 });
          console.log('Server responded to root endpoint');
        } catch (pingError) {
          throw new Error('Server is not reachable. Please ensure the backend server is running.');
        }
      }

      const maxRetries = 2; // Reduced from 3 to 2 for faster failure
      let attempt = 1;
      let response;

      // Dynamic timeout based on file size
      const timeoutMs = Math.max(30000, Math.min(120000, compressedSizeMB * 2000)); // 30s to 2min based on size
      console.log(`Using timeout: ${timeoutMs}ms for ${compressedSizeMB.toFixed(1)}MB file`);

      while (attempt <= maxRetries) {
        try {
          console.log(`Upload attempt ${attempt} of ${maxRetries}`);
          response = await axios.post('https://safeher-backend-vercel.vercel.app/upload-video', formData, {
            headers: { 
              'Content-Type': 'multipart/form-data',
              'Accept': 'application/json',
            },
            timeout: timeoutMs,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total && progressEvent.loaded) {
                const percentCompleted = Math.min(100, Math.round((progressEvent.loaded * 100) / progressEvent.total));
                setProcessingStatus(`Uploading... ${percentCompleted}%`);
                console.log(`Upload progress: ${percentCompleted}% (${progressEvent.loaded}/${progressEvent.total} bytes)`);
              } else {
                setProcessingStatus('Uploading...');
                console.log('Upload progress: calculating...');
              }
            },
          });
          break;
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error.message, error.code, error.config?.url, error.response ? error.response.status : 'No response');
          
          // Check for specific error types
          if (error.code === 'ECONNABORTED' || error.message.includes('Network Error') || error.message.includes('timeout')) {
            if (attempt === maxRetries) {
              throw new Error(`Upload failed after ${maxRetries} attempts. Network connection issue. Please check your internet connection and ensure the server is running.`);
            }
            const delay = attempt * 1000; // Reduced delay: 1s, 2s
            console.log(`Retrying after ${delay}ms...`);
            setProcessingStatus(`Retrying upload... (${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
          } else if (error.response) {
              // Server responded with an error
              throw new Error(`Server error: ${error.response.status} - ${error.response.data?.message || error.message}`);
            } else {
              // Other network issues
              throw new Error(`Network error: ${error.message}. Please check your connection and try again.`);
            }
          }
        }

      if (response.data.success) {
        const videoUrl = response.data.videoUrl;
        console.log('Server response:', response.data);
        console.log('Video URL to be shared:', videoUrl);
        if (!videoUrl || !videoUrl.startsWith('http')) {
          throw new Error('Invalid video URL returned from server');
        }
        try {
          const statusResponse = await axios.get('https://safeher-backend-vercel.vercel.app/video-status', {
            params: { videoUrl },
          });
          if (statusResponse.data.status !== 'ready') {
            throw new Error('Video is still processing on the server');
          }
        } catch (error) {
          console.warn('Video status check failed:', error.message);
        }
        setProcessingStatus('Upload complete!');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay to show completion
        navigation.navigate('ShareVideoScreen', { videoUrl });
        await RNFS.unlink(compressedVideoPath).catch(err => console.log('Failed to delete compressed file:', err));
      } else {
        throw new Error('Upload failed: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error during compression or upload:', error);
      Alert.alert(
        'Error',
        'Failed to compress or upload video. Please ensure the server is running and both devices are connected to the internet.'
      );
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleRecordingToggle = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not initialized.');
      return;
    }

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (!isRecording) {
      try {
        console.log('Starting recording...');
        setIsRecording(true);
        setCanStopRecording(false);

        await cameraRef.current.startRecording({
          onRecordingFinished: async (video) => {
            console.log('Recording finished - Video Object:', video);
            setIsRecording(false);
            setCanStopRecording(false);
            if (video?.path) {
              await saveRecording(video.path);
              console.log('Recording saved to history with path:', video.path);
              await uploadToDriveAndShare(video.path);
            } else {
              Alert.alert('Warning', 'Recording finished but no file was saved.');
            }
          },
          onRecordingError: (error) => {
            console.error('Recording error:', error);
            Alert.alert('Error', 'Recording failed: ' + error.message);
            setIsRecording(false);
            setCanStopRecording(false);
          },
          videoCodec: 'h264',
          fileType: 'mp4',
          frameProcessor: Platform.OS === 'android' ? 'yuv' : undefined,
        });

        setTimeout(() => {
          console.log('Recording can now be stopped');
          setCanStopRecording(true);
        }, 3000);
      } catch (error) {
        console.error('Start recording error:', error);
        Alert.alert('Error', 'Could not start recording: ' + error.message);
        setIsRecording(false);
        setCanStopRecording(false);
      }
    } else {
      if (!canStopRecording) {
        Alert.alert('Hold on', 'Please wait a few seconds before stopping the recording.');
        return;
      }

      try {
        console.log('Stopping recording...');
        await cameraRef.current.stopRecording();
      } catch (error) {
        console.error('Stop recording error:', error);
        Alert.alert('Error', 'Could not stop recording: ' + error.message);
        setIsRecording(false);
        setCanStopRecording(false);
      }
    }
  };

  const handleHistoryTap = () => {
    navigation.navigate('RecordingHistoryScreen');
    Animated.sequence([
      Animated.timing(historyScaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(historyScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (!device) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>No back camera available on this device.</Text>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Waiting for camera and microphone permissions...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundOverlay} />
      <Camera
        ref={cameraRef}
        // style={{ width: 200, height: 150, position: 'absolute', top: 20, left: 20 }}
        device={device}
        isActive={true}
        video={true}
        audio={true}
        location={false}
      />
      <Header />
      <View style={styles.mainContent}>
        <Animated.View style={{ transform: [{ scale: historyScaleAnim }] }}>
          <TouchableOpacity style={styles.historySection} onPress={handleHistoryTap}>
            <Icon name="mic-circle" size={24} color="#FF69B4" style={styles.historyIcon} />
            <Text style={styles.historyText}>Recording: Tap to see history</Text>
            <Icon name="chevron-forward" size={20} color="#555" />
          </TouchableOpacity>
        </Animated.View>
        <Text style={styles.welcomeText}>
          Record a video and share it with friends automatically!
        </Text>
        <View style={styles.spacer} />
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={styles.recordButtonContainer}
            onPress={handleRecordingToggle}
            disabled={isProcessing}
          >
            <View
              style={[
                styles.recordButton,
                {
                  backgroundColor: isRecording ? '#FF4B5C' : '#FF69B4',
                  borderColor: isRecording ? '#FF69B4' : '#FF4B5C',
                },
              ]}
            >
              <Icon
                name={isRecording ? 'stop-circle' : 'mic-circle'}
                size={40}
                color="#fff"
                style={styles.recordIcon}
              />
              <Text style={styles.recordButtonText}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
      <Modal
        visible={isProcessing}
        transparent={true}
        animationType="none"
      >
        <Animated.View style={[styles.loadingOverlay, { opacity: fadeAnim }]}>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            }}
          >
            <Icon name="refresh-circle" size={50} color="#FF69B4" />
          </Animated.View>
          <Text style={styles.loadingText}>{processingStatus}</Text>
        </Animated.View>
      </Modal>
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
    backgroundColor: 'rgba(255, 105, 180, 0.05)',
  },
  mainContent: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  historySection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    borderWidth: 1,
    borderColor: '#FF69B4',
  },
  historyIcon: {
    marginRight: 12,
  },
  historyText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF69B4',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  spacer: {
    flex: 1,
  },
  recordButtonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    borderWidth: 2,
  },
  recordIcon: {
    marginRight: 15,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(255, 105, 180, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    textAlign: 'center',
  },
});

export default RecordScreen;