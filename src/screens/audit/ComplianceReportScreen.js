/**
 * COMPLIANCE REPORT SCREEN
 * Real-world compliance checking
 * Shows trial balance, invoice gaps, negative stock, etc.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import complianceEngine from '../../services/audit/complianceEngine';

const ComplianceReportScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('THIS_MONTH');

  useEffect(() => {
    generateReport();
  }, [selectedPeriod]);

  const generateReport = async () => {
    try {
      setLoading(true);

      const { startDate, endDate } = getPeriodDates(selectedPeriod);

      const result = await complianceEngine.generateComplianceReport(startDate, endDate);

      if (result.success) {
        setReport(result.report);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Generate report error:', error);
      Alert.alert('Error', 'Failed to generate compliance report');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodDates = (period) => {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'TODAY':
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString();
        break;

      case 'THIS_WEEK':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        startDate = weekStart.toISOString();
        endDate = new Date().toISOString();
        break;

      case 'THIS_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        endDate = new Date().toISOString();
        break;

      case 'THIS_QUARTER':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString();
        endDate = new Date().toISOString();
        break;

      case 'THIS_YEAR':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
        endDate = new Date().toISOString();
        break;

      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        endDate = new Date().toISOString();
    }

    return { startDate, endDate };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASS':
        return '#4CAF50';
      case 'FAIL':
        return '#F44336';
      case 'WARNING':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASS':
        return 'check-circle';
      case 'FAIL':
        return 'close-circle';
      case 'WARNING':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const renderCheckItem = (check) => (
    <View key={check.name} style={styles.checkCard}>
      <View style={styles.checkHeader}>
        <View style={styles.checkHeaderLeft}>
          <Icon
            name={getStatusIcon(check.status)}
            size={32}
            color={getStatusColor(check.status)}
          />
          <Text style={styles.checkName}>{check.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(check.status) }]}>
          <Text style={styles.statusText}>{check.status}</Text>
        </View>
      </View>

      {/* Details */}
      {check.name === 'Trial Balance' && check.details && (
        <View style={styles.checkDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Debit</Text>
            <Text style={styles.detailValue}>
              ₹{check.details.totalDebit?.toLocaleString('en-IN') || 0}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Credit</Text>
            <Text style={styles.detailValue}>
              ₹{check.details.totalCredit?.toLocaleString('en-IN') || 0}
            </Text>
          </View>
          {check.details.difference !== 0 && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: '#F44336' }]}>Difference</Text>
              <Text style={[styles.detailValue, { color: '#F44336' }]}>
                ₹{Math.abs(check.details.difference || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          )}
        </View>
      )}

      {check.name === 'Unposted Transactions' && check.details && check.details.count > 0 && (
        <View style={styles.checkDetails}>
          <Text style={styles.warningText}>
            {check.details.count} unposted transaction(s) found
          </Text>
        </View>
      )}

      {check.name === 'Invoice Sequence' && check.details?.gaps?.length > 0 && (
        <View style={styles.checkDetails}>
          <Text style={styles.warningText}>
            {check.details.gaps.length} gap(s) in invoice sequence
          </Text>
          {check.details.gaps.slice(0, 3).map((gap, index) => (
            <Text key={index} style={styles.gapText}>
              • Gap between {gap.from} and {gap.to} ({gap.missing} missing)
            </Text>
          ))}
        </View>
      )}

      {check.name === 'Stock Validation' && check.details?.negativeItems?.length > 0 && (
        <View style={styles.checkDetails}>
          <Text style={styles.warningText}>
            {check.details.negativeItems.length} item(s) with negative stock
          </Text>
          {check.details.negativeItems.slice(0, 3).map((item, index) => (
            <Text key={index} style={styles.gapText}>
              • {item.item_name}: {item.current_stock} {item.unit}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Generating compliance report...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={80} color="#F44336" />
        <Text style={styles.errorText}>Failed to generate report</Text>
        <TouchableOpacity style={styles.retryButton} onPress={generateReport}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Compliance Report</Text>
        <TouchableOpacity onPress={generateReport}>
          <Icon name="refresh" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodSelector}>
        {['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR'].map(period => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive
            ]}>
              {period.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {/* Overall Status */}
        <View style={[
          styles.overallStatusCard,
          {
            backgroundColor: report.overallStatus === 'COMPLIANT' ? '#E8F5E9' : '#FFEBEE'
          }
        ]}>
          <Icon
            name={report.overallStatus === 'COMPLIANT' ? 'check-circle' : 'alert-circle'}
            size={48}
            color={report.overallStatus === 'COMPLIANT' ? '#4CAF50' : '#F44336'}
          />
          <Text style={[
            styles.overallStatusText,
            {
              color: report.overallStatus === 'COMPLIANT' ? '#2E7D32' : '#C62828'
            }
          ]}>
            {report.overallStatus === 'COMPLIANT' ? 'COMPLIANT' : 'NON-COMPLIANT'}
          </Text>
          <Text style={styles.overallStatusSubtext}>
            {report.checks.filter(c => c.status === 'PASS').length} of {report.checks.length} checks passed
          </Text>
        </View>

        {/* Checks */}
        <View style={styles.checksContainer}>
          <Text style={styles.sectionTitle}>Compliance Checks</Text>
          {report.checks.map(check => renderCheckItem(check))}
        </View>

        {/* Recommendations */}
        {report.overallStatus !== 'COMPLIANT' && (
          <View style={styles.recommendationsCard}>
            <Text style={styles.recommendationsTitle}>
              <Icon name="lightbulb-on" size={20} color="#FF9800" /> Recommendations
            </Text>
            
            {report.checks.filter(c => c.status !== 'PASS').map((check, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Icon name="chevron-right" size={20} color="#666666" />
                <Text style={styles.recommendationText}>
                  {check.name === 'Trial Balance' && 'Review and correct ledger entries to balance trial balance'}
                  {check.name === 'Unposted Transactions' && 'Post all draft transactions before closing period'}
                  {check.name === 'Invoice Sequence' && 'Review invoice numbering for gaps or duplicates'}
                  {check.name === 'Stock Validation' && 'Adjust negative stock items or review stock movements'}
                </Text>
              </View>
            ))}
          </View>
        )}
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
    alignItems: 'center',
    backgroundColor: '#F5F5F5'
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5'
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginTop: 16,
    marginBottom: 24
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000'
  },
  periodSelector: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8
  },
  periodButtonActive: {
    backgroundColor: '#2196F3'
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666'
  },
  periodButtonTextActive: {
    color: '#FFFFFF'
  },
  content: {
    flex: 1
  },
  overallStatusCard: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center'
  },
  overallStatusText: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12
  },
  overallStatusSubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8
  },
  checksContainer: {
    paddingHorizontal: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12
  },
  checkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  checkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  checkHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  checkName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 12
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  checkDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000'
  },
  warningText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
    marginBottom: 8
  },
  gapText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
    marginTop: 4
  },
  recommendationsCard: {
    backgroundColor: '#FFF3E0',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB74D'
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 12
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  recommendationText: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
    marginLeft: 8
  }
});

export default ComplianceReportScreen;
