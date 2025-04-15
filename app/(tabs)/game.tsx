import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, StatusBar, Platform, Alert, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import GameCanvas from '../../components/GameCanvas';
import TimeControl from '../../components/TimeControl';
import GameOverModal from '../../components/GameOverModal';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

// Game difficulty levels
const DIFFICULTY_LEVELS = [
  { name: 'Easy', timeSpeed: 0.7, objectSpeed: 0.8, initialTime: 40, spawnRate: 2500 },
  { name: 'Normal', timeSpeed: 1, objectSpeed: 1, initialTime: 30, spawnRate: 2000 },
  { name: 'Hard', timeSpeed: 1.3, objectSpeed: 1.2, initialTime: 25, spawnRate: 1500 },
  { name: 'Insane', timeSpeed: 1.5, objectSpeed: 1.5, initialTime: 20, spawnRate: 1200 },
];

export default function GameScreen() {
  const [gameActive, setGameActive] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeCollected, setTimeCollected] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [difficulty, setDifficulty] = useState(DIFFICULTY_LEVELS[1]); // Default: Normal
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);
  
  const gameRef = useRef(null);
  const timeControlRef = useRef(null);
  
  // Animation values
  const pulseValue = useSharedValue(1);
  const rotateValue = useSharedValue(0);

  useEffect(() => {
    fetchHighScore();
    checkNotificationsSupport();
    
    // Set up back button handler for Android to pause game
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (gameActive && !gamePaused) {
        handlePauseGame();
        return true;
      }
      return false;
    });
    
    return () => backHandler.remove();
  }, [gameActive, gamePaused]);
  
  // Start animation when the component mounts
  useEffect(() => {
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    
    rotateValue.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const checkNotificationsSupport = () => {
    // Check if notifications are available in the current environment
    const isExpoGo = Constants.appOwnership === 'expo';
    
    // Notifications are not fully supported in Expo Go and web
    if (Platform.OS === 'web' || (isExpoGo && Constants.expoVersion >= '53.0.0')) {
      setNotificationsSupported(false);
      return;
    }
    
    // For other platforms/environments, we'll assume support but handle errors gracefully
    setNotificationsSupported(true);
  };

  const fetchHighScore = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      const { data, error } = await supabase
        .from('high_scores')
        .select('score')
        .eq('user_id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching high score:', error);
        return;
      }
      
      if (data) {
        setHighScore(data.score);
      }
    } catch (error) {
      console.error('Error connecting to database:', error);
    }
  };
  
  const handleSelectDifficulty = (index) => {
    setDifficulty(DIFFICULTY_LEVELS[index]);
    setCurrentLevel(index);
    setShowDifficultySelector(false);
  };

  const handleStartGame = () => {
    setGameActive(true);
    setGamePaused(false);
    setGameOver(false);
    setScore(0);
    setTimeCollected(0);
    setTimeRemaining(difficulty.initialTime);
    
    if (gameRef.current) {
      gameRef.current.resetGame(difficulty);
    }
    
    if (timeControlRef.current) {
      timeControlRef.current.startTimer(difficulty.timeSpeed);
    }
  };
  
  const handlePauseGame = () => {
    setGamePaused(true);
    
    if (timeControlRef.current) {
      timeControlRef.current.pauseTimer();
    }
    
    if (gameRef.current) {
      gameRef.current.pauseGame();
    }
  };
  
  const handleResumeGame = () => {
    setGamePaused(false);
    
    if (timeControlRef.current) {
      timeControlRef.current.resumeTimer();
    }
    
    if (gameRef.current) {
      gameRef.current.resumeGame();
    }
  };
  
  const handleStopGame = () => {
    setGameActive(false);
    setGamePaused(false);
    
    if (timeControlRef.current) {
      timeControlRef.current.stopTimer();
    }
  };

  const handleGameOver = async () => {
    setGameActive(false);
    setGamePaused(false);
    setGameOver(true);
    
    if (timeControlRef.current) {
      timeControlRef.current.stopTimer();
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update high score if current score is higher
        if (score > highScore) {
          setHighScore(score);
          
          const { error } = await supabase
            .from('high_scores')
            .upsert({
              user_id: user.id,
              score: score,
              time_collected: timeCollected
            });
            
          if (error) throw error;
          
          // If notifications are supported, send a high score notification
          if (notificationsSupported && score > highScore) {
            try {
              const { status } = await Notifications.getPermissionsAsync();
              
              if (status === 'granted') {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: 'New High Score!',
                    body: `You've set a new high score of ${score} points in ${difficulty.name} mode!`,
                  },
                  trigger: null, // Send immediately
                });
              }
            } catch (error) {
              console.log('Error sending notification:', error);
            }
          }
        }
        
        // Update the user's streak
        const { error: streakError } = await supabase
          .from('streaks')
          .upsert({
            user_id: user.id,
            last_played_at: new Date().toISOString()
          });
          
        if (streakError) throw streakError;
      }
    } catch (error) {
      console.error('Error updating database:', error);
    }
  };

  const updateScore = (points) => {
    setScore(prevScore => prevScore + points);
  };

  const updateTimeCollected = (seconds) => {
    setTimeCollected(prevTime => prevTime + seconds);
    setTimeRemaining(prevTime => prevTime + seconds);
  };

  const updateTimeRemaining = (seconds) => {
    setTimeRemaining(seconds);
    if (seconds <= 0 && gameActive) {
      handleGameOver();
    }
  };
  
  const backgroundStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateValue.value}rad` }],
    };
  });
  
  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseValue.value }],
    };
  });

  // Load saved high score from AsyncStorage
  const loadHighScore = async () => {
    try {
      const storedScore = await AsyncStorage.getItem('highScore');
      if (storedScore !== null) {
        setHighScore(parseInt(storedScore));
      }
    } catch (error) {
      console.log('Error loading high score:', error);
    }
  };
  
  // Save high score to AsyncStorage
  const saveHighScore = async (newScore) => {
    try {
      if (newScore > highScore) {
        await AsyncStorage.setItem('highScore', newScore.toString());
        setHighScore(newScore);
      }
    } catch (error) {
      console.log('Error saving high score:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#121638', '#2C3E7B', '#121638']}
        style={styles.gradient}
      >
        <Animated.View style={[styles.backgroundElements, backgroundStyle]}>
          <View style={styles.bgCircle1} />
          <View style={styles.bgCircle2} />
          <View style={styles.bgCircle3} />
        </Animated.View>
        
        <View style={styles.header}>
          <Text style={styles.headerText}>Time Flux</Text>
          <View style={styles.statsContainer}>
            {gameActive ? (
              <Text style={styles.scoreText}>Score: {score}</Text>
            ) : (
              <Text style={styles.scoreText}>High Score: {highScore}</Text>
            )}
            {gameActive && (
              <View style={styles.gameControls}>
                {gamePaused ? (
                  <TouchableOpacity 
                    style={styles.controlButton}
                    onPress={handleResumeGame}>
                    <Ionicons name="play" size={24} color="#7DF9FF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.controlButton}
                    onPress={handlePauseGame}>
                    <Ionicons name="pause" size={24} color="#7DF9FF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={handleStopGame}>
                  <Ionicons name="stop" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.gameContainer}>
          {gameActive ? (
            <GameCanvas
              ref={gameRef}
              updateScore={updateScore}
              updateTimeCollected={updateTimeCollected}
              gameActive={gameActive && !gamePaused}
              difficulty={difficulty}
            />
          ) : (
            <View style={styles.startScreen}>
              <Ionicons name="time" size={80} color="#7DF9FF" />
              <Text style={styles.gameTitle}>TIME FLUX</Text>
              <Text style={styles.tagline}>Master time distortions to survive</Text>
              
              <View style={styles.difficultySelector}>
                <TouchableOpacity 
                  style={[styles.difficultyButton, 
                    showDifficultySelector ? styles.difficultyButtonActive : {}
                  ]}
                  onPress={() => setShowDifficultySelector(!showDifficultySelector)}
                >
                  <Text style={styles.difficultyText}>
                    {difficulty.name} Mode
                  </Text>
                  <Ionicons name={showDifficultySelector ? "chevron-up" : "chevron-down"} 
                    size={20} color="#7DF9FF" />
                </TouchableOpacity>
                
                {showDifficultySelector && (
                  <View style={styles.difficultyOptions}>
                    {DIFFICULTY_LEVELS.map((level, index) => (
                      <TouchableOpacity
                        key={level.name}
                        style={[
                          styles.difficultyOption,
                          currentLevel === index ? styles.difficultyOptionSelected : {}
                        ]}
                        onPress={() => handleSelectDifficulty(index)}
                      >
                        <Text style={[
                          styles.difficultyOptionText,
                          currentLevel === index ? styles.difficultyOptionTextSelected : {}
                        ]}>
                          {level.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              
              <Animated.View style={buttonStyle}>
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={handleStartGame}
                >
                  <LinearGradient
                    colors={['rgba(125, 249, 255, 0.8)', 'rgba(125, 249, 255, 0.2)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.startButtonText}>START GAME</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
              
              <View style={styles.gameInstructions}>
                <Text style={styles.instructionTitle}>How to Play:</Text>
                <Text style={styles.instructionText}>• Tap time orbs to collect them</Text>
                <Text style={styles.instructionText}>• Blue orbs: +3 seconds</Text>
                <Text style={styles.instructionText}>• Gold orbs: +5 seconds (slower time)</Text>
                <Text style={styles.instructionText}>• Red orbs: -2 seconds (time reversal)</Text>
                <Text style={styles.instructionText}>• Green orbs: +8 seconds (bonus time)</Text>
                <Text style={styles.instructionText}>• Each orb gives different points</Text>
                <Text style={styles.instructionText}>• Time runs out faster at higher difficulties</Text>
              </View>
            </View>
          )}
        </View>
        
        {gameActive && (
          <TimeControl
            ref={timeControlRef}
            timeRemaining={timeRemaining}
            updateTimeRemaining={updateTimeRemaining}
            gamePaused={gamePaused}
          />
        )}
        
        {/* Pause Menu Modal */}
        {gamePaused && (
          <View style={styles.pauseOverlay}>
            <View style={styles.pauseMenu}>
              <Text style={styles.pauseTitle}>Game Paused</Text>
              
              <TouchableOpacity
                style={styles.pauseButton}
                onPress={handleResumeGame}
              >
                <Text style={styles.pauseButtonText}>Resume Game</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.pauseButton, styles.stopButton]}
                onPress={handleStopGame}
              >
                <Text style={styles.stopButtonText}>Exit Game</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <GameOverModal
          visible={gameOver}
          score={score}
          highScore={highScore}
          timeCollected={timeCollected}
          difficulty={difficulty.name}
          onRestart={handleStartGame}
        />
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
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundElements: {
    position: 'absolute',
    width: '200%',
    height: '200%',
    top: '-50%',
    left: '-50%',
  },
  bgCircle1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(125, 249, 255, 0.03)',
    top: '10%',
    left: '10%',
  },
  bgCircle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 107, 107, 0.03)',
    bottom: '20%',
    right: '15%',
  },
  bgCircle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 215, 0, 0.03)',
    top: '40%',
    right: '25%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    color: '#7DF9FF',
    marginRight: 15,
  },
  gameControls: {
    flexDirection: 'row',
  },
  controlButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.3)',
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  gameTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  tagline: {
    fontSize: 18,
    color: '#7DF9FF',
    marginTop: 10,
    marginBottom: 40,
  },
  difficultySelector: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  difficultyButton: {
    backgroundColor: 'rgba(125, 249, 255, 0.1)',
    padding: 12,
    borderRadius: 25,
    width: 200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.3)',
  },
  difficultyButtonActive: {
    backgroundColor: 'rgba(125, 249, 255, 0.2)',
    borderColor: 'rgba(125, 249, 255, 0.5)',
  },
  difficultyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  difficultyOptions: {
    width: 200,
    marginTop: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.3)',
  },
  difficultyOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  difficultyOptionSelected: {
    backgroundColor: 'rgba(125, 249, 255, 0.2)',
  },
  difficultyOptionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  difficultyOptionTextSelected: {
    color: '#7DF9FF',
    fontWeight: 'bold',
  },
  startButton: {
    width: 220,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#7DF9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    marginBottom: 30,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    color: '#121638',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  gameInstructions: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 15,
    borderRadius: 15,
    width: '100%',
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.2)',
  },
  instructionTitle: {
    color: '#7DF9FF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 30, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseMenu: {
    width: '80%',
    backgroundColor: 'rgba(20, 30, 60, 0.95)',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.3)',
  },
  pauseTitle: {
    fontSize: 28,
    color: '#7DF9FF',
    fontWeight: 'bold',
    marginBottom: 30,
  },
  pauseButton: {
    backgroundColor: 'rgba(125, 249, 255, 0.2)',
    width: '100%',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.5)',
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stopButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderColor: 'rgba(255, 107, 107, 0.5)',
  },
  stopButtonText: {
    color: '#FF6B6B',
  },
});