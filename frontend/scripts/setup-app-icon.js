const fs = require('fs');
const path = require('path');

console.log('SafeHer App Icon Setup');
console.log('======================');
console.log('');

// Check if logo exists
const logoPath = path.join(__dirname, '../src/assets/safeher_logo.png');
if (!fs.existsSync(logoPath)) {
  console.log('❌ Error: safeher_logo.png not found in src/assets/');
  console.log('Please make sure your logo file exists at: src/assets/safeher_logo.png');
  process.exit(1);
}

console.log('✅ Found SafeHer logo at:', logoPath);
console.log('');

console.log('📱 Android Icon Setup:');
console.log('----------------------');
console.log('1. Copy your safeher_logo.png to these locations:');
console.log('');

const androidPaths = [
  'android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png',
  'android/app/src/main/res/mipmap-hdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png',
  'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png',
  'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png',
];

androidPaths.forEach((filePath, index) => {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`   ${exists ? '✅' : '❌'} ${filePath}`);
});

console.log('');
console.log('🍎 iOS Icon Setup:');
console.log('-------------------');
console.log('1. Copy your safeher_logo.png to these locations:');
console.log('');

const iosPaths = [
  'ios/SafeHer/Images.xcassets/AppIcon.appiconset/icon-20x20.png',
  'ios/SafeHer/Images.xcassets/AppIcon.appiconset/icon-29x29.png',
  'ios/SafeHer/Images.xcassets/AppIcon.appiconset/icon-40x40.png',
  'ios/SafeHer/Images.xcassets/AppIcon.appiconset/icon-58x58.png',
  'ios/SafeHer/Images.xcassets/AppIcon.appiconset/icon-60x60.png',
  'ios/SafeHer/Images.xcassets/AppIcon.appiconset/icon-76x76.png',
  'ios/SafeHer/Images.xcassets/AppIcon.appiconset/icon-80x80.png',
  'ios/SafeHer/Images.xcassets/AppIcon.appiconset/icon-87x87.png',
  'ios/SafeHer/Images.xcassets/AppIcon.appiconset/icon-120x120.png',
  'ios/SafeHer/Images.xcassets/AppIcon.appiconset/icon-152x152.png',
  'ios/SafeHer/Images.xcassets/AppIcon.appiconset/icon-167x167.png',
  'ios/SafeHer/Images.xcassets/AppIcon.appiconset/icon-180x180.png',
  'ios/SafeHer/Images.xcassets/AppIcon.appiconset/icon-1024x1024.png',
];

iosPaths.forEach((filePath, index) => {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`   ${exists ? '✅' : '❌'} ${filePath}`);
});

console.log('');
console.log('🛠️  Quick Setup Options:');
console.log('-------------------------');
console.log('');
console.log('Option 1: Use an online icon generator:');
console.log('   • https://appicon.co/ (Recommended)');
console.log('   • https://icon.kitchen/');
console.log('   • https://makeappicon.com/');
console.log('');
console.log('Option 2: Use ImageMagick (if installed):');
console.log('   • Install ImageMagick first');
console.log('   • Run: convert src/assets/safeher_logo.png -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png');
console.log('');
console.log('Option 3: Manual copy and resize:');
console.log('   • Copy safeher_logo.png to each location');
console.log('   • Resize to the required dimensions');
console.log('');
console.log('📋 Next Steps:');
console.log('1. Replace all the ❌ files with your SafeHer logo');
console.log('2. Resize each icon to the correct dimensions');
console.log('3. Run: npx react-native run-android (or run-ios) to test');
console.log('4. The splash screen will automatically show your logo!');
console.log('');
console.log('🎨 Pro Tips:');
console.log('• Make sure your logo is square and high resolution');
console.log('• Use PNG format for best quality');
console.log('• Test on different screen densities');
console.log('• The splash screen will use the logo from src/assets/safeher_logo.png');
