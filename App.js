/**
 * APP.JS - WITH BACKGROUND SERVICES & ENHANCED SETUP
 * 
 * Initializes background services on app start
 * Services run automatically every hour:
 * - Business health check
 * - Tax optimization scan
 * - Bank reconciliation
 * - Inventory alerts
 * - Payment reminders
 * 
 * Features:
 * - Multi-country support (15 countries)
 * - Enhanced business setup wizard (5 steps)
 * - Complete authentication flow
 * - Background automation
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';

// Import auth screens
import SignUpScreen from './src/screens/auth/SignUpScreen';
import SignInScreen from './src/screens/auth/SignInScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

// Import setup screens
import BusinessSetupScreen from './src/screens/setup/BusinessSetupScreen';
import EnhancedBusinessSetupScreen from './src/screens/setup/EnhancedBusinessSetupScreen';

// Import main screens
import DashboardScreen from './src/screens/DashboardScreen';
import CreateInvoiceScreen from './src/screens/CreateInvoiceScreen';
import JournalEntryScreen from './src/screens/JournalEntryScreen';
import RecordPaymentScreen from './src/screens/RecordPaymentScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import StockManagementScreen from './src/screens/StockManagementScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CustomerManagementScreen from './src/screens/CustomerManagementScreen';
import ProductManagementScreen from './src/screens/ProductManagementScreen';
import PeriodClosingScreen from './src/screens/PeriodClosingScreen';

// Import services
import { AuthService } from './src/services/AuthService';
import { SetupService } from './src/services/SetupService';
import ScreenConnector from './src/services/integration/ScreenConnector';

// Import Error Boundary
import ErrorBoundary from './src/components/ErrorBoundary';

const Stack = createStackNavigator();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isSetupComplete, setIsSetupComplete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [businessId, setBusinessId] = useState(null);

  useEffect(() => {
    checkAppStatus();
  }, []);

  const checkAppStatus = async () => {
    try {
      console.log('🚀 Initializing MindStack...');

      // Check authentication
      const authenticated = await AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);

      // Check setup completion (only if authenticated)
      if (authenticated) {
        const setupComplete = await SetupService.isSetupComplete();
        setIsSetupComplete(setupComplete);

        // Get user and business IDs
        const user = await AuthService.getCurrentUser();
        const business = await SetupService.getCurrentBusiness();
        
        if (user) setUserId(user.id);
        if (business) setBusinessId(business.id);

        // ✨ INITIALIZE BACKGROUND SERVICES
        if (user && business) {
          await ScreenConnector.initialize(user.id, business.id);
          
          console.log('✅ Background services started!');
          console.log('⚙️ Services running automatically:');
          console.log('   - Business health check (every hour)');
          console.log('   - Tax optimization scan (every hour)');
          console.log('   - Bank reconciliation (every hour)');
          console.log('   - Inventory alerts (every hour)');
          console.log('   - Payment reminders (every hour)');
        }
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
      return 'EnhancedBusinessSetup';
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

          {/* Setup Screens */}
          <Stack.Screen 
            name="BusinessSetup" 
            component={BusinessSetupScreen}
            options={{ 
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen 
            name="EnhancedBusinessSetup" 
            component={EnhancedBusinessSetupScreen}
            options={{ 
              title: 'Business Setup',
              headerLeft: null,
              gestureEnabled: false,
            }}
          />

          {/* Main App Screens */}
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen}
            initialParams={{ userId, businessId }}
            options={{ 
              title: 'Dashboard',
              headerLeft: null
            }}
          />
          <Stack.Screen 
            name="CreateInvoice" 
            component={CreateInvoiceScreen}
            initialParams={{ userId, businessId }}
            options={({ route }) => ({ 
              title: `Create ${route.params?.type === 'SALES' ? 'Sales' : 'Purchase'} Invoice`
            })}
          />
          <Stack.Screen 
            name="JournalEntry" 
            component={JournalEntryScreen}
            initialParams={{ userId, businessId }}
            options={{ title: 'Create Journal Entry' }}
          />
          <Stack.Screen 
            name="PeriodClosing" 
            component={PeriodClosingScreen}
            initialParams={{ userId, businessId }}
            options={{ title: 'Period Closing' }}
          />
          <Stack.Screen 
            name="RecordPayment" 
            component={RecordPaymentScreen}
            initialParams={{ userId, businessId }}
            options={{ title: 'Record Payment' }}
          />
          <Stack.Screen 
            name="RecordReceipt" 
            component={RecordPaymentScreen}
            initialParams={{ type: 'RECEIPT', userId, businessId }}
            options={{ title: 'Record Receipt' }}
          />
          <Stack.Screen 
            name="Reports" 
            component={ReportsScreen}
            initialParams={{ userId, businessId }}
            options={{ title: 'Financial Reports' }}
          />
          <Stack.Screen 
            name="StockManagement" 
            component={StockManagementScreen}
            initialParams={{ userId, businessId }}
            options={{ title: 'Stock Management' }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen}
            initialParams={{ userId, businessId }}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen 
            name="CustomerManagement" 
            component={CustomerManagementScreen}
            initialParams={{ userId, businessId }}
            options={{ title: 'Customer Management' }}
          />
          <Stack.Screen 
            name="ProductManagement" 
            component={ProductManagementScreen}
            initialParams={{ userId, businessId }}
            options={{ title: 'Product Management' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
};

export default App;
