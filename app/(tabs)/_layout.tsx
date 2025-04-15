import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  interpolate
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  const getTabBarIcon = (name: string, focused: boolean, color: string) => {
    return (
      <View style={styles.iconWrapper}>
        <AnimatedIonicons 
          name={name} 
          size={24} 
          color={color}
          style={[
            styles.icon,
            {
              transform: [
                { scale: focused ? 1.2 : 1 },
                { translateY: focused ? -8 : 0 }
              ],
              opacity: focused ? 1 : 0.7,
            }
          ]}
        />
        {focused && (
          <View style={styles.indicator} />
        )}
        {focused && (
          <View style={styles.shadow} />
        )}
      </View>
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#7DF9FF',
        tabBarInactiveTintColor: '#FFFFFF80',
        tabBarStyle: {
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          height: 70,
          borderRadius: 35,
          backgroundColor: 'rgba(20, 25, 52, 0.7)',
          borderTopWidth: 0,
          elevation: 0,
          borderWidth: 1,
          borderColor: 'rgba(125, 249, 255, 0.2)',
          shadowColor: '#7DF9FF',
          shadowOffset: {
            width: 0,
            height: 5,
          },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          paddingBottom: 0,
          paddingHorizontal: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: -8,
          marginBottom: 10,
        },
        tabBarItemStyle: {
          padding: 5,
        },
        tabBarBackground: () => (
          <BlurView 
            intensity={30} 
            tint="dark" 
            style={StyleSheet.absoluteFill} 
          />
        ),
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => getTabBarIcon('home', focused, color),
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: 'Game',
          tabBarIcon: ({ color, focused }) => getTabBarIcon('game-controller', focused, color),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => getTabBarIcon('stats-chart', focused, color),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  icon: {
    marginBottom: 4,
  },
  indicator: {
    position: 'absolute',
    bottom: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7DF9FF',
  },
  shadow: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(125, 249, 255, 0.3)',
    opacity: 0.6,
    transform: [
      { scale: 0.7 },
    ],
    zIndex: -1,
  },
});