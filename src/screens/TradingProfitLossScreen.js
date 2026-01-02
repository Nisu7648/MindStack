import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import TradingProfitLossService from '../services/accounting/tradingProfitLossService';
import FinalAccountsPDFService from '../services/accounting/finalAccountsPDFService';
import moment from 'moment';

export default function TradingProfitLossScreen() {
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0, 1));
  const [toDate, setToDate] = useState(new Date());
  const [showFromDate, setShowFromDate] = useState(false);
  const [showToDate, setShowToDate] = useState(false);
  const [tradingData, setTradingData] = useState(null);
  const [profitLossData, setProfitLossData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('trading'); // 'trading' or 'profitloss'

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const filters = {
        fromDate: moment(fromDate).format('YYYY-MM-DD'),
        toDate: moment(toDate).format('YYYY-MM-DD')
      };

      const tradingResult = await TradingProfitLossService.getTradingAccount(filters);
      const plResult = await TradingProfitLossService.getProfitAndLossAccount(filters);

      if (tradingResult.success && plResult.success) {
        setTradingData(tradingResult);
        setProfitLossData(plResult);
      } else {
        Alert.alert('Error', 'Failed to load accounts');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const generateTradingPDF = async () => {
    if (!tradingData) {
      Alert.alert('Error', 'Please load accounts first');
      return;
    }

    try {
      const period = `${moment(fromDate).format('DD/MM/YYYY')} to ${moment(toDate).format('DD/MM/YYYY')}`;
      const filters = {
        fromDate: moment(fromDate).format('YYYY-MM-DD'),
        toDate: moment(toDate).format('YYYY-MM-DD')
      };
      
      const result = await FinalAccountsPDFService.generateTradingAccountPDF(filters, period);

      if (result.success) {
        Alert.alert('Success', `PDF saved to: ${result.filePath}`);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const generateProfitLossPDF = async () => {
    if (!profitLossData) {
      Alert.alert('Error', 'Please load accounts first');
      return;
    }

    try {
      const period = `${moment(fromDate).format('DD/MM/YYYY')} to ${moment(toDate).format('DD/MM/YYYY')}`;
      const filters = {
        fromDate: moment(fromDate).format('YYYY-MM-DD'),
        toDate: moment(toDate).format('YYYY-MM-DD')
      };
      
      const result = await FinalAccountsPDFService.generateProfitLossAccountPDF(filters, period);

      if (result.success) {
        Alert.alert('Success', `PDF saved to: ${result.filePath}`);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const renderTradingAccount = () => {
    if (!tradingData) return null;

    const { data, calculations } = tradingData;

    return (
      <View style={styles.accountContainer}>
        <View style={styles.accountHeader}>
          <Text style={styles.accountTitle}>TRADING ACCOUNT</Text>
          <Text style={styles.accountPeriod}>
            {moment(fromDate).format('DD/MM/YYYY')} to {moment(toDate).format('DD/MM/YYYY')}
          </Text>
        </View>

        <View style={styles.doubleSidedContainer}>
          <View style={styles.sideHeader}>
            <View style={styles.debitHeader}>
              <Text style={styles.sideHeaderText}>DEBIT SIDE (Dr.)</Text>
            </View>
            <View style={styles.creditHeader}>
              <Text style={styles.sideHeaderText}>CREDIT SIDE (Cr.)</Text>
            </View>
          </View>

          <View style={styles.contentRow}>
            <View style={styles.debitSide}>
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Opening Stock</Text>
                <Text style={styles.itemAmount}>₹{TradingProfitLossService.formatAmount(data.openingStock)}</Text>
              </View>
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Purchases</Text>
                <Text style={styles.itemAmount}>₹{TradingProfitLossService.formatAmount(data.purchases)}</Text>
              </View>
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Less: Purchase Returns</Text>
                <Text style={styles.itemAmount}>(₹{TradingProfitLossService.formatAmount(data.purchaseReturns)})</Text>
              </View>
              <View style={[styles.itemRow, styles.boldRow]}>
                <Text style={styles.itemLabelBold}>Net Purchases</Text>
                <Text style={styles.itemAmountBold}>₹{calculations.netPurchasesFormatted}</Text>
              </View>
              {data.directExpenses.map((expense, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemLabel}>{expense.accountName}</Text>
                  <Text style={styles.itemAmount}>₹{TradingProfitLossService.formatAmount(expense.amount)}</Text>
                </View>
              ))}
              {calculations.isGrossProfit && (
                <View style={[styles.itemRow, styles.profitRow]}>
                  <Text style={styles.itemLabelBold}>Gross Profit c/d</Text>
                  <Text style={styles.itemAmountBold}>₹{calculations.grossProfitFormatted}</Text>
                </View>
              )}
            </View>

            <View style={styles.creditSide}>
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Sales</Text>
                <Text style={styles.itemAmount}>₹{TradingProfitLossService.formatAmount(data.sales)}</Text>
              </View>
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Less: Sales Returns</Text>
                <Text style={styles.itemAmount}>(₹{TradingProfitLossService.formatAmount(data.salesReturns)})</Text>
              </View>
              <View style={[styles.itemRow, styles.boldRow]}>
                <Text style={styles.itemLabelBold}>Net Sales</Text>
                <Text style={styles.itemAmountBold}>₹{calculations.netSalesFormatted}</Text>
              </View>
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>Closing Stock</Text>
                <Text style={styles.itemAmount}>₹{TradingProfitLossService.formatAmount(data.closingStock)}</Text>
              </View>
              {!calculations.isGrossProfit && (
                <View style={[styles.itemRow, styles.lossRow]}>
                  <Text style={styles.itemLabelBold}>Gross Loss c/d</Text>
                  <Text style={styles.itemAmountBold}>₹{calculations.grossProfitFormatted}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.resultCard, calculations.isGrossProfit ? styles.profitCard : styles.lossCard]}>
          <Text style={styles.resultLabel}>
            {calculations.isGrossProfit ? 'GROSS PROFIT' : 'GROSS LOSS'}
          </Text>
          <Text style={styles.resultAmount}>₹{calculations.grossProfitFormatted}</Text>
        </View>

        <TouchableOpacity style={styles.pdfButton} onPress={generateTradingPDF}>
          <Text style={styles.buttonText}>Generate Trading Account PDF</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderProfitLossAccount = () => {
    if (!profitLossData) return null;

    const { data, calculations } = profitLossData;

    return (
      <View style={styles.accountContainer}>
        <View style={styles.accountHeader}>
          <Text style={styles.accountTitle}>PROFIT & LOSS ACCOUNT</Text>
          <Text style={styles.accountPeriod}>
            {moment(fromDate).format('DD/MM/YYYY')} to {moment(toDate).format('DD/MM/YYYY')}
          </Text>
        </View>

        <View style={styles.doubleSidedContainer}>
          <View style={styles.sideHeader}>
            <View style={styles.debitHeader}>
              <Text style={styles.sideHeaderText}>DEBIT SIDE (Dr.) - EXPENSES</Text>
            </View>
            <View style={styles.creditHeader}>
              <Text style={styles.sideHeaderText}>CREDIT SIDE (Cr.) - INCOMES</Text>
            </View>
          </View>

          <View style={styles.contentRow}>
            <View style={styles.debitSide}>
              {calculations.grossLoss > 0 && (
                <View style={[styles.itemRow, styles.lossRow]}>
                  <Text style={styles.itemLabelBold}>Gross Loss b/d</Text>
                  <Text style={styles.itemAmountBold}>₹{calculations.grossLossFormatted}</Text>
                </View>
              )}
              {data.indirectExpenses.map((expense, index) => (
                <View key={`indirect-${index}`} style={styles.itemRow}>
                  <Text style={styles.itemLabel}>{expense.accountName}</Text>
                  <Text style={styles.itemAmount}>₹{TradingProfitLossService.formatAmount(expense.amount)}</Text>
                </View>
              ))}
              {data.financialExpenses.map((expense, index) => (
                <View key={`financial-${index}`} style={styles.itemRow}>
                  <Text style={styles.itemLabel}>{expense.accountName}</Text>
                  <Text style={styles.itemAmount}>₹{TradingProfitLossService.formatAmount(expense.amount)}</Text>
                </View>
              ))}
              {calculations.isNetProfit && (
                <View style={[styles.itemRow, styles.profitRow]}>
                  <Text style={styles.itemLabelBold}>Net Profit</Text>
                  <Text style={styles.itemAmountBold}>₹{calculations.netProfitFormatted}</Text>
                </View>
              )}
            </View>

            <View style={styles.creditSide}>
              {calculations.grossProfit > 0 && (
                <View style={[styles.itemRow, styles.profitRow]}>
                  <Text style={styles.itemLabelBold}>Gross Profit b/d</Text>
                  <Text style={styles.itemAmountBold}>₹{calculations.grossProfitFormatted}</Text>
                </View>
              )}
              {data.indirectIncomes.map((income, index) => (
                <View key={`indirect-${index}`} style={styles.itemRow}>
                  <Text style={styles.itemLabel}>{income.accountName}</Text>
                  <Text style={styles.itemAmount}>₹{TradingProfitLossService.formatAmount(income.amount)}</Text>
                </View>
              ))}
              {data.financialIncomes.map((income, index) => (
                <View key={`financial-${index}`} style={styles.itemRow}>
                  <Text style={styles.itemLabel}>{income.accountName}</Text>
                  <Text style={styles.itemAmount}>₹{TradingProfitLossService.formatAmount(income.amount)}</Text>
                </View>
              ))}
              {!calculations.isNetProfit && (
                <View style={[styles.itemRow, styles.lossRow]}>
                  <Text style={styles.itemLabelBold}>Net Loss</Text>
                  <Text style={styles.itemAmountBold}>₹{calculations.netProfitFormatted}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.resultCard, calculations.isNetProfit ? styles.profitCard : styles.lossCard]}>
          <Text style={styles.resultLabel}>
            {calculations.isNetProfit ? 'NET PROFIT' : 'NET LOSS'}
          </Text>
          <Text style={styles.resultAmount}>₹{calculations.netProfitFormatted}</Text>
        </View>

        <TouchableOpacity style={styles.pdfButton} onPress={generateProfitLossPDF}>
          <Text style={styles.buttonText}>Generate Profit & Loss PDF</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>TRADING & PROFIT LOSS ACCOUNT</Text>

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

        <TouchableOpacity
          style={styles.loadButton}
          onPress={loadAccounts}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Load Accounts'}
          </Text>
        </TouchableOpacity>
      </View>

      {(tradingData || profitLossData) && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'trading' && styles.activeTab]}
            onPress={() => setActiveTab('trading')}
          >
            <Text style={[styles.tabText, activeTab === 'trading' && styles.activeTabText]}>
              Trading Account
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'profitloss' && styles.activeTab]}
            onPress={() => setActiveTab('profitloss')}
          >
            <Text style={[styles.tabText, activeTab === 'profitloss' && styles.activeTabText]}>
              Profit & Loss
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'trading' ? renderTradingAccount() : renderProfitLossAccount()}
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
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    padding: 15,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#2196F3',
    marginHorizontal: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: 'white',
  },
  accountContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
  },
  accountHeader: {
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
    paddingBottom: 10,
  },
  accountTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  accountPeriod: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  doubleSidedContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 15,
  },
  sideHeader: {
    flexDirection: 'row',
  },
  debitHeader: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 10,
    borderTopLeftRadius: 5,
  },
  creditHeader: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 10,
    borderTopRightRadius: 5,
  },
  sideHeaderText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contentRow: {
    flexDirection: 'row',
  },
  debitSide: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    padding: 10,
  },
  creditSide: {
    flex: 1,
    padding: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  boldRow: {
    backgroundColor: '#f0f0f0',
  },
  profitRow: {
    backgroundColor: '#e8f5e9',
  },
  lossRow: {
    backgroundColor: '#ffebee',
  },
  itemLabel: {
    fontSize: 14,
    color: '#333',
  },
  itemAmount: {
    fontSize: 14,
    color: '#666',
  },
  itemLabelBold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  itemAmountBold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  resultCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  profitCard: {
    backgroundColor: '#e8f5e9',
  },
  lossCard: {
    backgroundColor: '#ffebee',
  },
  resultLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  resultAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  pdfButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
});
