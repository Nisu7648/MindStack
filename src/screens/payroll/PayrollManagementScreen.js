/**
 * PAYROLL MANAGEMENT SCREEN
 * 
 * Features:
 * - Employee payroll overview
 * - Monthly payroll processing
 * - Payslip generation
 * - Bank payout file generation
 * - Payroll history
 * - Compliance reports
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import PayrollService from '../services/payroll/payrollService';
import moment from 'moment';

const PayrollManagementScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('M'));
  const [selectedYear, setSelectedYear] = useState(moment().format('YYYY'));
  const [payrollData, setPayrollData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPayrollSummary();
  }, [selectedMonth, selectedYear]);

  const loadPayrollSummary = async () => {
    try {
      setLoading(true);
      const result = await PayrollService.getPayrollSummary(
        parseInt(selectedMonth),
        parseInt(selectedYear)
      );

      if (result.success) {
        setSummary(result.summary);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePayroll = async () => {
    try {
      Alert.alert(
        'Calculate Payroll',
        `Calculate payroll for ${moment(`${selectedYear}-${selectedMonth}`, 'YYYY-M').format('MMMM YYYY')}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Calculate',
            onPress: async () => {
              setProcessing(true);
              const result = await PayrollService.calculatePayroll(
                parseInt(selectedMonth),
                parseInt(selectedYear)
              );

              if (result.success) {
                setPayrollData(result);
                Alert.alert(
                  'Success',
                  `Calculated payroll for ${result.successCount} employees`,
                  [
                    {
                      text: 'Review',
                      onPress: () => navigation.navigate('PayrollReview', { payrollData: result })
                    },
                    {
                      text: 'Process Now',
                      onPress: () => handleProcessPayroll(result)
                    }
                  ]
                );
              } else {
                Alert.alert('Error', result.error);
              }
              setProcessing(false);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
      setProcessing(false);
    }
  };

  const handleProcessPayroll = async (data) => {
    try {
      setProcessing(true);
      const result = await PayrollService.processPayroll(data);

      if (result.success) {
        Alert.alert(
          'Payroll Processed',
          `Successfully processed payroll for ${result.processedCount} employees`,
          [{ text: 'OK', onPress: () => loadPayrollSummary() }]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleGeneratePayoutFile = async (format) => {
    try {
      setProcessing(true);
      const result = await PayrollService.generateBankPayoutFile(
        parseInt(selectedMonth),
        parseInt(selectedYear),
        format
      );

      if (result.success) {
        Alert.alert(
          'Payout File Generated',
          `File: ${result.fileName}\nTotal Records: ${result.totalRecords}\nTotal Amount: ₹${result.totalAmount.toLocaleString('en-IN')}`,
          [
            {
              text: 'Download',
              onPress: () => {
                // Implement file download/share
                Alert.alert('Info', 'File download functionality to be implemented');
              }
            },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessing(false);
      setShowPayoutModal(false);
    }
  };

  const renderSummaryCard = (title, value, subtitle, color) => (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.summarySubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderPayoutModal = () => (
    <Modal
      visible={showPayoutModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPayoutModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Generate Bank Payout File</Text>
          <Text style={styles.modalSubtitle}>
            Select format for {moment(`${selectedYear}-${selectedMonth}`, 'YYYY-M').format('MMMM YYYY')}
          </Text>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => handleGeneratePayoutFile('CSV')}
            disabled={processing}
          >
            <Text style={styles.modalButtonText}>📄 CSV Format</Text>
            <Text style={styles.modalButtonSubtext}>
              Standard format for most banks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => handleGeneratePayoutFile('NEFT')}
            disabled={processing}
          >
            <Text style={styles.modalButtonText}>🏦 NEFT Format</Text>
            <Text style={styles.modalButtonSubtext}>
              Bank-specific NEFT format
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowPayoutModal(false)}
            disabled={processing}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Month</Text>
          <Picker
            selectedValue={selectedMonth}
            onValueChange={setSelectedMonth}
            style={styles.picker}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <Picker.Item
                key={month}
                label={moment(`${month}`, 'M').format('MMMM')}
                value={month.toString()}
              />
            ))}
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Year</Text>
          <Picker
            selectedValue={selectedYear}
            onValueChange={setSelectedYear}
            style={styles.picker}
          >
            {Array.from({ length: 5 }, (_, i) => moment().year() - i).map((year) => (
              <Picker.Item
                key={year}
                label={year.toString()}
                value={year.toString()}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleCalculatePayroll}
          disabled={processing || loading}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>🧮 Calculate Payroll</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowPayoutModal(true)}
          disabled={!summary || summary.total_employees === 0}
        >
          <Text style={styles.actionButtonText}>💳 Generate Payout File</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      ) : summary ? (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            {renderSummaryCard(
              'Total Employees',
              summary.total_employees || 0,
              null,
              '#6366F1'
            )}
            {renderSummaryCard(
              'Gross Salary',
              `₹${(summary.total_gross || 0).toLocaleString('en-IN')}`,
              null,
              '#10B981'
            )}
          </View>
          <View style={styles.summaryRow}>
            {renderSummaryCard(
              'Total Deductions',
              `₹${(summary.total_deductions || 0).toLocaleString('en-IN')}`,
              null,
              '#F59E0B'
            )}
            {renderSummaryCard(
              'Net Payable',
              `₹${(summary.total_net || 0).toLocaleString('en-IN')}`,
              `Avg: ₹${Math.round(summary.avg_salary || 0).toLocaleString('en-IN')}`,
              '#1A1A1A'
            )}
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No payroll data for selected period
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Click "Calculate Payroll" to process
          </Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('EmployeeManagement')}
        >
          <Text style={styles.quickActionIcon}>👥</Text>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>Manage Employees</Text>
            <Text style={styles.quickActionSubtitle}>
              Add, edit, or remove employees
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('SalaryStructures')}
        >
          <Text style={styles.quickActionIcon}>💰</Text>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>Salary Structures</Text>
            <Text style={styles.quickActionSubtitle}>
              Configure salary components
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('PayrollReports')}
        >
          <Text style={styles.quickActionIcon}>📊</Text>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>Payroll Reports</Text>
            <Text style={styles.quickActionSubtitle}>
              View detailed payroll reports
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('ComplianceReports')}
        >
          <Text style={styles.quickActionIcon}>📋</Text>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>Compliance Reports</Text>
            <Text style={styles.quickActionSubtitle}>
              PF, ESI, TDS reports
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {renderPayoutModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  pickerContainer: {
    flex: 1
  },
  pickerLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600'
  },
  picker: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8
  },
  actionButtons: {
    padding: 16,
    gap: 12
  },
  actionButton: {
    paddingVertical: 14,
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
  loadingContainer: {
    padding: 48,
    alignItems: 'center'
  },
  summaryContainer: {
    padding: 16,
    gap: 12
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12
  },
  summaryCard: {
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
  summaryTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4
  },
  summarySubtitle: {
    fontSize: 11,
    color: '#9CA3AF'
  },
  emptyState: {
    padding: 48,
    alignItems: 'center'
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF'
  },
  quickActions: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  quickActionIcon: {
    fontSize: 32,
    marginRight: 16
  },
  quickActionContent: {
    flex: 1
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: '#6B7280'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24
  },
  modalButton: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  modalButtonSubtext: {
    fontSize: 13,
    color: '#6B7280'
  },
  modalCancelButton: {
    padding: 16,
    alignItems: 'center'
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626'
  }
});

export default PayrollManagementScreen;
