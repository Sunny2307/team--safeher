import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

const SERVER_IP_KEY = 'server_ip_address';
const SERVER_PORT = '3000';
const LOCAL_FALLBACK_BASE_URL = 'http://10.181.142.178:3000';
const PRODUCTION_URL = 'https://safeher-backend-render.onrender.com';
const DEFAULT_TIMEOUT = 5000; // 5 seconds timeout for IP detection


/**
 * Get the device's local IP address from network info
 */
const getDeviceNetworkInfo = async () => {
  try {
    const state = await NetInfo.fetch();
    if (state.details && state.details.ipAddress) {
      return state.details.ipAddress;
    }
  } catch (error) {
    console.log('Error getting network info:', error);
  }
  return null;
};

/**
 * Generate possible server IPs based on device IP
 */
const generatePossibleIPs = (deviceIP) => {
  if (!deviceIP) return [];

  const ipParts = deviceIP.split('.');
  if (ipParts.length !== 4) return [];

  const baseIP = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
  const possibleIPs = [];

  // Try common IPs in the same subnet
  for (let i = 1; i <= 254; i++) {
    possibleIPs.push(`${baseIP}.${i}`);
  }

  return possibleIPs;
};

/**
 * Test if a server IP is reachable
 */
const testServerIP = async (ip, port = SERVER_PORT) => {
  try {
    const url = ip === '10.181.142.178'
      ? `http://10.181.142.178:${port}/health`
      : `http://${ip}:${port}/health`;
    const response = await axios.get(url, { timeout: DEFAULT_TIMEOUT });
    return response.status === 200;
  } catch (error) {
    // If we get a response (even error), server is reachable
    if (error.response) {
      return true; // Server responded, it's reachable
    }
    // Connection refused or timeout means server is not reachable
    return false;
  }
};

/**
 * Auto-detect server IP by scanning common IPs
 */
const autoDetectServerIP = async () => {
  try {
    const deviceIP = await getDeviceNetworkInfo();
    if (!deviceIP) {
      console.log('Could not get device IP, trying common IPs');
      // Try common development IPs
      const commonIPs = ['192.168.1.100', '192.168.0.100', '192.168.1.1', '192.168.0.1'];
      for (const ip of commonIPs) {
        if (await testServerIP(ip)) {
          return ip;
        }
      }
      return null;
    }

    console.log('Device IP detected:', deviceIP);
    const ipParts = deviceIP.split('.');
    const baseIP = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
    const deviceLastOctet = parseInt(ipParts[3]);

    // Smart IP testing: test likely server IPs first
    // Common server IPs are usually .1, .100, .101, or near the device IP
    const priorityIPs = [
      `${baseIP}.1`,      // Router/gateway (often the dev machine)
      `${baseIP}.100`,    // Common static IP
      `${baseIP}.101`,    // Common static IP
      `${baseIP}.${deviceLastOctet - 1}`, // IP before device
      `${baseIP}.${deviceLastOctet + 1}`, // IP after device
      deviceIP,           // Device's own IP (in case server is on device)
    ];

    // Remove duplicates and invalid IPs
    const uniqueIPs = [...new Set(priorityIPs.filter(ip => {
      const lastOctet = parseInt(ip.split('.')[3]);
      return !isNaN(lastOctet) && lastOctet >= 1 && lastOctet <= 254;
    }))];

    console.log('Testing priority IPs:', uniqueIPs);

    // Test priority IPs first (these are most likely)
    for (const ip of uniqueIPs) {
      if (await testServerIP(ip)) {
        console.log('Found server at priority IP:', ip);
        return ip;
      }
    }

    // If priority IPs don't work, try a broader scan (every 5th IP)
    console.log('Priority IPs failed, scanning broader range...');
    const scanIPs = [];
    for (let i = 1; i <= 254; i += 5) {
      scanIPs.push(`${baseIP}.${i}`);
    }

    // Test in batches to avoid overwhelming
    const batchSize = 10;
    for (let i = 0; i < scanIPs.length; i += batchSize) {
      const batch = scanIPs.slice(i, i + batchSize);
      const testPromises = batch.map(async (ip) => {
        const isReachable = await testServerIP(ip);
        return isReachable ? ip : null;
      });

      const results = await Promise.all(testPromises);
      const reachableIP = results.find(ip => ip !== null);

      if (reachableIP) {
        console.log('Found server at scanned IP:', reachableIP);
        return reachableIP;
      }
    }

    return null;
  } catch (error) {
    console.error('Error auto-detecting server IP:', error);
    return null;
  }
};

/**
 * Get server IP address - tries stored IP first, then auto-detection
 */
export const getServerIP = async () => {
  try {
    // First, try to get stored IP
    const storedIP = await AsyncStorage.getItem(SERVER_IP_KEY);
    if (storedIP && storedIP !== '10.181.142.178') {
      // Quick check if stored IP is reachable (with shorter timeout)
      try {
        const isReachable = await testServerIP(storedIP);
        if (isReachable) {
          console.log('Using stored server IP:', storedIP);
          return storedIP;
        }
      } catch (error) {
        // If check fails, continue to auto-detection
        console.log('Stored IP check failed, will re-detect');
      }
      // Remove invalid stored IP
      await AsyncStorage.removeItem(SERVER_IP_KEY);
    }

    // Try 10.181.142.178 first (fastest)
    try {
      const url = `http://10.181.142.178:${SERVER_PORT}/health`;
      const response = await axios.get(url, { timeout: 1000 });
      if (response.status === 200) {
        return '10.181.142.178';
      }
    } catch (error) {
      if (error.response) {
        return '10.181.142.178'; // Server responded
      }
    }

    // Auto-detect server IP
    const detectedIP = await autoDetectServerIP();
    if (detectedIP) {
      await AsyncStorage.setItem(SERVER_IP_KEY, detectedIP);
      console.log('Server IP detected:', detectedIP);
      return detectedIP;
    }

    // Fallback to 10.181.142.178
    return '10.181.142.178';
  } catch (error) {
    console.error('Error getting server IP:', error);
    return '10.181.142.178';
  }
};

/**
 * Get the full server URL
 */
export const getServerURL = async () => {
  // If running in production (release build), use the production URL
  if (!__DEV__) {
    console.log('In production mode, using production URL');
    return PRODUCTION_URL;
  }

  try {
    const ip = await getServerIP();
    // If IP is '10.181.142.178', return the 10.181.142.178 URL directly
    if (ip === '10.181.142.178') {
      return LOCAL_FALLBACK_BASE_URL;
    }
    return `http://${ip}:${SERVER_PORT}`;
  } catch (error) {
    console.error('Error getting server URL:', error);
    return LOCAL_FALLBACK_BASE_URL;
  }
};

/**
 * Manually set server IP (for cases where auto-detection fails)
 */
export const setServerIP = async (ip) => {
  try {
    await AsyncStorage.setItem(SERVER_IP_KEY, ip);
    console.log('Server IP manually set to:', ip);
    return true;
  } catch (error) {
    console.error('Error setting server IP:', error);
    return false;
  }
};

/**
 * Clear stored server IP (force re-detection on next call)
 */
export const clearServerIP = async () => {
  try {
    await AsyncStorage.removeItem(SERVER_IP_KEY);
    console.log('Server IP cleared');
    return true;
  } catch (error) {
    console.error('Error clearing server IP:', error);
    return false;
  }
};

