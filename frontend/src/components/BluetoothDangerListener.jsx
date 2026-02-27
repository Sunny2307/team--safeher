import React, { useEffect } from 'react';
import { bluetoothService } from '../services/BluetoothService';

export default function BluetoothDangerListener({ onDanger }) {
  useEffect(() => {
    console.log('Registering BluetoothDangerListener');
    bluetoothService.addListener(onDanger);

    return () => {
      console.log('Unregistering BluetoothDangerListener');
      bluetoothService.removeListener(onDanger);
    };
  }, [onDanger]);

  return null;
}