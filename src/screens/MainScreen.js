/**
 * MAIN SCREEN - TRANSACTION TYPE FOCUSED
 * 
 * Revolutionary approach:
 * - AI-powered natural language input
 * - User thinks in TRANSACTIONS, not features
 * - One tap to start any transaction
 * - No complex menus
 * - Business health visible immediately
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl
} from 'react-native';
import { supabase } from '../services/supabase';
import BusinessHealthMonitor from '../services/health/BusinessHealthMonitor';

const { width } = Dimensions.get('window');

const TRANSACTION_TYPES = [
  {
    id: 'sale',
    title: 'Sale',
    subtitle: 'Create invoice & get paid',
    icon: '💵',
    color: '#4CAF50',
    screen: 'CreateInvoice',
    description: 'Invoice customer, record sale, update inventory & accounting automatically'
  },
  {
    id: 'purchase',
    title: 'Purchase',
    subtitle: 'Record supplier bill',
    icon: '🛒',
    color: '#2196F3',
    screen: 'CreatePurchase',
    description: 'Record purchase, update inventory, track payables automatically'
  },
  {
    id: 'expense',
    title: 'Expense',
    subtitle: 'Business expense',
    icon: '💸',
    color: '#FF9800',
    screen: 'CreateExpense',
    description: 'Record expense, categorize, update accounting automatically'
  },
  {
    id: 'payment_in',
    title: 'Payment In',
    subtitle: 'Receive money',
    icon: '💰',
    color: '#8BC34A',
    screen: 'RecordPaymentIn',
    description: 'Record customer payment, update receivables, reconcile automatically'
  },
  {
    id: 'payment_out',
    title: 'Payment Out',
    subtitle: 'Pay supplier/expense',
    icon: '💳',
    color: '#F44336',
    screen: 'RecordPaymentOut',
    description: 'Record payment to supplier, update payables, reconcile automatically'
  },
  {
    id: 'credit_note',
    title: 'Credit Note',
    subtitle: 'Sales return',
    icon: '↩️',
    color: '#9C27B0',
    screen: 'CreateCreditNote',
    description: 'Issue credit note, reverse sale, restore inventory automatically'
  },
  {
    id: 'debit_note',
    title: 'Debit Note',
    subtitle: 'Purchase return',
    icon: '↪️',
    color: '#FF5722',
    screen: 'CreateDebitNote',
    description: 'Issue debit note, reverse purchase, adjust inventory automatically'
  }
];

const MainScreen = ({ navigation, userId }) => {
  const [business, setBusiness] = useState(null);
  const [businessHealth, setBusinessHealth] = useState(null);
  const [todayStats, setTodayStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

      // Load today's stats
      const stats = await loadTodayStats(businessData.id);
      setTodayStats(stats);

    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayStats = async (businessId) => {
    const today = new Date().toISOString().split('T')[0];

    const { data: transactions } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('business_id', businessId)
      .gte('date', today);

    const stats = {
      sales: 0,
      purchases: 0,
      expenses: 0,
      paymentsIn: 0,
      paymentsOut: 0,
      transactionCount: transactions?.length || 0
    };

    if (transactions) {
      for (const txn of transactions) {
        switch (txn.type) {
          case 'sale':
            stats.sales += txn.amount;
            break;
          case 'purchase':
            stats.purchases += txn.amount;
            break;
          case 'expense':
            stats.expenses += txn.amount;
            break;
          case 'payment_in':
            stats.paymentsIn += txn.amount;
            break;
          case 'payment_out':
            stats.paymentsOut += txn.amount;
            break;
        }
      }
    }

    return stats;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleTransactionPress = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const startTransaction = () => {
    if (selectedTransaction) {
      navigation.navigate(selectedTransaction.screen, {
        businessId: business.id,
        transactionType: selectedTransaction.id
      });
      setSelectedTransaction(null);
    }
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
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello!</Text>
            <Text style={styles.businessName}>{business?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* AI Transaction Button - PROMINENT */}
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => navigation.navigate('AITransaction', { businessId: business.id })}
        >
          <View style={styles.aiButtonContent}>
            <Text style={styles.aiButtonIcon}>🤖</Text>
            <View style={styles.aiButtonText}>
              <Text style={styles.aiButtonTitle}>AI Transaction</Text>
              <Text style={styles.aiButtonSubtitle}>
                Just type what you did in any language
              </Text>
            </View>
            <Text style={styles.aiButtonArrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Business Health */}
        {businessHealth && (
          <TouchableOpacity
            style={[styles.healthCard, { borderLeftColor: getHealthColor(businessHealth.status) }]}
            onPress={() => navigation.navigate('BusinessHealth')}
          >
            <View style={styles.healthHeader}>
              <Text style={styles.healthEmoji}>{getHealthEmoji(businessHealth.status)}</Text>
              <View style={styles.healthInfo}>
                <Text style={styles.healthTitle}>Business Health</Text>
                <Text style={[styles.healthStatus, { color: getHealthColor(businessHealth.status) }]}>
                  {businessHealth.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.healthMessage}>{businessHealth.message}</Text>
          </TouchableOpacity>
        )}

        {/* Today's Stats */}
        {todayStats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>📊 Today's Activity</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Sales</Text>
                <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                  ₹{todayStats.sales.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Purchases</Text>
                <Text style={[styles.statValue, { color: '#2196F3' }]}>
                  ₹{todayStats.purchases.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Expenses</Text>
                <Text style={[styles.statValue, { color: '#FF9800' }]}>
                  ₹{todayStats.expenses.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Transactions</Text>
                <Text style={styles.statValue}>{todayStats.transactionCount}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Main Section: What do you want to do? */}
        <View style={styles.mainSection}>
          <Text style={styles.mainTitle}>Or choose transaction type</Text>

          <View style={styles.transactionGrid}>
            {TRANSACTION_TYPES.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={[
                  styles.transactionCard,
                  selectedTransaction?.id === transaction.id && styles.transactionCardSelected
                ]}
                onPress={() => handleTransactionPress(transaction)}
              >
                <View style={[styles.transactionIcon, { backgroundColor: transaction.color }]}>
                  <Text style={styles.transactionEmoji}>{transaction.icon}</Text>
                </View>
                <Text style={styles.transactionTitle}>{transaction.title}</Text>
                <Text style={styles.transactionSubtitle}>{transaction.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transaction Explanation */}
        {selectedTransaction && (
          <View style={[styles.explanationCard, { borderLeftColor: selectedTransaction.color }]}>
            <View style={styles.explanationHeader}>
              <Text style={styles.explanationIcon}>{selectedTransaction.icon}</Text>
              <Text style={styles.explanationTitle}>{selectedTransaction.title}</Text>
            </View>
            <Text style={styles.explanationText}>{selectedTransaction.description}</Text>
            
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: selectedTransaction.color }]}
              onPress={startTransaction}
            >
              <Text style={styles.startButtonText}>Start {selectedTransaction.title} →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Access */}
        <View style={styles.quickAccess}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          
          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => navigation.navigate('InvoiceList')}
          >
            <Text style={styles.quickAccessIcon}>📄</Text>
            <View style={styles.quickAccessInfo}>
              <Text style={styles.quickAccessTitle}>Invoices</Text>
              <Text style={styles.quickAccessSubtitle}>View all invoices</Text>
            </View>
            <Text style={styles.quickAccessArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => navigation.navigate('Customers')}
          >
            <Text style={styles.quickAccessIcon}>👥</Text>
            <View style={styles.quickAccessInfo}>
              <Text style={styles.quickAccessTitle}>Customers</Text>
              <Text style={styles.quickAccessSubtitle}>Manage customers</Text>
            </View>
            <Text style={styles.quickAccessArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => navigation.navigate('Inventory')}
          >
            <Text style={styles.quickAccessIcon}>📦</Text>
            <View style={styles.quickAccessInfo}>
              <Text style={styles.quickAccessTitle}>Inventory</Text>
              <Text style={styles.quickAccessSubtitle}>Stock management</Text>
            </View>
            <Text style={styles.quickAccessArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => navigation.navigate('Reports')}
          >
            <Text style={styles.quickAccessIcon}>📈</Text>
            <View style={styles.quickAccessInfo}>
              <Text style={styles.quickAccessTitle}>Reports</Text>
              <Text style={styles.quickAccessSubtitle}>Business insights</Text>
            </View>
            <Text style={styles.quickAccessArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
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
  scrollView: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 30
  },
  greeting: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.9
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 5
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  settingsIcon: {
    fontSize: 20
  },
  aiButton: {
    backgroundColor: '#4CAF50',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5
  },
  aiButtonContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  aiButtonIcon: {
    fontSize: 40,
    marginRight: 15
  },
  aiButtonText: {
    flex: 1
  },
  aiButtonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5
  },
  aiButtonSubtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9
  },
  aiButtonArrow: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold'
  },
  healthCard: {
    backgroundColor: '#FFF',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 6,
    elevation: 2
  },
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  healthEmoji: {
    fontSize: 32,
    marginRight: 15
  },
  healthInfo: {
    flex: 1
  },
  healthTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3
  },
  healthStatus: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  healthMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  statsCard: {
    backgroundColor: '#FFF',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 12,
    elevation: 2
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  statItem: {
    width: '50%',
    marginBottom: 15
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  mainSection: {
    padding: 15
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 15
  },
  transactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5
  },
  transactionCard: {
    width: (width - 40) / 2,
    backgroundColor: '#FFF',
    margin: 5,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  transactionCardSelected: {
    borderColor: '#2196F3',
    elevation: 4
  },
  transactionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  transactionEmoji: {
    fontSize: 28
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
    textAlign: 'center'
  },
  transactionSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  explanationCard: {
    backgroundColor: '#FFF',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 6,
    elevation: 3
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  explanationIcon: {
    fontSize: 32,
    marginRight: 15
  },
  explanationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  explanationText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20
  },
  startButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  quickAccess: {
    backgroundColor: '#FFF',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 12,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  quickAccessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginBottom: 10
  },
  quickAccessIcon: {
    fontSize: 28,
    marginRight: 15
  },
  quickAccessInfo: {
    flex: 1
  },
  quickAccessTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3
  },
  quickAccessSubtitle: {
    fontSize: 13,
    color: '#666'
  },
  quickAccessArrow: {
    fontSize: 20,
    color: '#999'
  }
});

export default MainScreen;
