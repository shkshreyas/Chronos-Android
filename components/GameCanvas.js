import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Dimensions, TouchableWithoutFeedback } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const GAME_AREA_HEIGHT = height * 0.6;
const TIME_OBJECT_SIZE = 70;

// Types of time objects
const TIME_OBJECT_TYPES = [
  { 
    type: 'normal',
    timeValue: 3,
    scoreValue: 10,
    probability: 0.6,
    color: ['#4FC3F7', '#2196F3'],
    size: TIME_OBJECT_SIZE,
  },
  { 
    type: 'slow',
    timeValue: 5, 
    scoreValue: 20,
    probability: 0.2,
    color: ['#FFD700', '#FFA000'],
    size: TIME_OBJECT_SIZE * 0.9,
  },
  { 
    type: 'reverse',
    timeValue: -2,
    scoreValue: 30,
    probability: 0.1,
    color: ['#F44336', '#D32F2F'],
    size: TIME_OBJECT_SIZE * 0.8,
  },
  { 
    type: 'bonus',
    timeValue: 8,
    scoreValue: 50,
    probability: 0.1,
    color: ['#4CAF50', '#2E7D32'],
    size: TIME_OBJECT_SIZE * 1.1,
  }
];

// Default game settings
const DEFAULT_SETTINGS = {
  timeSpeed: 1,
  objectSpeed: 1,
  initialTime: 30,
  spawnRate: 2000,
};

const GameCanvas = forwardRef(({ updateScore, updateTimeCollected, gameActive, difficulty = DEFAULT_SETTINGS }, ref) => {
  const [timeObjects, setTimeObjects] = useState([]);
  const [lastObjectId, setLastObjectId] = useState(0);
  const gameLoopRef = useRef(null);
  const isPaused = useRef(false);
  
  // Cache difficulty values to use in the game loop
  const difficultyRef = useRef(difficulty);
  
  // Update the ref when difficulty changes
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  // Generate a time object with random properties
  const generateTimeObject = () => {
    // Get random x position within the screen width
    const xPos = Math.random() * (width - TIME_OBJECT_SIZE);
    
    // Get random type based on probability
    let random = Math.random();
    let cumulativeProbability = 0;
    let selectedType = TIME_OBJECT_TYPES[0]; // Default to normal
    
    for (const objType of TIME_OBJECT_TYPES) {
      cumulativeProbability += objType.probability;
      if (random <= cumulativeProbability) {
        selectedType = objType;
        break;
      }
    }
    
    // More rare bonus objects in harder difficulties
    if (difficultyRef.current.timeSpeed > 1.2 && Math.random() > 0.85) {
      selectedType = TIME_OBJECT_TYPES[3]; // Bonus type
    }
    
    const id = lastObjectId + 1;
    
    // Create the time object
    return {
      id,
      x: xPos,
      y: -TIME_OBJECT_SIZE, // Start above the screen
      type: selectedType.type,
      color: selectedType.color,
      size: selectedType.size,
      timeValue: selectedType.timeValue,
      scoreValue: selectedType.scoreValue,
      opacity: useSharedValue(0),
      scale: useSharedValue(0.3),
      yPosition: useSharedValue(-TIME_OBJECT_SIZE),
      rotation: useSharedValue(0),
      collected: false,
    };
  };

  // Collect a time object
  const collectTimeObject = (id) => {
    setTimeObjects(prevObjects => {
      const objectsCopy = [...prevObjects];
      const index = objectsCopy.findIndex(obj => obj.id === id);
      
      if (index !== -1 && !objectsCopy[index].collected) {
        const object = objectsCopy[index];
        
        // Mark as collected
        object.collected = true;
        
        // Animate collection
        object.scale.value = withSequence(
          withTiming(1.5, { duration: 150 }),
          withTiming(0, { duration: 300 })
        );
        
        // Update game state
        updateScore(object.scoreValue);
        updateTimeCollected(object.timeValue);
        
        // Special effects based on time object type
        switch (object.type) {
          case 'slow':
            // Slow down other objects (visual effect only)
            objectsCopy.forEach(obj => {
              if (obj.id !== id && !obj.collected) {
                const currentY = obj.yPosition.value;
                obj.yPosition.value = withTiming(currentY, { duration: 500 });
              }
            });
            break;
          case 'reverse':
            // Reverse direction briefly for uncollected objects
            objectsCopy.forEach(obj => {
              if (obj.id !== id && !obj.collected) {
                const currentY = obj.yPosition.value;
                obj.yPosition.value = withSequence(
                  withTiming(currentY - 100, { duration: 300 }),
                  withTiming(currentY, { duration: 200 }),
                  withTiming(currentY + 50, { duration: 100 })
                );
              }
            });
            break;
          case 'bonus':
            // Create a visual pulse effect
            objectsCopy.forEach(obj => {
              if (obj.id !== id && !obj.collected) {
                obj.scale.value = withSequence(
                  withTiming(1.2, { duration: 200 }),
                  withTiming(1, { duration: 200 })
                );
              }
            });
            break;
        }
      }
      
      return objectsCopy;
    });
  };
  
  // Reset the game state
  const resetGame = (newDifficulty = DEFAULT_SETTINGS) => {
    // Clear any existing intervals
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    // Reset game state
    setTimeObjects([]);
    setLastObjectId(0);
    isPaused.current = false;
    difficultyRef.current = newDifficulty;
    
    // Start with a few objects
    const initialObjects = [];
    for (let i = 0; i < 3; i++) {
      const newObject = generateTimeObject();
      setLastObjectId(newObject.id);
      initialObjects.push(newObject);
    }
    
    setTimeObjects(initialObjects);
  };
  
  // Pause the game
  const pauseGame = () => {
    isPaused.current = true;
    
    // Pause all animations
    timeObjects.forEach(obj => {
      cancelAnimation(obj.yPosition);
      cancelAnimation(obj.rotation);
    });
    
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  };
  
  // Resume the game
  const resumeGame = () => {
    isPaused.current = false;
    
    // Resume animations
    timeObjects.forEach(obj => {
      if (!obj.collected) {
        const currentY = obj.yPosition.value;
        const remainingDistance = GAME_AREA_HEIGHT - currentY;
        const duration = (remainingDistance / GAME_AREA_HEIGHT) * 4000 / difficultyRef.current.objectSpeed;
        
        obj.yPosition.value = withTiming(GAME_AREA_HEIGHT, { 
          duration: duration, 
          easing: Easing.linear 
        });
        
        obj.rotation.value = withTiming(2 * Math.PI, { 
          duration: 3000, 
          easing: Easing.linear 
        });
      }
    });
    
    // Restart the game loop
    startGameLoop();
  };

  // Start the game loop
  const startGameLoop = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
    
    gameLoopRef.current = setInterval(() => {
      if (isPaused.current) return;
      
      // Remove objects that are off screen or collected
      setTimeObjects(prevObjects => {
        return prevObjects.filter(obj => {
          return obj.yPosition.value < GAME_AREA_HEIGHT && !obj.collected;
        });
      });
      
      // Generate new time object
      const newObject = generateTimeObject();
      setLastObjectId(newObject.id);
      
      // Add the new object and animate it
      setTimeObjects(prevObjects => [...prevObjects, newObject]);
      
      // Animate the new object
      newObject.opacity.value = withTiming(1, { duration: 300 });
      newObject.scale.value = withTiming(1, { duration: 300 });
      
      // Calculate duration based on difficulty
      const duration = 4000 / difficultyRef.current.objectSpeed;
      
      // Move the object down
      newObject.yPosition.value = withTiming(GAME_AREA_HEIGHT, { 
        duration: duration, 
        easing: Easing.linear 
      }, (finished) => {
        if (finished) {
          // Remove the object when it reaches the bottom
          runOnJS(setTimeObjects)(prevObjects => 
            prevObjects.filter(obj => obj.id !== newObject.id)
          );
        }
      });
      
      // Rotate the object
      newObject.rotation.value = withTiming(2 * Math.PI, { 
        duration: 3000, 
        easing: Easing.linear 
      });
      
    }, difficultyRef.current.spawnRate);
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    resetGame,
    pauseGame,
    resumeGame
  }));

  // Handle game active state changes
  useEffect(() => {
    if (gameActive && !isPaused.current) {
      startGameLoop();
    } else if (!gameActive) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }
    
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameActive]);

  // Render each time object with animations
  const renderTimeObjects = () => {
    return timeObjects.map((obj) => {
      // Create animated styles
      const animatedStyle = useAnimatedStyle(() => {
        return {
          transform: [
            { translateY: obj.yPosition.value },
            { scale: obj.scale.value },
            { rotate: `${obj.rotation.value}rad` }
          ],
          opacity: obj.opacity.value,
        };
      });
      
      return (
        <TouchableWithoutFeedback 
          key={obj.id} 
          onPress={() => collectTimeObject(obj.id)}
        >
          <Animated.View 
            style={[
              styles.timeObject,
              {
                left: obj.x,
                width: obj.size,
                height: obj.size,
                borderRadius: obj.size / 2,
                backgroundColor: obj.color[0],
                borderColor: obj.color[1],
              },
              animatedStyle
            ]}
          >
            <Ionicons 
              name={
                obj.type === 'normal' ? 'time' :
                obj.type === 'slow' ? 'hourglass' :
                obj.type === 'reverse' ? 'arrow-undo' : 'star'
              } 
              size={24} 
              color="white" 
            />
          </Animated.View>
        </TouchableWithoutFeedback>
      );
    });
  };

  return (
    <View style={styles.canvas}>
      {renderTimeObjects()}
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    height: GAME_AREA_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.3)',
  },
  timeObject: {
    position: 'absolute',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
});

export default GameCanvas; 