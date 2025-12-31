import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';

// Import auth screens
import SignUpScreen from './src/screens/auth/SignUpScreen';
import SignInScreen from './src/screens/auth/SignInScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

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

// Import Error Boundary
import ErrorBoundary from './src/components/ErrorBoundary';

const Stack = createStackNavigator();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
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
          initialRouteName={isAuthenticated ? 'Dashboard' : 'SignIn'}
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
