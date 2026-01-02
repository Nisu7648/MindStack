/**
 * LOGIN SCREEN
 * 
 * User authentication with:
 * - Email/Password login
 * - Google OAuth
 * - Microsoft OAuth
 * - Biometric authentication
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    checkSavedCredentials();
  }, []);

  /**
   * Check for saved credentials
   */
  const checkSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('saved_email');
      const savedRemember = await AsyncStorage.getItem('remember_me');
      
      if (savedEmail && savedRemember === 'true') {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  /**
   * Handle email/password login
   */
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual authentication
      // For now, simulate login
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Save credentials if remember me is checked
      if (rememberMe) {
        await AsyncStorage.setItem('saved_email', email);
        await AsyncStorage.setItem('remember_me', 'true');
      } else {
        await AsyncStorage.removeItem('saved_email');
        await AsyncStorage.removeItem('remember_me');
      }

      // Save auth token
      await AsyncStorage.setItem('auth_token', 'dummy_token');
      await AsyncStorage.setItem('user_email', email);

      // Navigate to main app
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Google OAuth
   */
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // TODO: Implement Google OAuth
      Alert.alert('Coming Soon', 'Google login will be available soon');
    } catch (error) {
      Alert.alert('Error', 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Microsoft OAuth
   */
  const handleMicrosoftLogin = async () => {
    setLoading(true);
    try {
      // TODO: Implement Microsoft OAuth
      Alert.alert('Coming Soon', 'Microsoft login will be available soon');
    } catch (error) {
      Alert.alert('Error', 'Microsoft login failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle biometric authentication
   */
  const handleBiometricLogin = async () => {
    try {
      // TODO: Implement biometric authentication
      Alert.alert('Coming Soon', 'Biometric login will be available soon');
    } catch (error) {
      Alert.alert('Error', 'Biometric authentication failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Icon name="chart-line" size={48} color="#4CAF50" />
          </View>
          <Text style={styles.appName}>MindStack</Text>
          <Text style={styles.tagline}>Autonomous Accounting</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Icon name="email-outline" size={20} color="#757575" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Icon name="lock-outline" size={20} color="#757575" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon 
                name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                size={20} 
                color="#757575" 
              />
            </TouchableOpacity>
          </View>

          {/* Remember Me & Forgot Password */}
          <View style={styles.optionsRow}>
            <TouchableOpacity 
              style={styles.rememberMe}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <Icon 
                name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'} 
                size={20} 
                color="#4CAF50" 
              />
              <Text style={styles.rememberMeText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login Buttons */}
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Icon name="google" size={20} color="#DB4437" />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleMicrosoftLogin}
            disabled={loading}
          >
            <Icon name="microsoft" size={20} color="#00A4EF" />
            <Text style={styles.socialButtonText}>Continue with Microsoft</Text>
          </TouchableOpacity>

          {/* Biometric Login */}
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricLogin}
          >
            <Icon name="fingerprint" size={32} color="#4CAF50" />
            <Text style={styles.biometricText}>Use Biometric</Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  content: {
    flex: 1,
    paddingHorizontal: 24
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4
  },
  tagline: {
    fontSize: 14,
    color: '#757575'
  },
  form: {
    flex: 1
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 32
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FAFAFA'
  },
  inputIcon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1A1A1A'
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  rememberMeText: {
    fontSize: 14,
    color: '#1A1A1A',
    marginLeft: 8
  },
  forgotPassword: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500'
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0'
  },
  dividerText: {
    fontSize: 14,
    color: '#757575',
    marginHorizontal: 16
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 50,
    borderRadius: 8,
    marginBottom: 12
  },
  socialButtonText: {
    fontSize: 16,
    color: '#1A1A1A',
    marginLeft: 12
  },
  biometricButton: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24
  },
  biometricText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24
  },
  signupText: {
    fontSize: 14,
    color: '#757575'
  },
  signupLink: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600'
  }
});

export default LoginScreen;
