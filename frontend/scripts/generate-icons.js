const fs = require('fs');
const path = require('path');

// This script will help generate app icons from the SafeHer logo
// You'll need to manually copy the safeher_logo.png to the appropriate icon sizes

const iconSizes = {
  android: {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  },
  ios: {
    '20x20': 20,
    '29x29': 29,
    '40x40': 40,
    '58x58': 58,
    '60x60': 60,
    '76x76': 76,
    '80x80': 80,
    '87x87': 87,
    '120x120': 120,
    '152x152': 152,
    '167x167': 167,
    '180x180': 180,
    '1024x1024': 1024,
  }
};

console.log('SafeHer App Icon Generation Guide');
console.log('==================================');
console.log('');
console.log('To set up your app icons, you need to:');
console.log('');
console.log('1. Copy your safeher_logo.png to the following sizes:');
console.log('');
console.log('Android Icons (place in android/app/src/main/res/):');
Object.entries(iconSizes.android).forEach(([folder, size]) => {
  console.log(`   ${folder}/ic_launcher.png (${size}x${size})`);
  console.log(`   ${folder}/ic_launcher_round.png (${size}x${size})`);
});
console.log('');
console.log('iOS Icons (place in ios/SafeHer/Images.xcassets/AppIcon.appiconset/):');
Object.entries(iconSizes.ios).forEach(([size, pixels]) => {
  console.log(`   icon-${size}.png (${pixels}x${pixels})`);
});
console.log('');
console.log('2. Use an online icon generator like:');
console.log('   - https://appicon.co/');
console.log('   - https://icon.kitchen/');
console.log('   - https://makeappicon.com/');
console.log('');
console.log('3. Or use ImageMagick to resize manually:');
console.log('   convert safeher_logo.png -resize 48x48 ic_launcher.png');
console.log('');
console.log('4. Update the Contents.json file in iOS AppIcon.appiconset folder');
console.log('');
console.log('Note: Make sure your logo is square and high resolution for best results!');
