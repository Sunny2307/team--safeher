const fs = require('fs');
const path = require('path');

console.log('Copying SafeHer logo to iOS AppIcon directory...');

const sourceLogo = path.join(__dirname, '../src/assets/safeher_logo.png');
const iosAppIconDir = path.join(__dirname, '../ios/SafeHer/Images.xcassets/AppIcon.appiconset');

// Check if source logo exists
if (!fs.existsSync(sourceLogo)) {
  console.log('❌ Error: safeher_logo.png not found in src/assets/');
  process.exit(1);
}

// Check if iOS AppIcon directory exists
if (!fs.existsSync(iosAppIconDir)) {
  console.log('❌ Error: iOS AppIcon directory not found');
  console.log('Expected location:', iosAppIconDir);
  process.exit(1);
}

// Create all the required icon files by copying the source logo
const iosIconSizes = [
  { name: 'icon-20x20.png', size: 20 },
  { name: 'icon-29x29.png', size: 29 },
  { name: 'icon-40x40.png', size: 40 },
  { name: 'icon-58x58.png', size: 58 },
  { name: 'icon-60x60.png', size: 60 },
  { name: 'icon-76x76.png', size: 76 },
  { name: 'icon-80x80.png', size: 80 },
  { name: 'icon-87x87.png', size: 87 },
  { name: 'icon-120x120.png', size: 120 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-167x167.png', size: 167 },
  { name: 'icon-180x180.png', size: 180 },
  { name: 'icon-1024x1024.png', size: 1024 },
];

console.log('📱 Creating iOS app icons...');
console.log('');

let successCount = 0;
let errorCount = 0;

iosIconSizes.forEach(({ name, size }) => {
  const targetPath = path.join(iosAppIconDir, name);
  
  try {
    // Copy the source logo to the target location
    fs.copyFileSync(sourceLogo, targetPath);
    console.log(`✅ Created ${name} (${size}x${size})`);
    successCount++;
  } catch (error) {
    console.log(`❌ Failed to create ${name}: ${error.message}`);
    errorCount++;
  }
});

console.log('');
console.log(`📊 Results: ${successCount} successful, ${errorCount} failed`);
console.log('');

if (successCount > 0) {
  console.log('🎉 iOS app icons created successfully!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Open your iOS project in Xcode');
  console.log('2. Go to Images.xcassets > AppIcon');
  console.log('3. Drag and drop the generated icons to their respective slots');
  console.log('4. Or use the Contents.json file to reference the icons');
  console.log('');
  console.log('⚠️  Note: You may need to manually resize the icons for optimal quality');
  console.log('   Consider using an online tool like https://appicon.co/ for best results');
} else {
  console.log('❌ No icons were created. Please check the error messages above.');
}
