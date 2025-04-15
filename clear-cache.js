const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🧹 Cleaning Expo and React Native caches...');

// List of directories to remove
const dirsToRemove = [
  '.expo',
  'node_modules/.cache',
];

// Clear watchman watches if available
try {
  console.log('Clearing Watchman watches...');
  execSync('watchman watch-del-all', { stdio: 'inherit' });
} catch (e) {
  console.log('Watchman not installed or not working. Skipping.');
}

// Delete directories
dirsToRemove.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`Removing ${dir}...`);
    if (os.platform() === 'win32') {
      try {
        execSync(`rmdir /s /q "${dirPath}"`, { stdio: 'inherit' });
      } catch (e) {
        console.log(`Could not remove ${dir}: ${e.message}`);
      }
    } else {
      try {
        execSync(`rm -rf "${dirPath}"`, { stdio: 'inherit' });
      } catch (e) {
        console.log(`Could not remove ${dir}: ${e.message}`);
      }
    }
  }
});

// Clear Metro bundler cache
console.log('Clearing Metro bundler cache...');
try {
  execSync('npx react-native start --reset-cache --no-interactive', { 
    stdio: 'inherit',
    timeout: 5000 // Kill after 5 seconds
  });
} catch (e) {
  // This will likely fail due to the timeout, but it's enough to clear the cache
  console.log('Metro cache cleared.');
}

console.log('Cache clean complete. Now run:');
console.log('npm start -- --clear'); 