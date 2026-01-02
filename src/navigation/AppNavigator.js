/**
 * NAVIGATION CONFIGURATION
 * 
 * Complete app navigation structure with all screens connected
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

// Main Screens
import DashboardScreen from '../screens/main/DashboardScreen';
import MoneyFlowScreen from '../screens/autonomous/MoneyFlowScreen';
import FinancialInsightsScreen from '../screens/insights/FinancialInsightsScreen';

// POS Screens
import POSQuickBillScreen from '../screens/pos/POSQuickBillScreen';
import POSHistoryScreen from '../screens/pos/POSHistoryScreen';
import ProductManagementScreen from '../screens/pos/ProductManagementScreen';

// Inventory Screens
import InventoryDashboardScreen from '../screens/inventory/InventoryDashboardScreen';
import StockManagementScreen from '../screens/inventory/StockManagementScreen';
import PurchaseOrderScreen from '../screens/inventory/PurchaseOrderScreen';

// Banking Screens
import AutoReconciliationScreen from '../screens/autonomous/AutoReconciliationScreen';
import BankAccountsScreen from '../screens/banking/BankAccountsScreen';
import TransactionHistoryScreen from '../screens/banking/TransactionHistoryScreen';

// Tax Screens
import TaxReportScreen from '../screens/tax/TaxReportScreen';
import TaxOptimizationScreen from '../screens/tax/TaxOptimizationScreen';
import TaxReadinessScreen from '../screens/tax/TaxReadinessScreen';

// Customer/Vendor Screens
import CustomerListScreen from '../screens/contacts/CustomerListScreen';
import VendorListScreen from '../screens/contacts/VendorListScreen';
import ContactDetailsScreen from '../screens/contacts/ContactDetailsScreen';

// Invoice Screens
import InvoiceListScreen from '../screens/invoices/InvoiceListScreen';
import CreateInvoiceScreen from '../screens/invoices/CreateInvoiceScreen';
import InvoiceDetailsScreen from '../screens/invoices/InvoiceDetailsScreen';

// Expense Screens
import ExpenseManagementScreen from '../screens/expenses/ExpenseManagementScreen';
import CreateExpenseScreen from '../screens/expenses/CreateExpenseScreen';

// Reports Screens
import ReportsDashboardScreen from '../screens/reports/ReportsDashboardScreen';
import ProfitLossScreen from '../screens/reports/ProfitLossScreen';
import BalanceSheetScreen from '../screens/reports/BalanceSheetScreen';
import CashFlowScreen from '../screens/reports/CashFlowScreen';

// Settings Screens
import SettingsScreen from '../screens/settings/SettingsScreen';
import BusinessSettingsScreen from '../screens/settings/BusinessSettingsScreen';
import UserProfileScreen from '../screens/settings/UserProfileScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';

// Search Screen
import GlobalSearchScreen from '../screens/search/GlobalSearchScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

/**
 * Bottom Tab Navigator
 */
const BottomTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'POS':
              iconName = focused ? 'cash-register' : 'cash-register';
              break;
            case 'Money':
              iconName = focused ? 'currency-usd' : 'currency-usd';
              break;
            case 'Reports':
              iconName = focused ? 'chart-line' : 'chart-line';
              break;
            case 'More':
              iconName = focused ? 'menu' : 'menu';
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#757575',
        headerShown: false
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="POS" component={POSQuickBillScreen} />
      <Tab.Screen name="Money" component={MoneyFlowScreen} />
      <Tab.Screen name="Reports" component={ReportsDashboardScreen} />
      <Tab.Screen name="More" component={DrawerNavigator} />
    </Tab.Navigator>
  );
};

/**
 * Drawer Navigator (Side Menu)
 */
const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerActiveTintColor: '#4CAF50',
        drawerInactiveTintColor: '#757575'
      }}
    >
      <Drawer.Screen 
        name="Home" 
        component={DashboardScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          )
        }}
      />
      
      <Drawer.Screen 
        name="Financial Insights" 
        component={FinancialInsightsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="lightbulb-on" size={size} color={color} />
          )
        }}
      />
      
      <Drawer.Screen 
        name="Inventory" 
        component={InventoryDashboardScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="package-variant" size={size} color={color} />
          )
        }}
      />
      
      <Drawer.Screen 
        name="Customers" 
        component={CustomerListScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="account-group" size={size} color={color} />
          )
        }}
      />
      
      <Drawer.Screen 
        name="Vendors" 
        component={VendorListScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="truck" size={size} color={color} />
          )
        }}
      />
      
      <Drawer.Screen 
        name="Invoices" 
        component={InvoiceListScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="file-document" size={size} color={color} />
          )
        }}
      />
      
      <Drawer.Screen 
        name="Expenses" 
        component={ExpenseManagementScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="credit-card" size={size} color={color} />
          )
        }}
      />
      
      <Drawer.Screen 
        name="Bank Reconciliation" 
        component={AutoReconciliationScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="bank" size={size} color={color} />
          )
        }}
      />
      
      <Drawer.Screen 
        name="Tax Reports" 
        component={TaxReportScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="file-chart" size={size} color={color} />
          )
        }}
      />
      
      <Drawer.Screen 
        name="Tax Optimization" 
        component={TaxOptimizationScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="lightbulb-on-outline" size={size} color={color} />
          )
        }}
      />
      
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="cog" size={size} color={color} />
          )
        }}
      />
    </Drawer.Navigator>
  );
};

/**
 * Main App Navigator
 */
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerShown: false
        }}
      >
        {/* Auth Flow */}
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        
        {/* Main App */}
        <Stack.Screen name="Main" component={BottomTabs} />
        
        {/* Global Search */}
        <Stack.Screen 
          name="GlobalSearch" 
          component={GlobalSearchScreen}
          options={{
            headerShown: true,
            title: 'Search'
          }}
        />
        
        {/* POS Screens */}
        <Stack.Screen name="POSHistory" component={POSHistoryScreen} />
        <Stack.Screen name="ProductManagement" component={ProductManagementScreen} />
        
        {/* Inventory Screens */}
        <Stack.Screen name="StockManagement" component={StockManagementScreen} />
        <Stack.Screen name="PurchaseOrder" component={PurchaseOrderScreen} />
        
        {/* Banking Screens */}
        <Stack.Screen name="BankAccounts" component={BankAccountsScreen} />
        <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
        
        {/* Tax Screens */}
        <Stack.Screen name="TaxReadiness" component={TaxReadinessScreen} />
        
        {/* Contact Screens */}
        <Stack.Screen name="ContactDetails" component={ContactDetailsScreen} />
        
        {/* Invoice Screens */}
        <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
        <Stack.Screen name="InvoiceDetails" component={InvoiceDetailsScreen} />
        
        {/* Expense Screens */}
        <Stack.Screen name="CreateExpense" component={CreateExpenseScreen} />
        
        {/* Report Screens */}
        <Stack.Screen name="ProfitLoss" component={ProfitLossScreen} />
        <Stack.Screen name="BalanceSheet" component={BalanceSheetScreen} />
        <Stack.Screen name="CashFlow" component={CashFlowScreen} />
        
        {/* Settings Screens */}
        <Stack.Screen name="BusinessSettings" component={BusinessSettingsScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
