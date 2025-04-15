import { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';

// Keep splash screen visible while we check auth
SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

export default function AnimatedSplashScreen() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  
  // Animation values
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const pulseOpacity = useSharedValue(0.5);
  const rotation = useSharedValue(0);
  const logoText = useSharedValue(0);
  
  // Background circle animations
  const circle1Scale = useSharedValue(0.5);
  const circle2Scale = useSharedValue(0.6);
  const circle3Scale = useSharedValue(0.4);

  useEffect(() => {
    async function prepare() {
      try {
        // Start animations immediately
        startAnimations();
        
        // Check if user is authenticated
        const { data } = await supabase.auth.getSession();
        const hasValidSession = !!data.session;
        setHasSession(hasValidSession);
        
        // Show splash for minimum time regardless of auth status
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setAuthChecked(true);
      } catch (e) {
        console.warn(e);
      } finally {
        // App is ready to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);
  
  // Handle navigation once app is ready and auth is checked
  useEffect(() => {
    if (appIsReady && authChecked) {
      handleNavigate();
    }
  }, [appIsReady, authChecked]);
  
  const handleNavigate = () => {
    // Start fade out animation before navigating
    opacity.value = withTiming(0, { duration: 500 }, (finished) => {
      if (finished) {
        runOnJS(navigateToScreen)();
      }
    });
  };
  
  const navigateToScreen = async () => {
    // Hide the splash screen
    await SplashScreen.hideAsync();
    
    // Navigate to appropriate screen based on session
    if (hasSession) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  };
  
  const startAnimations = () => {
    // Fade in logo
    opacity.value = withTiming(1, { duration: 800 });
    
    // Scale up logo with a bounce effect
    scale.value = withSequence(
      withTiming(1.1, { duration: 500, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 300, easing: Easing.inOut(Easing.quad) })
    );
    
    // Animate in the logo text
    logoText.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) });
    
    // Continuous pulse animation
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.4, { duration: 1500 })
      ),
      -1,
      true
    );
    
    // Subtle rotation
    rotation.value = withRepeat(
      withTiming(2 * Math.PI, { 
        duration: 12000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
    
    // Animate background circles
    circle1Scale.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.5, { duration: 5000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    
    circle2Scale.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.6, { duration: 7000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    
    circle3Scale.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 9000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  };

  // Animated styles
  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}rad` }
    ],
  }));
  
  const textStyle = useAnimatedStyle(() => ({
    opacity: logoText.value,
    transform: [
      { translateY: interpolate(
          logoText.value, 
          [0, 1], 
          [20, 0]
        ) 
      }
    ],
  }));
  
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: 1.5 }],
  }));
  
  const circle1Style = useAnimatedStyle(() => ({
    transform: [{ scale: circle1Scale.value }],
  }));
  
  const circle2Style = useAnimatedStyle(() => ({
    transform: [{ scale: circle2Scale.value }],
  }));
  
  const circle3Style = useAnimatedStyle(() => ({
    transform: [{ scale: circle3Scale.value }],
  }));

  return (
    <LinearGradient
      colors={['#000010', '#000030', '#000020']}
      style={styles.container}
    >
      <StatusBar style="light" />
      
      {/* Animated background circles */}
      <Animated.View style={[styles.backgroundCircle, styles.circle1, circle1Style]} />
      <Animated.View style={[styles.backgroundCircle, styles.circle2, circle2Style]} />
      <Animated.View style={[styles.backgroundCircle, styles.circle3, circle3Style]} />
      
      {/* Glow effect */}
      <Animated.View style={[styles.glow, pulseStyle]} />
      
      {/* Logo */}
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Image 
          source={require('../assets/images/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      
      {/* App Name */}
      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={styles.appName}>Chronos</Text>
        <Text style={styles.tagline}>Master of Time</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#7DF9FF',
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: '#7DF9FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  backgroundCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 400,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  circle1: {
    width: width * 1.2,
    height: width * 1.2,
    borderColor: 'rgba(0, 255, 255, 0.08)',
  },
  circle2: {
    width: width * 0.8,
    height: width * 0.8,
    borderColor: 'rgba(0, 255, 255, 0.12)',
  },
  circle3: {
    width: width * 1.5,
    height: width * 1.5,
    borderColor: 'rgba(0, 255, 255, 0.05)',
  },
}); 