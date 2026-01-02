/**
 * BANK RECONCILIATION DASHBOARD SCREEN
 * 
 * Features:
 * - Real-time reconciliation status
 * - Unreconciled transactions list
 * - One-click reconciliation
 * - Anomaly alerts
 * - Bank feed management
 * - Reconciliation history
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import BankFeedService from '../services/banking/bankFeedService';
import BankReconciliationService from '../services/banking/bankReconciliationService';

const BankReconciliationScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [unreconciledTxns, setUnreconciledTxns] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [autoMatching, setAutoMatching] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Get reconciliation dashboard
      const result = await BankReconciliationService.getReconciliationDashboard(
        selectedConnection
      );

      if (result.success) {
        setDashboard(result.dashboard);
      }

      // Get unreconciled transactions
      const txnsResult = await BankFeedService.getUnreconciledTransactions(
        selectedConnection
      );

      if (txnsResult.success) {
        setUnreconciledTxns(txnsResult.transactions);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleSyncBank = async () => {
    try {
      Alert.alert(
        'Sync Bank',
        'Fetch latest transactions from bank?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sync',
            onPress: async () => {
              setLoading(true);
              const result = await BankFeedService.syncBankTransactions(
                selectedConnection
              );
              
              if (result.success) {
                Alert.alert('Success', result.message);
                await loadDashboard();
              } else {
                Alert.alert('Error', result.error);
              }
              setLoading(false);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleOneClickReconciliation = async () => {
    try {
      setAutoMatching(true);
      
      const result = await BankReconciliationService.oneClickReconciliation(
        selectedConnection
      );

      if (result.success) {
        Alert.alert(
          'Reconciliation Complete',
          `Successfully reconciled ${result.reconciledCount} out of ${result.totalMatches} matched transactions.`,
          [{ text: 'OK', onPress: () => loadDashboard() }]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setAutoMatching(false);
    }
  };

  const handleManualReconcile = (bankTxn) => {
    navigation.navigate('ManualReconciliation', {
      bankTransaction: bankTxn,
      onReconciled: loadDashboard
    });
  };

  const renderStatCard = (title, value, color, subtitle) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderAnomalyAlert = (anomaly) => {
    const severityColors = {
      CRITICAL: '#DC2626',
      HIGH: '#EA580C',
      MEDIUM: '#F59E0B',
      LOW: '#10B981'
    };

    return (
      <View
        key={anomaly.description}
        style={[
          styles.anomalyCard,
          { borderLeftColor: severityColors[anomaly.severity] }
        ]}
      >
        <View style={styles.anomalyHeader}>
          <Text style={styles.anomalyType}>{anomaly.type}</Text>
          <Text
            style={[
              styles.anomalySeverity,
              { color: severityColors[anomaly.severity] }
            ]}
          >
            {anomaly.severity}
          </Text>
        </View>
        <Text style={styles.anomalyDescription}>{anomaly.description}</Text>
      </View>
    );
  };

  const renderTransaction = (txn) => (
    <TouchableOpacity
      key={txn.id}
      style={styles.transactionCard}
      onPress={() => handleManualReconcile(txn)}
    >
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionDate}>
          {new Date(txn.transaction_date).toLocaleDateString()}
        </Text>
        <Text
          style={[
            styles.transactionAmount,
            { color: txn.transaction_type === 'CREDIT' ? '#10B981' : '#DC2626' }
          ]}
        >
          {txn.transaction_type === 'CREDIT' ? '+' : '-'}₹
          {txn.amount.toLocaleString('en-IN')}
        </Text>
      </View>
      <Text style={styles.transactionDescription} numberOfLines={2}>
        {txn.description}
      </Text>
      <View style={styles.transactionFooter}>
        <Text style={styles.transactionCategory}>{txn.category}</Text>
        <TouchableOpacity
          style={styles.reconcileButton}
          onPress={() => handleManualReconcile(txn)}
        >
          <Text style={styles.reconcileButtonText}>Reconcile</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading && !dashboard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={styles.loadingText}>Loading reconciliation data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header Actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSyncBank}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>🔄 Sync Bank</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleOneClickReconciliation}
          disabled={autoMatching || loading}
        >
          {autoMatching ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>⚡ Auto-Reconcile</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      {dashboard && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            {renderStatCard(
              'Total Transactions',
              dashboard.statistics.total,
              '#6366F1',
              null
            )}
            {renderStatCard(
              'Reconciled',
              dashboard.statistics.reconciled,
              '#10B981',
              `${dashboard.statistics.reconciliationRate}%`
            )}
          </View>
          <View style={styles.statsRow}>
            {renderStatCard(
              'Pending',
              dashboard.statistics.pending,
              '#F59E0B',
              null
            )}
            {renderStatCard(
              'Overdue',
              dashboard.statistics.overdue,
              '#DC2626',
              '>7 days old'
            )}
          </View>
        </View>
      )}

      {/* Anomaly Alerts */}
      {dashboard && dashboard.anomalies.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Anomaly Alerts</Text>
          {dashboard.anomalies.map(renderAnomalyAlert)}
        </View>
      )}

      {/* Unreconciled Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Unreconciled Transactions ({unreconciledTxns.length})
          </Text>
        </View>
        {unreconciledTxns.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              ✅ All transactions reconciled!
            </Text>
          </View>
        ) : (
          unreconciledTxns.map(renderTransaction)
        )}
      </View>

      {/* Recent Reconciliations */}
      {dashboard && dashboard.recentReconciliations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Reconciliations</Text>
          {dashboard.recentReconciliations.map((rec) => (
            <View key={rec.id} style={styles.recentRecCard}>
              <Text style={styles.recentRecDate}>
                {new Date(rec.reconciled_at).toLocaleDateString()}
              </Text>
              <Text style={styles.recentRecDesc}>{rec.description}</Text>
              <Text style={styles.recentRecAmount}>
                ₹{rec.amount.toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280'
  },
  headerActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center'
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  primaryButton: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A'
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  statsContainer: {
    padding: 16,
    gap: 12
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9CA3AF'
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
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12
  },
  anomalyCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  anomalyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  anomalyType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  anomalySeverity: {
    fontSize: 12,
    fontWeight: '700'
  },
  anomalyDescription: {
    fontSize: 14,
    color: '#6B7280'
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  transactionDate: {
    fontSize: 12,
    color: '#6B7280'
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700'
  },
  transactionDescription: {
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 12
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  transactionCategory: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  reconcileButton: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  reconcileButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    padding: 48,
    borderRadius: 8,
    alignItems: 'center'
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280'
  },
  recentRecCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  recentRecDate: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1
  },
  recentRecDesc: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 2
  },
  recentRecAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    flex: 1,
    textAlign: 'right'
  }
});

export default BankReconciliationScreen;
