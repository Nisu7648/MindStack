import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import BalanceSheetService from '../services/accounting/balanceSheetService';
import FinalAccountsPDFService from '../services/accounting/finalAccountsPDFService';
import moment from 'moment';

export default function BalanceSheetScreen() {
  const [asOnDate, setAsOnDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [balanceSheetData, setBalanceSheetData] = useState(null);
  const [ratiosData, setRatiosData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRatios, setShowRatios] = useState(false);

  const loadBalanceSheet = async () => {
    setLoading(true);
    try {
      const dateStr = moment(asOnDate).format('YYYY-MM-DD');
      
      const bsResult = await BalanceSheetService.getBalanceSheet(dateStr);
      const ratiosResult = await BalanceSheetService.getFinancialRatios(dateStr);

      if (bsResult.success && ratiosResult.success) {
        setBalanceSheetData(bsResult);
        setRatiosData(ratiosResult);
        
        if (!bsResult.summary.isBalanced) {
          Alert.alert(
            'Warning',
            `Balance Sheet is not balanced!\nDifference: ₹${bsResult.summary.differenceFormatted}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Error', 'Failed to load balance sheet');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load balance sheet');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!balanceSheetData) {
      Alert.alert('Error', 'Please load balance sheet first');
      return;
    }

    try {
      const dateStr = moment(asOnDate).format('YYYY-MM-DD');
      const result = await FinalAccountsPDFService.generateBalanceSheetPDF(dateStr);

      if (result.success) {
        Alert.alert('Success', `PDF saved to: ${result.filePath}`);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const renderAssetGroup = (title, items, total, color) => (
    <View style={styles.groupContainer}>
      <View style={[styles.groupHeader, { backgroundColor: color }]}>
        <Text style={styles.groupTitle}>{title}</Text>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <Text style={styles.itemName}>{item.accountName}</Text>
          <Text style={styles.itemAmount}>₹{BalanceSheetService.formatAmount(item.amount)}</Text>
        </View>
      ))}
      <View style={styles.subtotalRow}>
        <Text style={styles.subtotalLabel}>Total {title}</Text>
        <Text style={styles.subtotalAmount}>₹{total}</Text>
      </View>
    </View>
  );

  const renderLiabilityGroup = (title, items, total, color) => (
    <View style={styles.groupContainer}>
      <View style={[styles.groupHeader, { backgroundColor: color }]}>
        <Text style={styles.groupTitle}>{title}</Text>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <Text style={styles.itemName}>{item.accountName}</Text>
          <Text style={styles.itemAmount}>₹{BalanceSheetService.formatAmount(item.amount)}</Text>
        </View>
      ))}
      <View style={styles.subtotalRow}>
        <Text style={styles.subtotalLabel}>Total {title}</Text>
        <Text style={styles.subtotalAmount}>₹{total}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>BALANCE SHEET</Text>

      <View style={styles.filterSection}>
        <Text style={styles.label}>As On Date:</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>{moment(asOnDate).format('DD/MM/YYYY')}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={asOnDate}
            mode="date"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setAsOnDate(date);
            }}
          />
        )}

        <TouchableOpacity
          style={styles.loadButton}
          onPress={loadBalanceSheet}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Load Balance Sheet'}
          </Text>
        </TouchableOpacity>
      </View>

      {balanceSheetData && (
        <>
          <View style={[
            styles.statusCard,
            { backgroundColor: balanceSheetData.summary.isBalanced ? '#e8f5e9' : '#ffebee' }
          ]}>
            <Text style={styles.statusText}>
              {balanceSheetData.summary.isBalanced ? '✅ BALANCED' : '❌ NOT BALANCED'}
            </Text>
            {!balanceSheetData.summary.isBalanced && (
              <Text style={styles.differenceText}>
                Difference: ₹{balanceSheetData.summary.differenceFormatted}
              </Text>
            )}
          </View>

          <View style={styles.balanceSheetContainer}>
            <View style={styles.sideHeader}>
              <View style={styles.liabilitiesHeader}>
                <Text style={styles.sideHeaderText}>LIABILITIES</Text>
              </View>
              <View style={styles.assetsHeader}>
                <Text style={styles.sideHeaderText}>ASSETS</Text>
              </View>
            </View>

            <ScrollView horizontal>
              <View style={styles.contentRow}>
                <View style={styles.liabilitiesSide}>
                  {renderLiabilityGroup(
                    'CAPITAL & RESERVES',
                    [...balanceSheetData.liabilities.capital, ...balanceSheetData.liabilities.reserves],
                    balanceSheetData.summary.capitalAndReservesFormatted,
                    '#2196F3'
                  )}
                  
                  <View style={[styles.profitLossRow, balanceSheetData.profitLoss.isProfit ? styles.profitRow : styles.lossRow]}>
                    <Text style={styles.profitLossLabel}>
                      {balanceSheetData.profitLoss.isProfit ? 'Add: Net Profit' : 'Less: Net Loss'}
                    </Text>
                    <Text style={styles.profitLossAmount}>
                      ₹{balanceSheetData.profitLoss.formatted}
                    </Text>
                  </View>

                  {balanceSheetData.liabilities.longTermLiabilities.length > 0 && renderLiabilityGroup(
                    'LONG TERM LIABILITIES',
                    balanceSheetData.liabilities.longTermLiabilities,
                    balanceSheetData.summary.totalLongTermLiabilitiesFormatted,
                    '#FF9800'
                  )}

                  {renderLiabilityGroup(
                    'CURRENT LIABILITIES',
                    balanceSheetData.liabilities.currentLiabilities,
                    balanceSheetData.summary.totalCurrentLiabilitiesFormatted,
                    '#F44336'
                  )}

                  {balanceSheetData.liabilities.provisions.length > 0 && renderLiabilityGroup(
                    'PROVISIONS',
                    balanceSheetData.liabilities.provisions,
                    balanceSheetData.summary.totalProvisionsFormatted,
                    '#9C27B0'
                  )}
                </View>

                <View style={styles.assetsSide}>
                  {renderAssetGroup(
                    'FIXED ASSETS',
                    balanceSheetData.assets.fixedAssets,
                    balanceSheetData.summary.totalFixedAssetsFormatted,
                    '#4CAF50'
                  )}

                  {renderAssetGroup(
                    'CURRENT ASSETS',
                    balanceSheetData.assets.currentAssets,
                    balanceSheetData.summary.totalCurrentAssetsFormatted,
                    '#00BCD4'
                  )}

                  {balanceSheetData.assets.investments.length > 0 && renderAssetGroup(
                    'INVESTMENTS',
                    balanceSheetData.assets.investments,
                    balanceSheetData.summary.totalInvestmentsFormatted,
                    '#673AB7'
                  )}

                  {balanceSheetData.assets.otherAssets.length > 0 && renderAssetGroup(
                    'OTHER ASSETS',
                    balanceSheetData.assets.otherAssets,
                    balanceSheetData.summary.totalOtherAssetsFormatted,
                    '#795548'
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.totalRow}>
              <View style={styles.totalColumn}>
                <Text style={styles.totalLabel}>TOTAL LIABILITIES:</Text>
                <Text style={styles.totalAmount}>₹{balanceSheetData.summary.totalLiabilitiesFormatted}</Text>
              </View>
              <View style={styles.totalColumn}>
                <Text style={styles.totalLabel}>TOTAL ASSETS:</Text>
                <Text style={styles.totalAmount}>₹{balanceSheetData.summary.totalAssetsFormatted}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.ratiosButton}
            onPress={() => setShowRatios(!showRatios)}
          >
            <Text style={styles.buttonText}>
              {showRatios ? 'Hide Financial Ratios' : 'Show Financial Ratios'}
            </Text>
          </TouchableOpacity>

          {showRatios && ratiosData && (
            <View style={styles.ratiosContainer}>
              <Text style={styles.ratiosTitle}>FINANCIAL RATIOS</Text>
              
              <View style={styles.ratioCard}>
                <Text style={styles.ratioLabel}>Current Ratio</Text>
                <Text style={styles.ratioValue}>{ratiosData.ratios.currentRatioFormatted}</Text>
                <Text style={[styles.ratioInterpretation, { color: ratiosData.interpretation.currentRatio === 'Good' ? '#4CAF50' : '#FF9800' }]}>
                  {ratiosData.interpretation.currentRatio}
                </Text>
              </View>

              <View style={styles.ratioCard}>
                <Text style={styles.ratioLabel}>Quick Ratio</Text>
                <Text style={styles.ratioValue}>{ratiosData.ratios.quickRatioFormatted}</Text>
                <Text style={[styles.ratioInterpretation, { color: ratiosData.interpretation.quickRatio === 'Good' ? '#4CAF50' : '#F44336' }]}>
                  {ratiosData.interpretation.quickRatio}
                </Text>
              </View>

              <View style={styles.ratioCard}>
                <Text style={styles.ratioLabel}>Debt-Equity Ratio</Text>
                <Text style={styles.ratioValue}>{ratiosData.ratios.debtEquityRatioFormatted}</Text>
                <Text style={[styles.ratioInterpretation, { color: ratiosData.interpretation.debtEquityRatio === 'Good' ? '#4CAF50' : '#F44336' }]}>
                  {ratiosData.interpretation.debtEquityRatio}
                </Text>
              </View>

              <View style={styles.ratioCard}>
                <Text style={styles.ratioLabel}>Working Capital</Text>
                <Text style={styles.ratioValue}>₹{ratiosData.ratios.workingCapitalFormatted}</Text>
                <Text style={[styles.ratioInterpretation, { color: ratiosData.interpretation.workingCapital === 'Positive' ? '#4CAF50' : '#F44336' }]}>
                  {ratiosData.interpretation.workingCapital}
                </Text>
              </View>
            </View>
          )}

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
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    backgroundColor: 'white',
    marginBottom: 15,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
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
  balanceSheetContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    elevation: 3,
  },
  sideHeader: {
    flexDirection: 'row',
  },
  liabilitiesHeader: {
    flex: 1,
    backgroundColor: '#F44336',
    padding: 10,
    borderTopLeftRadius: 10,
  },
  assetsHeader: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 10,
    borderTopRightRadius: 10,
  },
  sideHeaderText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    minHeight: 300,
  },
  liabilitiesSide: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    padding: 10,
  },
  assetsSide: {
    flex: 1,
    padding: 10,
  },
  groupContainer: {
    marginBottom: 15,
  },
  groupHeader: {
    padding: 8,
    borderRadius: 5,
  },
  groupTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemName: {
    fontSize: 13,
    color: '#333',
    flex: 2,
  },
  itemAmount: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f0f0f0',
    marginTop: 5,
    borderRadius: 5,
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  subtotalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  profitLossRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
  },
  profitRow: {
    backgroundColor: '#e8f5e9',
  },
  lossRow: {
    backgroundColor: '#ffebee',
  },
  profitLossLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  profitLossAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
  },
  totalColumn: {
    flex: 1,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 5,
  },
  ratiosButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  ratiosContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
  },
  ratiosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 15,
    textAlign: 'center',
  },
  ratioCard: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  ratioLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  ratioValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  ratioInterpretation: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  pdfButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
});
