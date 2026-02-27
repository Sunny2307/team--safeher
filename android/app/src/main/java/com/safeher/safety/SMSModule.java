package com.safeher.safety;

import android.telephony.SmsManager;
import android.util.Log;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;

public class SMSModule extends ReactContextBaseJavaModule {
    private static final String TAG = "SMSModule";

    public SMSModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "SMSModule";
    }

    @ReactMethod
    public void sendSMS(String phoneNumber, String message, Callback successCallback, Callback errorCallback) {
        try {
            SmsManager smsManager = SmsManager.getDefault();
            smsManager.sendTextMessage(phoneNumber, null, message, null, null);
            Log.d(TAG, "SMS sent to " + phoneNumber);
            successCallback.invoke("SMS sent successfully");
        } catch (Exception e) {
            Log.e(TAG, "Failed to send SMS", e);
            errorCallback.invoke(e.getMessage());
        }
    }
}


