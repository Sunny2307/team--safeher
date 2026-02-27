#!/usr/bin/env node
/**
 * Automatically sets up adb port forwarding before running Android app
 * This makes the app work on any network without hardcoded IPs
 */

const { execSync } = require('child_process');

function setupPortForwarding() {
  try {
    // Check if adb is available
    try {
      execSync('adb version', { stdio: 'ignore' });
    } catch (error) {
      console.log('⚠️  ADB not found. Make sure Android SDK platform-tools are in your PATH.');
      return;
    }

    // Check for connected devices
    const devicesOutput = execSync('adb devices', { encoding: 'utf-8' });
    const deviceLines = devicesOutput.split('\n').filter(line => line.trim() && !line.includes('List of devices'));
    const deviceCount = deviceLines.filter(line => line.includes('device')).length;

    if (deviceCount > 0) {
      // Set up port forwarding automatically
      try {
        // Forward Metro bundler port (8081)
        execSync('adb reverse tcp:8081 tcp:8081', { stdio: 'ignore' });
        console.log('✓ Metro port forwarding configured (192.168.1.208:8081)');

        // Forward backend API port (3000)
        execSync('adb reverse tcp:3000 tcp:3000', { stdio: 'ignore' });
        console.log('✓ Backend port forwarding configured (192.168.1.208:3000)');
      } catch (error) {
        console.log('⚠️  Could not set up port forwarding. Make sure USB debugging is enabled.');
      }
    } else {
      console.log('⚠️  No Android device connected. Connect your device via USB and enable USB debugging.');
    }
  } catch (error) {
    // Silently fail - don't block the build
  }
}

setupPortForwarding();

