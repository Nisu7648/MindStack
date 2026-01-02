/**
 * MONEY IN/OUT SCREEN
 * 
 * Simplified view for non-accountants
 * Shows money flow without accounting jargon
 * "Money in", "Money out", "What I owe", "What I'm owed"
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
import { LineChart, BarChart } from 'react-native-chart-kit';

const MoneyFlowScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('THIS_MONTH'); // THIS_MONTH, LAST_MONTH, THIS_YEAR
  const [moneyData, setMoneyData] = useState({
    moneyIn: {
      total: 0,
      cash: 0,
      bank: 0,
      credit: 0,
      breakdown: []
    },
    moneyOut: {
      total: 0,
      cash: 0,
      bank: 0,
      credit: 0,
      breakdown: []
    },
    whatIOwe: {
      total: 0,
      vendors: []
    },
    whatImOwed: {
      total: 0,
      customers: []
    },
    netCashFlow: 0,
    cashInHand: 0,
    bankBalance: 0
  });

  useEffect(() => {
    loadMoneyData();
  }, [period]);

  const loadMoneyData = async () => {
    setLoading(true);
    try {
      // This would query the database
      // For now, using mock data
      setMoneyData({
        moneyIn: {
          total: 150000,
          cash: 50000,
          bank: 80000,
          credit: 20000,
          breakdown: [
            { source: 'Sales', amount: 120000, percentage: 80 },
            { source: 'Payments Received', amount: 25000, percentage: 16.7 },
            { source: 'Other Income', amount: 5000, percentage: 3.3 }
          ]
        },
        moneyOut: {
          total: 95000,
          cash: 30000,
          bank: 55000,
          credit: 10000,
          breakdown: [
            { category: 'Purchases', amount: 50000, percentage: 52.6 },
            { category: 'Rent', amount: 15000, percentage: 15.8 },
            { category: 'Salaries', amount: 20000, percentage: 21.1 },
            { category: 'Utilities', amount: 5000, percentage: 5.3 },
            { category: 'Other', amount: 5000, percentage: 5.3 }
          ]
        },
        whatIOwe: {
          total: 45000,
          vendors: [
            { name: 'Vendor A', amount: 25000, dueDate: '2025-01-15', overdue: false },
            { name: 'Vendor B', amount: 15000, dueDate: '2025-01-20', overdue: false },
            { name: 'Vendor C', amount: 5000, dueDate: '2024-12-25', overdue: true }
          ]
        },
        whatImOwed: {
          total: 35000,
          customers: [
            { name: 'Customer A', amount: 20000, dueDate: '2025-01-10', overdue: false },
            { name: 'Customer B', amount: 10000, dueDate: '2024-12-28', overdue: true },
            { name: 'Customer C', amount: 5000, dueDate: '2025-01-25', overdue: false }
          ]
        },
        netCashFlow: 55000,
        cashInHand: 25000,
        bankBalance: 125000
      });
    } catch (error) {
      console.error('Failed to load money data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toLocaleString('en-IN', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'THIS_MONTH': return 'This Month';
      case 'LAST_MONTH': return 'Last Month';
      case 'THIS_YEAR': return 'This Year';
      default: return 'This Month';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadMoneyData} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>💰 Money Flow</Text>
        <Text style={styles.subtitle}>Simple view of your money</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, period === 'THIS_MONTH' && styles.periodButtonActive]}
          onPress={() => setPeriod('THIS_MONTH')}
        >
          <Text style={[styles.periodButtonText, period === 'THIS_MONTH' && styles.periodButtonTextActive]}>
            This Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === 'LAST_MONTH' && styles.periodButtonActive]}
          onPress={() => setPeriod('LAST_MONTH')}
        >
          <Text style={[styles.periodButtonText, period === 'LAST_MONTH' && styles.periodButtonTextActive]}>
            Last Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === 'THIS_YEAR' && styles.periodButtonActive]}
          onPress={() => setPeriod('THIS_YEAR')}
        >
          <Text style={[styles.periodButtonText, period === 'THIS_YEAR' && styles.periodButtonTextActive]}>
            This Year
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Summary Cards */}
      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={styles.summaryCardLabel}>💵 Cash in Hand</Text>
          <Text style={[styles.summaryCardValue, { color: '#4CAF50' }]}>
            {formatCurrency(moneyData.cashInHand)}
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
          <Text style={styles.summaryCardLabel}>🏦 Bank Balance</Text>
          <Text style={[styles.summaryCardValue, { color: '#2196F3' }]}>
            {formatCurrency(moneyData.bankBalance)}
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: moneyData.netCashFlow >= 0 ? '#E8F5E9' : '#FFEBEE' }]}>
          <Text style={styles.summaryCardLabel}>📊 Net Cash Flow</Text>
          <Text style={[styles.summaryCardValue, { color: moneyData.netCashFlow >= 0 ? '#4CAF50' : '#f44336' }]}>
            {formatCurrency(moneyData.netCashFlow)}
          </Text>
        </View>
      </View>

      {/* Money In Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💰 Money In</Text>
          <Text style={[styles.sectionAmount, { color: '#4CAF50' }]}>
            {formatCurrency(moneyData.moneyIn.total)}
          </Text>
        </View>

        <View style={styles.breakdownCards}>
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownLabel}>Cash</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(moneyData.moneyIn.cash)}</Text>
          </View>
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownLabel}>Bank</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(moneyData.moneyIn.bank)}</Text>
          </View>
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownLabel}>Credit</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(moneyData.moneyIn.credit)}</Text>
          </View>
        </View>

        <View style={styles.detailsList}>
          {moneyData.moneyIn.breakdown.map((item, index) => (
            <View key={index} style={styles.detailItem}>
              <View style={styles.detailInfo}>
                <Text style={styles.detailName}>{item.source}</Text>
                <Text style={styles.detailPercentage}>{item.percentage.toFixed(1)}%</Text>
              </View>
              <Text style={styles.detailAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Money Out Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💸 Money Out</Text>
          <Text style={[styles.sectionAmount, { color: '#f44336' }]}>
            {formatCurrency(moneyData.moneyOut.total)}
          </Text>
        </View>

        <View style={styles.breakdownCards}>
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownLabel}>Cash</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(moneyData.moneyOut.cash)}</Text>
          </View>
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownLabel}>Bank</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(moneyData.moneyOut.bank)}</Text>
          </View>
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownLabel}>Credit</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(moneyData.moneyOut.credit)}</Text>
          </View>
        </View>

        <View style={styles.detailsList}>
          {moneyData.moneyOut.breakdown.map((item, index) => (
            <View key={index} style={styles.detailItem}>
              <View style={styles.detailInfo}>
                <Text style={styles.detailName}>{item.category}</Text>
                <Text style={styles.detailPercentage}>{item.percentage.toFixed(1)}%</Text>
              </View>
              <Text style={styles.detailAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* What I Owe Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📤 What I Owe</Text>
          <Text style={[styles.sectionAmount, { color: '#FF9800' }]}>
            {formatCurrency(moneyData.whatIOwe.total)}
          </Text>
        </View>

        <View style={styles.detailsList}>
          {moneyData.whatIOwe.vendors.map((vendor, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.detailItem, vendor.overdue && styles.overdueItem]}
            >
              <View style={styles.detailInfo}>
                <Text style={styles.detailName}>{vendor.name}</Text>
                <Text style={[styles.detailDueDate, vendor.overdue && styles.overdueDateText]}>
                  Due: {vendor.dueDate} {vendor.overdue && '⚠️ OVERDUE'}
                </Text>
              </View>
              <Text style={styles.detailAmount}>{formatCurrency(vendor.amount)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Payables')}
        >
          <Text style={styles.actionButtonText}>View All Payables →</Text>
        </TouchableOpacity>
      </View>

      {/* What I'm Owed Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📥 What I'm Owed</Text>
          <Text style={[styles.sectionAmount, { color: '#4CAF50' }]}>
            {formatCurrency(moneyData.whatImOwed.total)}
          </Text>
        </View>

        <View style={styles.detailsList}>
          {moneyData.whatImOwed.customers.map((customer, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.detailItem, customer.overdue && styles.overdueItem]}
            >
              <View style={styles.detailInfo}>
                <Text style={styles.detailName}>{customer.name}</Text>
                <Text style={[styles.detailDueDate, customer.overdue && styles.overdueDateText]}>
                  Due: {customer.dueDate} {customer.overdue && '⚠️ OVERDUE'}
                </Text>
              </View>
              <Text style={styles.detailAmount}>{formatCurrency(customer.amount)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Receivables')}
        >
          <Text style={styles.actionButtonText}>View All Receivables →</Text>
        </TouchableOpacity>
      </View>

      {/* Real Profit Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💎 Real Profit</Text>
          <Text style={[styles.sectionAmount, { color: '#4CAF50' }]}>
            {formatCurrency(moneyData.moneyIn.total - moneyData.moneyOut.total)}
          </Text>
        </View>

        <View style={styles.profitExplanation}>
          <Text style={styles.profitExplanationText}>
            This is your actual profit after all expenses.
          </Text>
          <Text style={styles.profitExplanationText}>
            Money In: {formatCurrency(moneyData.moneyIn.total)}
          </Text>
          <Text style={styles.profitExplanationText}>
            Money Out: {formatCurrency(moneyData.moneyOut.total)}
          </Text>
          <Text style={[styles.profitExplanationText, { fontWeight: 'bold', marginTop: 10 }]}>
            = Real Profit: {formatCurrency(moneyData.moneyIn.total - moneyData.moneyOut.total)}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('ProfitAnalysis')}
        >
          <Text style={styles.actionButtonText}>Detailed Profit Analysis →</Text>
        </TouchableOpacity>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 Understanding Your Money</Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>Money In</Text>: All money that came into your business
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>Money Out</Text>: All money that went out of your business
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>What I Owe</Text>: Money you need to pay to vendors
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>What I'm Owed</Text>: Money customers need to pay you
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>Real Profit</Text>: Money In - Money Out
        </Text>
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#666'
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: '#fff'
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center'
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50'
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  periodButtonTextActive: {
    color: '#fff'
  },
  summaryCards: {
    flexDirection: 'row',
    padding: 15,
    gap: 10
  },
  summaryCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  summaryCardLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center'
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  sectionAmount: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  breakdownCards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  detailsList: {
    gap: 10
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8
  },
  overdueItem: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336'
  },
  detailInfo: {
    flex: 1
  },
  detailName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  detailPercentage: {
    fontSize: 12,
    color: '#666'
  },
  detailDueDate: {
    fontSize: 12,
    color: '#666'
  },
  overdueDateText: {
    color: '#f44336',
    fontWeight: '600'
  },
  detailAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  profitExplanation: {
    backgroundColor: '#F9F9F9',
    padding: 15,
    borderRadius: 8,
    marginTop: 10
  },
  profitExplanationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 10
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20
  },
  infoBold: {
    fontWeight: '600',
    color: '#1A1A1A'
  }
});

export default MoneyFlowScreen;
