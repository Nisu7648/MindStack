/**
 * DASHBOARD SCREEN
 * 
 * Main screen showing:
 * - Business health in 3 seconds
 * - Quick actions
 * - Today's summary
 * - Real-time insights
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions
} from 'react-native';
import { supabase } from '../services/supabase';
import BusinessHealthMonitor from '../services/health/BusinessHealthMonitor';
import TaxOptimizationEngine from '../services/tax/TaxOptimizationEngine';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation, userId }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessHealth, setBusinessHealth] = useState(null);
  const [todaySummary, setTodaySummary] = useState(null);
  const [taxSavings, setTaxSavings] = useState(null);
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Get business
      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!businessData) {
        navigation.replace('BusinessSetup');
        return;
      }

      setBusiness(businessData);

      // Load business health
      const health = await BusinessHealthMonitor.getBusinessHealth(businessData.id);
      setBusinessHealth(health);

      // Load today's summary
      const summary = await loadTodaySummary(businessData.id);
      setTodaySummary(summary);

      // Load tax savings opportunities
      const savings = await TaxOptimizationEngine.getRealTimeSavings({
        amount: summary.todaySales,
        type: 'sale',
        date: new Date().toISOString(),
        country: businessData.country,
        items: []
      });
      setTaxSavings(savings);

    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodaySummary = async (businessId) => {
    const today = new Date().toISOString().split('T')[0];

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .gte('date', today);

    const sales = transactions?.filter(t => t.type === 'sale') || [];
    const purchases = transactions?.filter(t => t.type === 'purchase') || [];
    const expenses = transactions?.filter(t => t.type === 'expense') || [];

    return {
      todaySales: sales.reduce((sum, s) => sum + s.amount, 0),
      todayPurchases: purchases.reduce((sum, p) => sum + p.amount, 0),
      todayExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
      transactionCount: transactions?.length || 0,
      salesCount: sales.length,
      purchaseCount: purchases.length
    };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const getHealthColor = (status) => {
    if (status === 'healthy') return '#4CAF50';
    if (status === 'watch_out') return '#FF9800';
    return '#F44336';
  };

  const getHealthEmoji = (status) => {
    if (status === 'healthy') return '🟢';
    if (status === 'watch_out') return '🟡';
    return '🔴';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {business?.name || 'User'}!</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</Text>
      </View>

      {/* Business Health Card */}
      {businessHealth && (
        <TouchableOpacity
          style={[styles.healthCard, { borderLeftColor: getHealthColor(businessHealth.status) }]}
          onPress={() => navigation.navigate('BusinessHealth', { health: businessHealth })}
        >
          <View style={styles.healthHeader}>
            <Text style={styles.healthEmoji}>
              {getHealthEmoji(businessHealth.status)}
            </Text>
            <Text style={styles.healthTitle}>BUSINESS HEALTH</Text>
          </View>
          <Text style={[styles.healthStatus, { color: getHealthColor(businessHealth.status) }]}>
            {businessHealth.status.toUpperCase()}
          </Text>
          <Text style={styles.healthMessage}>{businessHealth.message}</Text>
          
          {businessHealth.actions && businessHealth.actions.length > 0 && (
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>
                {businessHealth.actions.length} action{businessHealth.actions.length > 1 ? 's' : ''} needed
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Today's Summary */}
      {todaySummary && (
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>📊 Today's Summary</Text>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Sales</Text>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                ₹{todaySummary.todaySales.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.summaryCount}>{todaySummary.salesCount} transactions</Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Purchases</Text>
              <Text style={[styles.summaryValue, { color: '#FF9800' }]}>
                ₹{todaySummary.todayPurchases.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.summaryCount}>{todaySummary.purchaseCount} transactions</Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                ₹{todaySummary.todayExpenses.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Profit</Text>
              <Text style={[styles.summaryValue, { color: '#2196F3' }]}>
                ₹{(todaySummary.todaySales - todaySummary.todayPurchases - todaySummary.todayExpenses).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Tax Savings Alert */}
      {taxSavings && taxSavings.hasSavings && (
        <TouchableOpacity
          style={styles.savingsCard}
          onPress={() => navigation.navigate('TaxOptimization', { savings: taxSavings })}
        >
          <Text style={styles.savingsEmoji}>💰</Text>
          <Text style={styles.savingsTitle}>Tax Savings Available!</Text>
          <Text style={styles.savingsAmount}>
            Save ₹{taxSavings.totalPotentialSavings.toFixed(0)}
          </Text>
          <Text style={styles.savingsCount}>
            {taxSavings.suggestions.length} opportunities found
          </Text>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.cardTitle}>⚡ Quick Actions</Text>
        
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('NewSale')}
          >
            <Text style={styles.actionIcon}>💵</Text>
            <Text style={styles.actionText}>New Sale</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('NewPurchase')}
          >
            <Text style={styles.actionIcon}>🛒</Text>
            <Text style={styles.actionText}>New Purchase</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('NewExpense')}
          >
            <Text style={styles.actionIcon}>💸</Text>
            <Text style={styles.actionText}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('POSBilling')}
          >
            <Text style={styles.actionIcon}>🖨️</Text>
            <Text style={styles.actionText}>POS Billing</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Inventory')}
          >
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionText}>Inventory</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Reports')}
          >
            <Text style={styles.actionIcon}>📈</Text>
            <Text style={styles.actionText}>Reports</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentActivity}>
        <View style={styles.activityHeader}>
          <Text style={styles.cardTitle}>📋 Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>
        
        {/* This would show recent transactions */}
        <Text style={styles.comingSoon}>Recent transactions will appear here</Text>
      </View>

      {/* Bottom spacing */}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#666'
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 30
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5
  },
  date: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9
  },
  healthCard: {
    backgroundColor: '#FFF',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  healthEmoji: {
    fontSize: 32,
    marginRight: 10
  },
  healthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 1
  },
  healthStatus: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5
  },
  healthMessage: {
    fontSize: 15,
    color: '#666',
    marginBottom: 10
  },
  actionBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 10
  },
  actionBadgeText: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600'
  },
  summaryCard: {
    backgroundColor: '#FFF',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10
  },
  summaryItem: {
    width: '50%',
    padding: 10,
    marginBottom: 10
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 3
  },
  summaryCount: {
    fontSize: 12,
    color: '#999'
  },
  savingsCard: {
    backgroundColor: '#E8F5E9',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50'
  },
  savingsEmoji: {
    fontSize: 40,
    marginBottom: 10
  },
  savingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5
  },
  savingsAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 5
  },
  savingsCount: {
    fontSize: 14,
    color: '#388E3C'
  },
  quickActions: {
    backgroundColor: '#FFF',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    elevation: 3
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5
  },
  actionButton: {
    width: (width - 60) / 3,
    margin: 5,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  actionText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center'
  },
  recentActivity: {
    backgroundColor: '#FFF',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    elevation: 3
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  viewAll: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600'
  },
  comingSoon: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20
  }
});

export default DashboardScreen;
