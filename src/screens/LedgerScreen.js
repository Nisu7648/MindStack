import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import LedgerService from '../services/accounting/ledgerService';
import DoubleSidedBookPDFService from '../services/accounting/doubleSidedBookPDFService';
import ChartOfAccountsService from '../services/accounting/chartOfAccountsService';
import moment from 'moment';

export default function LedgerScreen() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0, 1));
  const [toDate, setToDate] = useState(new Date());
  const [showFromDate, setShowFromDate] = useState(false);
  const [showToDate, setShowToDate] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const result = await ChartOfAccountsService.getAllAccounts();
      if (result.success) {
        setAccounts(result.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load accounts');
    }
  };

  const loadLedger = async () => {
    if (!selectedAccount) {
      Alert.alert('Error', 'Please select an account');
      return;
    }

    setLoading(true);
    try {
      const result = await LedgerService.getLedgerAccount(selectedAccount, {
        fromDate: moment(fromDate).format('YYYY-MM-DD'),
        toDate: moment(toDate).format('YYYY-MM-DD')
      });

      if (result.success) {
        setLedgerData(result);
        
        if (result.validation && !result.validation.valid) {
          Alert.alert('Warning', result.validation.warning);
        }
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!ledgerData) {
      Alert.alert('Error', 'Please load ledger first');
      return;
    }

    try {
      const period = `${moment(fromDate).format('DD/MM/YYYY')} to ${moment(toDate).format('DD/MM/YYYY')}`;
      const result = await DoubleSidedBookPDFService.generateLedgerAccountPDF(ledgerData, period);

      if (result.success) {
        Alert.alert('Success', `PDF saved to: ${result.filePath}`);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const renderDebitEntry = (entry) => (
    <View key={entry.id} style={styles.entryRow}>
      <Text style={styles.dateCell}>{moment(entry.date).format('DD/MM/YY')}</Text>
      <Text style={styles.particularCell}>{entry.debitParticulars}</Text>
      <Text style={styles.voucherCell}>{entry.voucherNumber}</Text>
      <Text style={styles.lfCell}>{entry.ledgerFolio}</Text>
      <Text style={styles.amountCell}>₹{LedgerService.formatAmount(entry.debitAmount)}</Text>
    </View>
  );

  const renderCreditEntry = (entry) => (
    <View key={entry.id} style={styles.entryRow}>
      <Text style={styles.dateCell}>{moment(entry.date).format('DD/MM/YY')}</Text>
      <Text style={styles.particularCell}>{entry.creditParticulars}</Text>
      <Text style={styles.voucherCell}>{entry.voucherNumber}</Text>
      <Text style={styles.lfCell}>{entry.ledgerFolio}</Text>
      <Text style={styles.amountCell}>₹{LedgerService.formatAmount(entry.creditAmount)}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>LEDGER ACCOUNT</Text>

      <View style={styles.filterSection}>
        <Text style={styles.label}>Select Account:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedAccount}
            onValueChange={(value) => setSelectedAccount(value)}
            style={styles.picker}
          >
            <Picker.Item label="-- Select Account --" value="" />
            {accounts.map((account) => (
              <Picker.Item
                key={account.code}
                label={`${account.code} - ${account.name}`}
                value={account.code}
              />
            ))}
          </Picker>
        </View>

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

        <TouchableOpacity
          style={styles.loadButton}
          onPress={loadLedger}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Load Ledger'}
          </Text>
        </TouchableOpacity>
      </View>

      {ledgerData && (
        <>
          <View style={styles.accountInfo}>
            <Text style={styles.accountCode}>Account: {ledgerData.summary.accountCode}</Text>
            <Text style={styles.accountName}>{ledgerData.summary.accountName}</Text>
          </View>

          <View style={styles.ledgerContainer}>
            <View style={styles.headerRow}>
              <View style={styles.debitSide}>
                <Text style={styles.sideHeader}>DEBIT SIDE (Dr.)</Text>
              </View>
              <View style={styles.creditSide}>
                <Text style={styles.sideHeader}>CREDIT SIDE (Cr.)</Text>
              </View>
            </View>

            <View style={styles.columnHeaderRow}>
              <View style={styles.debitSide}>
                <Text style={styles.columnHeader}>Date</Text>
                <Text style={styles.columnHeader}>Particulars</Text>
                <Text style={styles.columnHeader}>V.No</Text>
                <Text style={styles.columnHeader}>LF</Text>
                <Text style={styles.columnHeader}>Amount</Text>
              </View>
              <View style={styles.creditSide}>
                <Text style={styles.columnHeader}>Date</Text>
                <Text style={styles.columnHeader}>Particulars</Text>
                <Text style={styles.columnHeader}>V.No</Text>
                <Text style={styles.columnHeader}>LF</Text>
                <Text style={styles.columnHeader}>Amount</Text>
              </View>
            </View>

            <ScrollView horizontal>
              <View style={styles.entriesContainer}>
                <View style={styles.debitSide}>
                  {ledgerData.debitEntries.map(renderDebitEntry)}
                </View>
                <View style={styles.creditSide}>
                  {ledgerData.creditEntries.map(renderCreditEntry)}
                </View>
              </View>
            </ScrollView>

            <View style={styles.totalRow}>
              <View style={styles.debitSide}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>
                  ₹{ledgerData.summary.totalDebitsFormatted}
                </Text>
              </View>
              <View style={styles.creditSide}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>
                  ₹{ledgerData.summary.totalCreditsFormatted}
                </Text>
              </View>
            </View>

            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Closing Balance:</Text>
              <Text style={styles.balanceAmount}>
                {ledgerData.summary.closingBalanceFormatted}
              </Text>
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 15,
  },
  picker: {
    height: 50,
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
  accountInfo: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  accountCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  accountName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  ledgerContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    padding: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  debitSide: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  creditSide: {
    flex: 1,
  },
  sideHeader: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  columnHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 5,
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  entriesContainer: {
    flexDirection: 'row',
    minHeight: 200,
  },
  entryRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateCell: {
    flex: 1,
    fontSize: 12,
    textAlign: 'center',
  },
  particularCell: {
    flex: 2,
    fontSize: 12,
  },
  voucherCell: {
    flex: 1,
    fontSize: 12,
    textAlign: 'center',
  },
  lfCell: {
    flex: 0.5,
    fontSize: 12,
    textAlign: 'center',
  },
  amountCell: {
    flex: 1.5,
    fontSize: 12,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 3,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1.5,
    color: '#2196F3',
  },
  balanceRow: {
    flexDirection: 'row',
    backgroundColor: '#e8f5e9',
    padding: 10,
    justifyContent: 'space-between',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  pdfButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
});
