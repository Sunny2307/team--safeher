package com.safeher.safety

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.safeher.safety.PowerButtonModule
import com.safeher.safety.SMSModule

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> {
          val packages = PackageList(this).packages.toMutableList()
          // Add PowerButtonModule and SMSModule
          packages.add(object : ReactPackage {
            override fun createNativeModules(reactContext: com.facebook.react.bridge.ReactApplicationContext): List<com.facebook.react.bridge.NativeModule> {
              Log.d("MainApplication", "Adding PowerButtonModule and SMSModule to native modules")
              return listOf(
                PowerButtonModule(reactContext),
                SMSModule(reactContext)
              )
            }
            override fun createViewManagers(reactContext: com.facebook.react.bridge.ReactApplicationContext): List<com.facebook.react.uimanager.ViewManager<*, *>> {
              return emptyList()
            }
          })
          // Add react-native-immediate-phone-call
          try {
            val immediatePhoneCallPackage = Class.forName("com.rnim.rn.immediatephonecall.RNImmediatePhoneCallPackage").getConstructor().newInstance() as ReactPackage
            Log.d("MainApplication", "Adding RNImmediatePhoneCallPackage")
            packages.add(immediatePhoneCallPackage)
          } catch (e: Exception) {
            Log.w("MainApplication", "RNImmediatePhoneCallPackage not found", e)
          }
          // Add react-native-sms (keeping for compatibility, but we'll use SMSModule)
          try {
            val smsPackage = Class.forName("com.github.herokotlin.sms.RNReactNativeSmsPackage").getConstructor().newInstance() as ReactPackage
            Log.d("MainApplication", "Adding RNReactNativeSmsPackage")
            packages.add(smsPackage)
          } catch (e: Exception) {
            Log.w("MainApplication", "RNReactNativeSmsPackage not found", e)
          }
          return packages
        }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
  }
}


