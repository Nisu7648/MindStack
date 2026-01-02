import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import PeriodClosingService from '../services/accounting/periodClosingService';
import FinalAccountsPDFService from '../services/accounting/finalAccountsPDFService';
import moment from 'moment';

export default function PeriodClosingScreen() {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [closingType, setClosingType] = useState('MONTHLY');
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    periodName: '',
    periodType: 'MONTHLY',
    startDate: new Date(),
    endDate: new Date()
  });
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [closingResult, setClosingResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      // Load periods from database
      // Implementation depends on your database service
      setPeriods([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load periods');
    }
  };

  const createPeriod = async () => {
    if (!newPeriod.periodName) {
      Alert.alert('Error', 'Please enter period name');
      return;
    }

    try {
      const result = await PeriodClosingService.createAccountingPeriod({
        periodName: newPeriod.periodName,
        periodType: newPeriod.periodType,
        startDate: moment(newPeriod.startDate).format('YYYY-MM-DD'),
        endDate: moment(newPeriod.endDate).format('YYYY-MM-DD')
      });

      if (result.success) {
        Alert.alert('Success', 'Accounting period created');
        setShowCreatePeriod(false);
        loadPeriods();
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create period');
    }
  };

  const performClosing = async () => {
    if (!selectedPeriod) {
      Alert.alert('Error', 'Please select a period');
      return;
    }

    Alert.alert(
      'Confirm Period Closing',
      `Are you sure you want to perform ${closingType} closing?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Proceed', 
          onPress: async () => {
            setLoading(true);
            try {
              let result;
              
              switch (closingType) {
                case 'MONTHLY':
                  result = await PeriodClosingService.performMonthlyClosing(selectedPeriod);
                  break;
                case 'QUARTERLY':
                  result = await PeriodClosingService.performQuarterlyClosing(selectedPeriod);
                  break;
                case 'ANNUAL':
                  result = await PeriodClosingService.performAnnualClosing(selectedPeriod);
                  break;
              }

              if (result.success) {
                setClosingResult(result);
                Alert.alert('Success', result.message);
              } else {
                Alert.alert('Error', result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to perform closing');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const generateAllPDFs = async () => {
    if (!closingResult) {
      Alert.alert('Error', 'Please perform closing first');
      return;
    }

    try {
      Alert.alert('Generating PDFs', 'Please wait...');
      
      // Generate all PDFs based on closing type
      const period = `${moment(newPeriod.startDate).format('DD/MM/YYYY')} to ${moment(newPeriod.endDate).format('DD/MM/YYYY')}`;
      
      if (closingResult.trialBalance) {
        await FinalAccountsPDFService.generateTrialBalancePDF({}, period);
      }
      
      if (closingResult.tradingAccount) {
        await FinalAccountsPDFService.generateTradingAccountPDF({}, period);
      }
      
      if (closingResult.profitLoss) {
        await FinalAccountsPDFService.generateProfitLossAccountPDF({}, period);
      }
      
      if (closingResult.balanceSheet) {
        await FinalAccountsPDFService.generateBalanceSheetPDF(moment(newPeriod.endDate).format('YYYY-MM-DD'));
      }

      Alert.alert('Success', 'All PDFs generated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDFs');
    }
  };

  const renderClosingResult = () => {
    if (!closingResult) return null;

    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>CLOSING SUMMARY</Text>

        {closingResult.trialBalance && (
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>Trial Balance</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Status:</Text>
              <Text style={[styles.resultValue, { color: closingResult.trialBalance.isBalanced ? '#4CAF50' : '#F44336' }]}>
                {closingResult.trialBalance.isBalanced ? '✅ BALANCED' : '❌ NOT BALANCED'}
              </Text>
            </View>
            {!closingResult.trialBalance.isBalanced && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Difference:</Text>
                <Text style={styles.resultValue}>₹{closingResult.trialBalance.difference}</Text>
              </View>
            )}
          </View>
        )}

        {closingResult.tradingAccount && (
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>Trading Account</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Gross Profit/Loss:</Text>
              <Text style={[styles.resultValue, { color: closingResult.tradingAccount.data.calculations.isGrossProfit ? '#4CAF50' : '#F44336' }]}>
                ₹{closingResult.tradingAccount.data.calculations.grossProfitFormatted}
              </Text>
            </View>
          </View>
        )}

        {closingResult.profitLoss && (
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>Profit & Loss Account</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Net Profit/Loss:</Text>
              <Text style={[styles.resultValue, { color: closingResult.profitLoss.data.calculations.isNetProfit ? '#4CAF50' : '#F44336' }]}>
                ₹{closingResult.profitLoss.data.calculations.netProfitFormatted}
              </Text>
            </View>
          </View>
        )}

        {closingResult.balanceSheet && (
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>Balance Sheet</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total Assets:</Text>
              <Text style={styles.resultValue}>₹{closingResult.balanceSheet.data.summary.totalAssetsFormatted}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total Liabilities:</Text>
              <Text style={styles.resultValue}>₹{closingResult.balanceSheet.data.summary.totalLiabilitiesFormatted}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Status:</Text>
              <Text style={[styles.resultValue, { color: closingResult.balanceSheet.isBalanced ? '#4CAF50' : '#F44336' }]}>
                {closingResult.balanceSheet.isBalanced ? '✅ BALANCED' : '❌ NOT BALANCED'}
              </Text>
            </View>
          </View>
        )}

        {closingResult.financialRatios && (
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>Financial Ratios</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Current Ratio:</Text>
              <Text style={styles.resultValue}>{closingResult.financialRatios.ratios.currentRatioFormatted}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Quick Ratio:</Text>
              <Text style={styles.resultValue}>{closingResult.financialRatios.ratios.quickRatioFormatted}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Debt-Equity Ratio:</Text>
              <Text style={styles.resultValue}>{closingResult.financialRatios.ratios.debtEquityRatioFormatted}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Gross Profit Ratio:</Text>
              <Text style={styles.resultValue}>{closingResult.financialRatios.ratios.grossProfitRatioFormatted}%</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Net Profit Ratio:</Text>
              <Text style={styles.resultValue}>{closingResult.financialRatios.ratios.netProfitRatioFormatted}%</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.pdfButton} onPress={generateAllPDFs}>
          <Text style={styles.buttonText}>Generate All PDFs</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>PERIOD CLOSING</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📋 Closing Rules</Text>
        <Text style={styles.infoText}>• Monthly: Close books, prepare Trial Balance</Text>
        <Text style={styles.infoText}>• Quarterly: Trial Balance + Trading + P&L (optional)</Text>
        <Text style={styles.infoText}>• Annual: All statements + Balance Sheet (mandatory)</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreatePeriod(!showCreatePeriod)}
        >
          <Text style={styles.buttonText}>
            {showCreatePeriod ? 'Hide' : 'Create New Period'}
          </Text>
        </TouchableOpacity>

        {showCreatePeriod && (
          <View style={styles.createPeriodForm}>
            <Text style={styles.label}>Period Name:</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., January 2024"
              value={newPeriod.periodName}
              onChangeText={(text) => setNewPeriod({ ...newPeriod, periodName: text })}
            />

            <Text style={styles.label}>Period Type:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newPeriod.periodType}
                onValueChange={(value) => setNewPeriod({ ...newPeriod, periodType: value })}
                style={styles.picker}
              >
                <Picker.Item label="Monthly" value="MONTHLY" />
                <Picker.Item label="Quarterly" value="QUARTERLY" />
                <Picker.Item label="Annual" value="ANNUALLY" />
              </Picker>
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateColumn}>
                <Text style={styles.label}>Start Date:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDate(true)}
                >
                  <Text>{moment(newPeriod.startDate).format('DD/MM/YYYY')}</Text>
                </TouchableOpacity>
                {showStartDate && (
                  <DateTimePicker
                    value={newPeriod.startDate}
                    mode="date"
                    onChange={(event, date) => {
                      setShowStartDate(false);
                      if (date) setNewPeriod({ ...newPeriod, startDate: date });
                    }}
                  />
                )}
              </View>

              <View style={styles.dateColumn}>
                <Text style={styles.label}>End Date:</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDate(true)}
                >
                  <Text>{moment(newPeriod.endDate).format('DD/MM/YYYY')}</Text>
                </TouchableOpacity>
                {showEndDate && (
                  <DateTimePicker
                    value={newPeriod.endDate}
                    mode="date"
                    onChange={(event, date) => {
                      setShowEndDate(false);
                      if (date) setNewPeriod({ ...newPeriod, endDate: date });
                    }}
                  />
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={createPeriod}>
              <Text style={styles.buttonText}>Create Period</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Perform Closing</Text>

        <Text style={styles.label}>Closing Type:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={closingType}
            onValueChange={(value) => setClosingType(value)}
            style={styles.picker}
          >
            <Picker.Item label="Monthly Closing" value="MONTHLY" />
            <Picker.Item label="Quarterly Closing" value="QUARTERLY" />
            <Picker.Item label="Annual Closing (Year-End)" value="ANNUAL" />
          </Picker>
        </View>

        <View style={styles.closingInfo}>
          <Text style={styles.closingInfoTitle}>
            {closingType === 'MONTHLY' && '📅 Monthly Closing'}
            {closingType === 'QUARTERLY' && '📊 Quarterly Closing'}
            {closingType === 'ANNUAL' && '🎯 Annual Closing'}
          </Text>
          <Text style={styles.closingInfoText}>
            {closingType === 'MONTHLY' && 'Closes all books and prepares Trial Balance'}
            {closingType === 'QUARTERLY' && 'Prepares Trial Balance, Trading Account, and P&L'}
            {closingType === 'ANNUAL' && 'Prepares all final accounts including Balance Sheet'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.closingButton, loading && styles.disabledButton]}
          onPress={performClosing}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Processing...' : `Perform ${closingType} Closing`}
          </Text>
        </TouchableOpacity>
      </View>

      {renderClosingResult()}
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
  infoCard: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 15,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createPeriodForm: {
    marginTop: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
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
  submitButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  closingInfo: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  closingInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  closingInfoText: {
    fontSize: 14,
    color: '#856404',
  },
  closingButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  resultContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
    marginBottom: 15,
  },
  resultCard: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
  },
  resultCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  pdfButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
});
