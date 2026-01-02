import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import TrialBalanceService from '../services/accounting/trialBalanceService';
import FinalAccountsPDFService from '../services/accounting/finalAccountsPDFService';
import moment from 'moment';

export default function TrialBalanceScreen() {
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0, 1));
  const [toDate, setToDate] = useState(new Date());
  const [showFromDate, setShowFromDate] = useState(false);
  const [showToDate, setShowToDate] = useState(false);
  const [trialBalanceData, setTrialBalanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'grouped'

  const loadTrialBalance = async () => {
    setLoading(true);
    try {
      const filters = {
        fromDate: moment(fromDate).format('YYYY-MM-DD'),
        toDate: moment(toDate).format('YYYY-MM-DD')
      };

      const result = viewMode === 'grouped'
        ? await TrialBalanceService.getTrialBalanceByGroup(filters)
        : await TrialBalanceService.getTrialBalance(filters);

      if (result.success) {
        setTrialBalanceData(result);
        
        if (!result.summary.isBalanced) {
          Alert.alert(
            'Warning',
            `Trial Balance is not balanced!\nDifference: ₹${result.summary.differenceFormatted}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!trialBalanceData) {
      Alert.alert('Error', 'Please load trial balance first');
      return;
    }

    try {
      const period = `${moment(fromDate).format('DD/MM/YYYY')} to ${moment(toDate).format('DD/MM/YYYY')}`;
      const filters = {
        fromDate: moment(fromDate).format('YYYY-MM-DD'),
        toDate: moment(toDate).format('YYYY-MM-DD')
      };
      
      const result = await FinalAccountsPDFService.generateTrialBalancePDF(filters, period);

      if (result.success) {
        Alert.alert('Success', `PDF saved to: ${result.filePath}`);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const renderAccountRow = (account) => (
    <View key={account.accountCode} style={styles.dataRow}>
      <Text style={styles.codeCell}>{account.accountCode}</Text>
      <Text style={styles.nameCell}>{account.accountName}</Text>
      <Text style={styles.amountCell}>₹{account.totalDebitsFormatted}</Text>
      <Text style={styles.amountCell}>₹{account.totalCreditsFormatted}</Text>
      <Text style={styles.amountCell}>₹{account.debitBalanceFormatted}</Text>
      <Text style={styles.amountCell}>₹{account.creditBalanceFormatted}</Text>
    </View>
  );

  const renderGroupedView = () => {
    if (!trialBalanceData || !trialBalanceData.data) return null;

    const groups = [
      { title: 'ASSETS', data: trialBalanceData.data.assets, color: '#4CAF50' },
      { title: 'LIABILITIES', data: trialBalanceData.data.liabilities, color: '#F44336' },
      { title: 'CAPITAL', data: trialBalanceData.data.capital, color: '#2196F3' },
      { title: 'INCOME', data: trialBalanceData.data.income, color: '#FF9800' },
      { title: 'EXPENSES', data: trialBalanceData.data.expenses, color: '#9C27B0' }
    ];

    return groups.map((group) => (
      <View key={group.title} style={styles.groupContainer}>
        <View style={[styles.groupHeader, { backgroundColor: group.color }]}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <Text style={styles.groupCount}>({group.data.length} accounts)</Text>
        </View>
        {group.data.map(renderAccountRow)}
      </View>
    ));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>TRIAL BALANCE</Text>

      <View style={styles.filterSection}>
        <View style={styles.dateRow}>
          <View style={styles.dateColumn}>
            <Text style={styles.label}>From Date:</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowFromDate(true)}
            >
              <Text>{moment(fromDate).format('DD/MM/YYYY')}</Text>
            </TouchableOpacity>
            {showFromDate && (
              <DateTimePicker
                value={fromDate}
                mode="date"
                onChange={(event, date) => {
                  setShowFromDate(false);
                  if (date) setFromDate(date);
                }}
              />
            )}
          </View>

          <View style={styles.dateColumn}>
            <Text style={styles.label}>To Date:</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowToDate(true)}
            >
              <Text>{moment(toDate).format('DD/MM/YYYY')}</Text>
            </TouchableOpacity>
            {showToDate && (
              <DateTimePicker
                value={toDate}
                mode="date"
                onChange={(event, date) => {
                  setShowToDate(false);
                  if (date) setToDate(date);
                }}
              />
            )}
          </View>
        </View>

        <View style={styles.viewModeRow}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'all' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('all')}
          >
            <Text style={[styles.viewModeText, viewMode === 'all' && styles.viewModeTextActive]}>
              All Accounts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'grouped' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('grouped')}
          >
            <Text style={[styles.viewModeText, viewMode === 'grouped' && styles.viewModeTextActive]}>
              Grouped
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loadButton}
          onPress={loadTrialBalance}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Load Trial Balance'}
          </Text>
        </TouchableOpacity>
      </View>

      {trialBalanceData && (
        <>
          <View style={[
            styles.statusCard,
            { backgroundColor: trialBalanceData.summary.isBalanced ? '#e8f5e9' : '#ffebee' }
          ]}>
            <Text style={styles.statusText}>
              {trialBalanceData.summary.isBalanced ? '✅ BALANCED' : '❌ NOT BALANCED'}
            </Text>
            {!trialBalanceData.summary.isBalanced && (
              <Text style={styles.differenceText}>
                Difference: ₹{trialBalanceData.summary.differenceFormatted}
              </Text>
            )}
          </View>

          <View style={styles.tableContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.headerCell}>Code</Text>
              <Text style={styles.headerCell}>Account Name</Text>
              <Text style={styles.headerCell}>Total Dr.</Text>
              <Text style={styles.headerCell}>Total Cr.</Text>
              <Text style={styles.headerCell}>Dr. Balance</Text>
              <Text style={styles.headerCell}>Cr. Balance</Text>
            </View>

            <ScrollView horizontal>
              {viewMode === 'grouped' ? (
                renderGroupedView()
              ) : (
                trialBalanceData.data.map(renderAccountRow)
              )}
            </ScrollView>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={styles.totalAmount}>₹{trialBalanceData.summary.totalDebitsFormatted}</Text>
              <Text style={styles.totalAmount}>₹{trialBalanceData.summary.totalCreditsFormatted}</Text>
              <Text style={styles.totalAmount}>₹{trialBalanceData.summary.totalDebitBalancesFormatted}</Text>
              <Text style={styles.totalAmount}>₹{trialBalanceData.summary.totalCreditBalancesFormatted}</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Debits:</Text>
              <Text style={styles.summaryValue}>₹{trialBalanceData.summary.totalDebitsFormatted}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Credits:</Text>
              <Text style={styles.summaryValue}>₹{trialBalanceData.summary.totalCreditsFormatted}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Debit Balances:</Text>
              <Text style={styles.summaryValue}>₹{trialBalanceData.summary.totalDebitBalancesFormatted}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Credit Balances:</Text>
              <Text style={styles.summaryValue}>₹{trialBalanceData.summary.totalCreditBalancesFormatted}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.pdfButton} onPress={generatePDF}>
            <Text style={styles.buttonText}>Generate PDF</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2196F3',
  },
  filterSection: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    backgroundColor: 'white',
  },
  viewModeRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  viewModeButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2196F3',
    marginHorizontal: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: '#2196F3',
  },
  viewModeText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  viewModeTextActive: {
    color: 'white',
  },
  loadButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  differenceText: {
    fontSize: 16,
    color: '#d32f2f',
    marginTop: 5,
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    padding: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  headerCell: {
    flex: 1,
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  codeCell: {
    flex: 0.8,
    fontSize: 12,
    textAlign: 'center',
  },
  nameCell: {
    flex: 2,
    fontSize: 12,
  },
  amountCell: {
    flex: 1,
    fontSize: 12,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  totalLabel: {
    flex: 2.8,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  totalAmount: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    color: '#2196F3',
  },
  groupContainer: {
    marginBottom: 15,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 5,
  },
  groupTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  groupCount: {
    color: 'white',
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2196F3',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  pdfButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
});
