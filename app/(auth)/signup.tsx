import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const titleOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);
  const buttonScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    // Animate elements in sequence
    titleOpacity.value = withTiming(1, { duration: 800 });
    
    // Animate form after title
    setTimeout(() => {
      formOpacity.value = withTiming(1, { duration: 800 });
      formTranslateY.value = withTiming(0, { 
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    }, 200);

    // Continuous glow animation for accent elements
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.4, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const handleSignup = async () => {
    // Animate button press
    buttonScale.value = withSequence(
      withTiming(0.92, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (user) {
        await supabase.from('users').insert({
          id: user.id,
          username,
          display_name: username,
        });

        await supabase.from('leaderboard').insert({
          user_id: user.id,
          total_points: 0,
        });

        router.replace('/(tabs)');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Animated styles
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <LinearGradient
      colors={['#000010', '#000030', '#000020']}
      style={styles.container}>
      
      {/* Background elements */}
      <Animated.View style={[styles.backgroundCircle, styles.circle1]} />
      <Animated.View style={[styles.backgroundCircle, styles.circle2]} />
      <Animated.View style={[styles.backgroundCircle, styles.circle3, glowStyle]} />
      
      {/* Title */}
      <Animated.View style={[styles.titleContainer, titleStyle]}>
        <Text style={styles.title}>CHRONOS</Text>
        <Text style={styles.subtitle}>Create your time traveler profile</Text>
      </Animated.View>

      {/* Form */}
      <Animated.View style={[styles.form, formStyle]}>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#ff4444" />
            <Text style={styles.error}>{error}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="person" size={20} color="#00ffff" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#666"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color="#00ffff" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color="#00ffff" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <Animated.View style={[styles.buttonContainer, buttonStyle]}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Creating profile...' : 'Join Adventure'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Link href="/login" style={styles.link}>
          Already have an account? <Text style={styles.linkHighlight}>Login</Text>
        </Link>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backgroundCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 200,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: '10%',
    left: '5%',
  },
  circle2: {
    width: 250,
    height: 250,
    bottom: '15%',
    right: '5%',
  },
  circle3: {
    width: 400,
    height: 400,
    borderColor: 'rgba(0, 255, 255, 0.15)',
    top: '50%',
    left: '50%',
    marginLeft: -200,
    marginTop: -200,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00ffff',
    letterSpacing: 4,
    textShadowColor: '#00ffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#00ff00',
    marginTop: 5,
  },
  form: {
    width: '100%',
    maxWidth: 320,
    padding: 25,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 20, 40, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  error: {
    color: '#ff4444',
    marginLeft: 8,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(0, 20, 40, 0.6)',
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: 50,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  buttonContainer: {
    width: '100%',
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 20,
  },
  button: {
    height: 50,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#00ff00',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#00ff00',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 10,
  },
  linkHighlight: {
    color: '#00ffff',
    fontWeight: 'bold',
  },
});