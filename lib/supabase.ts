import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.supabaseAnonKey;

// Log for debugging - remove in production
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Key exists' : 'Key missing');

// Create Supabase client with AsyncStorage for persistent sessions
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
});

// Helper functions for common Supabase operations
export const updateUserProfile = async (userId: string, updates: any) => {
  // Update user profile in Supabase
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);
    
  if (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
  
  // Return the updated data
  return { data, error: null };
};

export const fetchUserProfile = async (userId: string) => {
  try {
    // First check if the user exists in the users table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId);
      
    if (error) throw error;
    
    // If no user found, return null instead of throwing an error
    if (!data || data.length === 0) {
      console.log(`No profile found for user ${userId}, might need to create one`);
      return { data: null, error: null };
    }
    
    // Return the first user if found
    return { data: data[0], error: null };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { data: null, error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
};

// Function to sync profile data across the app
export const syncUserProfile = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    
    const { data } = await fetchUserProfile(user.id);
    return data;
  } catch (error) {
    console.error('Error syncing user profile:', error);
    return null;
  }
};