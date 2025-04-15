import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const GameOverModal = ({ 
  visible, 
  score, 
  highScore, 
  timeCollected, 
  onRestart, 
  onMainMenu,
  difficulty = 'normal'
}) => {
  // Animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const rotation = useSharedValue(0);
  const bounceValue = useSharedValue(0);
  
  // Handle modal visibility
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 500 });
      scale.value = withTiming(1, { duration: 500, easing: Easing.backOut });
      rotation.value = withSequence(
        withTiming(0.1, { duration: 100 }),
        withRepeat(
          withSequence(
            withTiming(-0.1, { duration: 200 }),
            withTiming(0.1, { duration: 200 })
          ),
          3
        ),
        withTiming(0, { duration: 100 })
      );
      
      // Animate badges and scores with delay
      bounceValue.value = withDelay(
        600,
        withSequence(
          withTiming(1.2, { duration: 300, easing: Easing.backOut }),
          withTiming(1, { duration: 200 })
        )
      );
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      scale.value = withTiming(0.8, { duration: 300 });
    }
  }, [visible]);
  
  // Animated styles
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { scale: scale.value },
        { rotate: `${rotation.value * 30}deg` }
      ]
    };
  });
  
  const scoreAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: bounceValue.value }]
    };
  });
  
  const clockIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: bounceValue.value },
        { rotate: `${withRepeat(withTiming(360, { duration: 10000 }), -1, false)}deg` }
      ]
    };
  });
  
  // Get message based on score and difficulty
  const getMessage = () => {
    const isNewHighScore = score > highScore;
    
    if (isNewHighScore) {
      return "NEW HIGH SCORE! 🎉";
    }
    
    if (score === 0) {
      return "Better luck next time!";
    }
    
    if (score < 500) {
      return "Good effort!";
    }
    
    if (score < 1000) {
      return "Impressive!";
    }
    
    if (score < 2000) {
      return "Amazing job!";
    }
    
    return "Chronos Master!";
  };
  
  // Get difficulty label
  const getDifficultyLabel = () => {
    switch(difficulty) {
      case 'easy':
        return 'EASY MODE';
      case 'hard':
        return 'HARD MODE';
      case 'expert':
        return 'EXPERT MODE';
      default:
        return 'NORMAL MODE';
    }
  };
  
  const getDifficultyColor = () => {
    switch(difficulty) {
      case 'easy':
        return '#4DC591';
      case 'hard':
        return '#FF9500';
      case 'expert':
        return '#FF453A';
      default:
        return '#7DF9FF';
    }
  };
  
  if (!visible) return null;
  
  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.container, containerStyle]}>
        <Text style={styles.title}>GAME OVER</Text>
        
        <Text style={[styles.difficultyLabel, { color: getDifficultyColor() }]}>
          {getDifficultyLabel()}
        </Text>
        
        <Text style={styles.message}>{getMessage()}</Text>
        
        <View style={styles.statsContainer}>
          <Animated.View style={[styles.statBox, scoreAnimatedStyle]}>
            <Text style={styles.statLabel}>SCORE</Text>
            <Text style={styles.statValue}>{score}</Text>
            {score > highScore && <Text style={styles.newRecord}>NEW!</Text>}
          </Animated.View>
          
          <Animated.View style={[styles.statBox, scoreAnimatedStyle]}>
            <Text style={styles.statLabel}>BEST</Text>
            <Text style={styles.statValue}>{Math.max(highScore, score)}</Text>
          </Animated.View>
        </View>
        
        <View style={styles.timeRow}>
          <Animated.View style={clockIconStyle}>
            <Ionicons name="time-outline" size={28} color="#7DF9FF" />
          </Animated.View>
          <Text style={styles.timeCollected}>
            <Text style={styles.timeNumber}>{timeCollected}</Text> seconds collected
          </Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <Pressable 
            style={[styles.button, styles.restartButton]} 
            onPress={onRestart}
            android_ripple={{ color: 'rgba(125, 249, 255, 0.3)' }}
          >
            <Ionicons name="refresh-outline" size={22} color="#7DF9FF" />
            <Text style={styles.buttonText}>Play Again</Text>
          </Pressable>
          
          <Pressable 
            style={[styles.button, styles.menuButton]} 
            onPress={onMainMenu}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
          >
            <Ionicons name="home-outline" size={22} color="#fff" />
            <Text style={styles.buttonText}>Main Menu</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '85%',
    backgroundColor: 'rgba(16, 22, 36, 0.95)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(125, 249, 255, 0.3)',
    shadowColor: '#7DF9FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textShadowColor: 'rgba(125, 249, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 1,
  },
  message: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 15,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.2)',
  },
  statLabel: {
    fontSize: 14,
    color: '#7DF9FF',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  newRecord: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FF9500',
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  timeCollected: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 10,
  },
  timeNumber: {
    color: '#7DF9FF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 50,
    minWidth: 130,
  },
  restartButton: {
    backgroundColor: 'rgba(125, 249, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.5)',
    marginRight: 10,
  },
  menuButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default GameOverModal; 