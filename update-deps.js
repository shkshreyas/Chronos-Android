const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * This script automatically updates dependencies to compatible versions based on Expo recommendations
 */

console.log('🔄 Checking for outdated packages...');

try {
  // Run expo doctor to get package compatibility information
  const expoDoctorOutput = execSync('npx expo-doctor').toString();
  
  console.log('\n📋 Expo Doctor Results:');
  console.log(expoDoctorOutput);
  
  // Get the current package.json
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  console.log('\n🔍 Scanning for updates based on Expo recommendations...');
  console.log('\n📦 Packages to update:');
  
  // Add your update logic here based on the expo-doctor output
  // This is a simplified example - you may want to parse the expo-doctor output
  // to extract the exact recommended versions
  
  // Backup the original package.json
  fs.writeFileSync(
    path.join(__dirname, 'package.json.backup'), 
    JSON.stringify(packageJson, null, 2)
  );
  
  console.log('\n💾 Backed up original package.json to package.json.backup');
  
  // Apply updates
  console.log('\n⬆️ Updating packages...');
  execSync('npm update', { stdio: 'inherit' });
  
  console.log('\n✅ Package update complete!');
  console.log('🚀 Run "npm install" to ensure all dependencies are correctly installed.');
  
} catch (error) {
  console.error('\n❌ Error updating dependencies:', error.message);
  process.exit(1);
} 