/**
 * DASHBOARD SCREEN
 * 
 * Main dashboard with:
 * - Quick stats overview
 * - Recent transactions
 * - Tax readiness widget
 * - Quick actions
 * - Financial insights
 * - Alerts and notifications
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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getDatabase } from '../../database/schema';
import GlobalTaxEngine from '../../services/tax/GlobalTaxEngine';
import AdvancedTaxCalculator from '../../services/tax/AdvancedTaxCalculator';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    todaySales: 0,
    todayExpenses: 0,
    cashInHand: 0,
    bankBalance: 0,
    receivables: 0,
    payables: 0,
    taxReadiness: 0,
    recentTransactions: [],
    alerts: []
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  /**
   * Load all dashboard data
   */
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        todayStats,
        balances,
        outstandings,
        taxReadiness,
        recentTxns,
        alerts
      ] = await Promise.all([
        getTodayStats(),
        getBalances(),
        getOutstandings(),
        getTaxReadiness(),
        getRecentTransactions(),
        getAlerts()
      ]);

      setDashboardData({
        ...todayStats,
        ...balances,
        ...outstandings,
        taxReadiness,
        recentTransactions: recentTxns,
        alerts
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get today's stats
   */
  const getTodayStats = async () => {
    const db = await getDatabase();
    const today = new Date().toISOString().split('T')[0];

    const result = await db.executeSql(
      `SELECT 
        SUM(CASE WHEN type = 'SALES' THEN amount ELSE 0 END) as todaySales,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as todayExpenses
       FROM transactions
       WHERE date = ?`,
      [today]
    );

    return {
      todaySales: result[0].rows.item(0).todaySales || 0,
      todayExpenses: result[0].rows.item(0).todayExpenses || 0
    };
  };

  /**
   * Get cash and bank balances
   */
  const getBalances = async () => {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT 
        SUM(CASE WHEN account_type = 'CASH' THEN balance ELSE 0 END) as cashInHand,
        SUM(CASE WHEN account_type = 'BANK' THEN balance ELSE 0 END) as bankBalance
       FROM accounts`
    );

    return {
      cashInHand: result[0].rows.item(0).cashInHand || 0,
      bankBalance: result[0].rows.item(0).bankBalance || 0
    };
  };

  /**
   * Get receivables and payables
   */
  const getOutstandings = async () => {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT 
        SUM(CASE WHEN type = 'SALES' AND payment_status = 'PENDING' THEN amount ELSE 0 END) as receivables,
        SUM(CASE WHEN type = 'PURCHASE' AND payment_status = 'PENDING' THEN amount ELSE 0 END) as payables
       FROM transactions`
    );

    return {
      receivables: result[0].rows.item(0).receivables || 0,
      payables: result[0].rows.item(0).payables || 0
    };
  };

  /**
   * Get tax readiness score
   */
  const getTaxReadiness = async () => {
    // Simplified - use actual TaxAutopilotEngine in production
    return 85;
  };

  /**
   * Get recent transactions
   */
  const getRecentTransactions = async () => {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT t.*, 
        CASE 
          WHEN t.customer_id IS NOT NULL THEN c.name
          WHEN t.vendor_id IS NOT NULL THEN v.name
          ELSE 'N/A'
        END as party_name
       FROM transactions t
       LEFT JOIN customers c ON t.customer_id = c.id
       LEFT JOIN vendors v ON t.vendor_id = v.id
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT 10`
    );

    const transactions = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(result[0].rows.item(i));
    }

    return transactions;
  };

  /**
   * Get alerts and notifications
   */
  const getAlerts = async () => {
    const alerts = [];

    // Check for low stock
    const db = await getDatabase();
    const lowStock = await db.executeSql(
      `SELECT COUNT(*) as count FROM inventory WHERE quantity < reorder_level`
    );

    if (lowStock[0].rows.item(0).count > 0) {
      alerts.push({
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${lowStock[0].rows.item(0).count} products need reordering`,
        action: () => navigation.navigate('Inventory')
      });
    }

    // Check for overdue invoices
    const overdueInvoices = await db.executeSql(
      `SELECT COUNT(*) as count FROM invoices 
       WHERE payment_status = 'PENDING' 
       AND due_date < date('now')`
    );

    if (overdueInvoices[0].rows.item(0).count > 0) {
      alerts.push({
        type: 'error',
        title: 'Overdue Invoices',
        message: `${overdueInvoices[0].rows.item(0).count} invoices are overdue`,
        action: () => navigation.navigate('Invoices')
      });
    }

    return alerts;
  };

  /**
   * Render stat card
   */
  const renderStatCard = (title, value, icon, color, onPress) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
    >
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>{title}</Text>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>₹{value.toLocaleString()}</Text>
    </TouchableOpacity>
  );

  /**
   * Render quick action button
   */
  const renderQuickAction = (title, icon, color, onPress) => (
    <TouchableOpacity 
      style={styles.quickAction}
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={28} color={color} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  /**
   * Render transaction item
   */
  const renderTransaction = (transaction) => {
    const isIncome = transaction.type === 'SALES';
    const icon = isIncome ? 'arrow-up-circle' : 'arrow-down-circle';
    const color = isIncome ? '#4CAF50' : '#F44336';

    return (
      <TouchableOpacity
        key={transaction.id}
        style={styles.transactionItem}
        onPress={() => navigation.navigate('TransactionDetails', { transactionId: transaction.id })}
      >
        <View style={[styles.transactionIcon, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={24} color={color} />
        </View>
        <View style={styles.transactionContent}>
          <Text style={styles.transactionTitle}>
            {transaction.description || transaction.type}
          </Text>
          <Text style={styles.transactionSubtitle}>
            {transaction.party_name} • {new Date(transaction.date).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, { color }]}>
          {isIncome ? '+' : '-'}₹{transaction.amount.toLocaleString()}
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * Render alert
   */
  const renderAlert = (alert) => {
    const iconName = alert.type === 'error' ? 'alert-circle' : 'alert';
    const color = alert.type === 'error' ? '#F44336' : '#FF9800';

    return (
      <TouchableOpacity
        key={alert.title}
        style={[styles.alert, { borderLeftColor: color }]}
        onPress={alert.action}
      >
        <Icon name={iconName} size={24} color={color} />
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>{alert.title}</Text>
          <Text style={styles.alertMessage}>{alert.message}</Text>
        </View>
        <Icon name="chevron-right" size={24} color="#757575" />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadDashboardData} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : 'Evening'}!</Text>
          <Text style={styles.businessName}>MindStack Business</Text>
        </View>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => navigation.navigate('GlobalSearch')}
        >
          <Icon name="magnify" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Alerts */}
      {dashboardData.alerts.length > 0 && (
        <View style={styles.alertsContainer}>
          {dashboardData.alerts.map(renderAlert)}
        </View>
      )}

      {/* Today's Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Sales Today',
            dashboardData.todaySales,
            'arrow-up-circle',
            '#4CAF50',
            () => navigation.navigate('POS')
          )}
          {renderStatCard(
            'Expenses Today',
            dashboardData.todayExpenses,
            'arrow-down-circle',
            '#F44336',
            () => navigation.navigate('Expenses')
          )}
        </View>
      </View>

      {/* Balances */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Balances</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Cash in Hand',
            dashboardData.cashInHand,
            'cash',
            '#2196F3',
            () => navigation.navigate('CashDiscipline')
          )}
          {renderStatCard(
            'Bank Balance',
            dashboardData.bankBalance,
            'bank',
            '#9C27B0',
            () => navigation.navigate('BankAccounts')
          )}
        </View>
      </View>

      {/* Outstandings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Outstandings</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'To Receive',
            dashboardData.receivables,
            'arrow-down',
            '#FF9800',
            () => navigation.navigate('Customers')
          )}
          {renderStatCard(
            'To Pay',
            dashboardData.payables,
            'arrow-up',
            '#F44336',
            () => navigation.navigate('Vendors')
          )}
        </View>
      </View>

      {/* Tax Readiness */}
      <TouchableOpacity
        style={styles.taxCard}
        onPress={() => navigation.navigate('TaxReadiness')}
      >
        <View style={styles.taxHeader}>
          <Text style={styles.taxTitle}>Tax Readiness</Text>
          <View style={styles.taxScore}>
            <Text style={styles.taxScoreText}>{dashboardData.taxReadiness}</Text>
            <Text style={styles.taxScoreLabel}>/100</Text>
          </View>
        </View>
        <View style={styles.taxProgress}>
          <View 
            style={[
              styles.taxProgressBar, 
              { width: `${dashboardData.taxReadiness}%` }
            ]} 
          />
        </View>
        <Text style={styles.taxStatus}>
          {dashboardData.taxReadiness >= 90 ? '✅ Ready to file' : '⚠️ Needs attention'}
        </Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {renderQuickAction('New Sale', 'cash-register', '#4CAF50', () => navigation.navigate('POS'))}
          {renderQuickAction('New Invoice', 'file-document', '#2196F3', () => navigation.navigate('CreateInvoice'))}
          {renderQuickAction('Add Expense', 'credit-card', '#F44336', () => navigation.navigate('CreateExpense'))}
          {renderQuickAction('Tax Report', 'file-chart', '#FF9800', () => navigation.navigate('TaxReport'))}
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.transactionsList}>
          {dashboardData.recentTransactions.map(renderTransaction)}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF'
  },
  greeting: {
    fontSize: 14,
    color: '#757575'
  },
  businessName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 4
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  alertsContainer: {
    padding: 16,
    paddingTop: 8
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 8,
    elevation: 1
  },
  alertContent: {
    flex: 1,
    marginLeft: 12
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  alertMessage: {
    fontSize: 12,
    color: '#757575'
  },
  section: {
    padding: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12
  },
  seeAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500'
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginRight: 8,
    borderLeftWidth: 4,
    elevation: 1
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  statTitle: {
    fontSize: 12,
    color: '#757575',
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  taxCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2
  },
  taxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  taxTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  taxScore: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  taxScoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  taxScoreLabel: {
    fontSize: 16,
    color: '#757575',
    marginLeft: 4
  },
  taxProgress: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12
  },
  taxProgressBar: {
    height: '100%',
    backgroundColor: '#4CAF50'
  },
  taxStatus: {
    fontSize: 14,
    color: '#757575'
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  quickAction: {
    width: (width - 48) / 4,
    alignItems: 'center',
    marginBottom: 16
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  quickActionText: {
    fontSize: 12,
    color: '#1A1A1A',
    textAlign: 'center'
  },
  transactionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden'
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  transactionContent: {
    flex: 1
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4
  },
  transactionSubtitle: {
    fontSize: 12,
    color: '#757575'
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600'
  }
});

export default DashboardScreen;
