/**
 * DAY CLOSE SCREEN
 * Essential for cash verification
 * Simple, business-focused, no fancy features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import cashGuard from '../../services/pos/cashGuard';

const DayCloseScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [expectedCash, setExpectedCash] = useState(null);
  const [physicalCash, setPhysicalCash] = useState('');
  const [salesSummary, setSalesSummary] = useState(null);

  useEffect(() => {
    loadDayData();
  }, []);

  const loadDayData = async () => {
    try {
      // Get expected cash
      const expected = await cashGuard.calculateExpectedCash();
      if (expected.success) {
        setExpectedCash(expected);
      }

      // Get sales summary
      const summary = await cashGuard.getTodaySalesSummary();
      if (summary.success) {
        setSalesSummary(summary.summary);
      }
    } catch (error) {
      console.error('Load day data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDay = async () => {
    if (!physicalCash || physicalCash.trim() === '') {
      Alert.alert('Error', 'Please enter physical cash amount');
      return;
    }

    const amount = parseFloat(physicalCash);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Error', 'Please enter valid amount');
      return;
    }

    try {
      const result = await cashGuard.closeDay(amount);

      if (result.success) {
        const { dayClose } = result;
        const diff = dayClose.difference;

        let message = `Day closed successfully!\n\n`;
        message += `Expected: ₹${dayClose.expectedCash.toLocaleString('en-IN')}\n`;
        message += `Physical: ₹${dayClose.physicalCash.toLocaleString('en-IN')}\n`;
        
        if (diff === 0) {
          message += `\n✓ Cash matched perfectly!`;
        } else if (diff > 0) {
          message += `\n⚠ Excess: ₹${Math.abs(diff).toLocaleString('en-IN')}`;
        } else {
          message += `\n⚠ Short: ₹${Math.abs(diff).toLocaleString('en-IN')}`;
        }

        Alert.alert('Day Closed', message, [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to close day');
      }
    } catch (error) {
      console.error('Close day error:', error);
      Alert.alert('Error', 'Failed to close day');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const difference = expectedCash && physicalCash 
    ? parseFloat(physicalCash) - expectedCash.expectedCash 
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Sales Summary */}
        {salesSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Sales</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Bills</Text>
              <Text style={styles.summaryValue}>{salesSummary.invoiceCount}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Sales</Text>
              <Text style={styles.summaryValue}>
                ₹{salesSummary.totalSales.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cash</Text>
              <Text style={styles.summaryValue}>
                ₹{salesSummary.cashSales.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>UPI</Text>
              <Text style={styles.summaryValue}>
                ₹{salesSummary.upiSales.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Card</Text>
              <Text style={styles.summaryValue}>
                ₹{salesSummary.cardSales.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Credit</Text>
              <Text style={styles.summaryValue}>
                ₹{salesSummary.creditSales.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}

        {/* Cash Verification */}
        {expectedCash && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cash Verification</Text>

            <View style={styles.cashRow}>
              <Text style={styles.cashLabel}>Opening Cash</Text>
              <Text style={styles.cashValue}>
                ₹{expectedCash.openingCash.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.cashRow}>
              <Text style={styles.cashLabel}>Cash Sales</Text>
              <Text style={styles.cashValue}>
                ₹{expectedCash.cashSales.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.cashRow}>
              <Text style={styles.expectedLabel}>Expected Cash</Text>
              <Text style={styles.expectedValue}>
                ₹{expectedCash.expectedCash.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}

        {/* Physical Cash Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enter Physical Cash</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="numeric"
              value={physicalCash}
              onChangeText={setPhysicalCash}
            />
          </View>

          {physicalCash && expectedCash && (
            <View style={[
              styles.differenceBox,
              {
                backgroundColor: difference === 0 ? '#E8F5E9' :
                                difference > 0 ? '#FFF3E0' : '#FFEBEE'
              }
            ]}>
              <Text style={[
                styles.differenceLabel,
                {
                  color: difference === 0 ? '#2E7D32' :
                         difference > 0 ? '#F57C00' : '#C62828'
                }
              ]}>
                {difference === 0 ? 'MATCHED' :
                 difference > 0 ? 'EXCESS' : 'SHORT'}
              </Text>
              <Text style={[
                styles.differenceValue,
                {
                  color: difference === 0 ? '#2E7D32' :
                         difference > 0 ? '#F57C00' : '#C62828'
                }
              ]}>
                {difference === 0 ? '₹0' :
                 `₹${Math.abs(difference).toLocaleString('en-IN')}`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Close Day Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleCloseDay}
        >
          <Icon name="check-circle" size={24} color="#FFFFFF" />
          <Text style={styles.closeButtonText}>CLOSE DAY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  content: {
    flex: 1
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666666'
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000'
  },
  cashRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  cashLabel: {
    fontSize: 16,
    color: '#666666'
  },
  cashValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000'
  },
  expectedLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000'
  },
  expectedValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2196F3'
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA'
  },
  rupeeSymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2196F3',
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: '#000000'
  },
  differenceBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  differenceLabel: {
    fontSize: 16,
    fontWeight: '700'
  },
  differenceValue: {
    fontSize: 24,
    fontWeight: '700'
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  closeButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8
  }
});

export default DayCloseScreen;
