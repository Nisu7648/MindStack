import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CreateInvoiceScreen from './src/screens/CreateInvoiceScreen';
import RecordPaymentScreen from './src/screens/RecordPaymentScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import StockManagementScreen from './src/screens/StockManagementScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CustomerManagementScreen from './src/screens/CustomerManagementScreen';
import ProductManagementScreen from './src/screens/ProductManagementScreen';

// Import Error Boundary
import ErrorBoundary from './src/components/ErrorBoundary';

const Stack = createStackNavigator();

const App = () => {
  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
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
