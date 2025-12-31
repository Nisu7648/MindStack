import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { PublicClientApplication } from '@azure/msal-react-native';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID', // Replace with your Google Web Client ID
  offlineAccess: true,
});

// Configure Microsoft Authentication
const msalConfig = {
  auth: {
    clientId: 'YOUR_MICROSOFT_CLIENT_ID', // Replace with your Microsoft Client ID
    authority: 'https://login.microsoftonline.com/common',
  },
};

const msalClient = new PublicClientApplication(msalConfig);

export class AuthService {
  static STORAGE_KEY = '@mindstack_user';

  // Email/Password Sign Up
  static async signUpWithEmail(email, password, fullName) {
    try {
      // In production, this would call your backend API
      // For now, we'll store locally
      const user = {
        id: Date.now().toString(),
        email,
        fullName,
        authProvider: 'email',
        createdAt: new Date().toISOString(),
      };

      // Hash password (in production, use proper encryption)
      const hashedPassword = await this.hashPassword(password);

      // Store user data
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify({ ...user, password: hashedPassword })
      );

      // Store auth token
      await AsyncStorage.setItem('@mindstack_token', user.id);

      return { success: true, user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  }

  // Email/Password Sign In
  static async signInWithEmail(email, password) {
    try {
      // Retrieve stored user
      const userData = await AsyncStorage.getItem(this.STORAGE_KEY);

      if (!userData) {
        return { success: false, error: 'No account found with this email' };
      }

      const user = JSON.parse(userData);

      // Verify password
      const hashedPassword = await this.hashPassword(password);

      if (user.password !== hashedPassword) {
        return { success: false, error: 'Invalid password' };
      }

      // Store auth token
      await AsyncStorage.setItem('@mindstack_token', user.id);

      return { success: true, user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Google Sign In
  static async signInWithGoogle() {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      const user = {
        id: userInfo.user.id,
        email: userInfo.user.email,
        fullName: userInfo.user.name,
        photo: userInfo.user.photo,
        authProvider: 'google',
        createdAt: new Date().toISOString(),
      };

      // Store user data
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
      await AsyncStorage.setItem('@mindstack_token', user.id);

      return { success: true, user };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Microsoft Sign In
  static async signInWithMicrosoft() {
    try {
      const result = await msalClient.acquireToken({
        scopes: ['User.Read'],
      });

      const user = {
        id: result.uniqueId,
        email: result.account.username,
        fullName: result.account.name,
        authProvider: 'microsoft',
        createdAt: new Date().toISOString(),
      };

      // Store user data
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
      await AsyncStorage.setItem('@mindstack_token', user.id);

      return { success: true, user };
    } catch (error) {
      console.error('Microsoft sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign Out
  static async signOut() {
    try {
      const userData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (userData) {
        const user = JSON.parse(userData);

        // Sign out from provider
        if (user.authProvider === 'google') {
          await GoogleSignin.signOut();
        } else if (user.authProvider === 'microsoft') {
          await msalClient.signOut();
        }
      }

      // Clear local storage
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem('@mindstack_token');

      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get Current User
  static async getCurrentUser() {
    try {
      const userData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (userData) {
        return { success: true, user: JSON.parse(userData) };
      }
      return { success: false, error: 'No user logged in' };
    } catch (error) {
      console.error('Get current user error:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if user is authenticated
  static async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem('@mindstack_token');
      return !!token;
    } catch (error) {
      return false;
    }
  }

  // Simple password hashing (use bcrypt in production)
  static async hashPassword(password) {
    // This is a simple hash for demo purposes
    // In production, use proper encryption like bcrypt
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  // Reset Password
  static async resetPassword(email) {
    try {
      // In production, this would send a reset email via your backend
      // For now, we'll just return success
      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: error.message };
    }
  }
}
