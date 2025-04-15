import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase, getCurrentUser, syncUserProfile } from '@/lib/supabase';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

export default function HomeScreen() {
  const [displayName, setDisplayName] = useState('Player');
  const [highScore, setHighScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  
  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
      return () => {};
    }, [])
  );
  
  useEffect(() => {
    // Background animations
    rotation.value = withRepeat(
      withTiming(2 * Math.PI, { 
        duration: 10000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
    
    scale.value = withRepeat(
      withTiming(1.2, {
        duration: 8000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, []);
  
  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      
      // Use the sync helper to get the latest profile data
      const profileData = await syncUserProfile();
      
      if (profileData) {
        // Use display_name from profile or fallback options
        const user = await getCurrentUser().catch(() => null);
        setDisplayName(
          profileData.display_name || 
          (user?.email ? user.email.split('@')[0] : 'Player')
        );
        setHighScore(profileData.highest_score || 0);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStartGame = () => {
    router.push('/(tabs)/game');
  };
  
  const handleViewProgress = () => {
    router.push('/(tabs)/progress');
  };
  
  const handleProfile = () => {
    router.push('/profile');
  };
  
  const handleSignOut = async () => {
    try {
      // Clear the session
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        return;
      }
      
      // Navigate to login screen
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}rad` },
        { scale: scale.value },
      ],
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#121638', '#2C3E7B', '#121638']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome, <Text style={styles.nameText}>{displayName}</Text></Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              onPress={handleProfile} 
              style={styles.headerButton}
            >
              <Ionicons name="person-circle" size={28} color="#7DF9FF" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSignOut} 
              style={styles.headerButton}
            >
              <Ionicons name="log-out-outline" size={24} color="#7DF9FF" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.content}>
          <Animated.View style={[styles.iconContainer, iconStyle]}>
            <Ionicons name="time" size={120} color="#7DF9FF" />
          </Animated.View>
          
          <Text style={styles.gameTitle}>Chronos</Text>
          <Text style={styles.tagline}>Master time, score high</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>High Score</Text>
              <Text style={styles.statValue}>{highScore}</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.playButton}
            onPress={handleStartGame}
          >
            <LinearGradient
              colors={['rgba(125, 249, 255, 0.8)', 'rgba(125, 249, 255, 0.2)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>PLAY NOW</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewProgress}
          >
            <Text style={styles.secondaryButtonText}>View Progress</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '500',
    color: '#fff',
  },
  nameText: {
    fontWeight: 'bold',
    color: '#7DF9FF',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 10,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 20,
  },
  gameTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 30,
  },
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginBottom: 30,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.2)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginBottom: 5,
  },
  statValue: {
    color: '#7DF9FF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  playButton: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#7DF9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#121638',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  secondaryButton: {
    padding: 15,
  },
  secondaryButtonText: {
    color: '#7DF9FF',
    fontSize: 16,
    fontWeight: '600',
  },
});