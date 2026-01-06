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

// Import billing screens
import DailyDashboardScreen from './src/screens/billing/DailyDashboardScreen';
import POSQuickBillScreen from './src/screens/billing/POSQuickBillScreen';
import FullInvoiceScreen from './src/screens/billing/FullInvoiceScreen';
import BarcodeScannerScreen from './src/screens/billing/BarcodeScannerScreen';
import DayCloseScreen from './src/screens/billing/DayCloseScreen';

// Import product screens
import AddProductScreen from './src/screens/products/AddProductScreen';
import InventoryScreen from './src/screens/products/InventoryScreen';

// Import audit screens
import AuditTrailScreen from './src/screens/audit/AuditTrailScreen';
import ComplianceReportScreen from './src/screens/audit/ComplianceReportScreen';

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
    return 'DailyDashboard'; // Changed default to billing dashboard
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
              gestureEnabled: false,
            }}
          />

          {/* Main Dashboard */}
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen}
            options={{ 
              title: 'Dashboard',
              headerLeft: null
            }}
          />

          {/* Billing Screens */}
          <Stack.Screen 
            name="DailyDashboard" 
            component={DailyDashboardScreen}
            options={{ 
              title: 'Daily Billing',
              headerLeft: null
            }}
          />
          <Stack.Screen 
            name="POSQuickBill" 
            component={POSQuickBillScreen}
            options={{ title: 'Quick Bill' }}
          />
          <Stack.Screen 
            name="FullInvoice" 
            component={FullInvoiceScreen}
            options={{ title: 'GST Invoice' }}
          />
          <Stack.Screen 
            name="BarcodeScanner" 
            component={BarcodeScannerScreen}
            options={{ 
              headerShown: false,
              gestureEnabled: false
            }}
          />
          <Stack.Screen 
            name="DayClose" 
            component={DayCloseScreen}
            options={{ title: 'Day Close' }}
          />

          {/* Product/Inventory Screens */}
          <Stack.Screen 
            name="Inventory" 
            component={InventoryScreen}
            options={{ title: 'Inventory' }}
          />
          <Stack.Screen 
            name="AddProduct" 
            component={AddProductScreen}
            options={{ title: 'Add Product' }}
          />

          {/* Audit Screens */}
          <Stack.Screen 
            name="AuditTrail" 
            component={AuditTrailScreen}
            options={{ title: 'Audit Trail' }}
          />
          <Stack.Screen 
            name="ComplianceReport" 
            component={ComplianceReportScreen}
            options={{ title: 'Compliance Report' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
};

export default App;
