import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const { width } = Dimensions.get('window');

type RankEntry = {
  rank: number;
  username: string;
  display_name: string;
  total_points: number;
};

export default function ProgressScreen() {
  const [activeTab, setActiveTab] = useState('ranks');
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [userRank, setUserRank] = useState<RankEntry | null>(null);
  const [streakCount, setStreakCount] = useState(0);
  const [totalTimeCollected, setTotalTimeCollected] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Animation values
  const tabPosition = useSharedValue(0);
  const progressOpacity = useSharedValue(0);
  
  useEffect(() => {
    // Set tab position based on active tab
    tabPosition.value = withTiming(activeTab === 'ranks' ? 0 : 1, { duration: 300 });
    
    // Fetch data
    fetchData();
    
    // Start entry animation
    progressOpacity.value = withTiming(1, { duration: 500 });

    // Check and setup notifications
    checkNotificationsSupport();
    
    // Only attempt to set up notifications if they're supported
    if (notificationsSupported) {
      registerForPushNotificationsAsync().then(status => {
        setNotificationsEnabled(status === 'granted');
        if (status === 'granted') {
          scheduleStreakReminder();
        }
      });
    }
  }, [activeTab, notificationsSupported]);
  
  const checkNotificationsSupport = () => {
    // Check if notifications are available in the current environment
    const isExpoGo = Constants.appOwnership === 'expo';
    
    // Notifications are not fully supported in Expo Go and web
    if (Platform.OS === 'web' || (isExpoGo && Constants.expoVersion && parseFloat(Constants.expoVersion) >= 53.0)) {
      setNotificationsSupported(false);
      return;
    }
    
    // For other platforms/environments, we'll assume support but handle errors gracefully
    setNotificationsSupported(true);
  };

  const registerForPushNotificationsAsync = async () => {
    try {
      if (!notificationsSupported) return 'unavailable';
      
      // Check if physical device
      if (!Device.isDevice) {
        return 'unavailable';
      }
      
      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Push notifications are needed for streak reminders. You can enable them in your app settings.',
          [{ text: 'OK' }]
        );
        return finalStatus;
      }
      
      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      
      return finalStatus;
    } catch (error) {
      console.log('Error setting up notifications:', error);
      return 'error';
    }
  };

  const scheduleStreakReminder = async () => {
    try {
      if (!notificationsSupported) return;
      
      // Cancel any existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Schedule daily reminder at 8 PM
      if (Platform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Maintain Your Streak!',
            body: `Don't forget to play Chronos today to keep your ${streakCount}-day streak going!`,
          },
          trigger: {
            hour: 20,
            minute: 0,
            repeats: true,
          },
        });
      }
    } catch (error) {
      console.log('Error scheduling reminder:', error);
    }
  };
  
  const fetchData = async () => {
    if (activeTab === 'ranks') {
      await fetchRankings();
    } else {
      await fetchStreakData();
    }
  };
  
  const fetchRankings = async () => {
    try {
      const { data: rankingsData } = await supabase
        .from('leaderboard')
        .select(`
          rank,
          total_points,
          users (
            username,
            display_name
          )
        `)
        .order('rank', { ascending: true })
        .limit(100);

      if (rankingsData) {
        const formattedRankings = rankingsData.map((entry) => ({
          rank: entry.rank,
          username: entry.users.username,
          display_name: entry.users.display_name,
          total_points: entry.total_points,
        }));
        setRankings(formattedRankings);

        // Get current user's rank
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userRankData = formattedRankings.find(
            (r) => r.username === user.email
          );
          if (userRankData) {
            setUserRank(userRankData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
    }
  };

  const fetchStreakData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      const { data, error } = await supabase
        .from('streaks')
        .select('streak_count, total_time_collected')
        .eq('user_id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching streak data:', error);
        return;
      }
      
      if (data) {
        setStreakCount(data.streak_count || 0);
        setTotalTimeCollected(data.total_time_collected || 0);
      }
    } catch (error) {
      console.error('Error connecting to database:', error);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
  
  // Animated styles
  const tabIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: width * 0.5 * tabPosition.value }],
    };
  });
  
  const screenStyle = useAnimatedStyle(() => {
    return {
      opacity: progressOpacity.value,
    };
  });
  
  const contentStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: interpolate(
        tabPosition.value,
        [0, 1],
        [0, -width],
        Extrapolate.CLAMP
      )}],
    };
  });
  
  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#7DF9FF';
  };
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#121638', '#2C3E7B', '#121638']}
        style={styles.background}
      >
        <Animated.View style={[styles.content, screenStyle]}>
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={styles.tab} 
              onPress={() => setActiveTab('ranks')}
            >
              <Ionicons 
                name="trophy" 
                size={24} 
                color={activeTab === 'ranks' ? '#7DF9FF' : '#FFFFFF80'} 
              />
              <Text 
                style={[
                  styles.tabText, 
                  activeTab === 'ranks' && styles.activeTabText
                ]}
              >
                Rankings
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.tab} 
              onPress={() => setActiveTab('streaks')}
            >
              <Ionicons 
                name="flame" 
                size={24} 
                color={activeTab === 'streaks' ? '#FF6B6B' : '#FFFFFF80'} 
              />
              <Text 
                style={[
                  styles.tabText, 
                  activeTab === 'streaks' && styles.activeStreakTabText
                ]}
              >
                Streaks
              </Text>
            </TouchableOpacity>
            
            <Animated.View style={[styles.tabIndicator, tabIndicatorStyle, {
              backgroundColor: activeTab === 'ranks' ? '#7DF9FF' : '#FF6B6B'
            }]} />
          </View>
          
          {/* Horizontal View for Tab Content */}
          <Animated.View style={[styles.tabContent, contentStyle]}>
            {/* Rankings Tab */}
            <View style={styles.tabPage}>
              {userRank && (
                <View style={styles.userRankContainer}>
                  <Text style={styles.userRankTitle}>Your Rank</Text>
                  <View style={styles.userRankContent}>
                    <Text style={[styles.rankNumber, { color: getRankColor(userRank.rank) }]}>
                      #{userRank.rank}
                    </Text>
                    <Text style={styles.points}>{userRank.total_points} pts</Text>
                  </View>
                </View>
              )}

              <ScrollView
                style={styles.rankingsList}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#7DF9FF"
                  />
                }
              >
                {rankings.map((entry, index) => (
                  <View
                    key={entry.username}
                    style={[
                      styles.rankingItem,
                      index % 2 === 0 && styles.alternateItem,
                    ]}
                  >
                    <View style={styles.rankInfo}>
                      <Text style={[styles.rank, { color: getRankColor(entry.rank) }]}>
                        #{entry.rank}
                      </Text>
                      {entry.rank <= 3 && (
                        <Ionicons name="medal" size={20} color={getRankColor(entry.rank)} />
                      )}
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.username}>{entry.display_name}</Text>
                      <Text style={styles.points}>{entry.total_points} pts</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
            
            {/* Streaks Tab */}
            <View style={styles.tabPage}>
              <ScrollView
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#FF6B6B"
                  />
                }
              >
                <View style={styles.streakContainer}>
                  <View style={styles.streakCard}>
                    <Ionicons name="flame" size={48} color="#FF6B6B" />
                    <Text style={styles.streakValue}>{streakCount}</Text>
                    <Text style={styles.streakLabel}>DAY STREAK</Text>
                  </View>
                  
                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Time Collected</Text>
                    <Text style={styles.infoValue}>{formatTime(totalTimeCollected)}</Text>
                  </View>
                </View>

                {!notificationsSupported && (
                  <View style={styles.warningCard}>
                    <Ionicons name="warning" size={24} color="#FFD700" />
                    <Text style={styles.warningText}>
                      Streak reminders require a development build of the app
                    </Text>
                  </View>
                )}

                {notificationsSupported && !notificationsEnabled && (
                  <View style={styles.warningCard}>
                    <Ionicons name="notifications-off" size={24} color="#FFD700" />
                    <Text style={styles.warningText}>
                      Enable notifications for daily streak reminders
                    </Text>
                  </View>
                )}
                
                <View style={styles.infoSection}>
                  <Text style={styles.infoHeader}>Streak Rewards</Text>
                  
                  <View style={styles.rewardList}>
                    <View style={styles.rewardItem}>
                      <View style={[styles.rewardIcon, streakCount >= 3 && styles.rewardUnlocked]}>
                        <Text style={styles.rewardDay}>3</Text>
                      </View>
                      <View style={styles.rewardInfo}>
                        <Text style={styles.rewardText}>+10 starting seconds</Text>
                        <Text style={styles.rewardSubtext}>
                          {streakCount >= 3 ? 'Unlocked' : `${3 - streakCount} days to go`}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.rewardItem}>
                      <View style={[styles.rewardIcon, streakCount >= 7 && styles.rewardUnlocked]}>
                        <Text style={styles.rewardDay}>7</Text>
                      </View>
                      <View style={styles.rewardInfo}>
                        <Text style={styles.rewardText}>+15 starting seconds</Text>
                        <Text style={styles.rewardSubtext}>
                          {streakCount >= 7 ? 'Unlocked' : `${7 - streakCount} days to go`}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.rewardItem}>
                      <View style={[styles.rewardIcon, streakCount >= 14 && styles.rewardUnlocked]}>
                        <Text style={styles.rewardDay}>14</Text>
                      </View>
                      <View style={styles.rewardInfo}>
                        <Text style={styles.rewardText}>Exclusive theme unlocked</Text>
                        <Text style={styles.rewardSubtext}>
                          {streakCount >= 14 ? 'Unlocked' : `${14 - streakCount} days to go`}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.rewardItem}>
                      <View style={[styles.rewardIcon, streakCount >= 30 && styles.rewardUnlocked]}>
                        <Text style={styles.rewardDay}>30</Text>
                      </View>
                      <View style={styles.rewardInfo}>
                        <Text style={styles.rewardText}>Master of Time badge</Text>
                        <Text style={styles.rewardSubtext}>
                          {streakCount >= 30 ? 'Unlocked' : `${30 - streakCount} days to go`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    height: 50,
    position: 'relative',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  tabText: {
    color: '#FFFFFF80',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#7DF9FF',
  },
  activeStreakTabText: {
    color: '#FF6B6B',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '50%',
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tabContent: {
    width: width * 2,
    flex: 1,
    flexDirection: 'row',
  },
  tabPage: {
    width: width,
    paddingHorizontal: 20,
  },
  // Rankings styles
  userRankContainer: {
    padding: 15,
    backgroundColor: 'rgba(125, 249, 255, 0.05)',
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.2)',
  },
  userRankTitle: {
    color: '#7DF9FF',
    fontSize: 18,
    marginBottom: 10,
    fontWeight: '600',
  },
  userRankContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankingsList: {
    flex: 1,
  },
  rankingItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(125, 249, 255, 0.1)',
    backgroundColor: 'rgba(125, 249, 255, 0.02)',
    borderRadius: 10,
    marginBottom: 10,
  },
  alternateItem: {
    backgroundColor: 'rgba(125, 249, 255, 0.05)',
  },
  rankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 5,
  },
  rankNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    color: '#fff',
    fontSize: 16,
  },
  points: {
    color: '#7DF9FF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Streaks styles
  streakContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  streakCard: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  streakValue: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 10,
  },
  streakLabel: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: 'rgba(125, 249, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.2)',
  },
  infoTitle: {
    color: '#7DF9FF',
    fontSize: 16,
    marginBottom: 5,
  },
  infoValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  warningText: {
    color: '#FFD700',
    marginLeft: 10,
    fontSize: 14,
    flex: 1,
  },
  infoSection: {
    marginTop: 20,
  },
  infoHeader: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  rewardList: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    overflow: 'hidden',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  rewardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rewardUnlocked: {
    backgroundColor: 'rgba(255, 107, 107, 0.8)',
  },
  rewardDay: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  rewardSubtext: {
    color: '#FFFFFF80',
    fontSize: 14,
    marginTop: 2,
  },
}); 