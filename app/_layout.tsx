import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export default function RootLayout() {
  useFrameworkReady();
  
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  
  useEffect(() => {
    // Add subtle animations to background elements
    rotation.value = withRepeat(
      withTiming(2 * Math.PI, { 
        duration: 20000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
    
    scale.value = withRepeat(
      withTiming(1.2, {
        duration: 15000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, []);
  
  const circleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}rad` },
        { scale: scale.value },
      ],
    };
  });

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <LinearGradient
          colors={['#000010', '#000030']}
          style={styles.background}
        >
          {/* Animated background elements */}
          <Animated.View style={[styles.circle, circleStyle, {top: '10%', left: '10%'}]} />
          <Animated.View style={[styles.circle, circleStyle, {top: '60%', right: '5%'}]} />
          <Animated.View style={[styles.circle, circleStyle, {bottom: '15%', left: '20%'}]} />
        
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
              animation: 'fade',
            }}>
            <Stack.Screen name="index" options={{ animation: 'none' }} />
          </Stack>
        </LinearGradient>
        <StatusBar style="light" />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
    opacity: 0.3,
  },
});
