/**
 * TAX READINESS SCREEN
 * 
 * Shows tax compliance status
 * Identifies issues before filing
 * Provides actionable recommendations
 * No filing-time panic!
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import TaxAutopilotEngine from '../../services/tax/TaxAutopilotEngine';

const TaxReadinessScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('THIS_MONTH');
  const [readinessData, setReadinessData] = useState({
    score: 0,
    grade: 'F',
    issues: {
      missingInvoices: [],
      wrongTax: [],
      unmatchedITC: [],
      lateFilings: [],
      thresholdViolations: []
    },
    recommendations: [],
    filingReady: false,
    taxSummary: null,
    taxLiability: null
  });

  useEffect(() => {
    loadReadinessData();
  }, [period]);

  const loadReadinessData = async () => {
    setLoading(true);
    try {
      const periodDates = getPeriodDates(period);
      
      // Get tax readiness score
      const readiness = await TaxAutopilotEngine.getTaxReadinessScore(1, periodDates);
      
      // Get tax summary
      const taxSummary = await TaxAutopilotEngine.generateTaxSummary(periodDates);
      
      // Get tax liability
      const taxLiability = await TaxAutopilotEngine.getTaxLiability(periodDates);

      setReadinessData({
        ...readiness,
        taxSummary,
        taxLiability
      });
    } catch (error) {
      console.error('Failed to load readiness data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodDates = (period) => {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'THIS_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'LAST_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'THIS_QUARTER':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const handleFixIssue = (issue) => {
    switch (issue.priority) {
      case 'CRITICAL':
        Alert.alert(
          '⚠️ Critical Issue',
          `${issue.issue}\n\nAction: ${issue.action}\n\nImpact: ${issue.impact}`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Fix Now', onPress: () => navigateToFix(issue) }
          ]
        );
        break;
      default:
        navigateToFix(issue);
    }
  };

  const navigateToFix = (issue) => {
    // Navigate to appropriate screen based on issue type
    if (issue.issue.includes('Invoice')) {
      navigation.navigate('Invoices');
    } else if (issue.issue.includes('Tax')) {
      navigation.navigate('TaxCorrection');
    } else if (issue.issue.includes('Filing')) {
      navigation.navigate('TaxFiling');
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#4CAF50';
    if (score >= 80) return '#8BC34A';
    if (score >= 70) return '#FFC107';
    if (score >= 60) return '#FF9800';
    return '#f44336';
  };

  const getGradeEmoji = (grade) => {
    const emojis = {
      'A': '🌟',
      'B': '✅',
      'C': '⚠️',
      'D': '❌',
      'F': '🚨'
    };
    return emojis[grade] || '❓';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'CRITICAL': '#f44336',
      'HIGH': '#FF9800',
      'MEDIUM': '#FFC107',
      'LOW': '#4CAF50'
    };
    return colors[priority] || '#666';
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadReadinessData} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Tax Readiness</Text>
        <Text style={styles.subtitle}>Always ready to file</Text>
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
          style={[styles.periodButton, period === 'THIS_QUARTER' && styles.periodButtonActive]}
          onPress={() => setPeriod('THIS_QUARTER')}
        >
          <Text style={[styles.periodButtonText, period === 'THIS_QUARTER' && styles.periodButtonTextActive]}>
            This Quarter
          </Text>
        </TouchableOpacity>
      </View>

      {/* Readiness Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreValue, { color: getScoreColor(readinessData.score) }]}>
            {readinessData.score}
          </Text>
          <Text style={styles.scoreLabel}>Readiness Score</Text>
        </View>

        <View style={styles.gradeSection}>
          <Text style={styles.gradeEmoji}>{getGradeEmoji(readinessData.grade)}</Text>
          <Text style={styles.gradeText}>Grade {readinessData.grade}</Text>
          <Text style={[
            styles.filingStatus,
            { color: readinessData.filingReady ? '#4CAF50' : '#f44336' }
          ]}>
            {readinessData.filingReady ? '✓ Ready to File' : '✗ Not Ready'}
          </Text>
        </View>
      </View>

      {/* Tax Summary */}
      {readinessData.taxSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Tax Summary</Text>

          <View style={styles.taxSummaryCard}>
            <View style={styles.taxRow}>
              <Text style={styles.taxLabel}>Output Tax (Sales):</Text>
              <Text style={[styles.taxValue, { color: '#f44336' }]}>
                {formatCurrency(
                  Object.values(readinessData.taxSummary.sales)
                    .reduce((sum, s) => sum + s.taxAmount, 0)
                )}
              </Text>
            </View>

            <View style={styles.taxRow}>
              <Text style={styles.taxLabel}>Input Tax (Purchases):</Text>
              <Text style={[styles.taxValue, { color: '#4CAF50' }]}>
                -{formatCurrency(
                  Object.values(readinessData.taxSummary.purchases)
                    .reduce((sum, p) => sum + p.taxAmount, 0)
                )}
              </Text>
            </View>

            <View style={[styles.taxRow, styles.netTaxRow]}>
              <Text style={styles.netTaxLabel}>Net Tax Payable:</Text>
              <Text style={[
                styles.netTaxValue,
                { color: readinessData.taxSummary.netTax > 0 ? '#f44336' : '#4CAF50' }
              ]}>
                {formatCurrency(Math.abs(readinessData.taxSummary.netTax))}
              </Text>
            </View>
          </View>

          {readinessData.taxLiability && (
            <View style={styles.dueDateCard}>
              <Text style={styles.dueDateLabel}>Due Date:</Text>
              <Text style={styles.dueDateValue}>
                {new Date(readinessData.taxLiability.dueDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Issues Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔍 Issues Found</Text>

        {Object.entries(readinessData.issues).map(([key, issues]) => {
          if (issues.length === 0) return null;

          const issueLabels = {
            missingInvoices: '📄 Missing Invoices',
            wrongTax: '⚠️ Wrong Tax Calculations',
            unmatchedITC: '🔗 Unmatched ITC',
            lateFilings: '⏰ Late Filings',
            thresholdViolations: '🚨 Threshold Violations'
          };

          return (
            <View key={key} style={styles.issueCard}>
              <View style={styles.issueHeader}>
                <Text style={styles.issueTitle}>{issueLabels[key]}</Text>
                <View style={styles.issueBadge}>
                  <Text style={styles.issueBadgeText}>{issues.length}</Text>
                </View>
              </View>

              <Text style={styles.issueDescription}>
                {this.getIssueDescription(key, issues.length)}
              </Text>

              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => navigation.navigate('IssueDetails', { issueType: key, issues })}
              >
                <Text style={styles.viewDetailsButtonText}>View Details →</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {Object.values(readinessData.issues).every(arr => arr.length === 0) && (
          <View style={styles.noIssuesCard}>
            <Text style={styles.noIssuesEmoji}>🎉</Text>
            <Text style={styles.noIssuesText}>No issues found!</Text>
            <Text style={styles.noIssuesSubtext}>Your tax records are in perfect shape</Text>
          </View>
        )}
      </View>

      {/* Recommendations */}
      {readinessData.recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Recommendations</Text>

          {readinessData.recommendations.map((rec, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recommendationCard}
              onPress={() => handleFixIssue(rec)}
            >
              <View style={styles.recommendationHeader}>
                <View style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(rec.priority) }
                ]}>
                  <Text style={styles.priorityText}>{rec.priority}</Text>
                </View>
                <Text style={styles.recommendationIssue}>{rec.issue}</Text>
              </View>

              <Text style={styles.recommendationAction}>
                ✓ {rec.action}
              </Text>

              <View style={styles.impactSection}>
                <Text style={styles.impactLabel}>Impact:</Text>
                <Text style={styles.impactText}>{rec.impact}</Text>
              </View>

              <View style={styles.fixButton}>
                <Text style={styles.fixButtonText}>Fix Now →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 Tax Readiness Score</Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>90-100</Text>: Perfect! Ready to file
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>80-89</Text>: Good, minor issues
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>70-79</Text>: Fair, needs attention
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>Below 70</Text>: Critical issues, fix immediately
        </Text>
        <Text style={[styles.infoText, { marginTop: 10 }]}>
          System continuously tracks compliance. No filing-time panic!
        </Text>
      </View>
    </ScrollView>
  );

  getIssueDescription(key, count) {
    const descriptions = {
      missingInvoices: `${count} transaction${count > 1 ? 's' : ''} without proper invoices`,
      wrongTax: `${count} transaction${count > 1 ? 's' : ''} with incorrect tax calculations`,
      unmatchedITC: `${count} purchase${count > 1 ? 's' : ''} without vendor GSTIN`,
      lateFilings: `${count} pending return${count > 1 ? 's' : ''} past due date`,
      thresholdViolations: `${count} threshold violation${count > 1 ? 's' : ''} detected`
    };
    return descriptions[key] || '';
  }
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
  scoreCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 2
  },
  scoreCircle: {
    alignItems: 'center'
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666'
  },
  gradeSection: {
    alignItems: 'center'
  },
  gradeEmoji: {
    fontSize: 48,
    marginBottom: 8
  },
  gradeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4
  },
  filingStatus: {
    fontSize: 14,
    fontWeight: '600'
  },
  section: {
    marginHorizontal: 15,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12
  },
  taxSummaryCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  taxLabel: {
    fontSize: 14,
    color: '#666'
  },
  taxValue: {
    fontSize: 16,
    fontWeight: '600'
  },
  netTaxRow: {
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
    paddingTop: 10,
    marginTop: 5
  },
  netTaxLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  netTaxValue: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  dueDateCard: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dueDateLabel: {
    fontSize: 14,
    color: '#F57C00',
    fontWeight: '600'
  },
  dueDateValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57C00'
  },
  issueCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1
  },
  issueBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  issueBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  issueDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  viewDetailsButton: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  viewDetailsButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600'
  },
  noIssuesCard: {
    backgroundColor: '#E8F5E9',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center'
  },
  noIssuesEmoji: {
    fontSize: 48,
    marginBottom: 12
  },
  noIssuesText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4
  },
  noIssuesSubtext: {
    fontSize: 14,
    color: '#666'
  },
  recommendationCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  priorityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold'
  },
  recommendationIssue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1
  },
  recommendationAction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10
  },
  impactSection: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10
  },
  impactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 4
  },
  impactText: {
    fontSize: 13,
    color: '#F57C00'
  },
  fixButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  fixButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
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

export default TaxReadinessScreen;
