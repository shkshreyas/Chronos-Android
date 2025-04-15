import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';

const TimeControl = forwardRef(({ onTimeUp, difficulty }, ref) => {
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);
  const initialTime = difficulty?.initialTime || 30;
  
  // Animation values
  const colorValue = useSharedValue(0);
  const pulseValue = useSharedValue(1);
  const scaleValue = useSharedValue(1);
  
  // Start the timer
  const startTimer = () => {
    // Reset timer to initial values
    setTimer(initialTime);
    setIsActive(true);
    setIsPaused(false);
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Start the interval
    intervalRef.current = setInterval(() => {
      setTimer(prevTime => {
        if (prevTime <= 0) {
          clearInterval(intervalRef.current);
          setIsActive(false);
          onTimeUp();
          return 0;
        }
        return prevTime - (difficulty?.timeSpeed || 1);
      });
    }, 1000);
  };
  
  // Stop the timer
  const stopTimer = () => {
    clearInterval(intervalRef.current);
    setIsActive(false);
    setIsPaused(false);
  };
  
  // Pause the timer
  const pauseTimer = () => {
    clearInterval(intervalRef.current);
    setIsPaused(true);
  };
  
  // Resume the timer
  const resumeTimer = () => {
    setIsPaused(false);
    
    // Start the interval again
    intervalRef.current = setInterval(() => {
      setTimer(prevTime => {
        if (prevTime <= 0) {
          clearInterval(intervalRef.current);
          setIsActive(false);
          onTimeUp();
          return 0;
        }
        return prevTime - (difficulty?.timeSpeed || 1);
      });
    }, 1000);
  };
  
  // Add time to the timer
  const addTime = (seconds) => {
    setTimer(prevTime => Math.max(0, prevTime + seconds));
  };
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    addTime,
  }));
  
  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  // Update animations based on timer value
  useEffect(() => {
    if (isActive && !isPaused) {
      // Color animation based on time remaining
      if (timer <= 10) {
        colorValue.value = withTiming(1, { duration: 500 });
        
        // Fast pulse animation when time is critical
        pulseValue.value = withRepeat(
          withTiming(1.2, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      } else if (timer <= 20) {
        colorValue.value = withTiming(0.5, { duration: 500 });
        
        // Slow pulse animation when time is getting low
        pulseValue.value = withRepeat(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      } else {
        colorValue.value = withTiming(0, { duration: 500 });
        pulseValue.value = 1;
      }
    } else if (isPaused) {
      // Paused animation
      pulseValue.value = withRepeat(
        withTiming(0.95, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [timer, isActive, isPaused]);
  
  // Calculate time display
  const formatTime = () => {
    const minutes = Math.floor(timer / 60);
    const seconds = Math.floor(timer % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Animated styles
  const colorStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        colorValue.value,
        [0, 0.5, 1],
        ['#ffffff', '#FFA500', '#FF0000']
      ),
      transform: [{ scale: pulseValue.value }],
    };
  });
  
  const containerStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolateColor(
        colorValue.value,
        [0, 0.5, 1],
        ['rgba(125, 249, 255, 0.5)', 'rgba(255, 165, 0, 0.7)', 'rgba(255, 0, 0, 0.8)']
      ),
      transform: [{ scale: isPaused ? pulseValue.value : 1 }],
    };
  });
  
  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.Text style={[styles.timerText, colorStyle]}>
        {formatTime()}
      </Animated.Text>
      {isPaused && (
        <Text style={styles.pausedText}>PAUSED</Text>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    minWidth: 150,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#7DF9FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  timerText: {
    fontSize: 32,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  pausedText: {
    color: '#FFA500',
    fontSize: 14,
    position: 'absolute',
    bottom: 10,
    opacity: 0.8,
  },
});

export default TimeControl; 