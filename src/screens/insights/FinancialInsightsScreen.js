/**
 * FINANCIAL INSIGHTS SCREEN
 * 
 * Human-language financial view
 * NO accounting jargon (Journal, Debit/Credit, Trial Balance)
 * Shows: "You earned", "You spent", "You owe", "You will receive"
 * WITH explanations: "Profit dropped because purchase cost increased"
 * 
 * Wave shows reports. MindStack EXPLAINS them.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl
} from 'react-native';

const FinancialInsightsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('THIS_MONTH');
  const [insights, setInsights] = useState({
    earned: {
      total: 0,
      breakdown: [],
      trend: null,
      explanation: ''
    },
    spent: {
      total: 0,
      breakdown: [],
      trend: null,
      explanation: ''
    },
    owe: {
      total: 0,
      breakdown: [],
      urgent: [],
      explanation: ''
    },
    willReceive: {
      total: 0,
      breakdown: [],
      overdue: [],
      explanation: ''
    },
    realProfit: {
      amount: 0,
      margin: 0,
      trend: null,
      explanation: '',
      factors: []
    },
    cashPosition: {
      current: 0,
      projected7Days: 0,
      explanation: ''
    }
  });

  useEffect(() => {
    loadInsights();
  }, [period]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      // Mock data with intelligent explanations
      setInsights({
        earned: {
          total: 250000,
          breakdown: [
            { source: 'Product Sales', amount: 180000, percentage: 72 },
            { source: 'Service Income', amount: 50000, percentage: 20 },
            { source: 'Other Income', amount: 20000, percentage: 8 }
          ],
          trend: 'UP',
          trendPercentage: 15,
          explanation: 'You earned ₹15,000 more this month because product sales increased by 20%.'
        },
        spent: {
          total: 180000,
          breakdown: [
            { category: 'Purchases', amount: 100000, percentage: 55.6, change: 25 },
            { category: 'Rent', amount: 30000, percentage: 16.7, change: 0 },
            { category: 'Salaries', amount: 35000, percentage: 19.4, change: 0 },
            { category: 'Utilities', amount: 10000, percentage: 5.6, change: -10 },
            { category: 'Other', amount: 5000, percentage: 2.8, change: 0 }
          ],
          trend: 'UP',
          trendPercentage: 12,
          explanation: 'You spent ₹20,000 more this month. Main reason: Purchase costs increased by 25% (₹20,000 more).'
        },
        owe: {
          total: 85000,
          breakdown: [
            { to: 'Vendor A', amount: 45000, dueDate: '2025-01-15', daysLeft: 10 },
            { to: 'Vendor B', amount: 30000, dueDate: '2025-01-20', daysLeft: 15 },
            { to: 'Rent', amount: 10000, dueDate: '2025-01-10', daysLeft: 5 }
          ],
          urgent: [
            { to: 'Rent', amount: 10000, dueDate: '2025-01-10', daysLeft: 5 }
          ],
          explanation: 'You need to pay ₹85,000 soon. ₹10,000 rent is due in 5 days - pay this first!'
        },
        willReceive: {
          total: 120000,
          breakdown: [
            { from: 'Customer A', amount: 60000, dueDate: '2025-01-12', daysLeft: 7 },
            { from: 'Customer B', amount: 40000, dueDate: '2025-01-18', daysLeft: 13 },
            { from: 'Customer C', amount: 20000, dueDate: '2025-01-08', daysLeft: 3 }
          ],
          overdue: [],
          explanation: 'Customers will pay you ₹120,000 soon. Follow up with Customer C (₹20,000 due in 3 days).'
        },
        realProfit: {
          amount: 70000,
          margin: 28,
          trend: 'UP',
          trendPercentage: 8,
          explanation: 'Your real profit is ₹70,000 (28% margin). This is ₹5,000 more than last month.',
          factors: [
            {
              factor: 'Sales increased',
              impact: '+₹15,000',
              positive: true,
              explanation: 'You sold more products'
            },
            {
              factor: 'Purchase costs increased',
              impact: '-₹20,000',
              positive: false,
              explanation: 'Raw materials became expensive'
            },
            {
              factor: 'Utilities decreased',
              impact: '+₹1,000',
              positive: true,
              explanation: 'Lower electricity bill'
            },
            {
              factor: 'Better margins on services',
              impact: '+₹9,000',
              positive: true,
              explanation: 'Service income had higher profit margin'
            }
          ]
        },
        cashPosition: {
          current: 45000,
          projected7Days: 80000,
          trend: 'UP',
          explanation: 'You have ₹45,000 cash now. In 7 days, you\'ll have ₹80,000 (after receiving ₹120,000 and paying ₹85,000).'
        }
      });
    } catch (error) {
      console.error('Failed to load insights:', error);
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

  const getTrendIcon = (trend) => {
    if (trend === 'UP') return '📈';
    if (trend === 'DOWN') return '📉';
    return '➡️';
  };

  const getTrendColor = (trend, isGood = true) => {
    if (trend === 'UP') return isGood ? '#4CAF50' : '#f44336';
    if (trend === 'DOWN') return isGood ? '#f44336' : '#4CAF50';
    return '#666';
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadInsights} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>💡 Financial Insights</Text>
        <Text style={styles.subtitle}>Your money story in plain language</Text>
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

      {/* Real Profit - Most Important */}
      <View style={styles.profitCard}>
        <Text style={styles.profitLabel}>💎 Your Real Profit</Text>
        <Text style={styles.profitAmount}>{formatCurrency(insights.realProfit.amount)}</Text>
        <Text style={styles.profitMargin}>{insights.realProfit.margin}% margin</Text>
        
        {insights.realProfit.trend && (
          <View style={styles.trendBadge}>
            <Text style={styles.trendText}>
              {getTrendIcon(insights.realProfit.trend)} {insights.realProfit.trendPercentage}% vs last period
            </Text>
          </View>
        )}

        <View style={styles.explanationBox}>
          <Text style={styles.explanationText}>{insights.realProfit.explanation}</Text>
        </View>

        {/* Profit Factors */}
        <View style={styles.factorsSection}>
          <Text style={styles.factorsTitle}>What affected your profit:</Text>
          {insights.realProfit.factors.map((factor, index) => (
            <View key={index} style={styles.factorCard}>
              <View style={styles.factorHeader}>
                <Text style={styles.factorName}>
                  {factor.positive ? '✅' : '❌'} {factor.factor}
                </Text>
                <Text style={[
                  styles.factorImpact,
                  { color: factor.positive ? '#4CAF50' : '#f44336' }
                ]}>
                  {factor.impact}
                </Text>
              </View>
              <Text style={styles.factorExplanation}>{factor.explanation}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* You Earned */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💰 You Earned</Text>
          <Text style={[styles.sectionAmount, { color: '#4CAF50' }]}>
            {formatCurrency(insights.earned.total)}
          </Text>
        </View>

        {insights.earned.trend && (
          <View style={[styles.trendBadge, { backgroundColor: '#E8F5E9' }]}>
            <Text style={[styles.trendText, { color: '#4CAF50' }]}>
              {getTrendIcon(insights.earned.trend)} {insights.earned.trendPercentage}% more than last period
            </Text>
          </View>
        )}

        <View style={styles.explanationBox}>
          <Text style={styles.explanationText}>{insights.earned.explanation}</Text>
        </View>

        <View style={styles.breakdownList}>
          {insights.earned.breakdown.map((item, index) => (
            <View key={index} style={styles.breakdownItem}>
              <View style={styles.breakdownInfo}>
                <Text style={styles.breakdownName}>{item.source}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${item.percentage}%` }]} />
                </View>
              </View>
              <Text style={styles.breakdownAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* You Spent */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💸 You Spent</Text>
          <Text style={[styles.sectionAmount, { color: '#f44336' }]}>
            {formatCurrency(insights.spent.total)}
          </Text>
        </View>

        {insights.spent.trend && (
          <View style={[styles.trendBadge, { backgroundColor: '#FFEBEE' }]}>
            <Text style={[styles.trendText, { color: '#f44336' }]}>
              {getTrendIcon(insights.spent.trend)} {insights.spent.trendPercentage}% more than last period
            </Text>
          </View>
        )}

        <View style={styles.explanationBox}>
          <Text style={styles.explanationText}>{insights.spent.explanation}</Text>
        </View>

        <View style={styles.breakdownList}>
          {insights.spent.breakdown.map((item, index) => (
            <View key={index} style={styles.breakdownItem}>
              <View style={styles.breakdownInfo}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownName}>{item.category}</Text>
                  {item.change !== 0 && (
                    <Text style={[
                      styles.changeText,
                      { color: item.change > 0 ? '#f44336' : '#4CAF50' }
                    ]}>
                      {item.change > 0 ? '+' : ''}{item.change}%
                    </Text>
                  )}
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${item.percentage}%`, backgroundColor: '#f44336' }]} />
                </View>
              </View>
              <Text style={styles.breakdownAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* You Owe */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📤 You Owe</Text>
          <Text style={[styles.sectionAmount, { color: '#FF9800' }]}>
            {formatCurrency(insights.owe.total)}
          </Text>
        </View>

        <View style={styles.explanationBox}>
          <Text style={styles.explanationText}>{insights.owe.explanation}</Text>
        </View>

        {insights.owe.urgent.length > 0 && (
          <View style={styles.urgentCard}>
            <Text style={styles.urgentTitle}>⚠️ Pay These First:</Text>
            {insights.owe.urgent.map((item, index) => (
              <View key={index} style={styles.urgentItem}>
                <Text style={styles.urgentName}>{item.to}</Text>
                <Text style={styles.urgentAmount}>{formatCurrency(item.amount)}</Text>
                <Text style={styles.urgentDays}>Due in {item.daysLeft} days</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.breakdownList}>
          {insights.owe.breakdown.map((item, index) => (
            <View key={index} style={styles.breakdownItem}>
              <View style={styles.breakdownInfo}>
                <Text style={styles.breakdownName}>{item.to}</Text>
                <Text style={styles.dueDate}>
                  Due: {new Date(item.dueDate).toLocaleDateString('en-IN')} ({item.daysLeft} days)
                </Text>
              </View>
              <Text style={styles.breakdownAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* You Will Receive */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📥 You Will Receive</Text>
          <Text style={[styles.sectionAmount, { color: '#4CAF50' }]}>
            {formatCurrency(insights.willReceive.total)}
          </Text>
        </View>

        <View style={styles.explanationBox}>
          <Text style={styles.explanationText}>{insights.willReceive.explanation}</Text>
        </View>

        <View style={styles.breakdownList}>
          {insights.willReceive.breakdown.map((item, index) => (
            <View key={index} style={styles.breakdownItem}>
              <View style={styles.breakdownInfo}>
                <Text style={styles.breakdownName}>{item.from}</Text>
                <Text style={styles.dueDate}>
                  Due: {new Date(item.dueDate).toLocaleDateString('en-IN')} ({item.daysLeft} days)
                </Text>
              </View>
              <Text style={styles.breakdownAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Cash Position */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💵 Your Cash Position</Text>
        </View>

        <View style={styles.cashCard}>
          <View style={styles.cashRow}>
            <Text style={styles.cashLabel}>Cash Now:</Text>
            <Text style={styles.cashValue}>{formatCurrency(insights.cashPosition.current)}</Text>
          </View>
          <View style={styles.cashRow}>
            <Text style={styles.cashLabel}>In 7 Days:</Text>
            <Text style={[
              styles.cashValue,
              { color: insights.cashPosition.projected7Days > insights.cashPosition.current ? '#4CAF50' : '#f44336' }
            ]}>
              {formatCurrency(insights.cashPosition.projected7Days)}
            </Text>
          </View>
        </View>

        <View style={styles.explanationBox}>
          <Text style={styles.explanationText}>{insights.cashPosition.explanation}</Text>
        </View>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 Understanding Your Money</Text>
        <Text style={styles.infoText}>
          We explain your finances in plain language - no accounting jargon!
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>You Earned</Text>: All money that came in
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>You Spent</Text>: All money that went out
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>You Owe</Text>: Money you need to pay
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>You Will Receive</Text>: Money coming to you
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>Real Profit</Text>: Earned - Spent
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
  profitCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    elevation: 3
  },
  profitLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center'
  },
  profitAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 4
  },
  profitMargin: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12
  },
  trendBadge: {
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  trendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50'
  },
  explanationBox: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  factorsSection: {
    marginTop: 10
  },
  factorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 10
  },
  factorCard: {
    backgroundColor: '#F9F9F9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  factorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1
  },
  factorImpact: {
    fontSize: 13,
    fontWeight: 'bold'
  },
  factorExplanation: {
    fontSize: 12,
    color: '#666'
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
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
  breakdownList: {
    gap: 10
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  breakdownInfo: {
    flex: 1,
    marginRight: 15
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  breakdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600'
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  dueDate: {
    fontSize: 12,
    color: '#666'
  },
  urgentCard: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15
  },
  urgentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 10
  },
  urgentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  urgentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1
  },
  urgentAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f44336',
    marginRight: 10
  },
  urgentDays: {
    fontSize: 12,
    color: '#f44336'
  },
  cashCard: {
    backgroundColor: '#F9F9F9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12
  },
  cashRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  cashLabel: {
    fontSize: 14,
    color: '#666'
  },
  cashValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A'
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

export default FinancialInsightsScreen;
