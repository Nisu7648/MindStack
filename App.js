import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';

// Import auth screens
import SignUpScreen from './src/screens/auth/SignUpScreen';
import SignInScreen from './src/screens/auth/SignInScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

// Import setup screen
import BusinessSetupScreen from './src/screens/setup/BusinessSetupScreen';

// Import main screens
import DashboardScreen from './src/screens/DashboardScreen';
import CreateInvoiceScreen from './src/screens/CreateInvoiceScreen';
import RecordPaymentScreen from './src/screens/RecordPaymentScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import StockManagementScreen from './src/screens/StockManagementScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CustomerManagementScreen from './src/screens/CustomerManagementScreen';
import ProductManagementScreen from './src/screens/ProductManagementScreen';

// Import services
import { AuthService } from './src/services/AuthService';
import { SetupService } from './src/services/SetupService';

// Import Error Boundary
import ErrorBoundary from './src/components/ErrorBoundary';

const Stack = createStackNavigator();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isSetupComplete, setIsSetupComplete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAppStatus();
  }, []);

  const checkAppStatus = async () => {
    try {
      // Check authentication
      const authenticated = await AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);

      // Check setup completion (only if authenticated)
      if (authenticated) {
        const setupComplete = await SetupService.isSetupComplete();
        setIsSetupComplete(setupComplete);
      }
    } catch (error) {
      console.error('App status check error:', error);
      setIsAuthenticated(false);
      setIsSetupComplete(false);
    } finally {
      setLoading(false);
    }
  };

  const getInitialRoute = () => {
    if (!isAuthenticated) {
      return 'SignIn';
    }
    if (!isSetupComplete) {
      return 'BusinessSetup';
    }
    return 'Dashboard';
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={getInitialRoute()}
          screenOptions={{
            headerStyle: {
              backgroundColor: '#FFFFFF',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: '#E0E0E0',
            },
            headerTintColor: '#1A1A1A',
            headerTitleStyle: {
              fontWeight: '600',
              fontSize: 18,
            },
          }}
        >
          {/* Auth Screens */}
          <Stack.Screen 
            name="SignIn" 
            component={SignInScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="SignUp" 
            component={SignUpScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="ForgotPassword" 
            component={ForgotPasswordScreen}
            options={{ 
              title: 'Reset Password',
              headerBackTitle: 'Back'
            }}
          />

          {/* Setup Screen */}
          <Stack.Screen 
            name="BusinessSetup" 
            component={BusinessSetupScreen}
            options={{ 
              headerShown: false,
              gestureEnabled: false, // Prevent swipe back
            }}
          />

          {/* Main App Screens */}
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen}
            options={{ 
              title: 'Dashboard',
              headerLeft: null // Disable back button
            }}
          />
          <Stack.Screen 
            name="CreateInvoice" 
            component={CreateInvoiceScreen}
            options={({ route }) => ({ 
              title: `Create ${route.params?.type === 'SALES' ? 'Sales' : 'Purchase'} Invoice`
            })}
          />
          <Stack.Screen 
            name="RecordPayment" 
            component={RecordPaymentScreen}
            options={{ title: 'Record Payment' }}
          />
          <Stack.Screen 
            name="RecordReceipt" 
            component={RecordPaymentScreen}
            initialParams={{ type: 'RECEIPT' }}
            options={{ title: 'Record Receipt' }}
          />
          <Stack.Screen 
            name="Reports" 
            component={ReportsScreen}
            options={{ title: 'Financial Reports' }}
          />
          <Stack.Screen 
            name="StockManagement" 
            component={StockManagementScreen}
            options={{ title: 'Stock Management' }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen 
            name="CustomerManagement" 
            component={CustomerManagementScreen}
            options={{ title: 'Customer Management' }}
          />
          <Stack.Screen 
            name="ProductManagement" 
            component={ProductManagementScreen}
            options={{ title: 'Product Management' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
};

export default App;
