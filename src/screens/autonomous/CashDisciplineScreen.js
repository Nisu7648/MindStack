/**
 * CASH DISCIPLINE SCREEN
 * 
 * Daily cash confirmation and tracking
 * Highlights shortages and surpluses
 * Enforces cash management discipline
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { CashDisciplineEngine } from '../../services/autonomous/BankIntelligenceEngine';

const CashDisciplineScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [cashData, setCashData] = useState({
    expectedCash: 0,
    lastConfirmation: null,
    needsConfirmation: false,
    shortages: [],
    forecast: []
  });

  useEffect(() => {
    loadCashData();
  }, []);

  const loadCashData = async () => {
    setLoading(true);
    try {
      // Mock data - actual implementation would use CashDisciplineEngine
      const expectedCash = 25000;
      const needsConfirmation = true;

      setCashData({
        expectedCash,
        lastConfirmation: {
          date: '2025-01-04',
          expectedCash: 20000,
          actualCash: 19500,
          difference: -500,
          status: 'DISCREPANCY'
        },
        needsConfirmation,
        shortages: [
          {
            date: '2025-01-04',
            expectedCash: 20000,
            actualCash: 19500,
            difference: -500,
            notes: 'Small shortage'
          },
          {
            date: '2025-01-02',
            expectedCash: 15000,
            actualCash: 14800,
            difference: -200,
            notes: 'Minor discrepancy'
          },
          {
            date: '2024-12-30',
            expectedCash: 18000,
            actualCash: 17500,
            difference: -500,
            notes: 'End of month shortage'
          }
        ],
        forecast: [
          {
            date: '2025-01-06',
            expectedReceipts: 30000,
            expectedPayments: 15000,
            netChange: 15000,
            projectedBalance: 40000
          },
          {
            date: '2025-01-07',
            expectedReceipts: 20000,
            expectedPayments: 25000,
            netChange: -5000,
            projectedBalance: 35000
          },
          {
            date: '2025-01-08',
            expectedReceipts: 25000,
            expectedPayments: 10000,
            netChange: 15000,
            projectedBalance: 50000
          },
          {
            date: '2025-01-09',
            expectedReceipts: 15000,
            expectedPayments: 20000,
            netChange: -5000,
            projectedBalance: 45000
          },
          {
            date: '2025-01-10',
            expectedReceipts: 35000,
            expectedPayments: 15000,
            netChange: 20000,
            projectedBalance: 65000
          }
        ]
      });

      if (needsConfirmation) {
        setShowConfirmModal(true);
      }
    } catch (error) {
      console.error('Failed to load cash data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCash = async () => {
    if (!actualCash) {
      Alert.alert('Error', 'Please enter actual cash amount');
      return;
    }

    const actualAmount = parseFloat(actualCash);
    const difference = actualAmount - cashData.expectedCash;

    if (Math.abs(difference) > 100) {
      Alert.alert(
        '⚠️ Large Discrepancy',
        `Difference: ₹${Math.abs(difference).toFixed(2)}\n\n` +
        `Expected: ₹${cashData.expectedCash.toFixed(2)}\n` +
        `Actual: ₹${actualAmount.toFixed(2)}\n\n` +
        `This is a significant difference. Please verify your count.`,
        [
          { text: 'Recount', style: 'cancel' },
          {
            text: 'Confirm Anyway',
            style: 'destructive',
            onPress: () => submitConfirmation(actualAmount)
          }
        ]
      );
    } else {
      submitConfirmation(actualAmount);
    }
  };

  const submitConfirmation = async (actualAmount) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const difference = actualAmount - cashData.expectedCash;
      
      Alert.alert(
        difference === 0 ? '✅ Perfect Match!' : difference > 0 ? '💰 Cash Surplus' : '⚠️ Cash Shortage',
        difference === 0 
          ? 'Your cash matches perfectly with the books!'
          : `Difference: ₹${Math.abs(difference).toFixed(2)}\n\n` +
            `Expected: ₹${cashData.expectedCash.toFixed(2)}\n` +
            `Actual: ₹${actualAmount.toFixed(2)}\n\n` +
            `${difference > 0 ? 'Surplus recorded as income.' : 'Shortage recorded as expense.'}`,
        [{ text: 'OK', onPress: () => {
          setShowConfirmModal(false);
          setActualCash('');
          setNotes('');
          loadCashData();
        }}]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>💵 Cash Discipline</Text>
        <Text style={styles.subtitle}>Track and confirm cash daily</Text>
      </View>

      {/* Expected Cash Card */}
      <View style={styles.expectedCashCard}>
        <Text style={styles.expectedCashLabel}>Expected Cash on Hand</Text>
        <Text style={styles.expectedCashValue}>
          {formatCurrency(cashData.expectedCash)}
        </Text>
        <Text style={styles.expectedCashNote}>
          Based on all recorded transactions
        </Text>

        {cashData.needsConfirmation && (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => setShowConfirmModal(true)}
          >
            <Text style={styles.confirmButtonText}>
              ✓ Confirm Today's Cash
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Last Confirmation */}
      {cashData.lastConfirmation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Confirmation</Text>
          <View style={[
            styles.confirmationCard,
            cashData.lastConfirmation.status === 'DISCREPANCY' && styles.discrepancyCard
          ]}>
            <View style={styles.confirmationHeader}>
              <Text style={styles.confirmationDate}>
                {formatDate(cashData.lastConfirmation.date)}
              </Text>
              <Text style={[
                styles.confirmationStatus,
                { color: cashData.lastConfirmation.status === 'OK' ? '#4CAF50' : '#FF9800' }
              ]}>
                {cashData.lastConfirmation.status === 'OK' ? '✓ OK' : '⚠️ Discrepancy'}
              </Text>
            </View>

            <View style={styles.confirmationDetails}>
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>Expected:</Text>
                <Text style={styles.confirmationValue}>
                  {formatCurrency(cashData.lastConfirmation.expectedCash)}
                </Text>
              </View>
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>Actual:</Text>
                <Text style={styles.confirmationValue}>
                  {formatCurrency(cashData.lastConfirmation.actualCash)}
                </Text>
              </View>
              <View style={[styles.confirmationRow, styles.differenceRow]}>
                <Text style={styles.confirmationLabel}>Difference:</Text>
                <Text style={[
                  styles.confirmationValue,
                  styles.differenceValue,
                  { color: cashData.lastConfirmation.difference >= 0 ? '#4CAF50' : '#f44336' }
                ]}>
                  {cashData.lastConfirmation.difference >= 0 ? '+' : ''}
                  {formatCurrency(Math.abs(cashData.lastConfirmation.difference))}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Cash Shortages History */}
      {cashData.shortages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ⚠️ Recent Discrepancies ({cashData.shortages.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            Track patterns to prevent cash leakage
          </Text>

          {cashData.shortages.map((shortage, index) => (
            <View key={index} style={styles.shortageCard}>
              <View style={styles.shortageHeader}>
                <Text style={styles.shortageDate}>{formatDate(shortage.date)}</Text>
                <Text style={[
                  styles.shortageDifference,
                  { color: shortage.difference >= 0 ? '#4CAF50' : '#f44336' }
                ]}>
                  {shortage.difference >= 0 ? '+' : ''}
                  {formatCurrency(Math.abs(shortage.difference))}
                </Text>
              </View>
              <View style={styles.shortageDetails}>
                <Text style={styles.shortageLabel}>
                  Expected: {formatCurrency(shortage.expectedCash)} | 
                  Actual: {formatCurrency(shortage.actualCash)}
                </Text>
                {shortage.notes && (
                  <Text style={styles.shortageNotes}>📝 {shortage.notes}</Text>
                )}
              </View>
            </View>
          ))}

          <View style={styles.shortageStats}>
            <Text style={styles.shortageStatsText}>
              Total Shortages: {formatCurrency(
                cashData.shortages
                  .filter(s => s.difference < 0)
                  .reduce((sum, s) => sum + Math.abs(s.difference), 0)
              )}
            </Text>
            <Text style={styles.shortageStatsText}>
              Avg Shortage: {formatCurrency(
                cashData.shortages
                  .filter(s => s.difference < 0)
                  .reduce((sum, s) => sum + Math.abs(s.difference), 0) / 
                  cashData.shortages.filter(s => s.difference < 0).length
              )}
            </Text>
          </View>
        </View>
      )}

      {/* Cash Flow Forecast */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 7-Day Cash Forecast</Text>
        <Text style={styles.sectionSubtitle}>
          Projected cash position based on scheduled payments
        </Text>

        {cashData.forecast.map((day, index) => (
          <View key={index} style={styles.forecastCard}>
            <View style={styles.forecastHeader}>
              <Text style={styles.forecastDate}>{formatDate(day.date)}</Text>
              <Text style={[
                styles.forecastBalance,
                { color: day.projectedBalance < 10000 ? '#f44336' : '#4CAF50' }
              ]}>
                {formatCurrency(day.projectedBalance)}
              </Text>
            </View>

            <View style={styles.forecastDetails}>
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>💰 Expected In:</Text>
                <Text style={[styles.forecastValue, { color: '#4CAF50' }]}>
                  +{formatCurrency(day.expectedReceipts)}
                </Text>
              </View>
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>💸 Expected Out:</Text>
                <Text style={[styles.forecastValue, { color: '#f44336' }]}>
                  -{formatCurrency(day.expectedPayments)}
                </Text>
              </View>
              <View style={[styles.forecastRow, styles.netChangeRow]}>
                <Text style={styles.forecastLabel}>Net Change:</Text>
                <Text style={[
                  styles.forecastValue,
                  { color: day.netChange >= 0 ? '#4CAF50' : '#f44336' }
                ]}>
                  {day.netChange >= 0 ? '+' : ''}
                  {formatCurrency(Math.abs(day.netChange))}
                </Text>
              </View>
            </View>

            {day.projectedBalance < 10000 && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>
                  ⚠️ Low cash warning! Consider delaying payments or collecting receivables.
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 Why Cash Discipline Matters</Text>
        <Text style={styles.infoText}>
          • Most Indian SMBs fail due to cash leakage
        </Text>
        <Text style={styles.infoText}>
          • Daily confirmation helps catch theft/errors early
        </Text>
        <Text style={styles.infoText}>
          • Forecast helps plan payments and avoid shortages
        </Text>
        <Text style={styles.infoText}>
          • Tracking patterns reveals systematic issues
        </Text>
      </View>

      {/* Cash Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💵 Confirm Today's Cash</Text>

            <View style={styles.expectedCashInfo}>
              <Text style={styles.expectedCashInfoLabel}>Expected Cash:</Text>
              <Text style={styles.expectedCashInfoValue}>
                {formatCurrency(cashData.expectedCash)}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Actual Cash on Hand *</Text>
            <TextInput
              style={styles.input}
              value={actualCash}
              onChangeText={setActualCash}
              keyboardType="numeric"
              placeholder="Enter actual cash amount"
              autoFocus
            />

            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes about discrepancies..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleConfirmCash}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  expectedCashCard: {
    backgroundColor: '#E8F5E9',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50'
  },
  expectedCashLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  expectedCashValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8
  },
  expectedCashNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  section: {
    marginHorizontal: 15,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12
  },
  confirmationCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50'
  },
  discrepancyCard: {
    borderLeftColor: '#FF9800'
  },
  confirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  confirmationDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  confirmationStatus: {
    fontSize: 14,
    fontWeight: '600'
  },
  confirmationDetails: {
    gap: 8
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  differenceRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    marginTop: 4
  },
  confirmationLabel: {
    fontSize: 14,
    color: '#666'
  },
  confirmationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  differenceValue: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  shortageCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f44336'
  },
  shortageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  shortageDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  shortageDifference: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  shortageDetails: {
    gap: 4
  },
  shortageLabel: {
    fontSize: 12,
    color: '#666'
  },
  shortageNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic'
  },
  shortageStats: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  shortageStatsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f44336'
  },
  forecastCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  forecastDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  forecastBalance: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  forecastDetails: {
    gap: 6
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  netChangeRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 6,
    marginTop: 4
  },
  forecastLabel: {
    fontSize: 13,
    color: '#666'
  },
  forecastValue: {
    fontSize: 13,
    fontWeight: '600'
  },
  warningBanner: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 6,
    marginTop: 10
  },
  warningText: {
    fontSize: 12,
    color: '#F57C00',
    textAlign: 'center'
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center'
  },
  expectedCashInfo: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  expectedCashInfoLabel: {
    fontSize: 14,
    color: '#666'
  },
  expectedCashInfoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#E0E0E0'
  },
  cancelButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600'
  },
  submitButton: {
    backgroundColor: '#4CAF50'
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default CashDisciplineScreen;
