const fs = require('fs');
const path = require('path');

console.log('🔄 Replacing Android app icons with SafeHer logo...');

const sourceLogo = path.join(__dirname, '../src/assets/safeher_logo.png');

// Check if source logo exists
if (!fs.existsSync(sourceLogo)) {
  console.log('❌ Error: safeher_logo.png not found in src/assets/');
  process.exit(1);
}

// Android icon directories and their required sizes
const androidIconDirs = [
  { dir: 'android/app/src/main/res/mipmap-mdpi', size: 48 },
  { dir: 'android/app/src/main/res/mipmap-hdpi', size: 72 },
  { dir: 'android/app/src/main/res/mipmap-xhdpi', size: 96 },
  { dir: 'android/app/src/main/res/mipmap-xxhdpi', size: 144 },
  { dir: 'android/app/src/main/res/mipmap-xxxhdpi', size: 192 },
];

console.log('📱 Replacing Android app icons...');
console.log('');

let successCount = 0;
let errorCount = 0;

androidIconDirs.forEach(({ dir, size }) => {
  const fullDir = path.join(__dirname, '..', dir);
  
  // Check if directory exists
  if (!fs.existsSync(fullDir)) {
    console.log(`❌ Directory not found: ${dir}`);
    errorCount++;
    return;
  }

  const iconFiles = ['ic_launcher.png', 'ic_launcher_round.png'];
  
  iconFiles.forEach(iconFile => {
    const targetPath = path.join(fullDir, iconFile);
    
    try {
      // Copy the source logo to replace the existing icon
      fs.copyFileSync(sourceLogo, targetPath);
      console.log(`✅ Replaced ${dir}/${iconFile} (${size}x${size})`);
      successCount++;
    } catch (error) {
      console.log(`❌ Failed to replace ${dir}/${iconFile}: ${error.message}`);
      errorCount++;
    }
  });
});

console.log('');
console.log(`📊 Results: ${successCount} successful, ${errorCount} failed`);
console.log('');

if (successCount > 0) {
  console.log('🎉 Android app icons replaced successfully!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Clean and rebuild your Android project');
  console.log('2. Run: npx react-native run-android');
  console.log('3. Check your device/emulator for the new SafeHer icon');
  console.log('');
  console.log('⚠️  Note: You may need to uninstall and reinstall the app to see the new icon');
} else {
  console.log('❌ No icons were replaced. Please check the error messages above.');
}
