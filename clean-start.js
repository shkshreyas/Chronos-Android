#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🧹 Cleaning Expo cache and node_modules...');

try {
  // Kill any running Metro bundler processes
  console.log('🔄 Stopping Metro bundler if running...');
  try {
    if (os.platform() === 'win32') {
      execSync('taskkill /f /im node.exe');
    } else {
      execSync('pkill -f "expo start"');
    }
  } catch (e) {
    // It's okay if there's nothing to kill
    console.log('No running Metro bundler found.');
  }

  // Clean various caches
  console.log('🗑️ Cleaning Metro cache...');
  if (fs.existsSync(path.join(os.tmpdir(), 'metro-cache'))) {
    execSync(`rm -rf "${path.join(os.tmpdir(), 'metro-cache')}"`);
  }
  
  console.log('🗑️ Clearing Expo cache...');
  execSync('npx expo-cli clear-cache --all', { stdio: 'inherit' });
  
  console.log('🔄 Cleaning Watchman watches...');
  try {
    execSync('watchman watch-del-all');
  } catch (e) {
    console.log('Watchman not installed or error clearing watches. Continuing...');
  }
  
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('🚀 Starting Expo development server...');
  execSync('npm run dev', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Error during clean start:', error.message);
  process.exit(1);
} 