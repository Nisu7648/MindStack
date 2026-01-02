/**
 * EXPENSE MANAGEMENT SCREEN
 * 
 * Features:
 * - Expense list with filters
 * - Receipt upload
 * - Approval workflow
 * - Reimbursement tracking
 * - Policy compliance
 * - Expense reports
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
import ExpenseManagementService from '../services/expense/expenseManagementService';
import moment from 'moment';

const ExpenseManagementScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, [filterStatus, filterCategory]);

  const loadExpenses = async () => {
    try {
      setLoading(true);

      const filters = {
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        category: filterCategory !== 'ALL' ? filterCategory : undefined,
        startDate: moment().subtract(3, 'months').format('YYYY-MM-DD'),
        endDate: moment().format('YYYY-MM-DD')
      };

      const result = await ExpenseManagementService.generateExpenseReport(filters);

      if (result.success) {
        setExpenses(result.expenses);
        setSummary(result.summary);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = () => {
    navigation.navigate('CreateExpense', {
      onCreated: loadExpenses
    });
  };

  const handleExpenseAction = (expense) => {
    const actions = [];

    if (expense.status === 'DRAFT') {
      actions.push({
        text: 'Submit for Approval',
        onPress: () => submitExpense(expense.id)
      });
      actions.push({
        text: 'Edit',
        onPress: () => navigation.navigate('EditExpense', { expenseId: expense.id })
      });
    }

    if (expense.status === 'SUBMITTED') {
      actions.push({
        text: 'View Details',
        onPress: () => navigation.navigate('ExpenseDetail', { expenseId: expense.id })
      });
    }

    if (expense.status === 'APPROVED') {
      actions.push({
        text: 'Process Reimbursement',
        onPress: () => processReimbursement([expense.id])
      });
    }

    actions.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Expense Actions', `${expense.description}`, actions);
  };

  const submitExpense = async (expenseId) => {
    try {
      const result = await ExpenseManagementService.submitExpense(expenseId);
      
      if (result.success) {
        Alert.alert('Success', result.message);
        loadExpenses();
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const processReimbursement = async (expenseIds) => {
    try {
      Alert.alert(
        'Process Reimbursement',
        'Select payment method',
        [
          {
            text: 'Bank Transfer',
            onPress: async () => {
              const result = await ExpenseManagementService.processReimbursement(
                expenseIds,
                'BANK',
                `REF-${Date.now()}`
              );
              
              if (result.success) {
                Alert.alert(
                  'Success',
                  `Reimbursed ₹${result.totalAmount.toLocaleString('en-IN')} to ${result.expenseCount} expense(s)`
                );
                loadExpenses();
              }
            }
          },
          {
            text: 'Cash',
            onPress: async () => {
              const result = await ExpenseManagementService.processReimbursement(
                expenseIds,
                'CASH',
                `CASH-${Date.now()}`
              );
              
              if (result.success) {
                Alert.alert('Success', result.message);
                loadExpenses();
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: '#6B7280',
      SUBMITTED: '#F59E0B',
      APPROVED: '#10B981',
      REJECTED: '#DC2626',
      REIMBURSED: '#6366F1'
    };
    return colors[status] || '#6B7280';
  };

  const renderSummaryCard = (title, value, color) => (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </View>
  );

  const renderExpenseCard = (expense) => (
    <TouchableOpacity
      key={expense.id}
      style={styles.expenseCard}
      onPress={() => handleExpenseAction(expense)}
    >
      <View style={styles.expenseHeader}>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseCategory}>{expense.category}</Text>
          <Text style={styles.expenseDate}>
            {moment(expense.expense_date).format('DD MMM YYYY')}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(expense.status) }]}>
          <Text style={styles.statusText}>{expense.status}</Text>
        </View>
      </View>
      
      <Text style={styles.expenseDescription} numberOfLines={2}>
        {expense.description}
      </Text>
      
      <View style={styles.expenseFooter}>
        <Text style={styles.expenseAmount}>
          ₹{expense.amount.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.expenseEmployee}>
          {expense.first_name} {expense.last_name}
        </Text>
      </View>

      {expense.receipt_id && (
        <View style={styles.receiptIndicator}>
          <Text style={styles.receiptText}>📎 Receipt attached</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter Expenses</Text>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <Picker
              selectedValue={filterStatus}
              onValueChange={setFilterStatus}
              style={styles.picker}
            >
              <Picker.Item label="All" value="ALL" />
              <Picker.Item label="Draft" value="DRAFT" />
              <Picker.Item label="Submitted" value="SUBMITTED" />
              <Picker.Item label="Approved" value="APPROVED" />
              <Picker.Item label="Rejected" value="REJECTED" />
              <Picker.Item label="Reimbursed" value="REIMBURSED" />
            </Picker>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Category</Text>
            <Picker
              selectedValue={filterCategory}
              onValueChange={setFilterCategory}
              style={styles.picker}
            >
              <Picker.Item label="All" value="ALL" />
              {Object.keys(ExpenseManagementService.EXPENSE_CATEGORIES).map(key => (
                <Picker.Item
                  key={key}
                  label={ExpenseManagementService.EXPENSE_CATEGORIES[key]}
                  value={key}
                />
              ))}
            </Picker>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowFilterModal(false);
                loadExpenses();
              }}
            >
              <Text style={styles.modalButtonText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A1A1A" />
        <Text style={styles.loadingText}>Loading expenses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCreateExpense}
        >
          <Text style={styles.primaryButtonText}>+ New Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterButtonText}>🔍 Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {summary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            {renderSummaryCard(
              'Total Expenses',
              summary.totalExpenses,
              '#6366F1'
            )}
            {renderSummaryCard(
              'Total Amount',
              `₹${summary.totalAmount.toLocaleString('en-IN')}`,
              '#10B981'
            )}
          </View>
        </View>
      )}

      {/* Expenses List */}
      <ScrollView style={styles.expensesList}>
        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No expenses found</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first expense to get started
            </Text>
          </View>
        ) : (
          expenses.map(renderExpenseCard)
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('ExpenseReports')}
        >
          <Text style={styles.quickActionText}>📊 Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('ExpensePolicies')}
        >
          <Text style={styles.quickActionText}>📋 Policies</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('PendingApprovals')}
        >
          <Text style={styles.quickActionText}>✓ Approvals</Text>
        </TouchableOpacity>
      </View>

      {renderFilterModal()}
    </View>
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
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  filterButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center'
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  summaryContainer: {
    padding: 16
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
    fontWeight: '700'
  },
  expensesList: {
    flex: 1,
    padding: 16
  },
  expenseCard: {
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
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  expenseInfo: {
    flex: 1
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  expenseDate: {
    fontSize: 12,
    color: '#6B7280'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  expenseDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  expenseEmployee: {
    fontSize: 13,
    color: '#6B7280'
  },
  receiptIndicator: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  receiptText: {
    fontSize: 12,
    color: '#10B981'
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
    color: '#9CA3AF',
    textAlign: 'center'
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A'
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
    marginBottom: 24
  },
  filterSection: {
    marginBottom: 20
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  picker: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8
  },
  modalActions: {
    gap: 12
  },
  modalButton: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  modalCancelButton: {
    paddingVertical: 14,
    alignItems: 'center'
  },
  modalCancelText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default ExpenseManagementScreen;
