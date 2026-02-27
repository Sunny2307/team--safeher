package com.safeher.safety;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.SystemClock;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import androidx.annotation.NonNull;

public class PowerButtonModule extends ReactContextBaseJavaModule {
    private static final String TAG = "PowerButtonModule";
    private static final String POWER_BUTTON_EVENT = "PowerButtonDoublePress";
    private static final long TIME_WINDOW_MS = 2000; // 2 seconds window for 2 presses
    private long[] pressTimestamps = new long[2];
    private int pressCount = 0;
    private BroadcastReceiver powerButtonReceiver;

    public PowerButtonModule(@NonNull ReactApplicationContext reactContext) {
        super(reactContext);
        Log.d(TAG, "Initializing PowerButtonModule");
        registerPowerButtonReceiver();
    }

    @NonNull
    @Override
    public String getName() {
        return "PowerButton";
    }

    @ReactMethod
    public void testModule() {
        Log.d(TAG, "PowerButtonModule test method called");
    }

    private void sendEvent(String eventName) {
        if (getReactApplicationContext().hasActiveCatalystInstance()) {
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, null);
            Log.d(TAG, "Emitted event: " + eventName);
        } else {
            Log.w(TAG, "No active Catalyst instance, event not emitted: " + eventName);
        }
    }

    private void registerPowerButtonReceiver() {
        powerButtonReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Log.d(TAG, "Received intent: " + (intent != null ? intent.getAction() : "null"));
                if (intent == null || intent.getAction() == null) {
                    return;
                }
                long currentTime = SystemClock.elapsedRealtime();
                pressTimestamps[pressCount % 2] = currentTime;
                pressCount++;

                if (pressCount >= 2) {
                    long timeDiff = pressTimestamps[(pressCount - 1) % 2] - pressTimestamps[(pressCount - 2) % 2];
                    Log.d(TAG, "Press count: " + pressCount + ", Time diff: " + timeDiff);
                    if (timeDiff <= TIME_WINDOW_MS) {
                        Log.d(TAG, "Double press detected, emitting event");
                        sendEvent(POWER_BUTTON_EVENT);
                        pressCount = 0; // Reset count
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        try {
            getReactApplicationContext().registerReceiver(powerButtonReceiver, filter);
            Log.d(TAG, "Power button receiver registered successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to register power button receiver", e);
        }
    }

    @Override
    public void onCatalystInstanceDestroy() {
        if (powerButtonReceiver != null) {
            try {
                getReactApplicationContext().unregisterReceiver(powerButtonReceiver);
                Log.d(TAG, "Power button receiver unregistered");
            } catch (Exception e) {
                Log.e(TAG, "Failed to unregister power button receiver", e);
            }
            powerButtonReceiver = null;
        }
    }
}


