import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { Alert, Platform, PermissionsAndroid, Linking } from 'react-native';

class BluetoothService {
  constructor() {
    this.device = null;
    this.listeners = [];
    this.isConnecting = false;
    this.connectionCheckInterval = null;
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
        const results = await PermissionsAndroid.requestMultiple(permissions);
        const allGranted = Object.values(results).every(
          (result) => result === PermissionsAndroid.RESULTS.GRANTED
        );
        if (!allGranted) {
          console.log('Some Bluetooth permissions were denied:', results);
          // Alert.alert(
          //   'Bluetooth Permissions Required',
          //   'Please enable Bluetooth permissions in Settings > Apps > SafeHer > Permissions to connect to your ESP32 device.',
          //   [
          //     { text: 'Cancel', style: 'cancel' },
          //     { text: 'Open Settings', onPress: () => Linking.openSettings() },
          //   ]
          // );
          return false;
        }
        return true;
      } catch (err) {
        console.warn('Bluetooth Permission Error:', err);
        return false;
      }
    }
    return true;
  }

  async connect() {
    if (this.device || this.isConnecting) {
      console.log('Bluetooth already connected or connecting:', !!this.device, this.isConnecting);
      return;
    }

    this.isConnecting = true;
    const maxRetries = 3;
    let attempt = 1;

    while (attempt <= maxRetries && !this.device) {
      try {
        console.log(`Attempting to connect to ESP32 (Attempt ${attempt} of ${maxRetries})...`);
        if (!RNBluetoothClassic) {
          console.error('RNBluetoothClassic is not initialized');
          Alert.alert('Bluetooth Error', 'Bluetooth module is not initialized.');
          break;
        }

        if (typeof RNBluetoothClassic.isBluetoothEnabled !== 'function') {
          console.error('isBluetoothEnabled is not available on RNBluetoothClassic');
          Alert.alert('Bluetooth Error', 'Bluetooth enabled check is not supported in this version.');
          break;
        }

        const enabled = await RNBluetoothClassic.isBluetoothEnabled();
        if (!enabled) {
          // Alert.alert(
          //   'Bluetooth Required',
          //   'Please enable Bluetooth to connect to your ESP32 device.',
          //   [
          //     { text: 'Cancel', style: 'cancel' },
          //     { text: 'Enable Bluetooth', onPress: () => RNBluetoothClassic.requestBluetoothEnabled() },
          //   ]
          // );
          console.log('Bluetooth is disabled, skipping connection');
          break;
        }

        const devices = await RNBluetoothClassic.getBondedDevices();
        console.log('Available Bluetooth devices:', devices);
        const esp32 = devices.find((d) => d.name === 'ESP32');
        if (!esp32) {
          console.log('ESP32 not found in paired devices. Available devices:', devices.map((d) => d.name));
          // Alert.alert(
          //   'ESP32 Not Found',
          //   'Please pair your ESP32 device with your phone first. Go to Bluetooth settings and pair with "ESP32".',
          //   [
          //     { text: 'Cancel', style: 'cancel' },
          //     { text: 'Open Bluetooth Settings', onPress: () => Linking.openSettings() },
          //   ]
          // );
          break;
        }

        console.log('Connecting to ESP32...');
        const connectedDevice = await esp32.connect();
        this.device = esp32;
        console.log('Successfully connected to ESP32:', connectedDevice);

        // Set up data received listener
        esp32.onDataReceived((event) => {
          console.log('Received data from ESP32:', event.data);
          if (event.data.trim() === 'DANGER') {
            console.log('DANGER message received! Triggering SOS...');
            Alert.alert(
              'Emergency Triggered',
              'Hardware SOS button pressed! Initiating emergency call...',
              [{ text: 'OK' }]
            );
            this.listeners.forEach((callback) => callback());
          }
        });

        // Start periodic connection check
        this.connectionCheckInterval = setInterval(async () => {
          if (this.device && !(await this.device.isConnected())) {
            console.log('ESP32 disconnected');
            this.device = null;
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
            Alert.alert(
              'ESP32 Disconnected',
              'Your ESP32 device has disconnected. Please check the connection.',
              [{ text: 'OK' }]
            );
          }
        }, 5000); // Check every 5 seconds
        break; // Exit loop if connection succeeds
      } catch (error) {
        console.error(`Bluetooth connection error on attempt ${attempt}:`, error);
        if (attempt === maxRetries) {
          Alert.alert('Connection Error', `Failed to connect to ESP32 after ${maxRetries} attempts: ${error.message}`, [{ text: 'OK' }]);
        }
        attempt++;
        if (attempt <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
        }
      }
    }

    this.isConnecting = false;
  }

  async initialize() {
    const hasPermissions = await this.requestPermissions();
    if (hasPermissions) {
      await this.connect();
    }
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter((cb) => cb !== callback);
  }

  async disconnect() {
    if (this.device) {
      console.log('Disconnecting from ESP32...');
      try {
        clearInterval(this.connectionCheckInterval); // Clear the interval
        await this.device.disconnect();
        this.device = null;
      } catch (error) {
        console.error('Error disconnecting from ESP32:', error);
      }
    }
  }
}

export const bluetoothService = new BluetoothService();