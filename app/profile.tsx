import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, getCurrentUser, updateUserProfile } from '@/lib/supabase';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Default avatar image - using letter avatar based on display name
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=0D47A1&color=7DF9FF&size=200&bold=true&name=';

type UserProfile = {
  username: string;
  display_name: string;
  points: number;
  highest_score: number;
  current_streak: number;
  games_played?: number;
  average_score?: number;
  avatar_url?: string;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  
  // Animation values
  const headerHeight = useSharedValue(250);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    fetchProfile();
    
    // Start animations
    opacity.value = withTiming(1, { duration: 500 });
    scale.value = withSpring(1);
  }, []);

  useEffect(() => {
    // Update avatar URL when profile changes
    if (profile) {
      const initials = profile.display_name
        ? profile.display_name
            .split(' ')
            .map(name => name[0])
            .join('')
            .substring(0, 2)
        : '??';
      
      setAvatarUrl(profile.avatar_url || `${DEFAULT_AVATAR}${initials}`);
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();
      
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      // Fetch user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        // If the user profile doesn't exist yet, create a default one
        if (profileError.code === 'PGRST116') {
          const defaultProfile = {
            id: user.id,
            username: user.email ? user.email.split('@')[0] : 'user',
            display_name: user.email ? user.email.split('@')[0] : 'User',
            points: 0,
            highest_score: 0,
            current_streak: 0,
          };
          
          const { error: insertError } = await supabase
            .from('users')
            .insert(defaultProfile);
            
          if (insertError) throw insertError;
          
          setProfile(defaultProfile as UserProfile);
          setLoading(false);
          return;
        } else {
          throw profileError;
        }
      }

      // If we get here, we have a valid profileData
      setProfile(profileData as UserProfile);
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      setError('Error loading profile. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!editedProfile.display_name || editedProfile.display_name.trim() === '') {
        Alert.alert('Invalid Name', 'Please enter a valid display name');
        return;
      }
      
      setSaving(true);
      setError(null);

      const user = await getCurrentUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Update display name in Supabase
      const { error: updateError } = await updateUserProfile(user.id, {
        display_name: editedProfile.display_name,
      });

      if (updateError) throw updateError;

      // Show success message
      Alert.alert(
        'Profile Updated',
        'Your profile has been successfully updated',
        [{ text: 'OK' }]
      );

      setProfile((prev) => ({
        ...prev!,
        ...editedProfile,
      }));
      setEditing(false);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Error in handleSave:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/(auth)/login');
    } catch (err) {
      setError('Failed to sign out. Please try again.');
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Animated styles
  const headerStyle = useAnimatedStyle(() => ({
    height: headerHeight.value,
  }));
  
  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (loading) {
    return (
      <LinearGradient
        colors={['#121638', '#2C3E7B', '#121638']}
        style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7DF9FF" />
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#121638', '#2C3E7B', '#121638']}
        style={styles.container}>
        
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#7DF9FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{width: 24}} /> {/* Empty view for alignment */}
        </View>
        
        <ScrollView style={styles.scrollView}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Animated.View style={[styles.header, headerStyle]}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                onError={() => {
                  // If image fails to load, use default avatar with initials
                  const initials = profile?.display_name ? 
                    profile.display_name.substring(0, 2).toUpperCase() : '??';
                  setAvatarUrl(`${DEFAULT_AVATAR}${initials}`);
                }}
              />
              {!editing && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditing(true)}>
                  <Ionicons name="pencil" size={20} color="#7DF9FF" />
                </TouchableOpacity>
              )}
            </View>

            {editing ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.input}
                  value={editedProfile.display_name ?? profile?.display_name}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, display_name: text })
                  }
                  placeholder="Display Name"
                  placeholderTextColor="#666"
                  autoFocus
                  maxLength={20}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => {
                      setEditing(false);
                      setEditedProfile({});
                    }}>
                    <Ionicons name="close" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.saveButton]}
                    onPress={handleSave}
                    disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Ionicons name="save" size={20} color="#000" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.displayName}>{profile?.display_name}</Text>
            )}
            <Text style={styles.username}>@{profile?.username}</Text>
          </Animated.View>

          <Animated.View style={[styles.content, contentStyle]}>
            <View style={styles.cardRow}>
              <View style={styles.statCard}>
                <Ionicons name="trophy" size={24} color="#7DF9FF" />
                <Text style={styles.statValue}>{profile?.points || 0}</Text>
                <Text style={styles.statLabel}>Total Points</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="person" size={24} color="#7DF9FF" />
                <Text style={styles.statValue}>{profile?.games_played || 0}</Text>
                <Text style={styles.statLabel}>Games Played</Text>
              </View>
            </View>
            
            <View style={styles.cardRow}>
              <View style={styles.statCard}>
                <Ionicons name="flame" size={24} color="#FF6B6B" />
                <Text style={styles.statValue}>{profile?.current_streak || 0}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="bar-chart" size={24} color="#7DF9FF" />
                <Text style={styles.statValue}>{profile?.average_score || 0}</Text>
                <Text style={styles.statLabel}>Avg Score</Text>
              </View>
            </View>

            <View style={styles.achievementsContainer}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <View style={styles.achievementsList}>
                {profile?.highest_score! >= 100 && (
                  <View style={styles.achievement}>
                    <Ionicons name="trophy" size={24} color="#FFD700" />
                    <Text style={styles.achievementText}>High Scorer</Text>
                  </View>
                )}
                {profile?.current_streak! >= 3 && (
                  <View style={styles.achievement}>
                    <Ionicons name="trophy" size={24} color="#C0C0C0" />
                    <Text style={styles.achievementText}>Streak Master</Text>
                  </View>
                )}
                {profile?.games_played! >= 10 && (
                  <View style={styles.achievement}>
                    <Ionicons name="trophy" size={24} color="#CD7F32" />
                    <Text style={styles.achievementText}>Dedicated Player</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}>
              <Ionicons name="log-out" size={24} color="#FF6B6B" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    padding: 10,
    margin: 10,
    borderRadius: 10,
  },
  errorText: {
    color: '#FF6B6B',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#7DF9FF',
  },
  editButton: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    backgroundColor: 'rgba(125, 249, 255, 0.1)',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7DF9FF',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  username: {
    fontSize: 16,
    color: '#7DF9FF',
    opacity: 0.8,
  },
  editContainer: {
    width: '80%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 10,
    color: '#fff',
    marginBottom: 10,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  actionButton: {
    padding: 10,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  saveButton: {
    backgroundColor: '#7DF9FF',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: 'rgba(125, 249, 255, 0.05)',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    width: '48%',
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.2)',
  },
  statValue: {
    color: '#7DF9FF',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  statLabel: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  achievementsContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  achievementsList: {
    backgroundColor: 'rgba(125, 249, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(125, 249, 255, 0.2)',
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 10,
    borderRadius: 10,
  },
  achievementText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginTop: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  logoutText: {
    color: '#FF6B6B',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
}); 