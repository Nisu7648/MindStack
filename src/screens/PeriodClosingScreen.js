/**
 * PERIOD CLOSING SCREEN - CONNECTED TO SERVICES
 * 
 * User clicks "Close Period" → Everything happens automatically
 * - All subsidiary books closed
 * - Ledger posted
 * - Trial balance prepared
 * - Trading account prepared
 * - Profit & Loss prepared
 * - Balance sheet prepared
 * - All PDFs generated
 * 
 * Background logic handles everything
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import ScreenConnector from '../services/integration/ScreenConnector';
import { supabase } from '../services/supabase';

const PeriodClosingScreen = ({ navigation, route }) => {
  const { businessId } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [periodType, setPeriodType] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [businessInfo, setBusinessInfo] = useState(null);
  const [periodStatus, setPeriodStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load business info
      const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();
      
      setBusinessInfo(business);

      // Check period status
      await checkPeriodStatus();
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const checkPeriodStatus = async () => {
    try {
      // Check if period is already closed
      const { data } = await supabase
        .from('period_closings')
        .select('*')
        .eq('business_id', businessId)
        .eq('period_type', periodType)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .single();
      
      setPeriodStatus(data);
    } catch (error) {
      setPeriodStatus(null);
    }
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  /**
   * ONE-CLICK PERIOD CLOSING
   * Background logic handles everything automatically
   */
  const handleClosePeriod = async () => {
    Alert.alert(
      'Confirm Period Closing',
      `Are you sure you want to close ${periodType} period for ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}?\n\nThis will:\n✅ Close all subsidiary books\n✅ Post to ledger\n✅ Generate trial balance\n✅ Generate trading account\n✅ Generate P&L\n✅ Generate balance sheet\n✅ Generate all PDFs`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Period',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            
            try {
              // ONE-CLICK: Everything happens automatically
              const result = await ScreenConnector.closePeriod({
                periodType,
                month: selectedMonth,
                year: selectedYear,
                businessId
              }, businessId);

              if (result.success) {
                Alert.alert(
                  '✅ Period Closed Successfully!',
                  `All financial statements generated:\n\n` +
                  `📊 Trial Balance\n` +
                  `📈 Trading Account\n` +
                  `💰 Profit & Loss\n` +
                  `📋 Balance Sheet\n\n` +
                  `PDFs saved to phone storage`,
                  [
                    { text: 'View Reports', onPress: () => navigation.navigate('Reports') },
                    { text: 'Done', onPress: () => navigation.goBack() }
                  ]
                );
                
                await checkPeriodStatus();
              }
            } catch (error) {
              console.error('Close period error:', error);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReopenPeriod = async () => {
    Alert.alert(
      'Reopen Period',
      'Are you sure you want to reopen this period? This will allow modifications.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen',
          onPress: async () => {
            setLoading(true);
            try {
              // Delete period closing record
              await supabase
                .from('period_closings')
                .delete()
                .eq('id', periodStatus.id);
              
              Alert.alert('✅ Success', 'Period reopened successfully');
              await checkPeriodStatus();
            } catch (error) {
              Alert.alert('❌ Error', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Period Closing</Text>
        <Text style={styles.subtitle}>One-click closing with automatic financial statements</Text>
      </View>

      {/* Period Type */}
      <View style={styles.section}>
        <Text style={styles.label}>Period Type</Text>
        <View style={styles.typeButtons}>
          <TouchableOpacity
            style={[styles.typeButton, periodType === 'monthly' && styles.typeButtonActive]}
            onPress={() => setPeriodType('monthly')}
          >
            <Text style={[styles.typeButtonText, periodType === 'monthly' && styles.typeButtonTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, periodType === 'quarterly' && styles.typeButtonActive]}
            onPress={() => setPeriodType('quarterly')}
          >
            <Text style={[styles.typeButtonText, periodType === 'quarterly' && styles.typeButtonTextActive]}>
              Quarterly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, periodType === 'annual' && styles.typeButtonActive]}
            onPress={() => setPeriodType('annual')}
          >
            <Text style={[styles.typeButtonText, periodType === 'annual' && styles.typeButtonTextActive]}>
              Annual
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Period Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Select Period</Text>
        
        {periodType === 'monthly' && (
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Month</Text>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={(value) => {
                  setSelectedMonth(value);
                  checkPeriodStatus();
                }}
                style={styles.picker}
              >
                {months.map(month => (
                  <Picker.Item key={month.value} label={month.label} value={month.value} />
                ))}
              </Picker>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Year</Text>
              <Picker
                selectedValue={selectedYear}
                onValueChange={(value) => {
                  setSelectedYear(value);
                  checkPeriodStatus();
                }}
                style={styles.picker}
              >
                {years.map(year => (
                  <Picker.Item key={year} label={year.toString()} value={year} />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {periodType === 'quarterly' && (
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Quarter</Text>
              <Picker
                selectedValue={Math.ceil(selectedMonth / 3)}
                onValueChange={(value) => {
                  setSelectedMonth(value * 3);
                  checkPeriodStatus();
                }}
                style={styles.picker}
              >
                <Picker.Item label="Q1 (Jan-Mar)" value={1} />
                <Picker.Item label="Q2 (Apr-Jun)" value={2} />
                <Picker.Item label="Q3 (Jul-Sep)" value={3} />
                <Picker.Item label="Q4 (Oct-Dec)" value={4} />
              </Picker>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Year</Text>
              <Picker
                selectedValue={selectedYear}
                onValueChange={(value) => {
                  setSelectedYear(value);
                  checkPeriodStatus();
                }}
                style={styles.picker}
              >
                {years.map(year => (
                  <Picker.Item key={year} label={year.toString()} value={year} />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {periodType === 'annual' && (
          <View>
            <Text style={styles.label}>Financial Year</Text>
            <Picker
              selectedValue={selectedYear}
              onValueChange={(value) => {
                setSelectedYear(value);
                checkPeriodStatus();
              }}
              style={styles.picker}
            >
              {years.map(year => (
                <Picker.Item 
                  key={year} 
                  label={`FY ${year}-${(year + 1).toString().slice(-2)}`} 
                  value={year} 
                />
              ))}
            </Picker>
          </View>
        )}
      </View>

      {/* Period Status */}
      {periodStatus && (
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>⚠️ Period Already Closed</Text>
          <Text style={styles.statusText}>
            Closed on: {new Date(periodStatus.closed_at).toLocaleDateString()}
          </Text>
          <Text style={styles.statusText}>
            Closed by: {periodStatus.closed_by_name || 'System'}
          </Text>
          
          <TouchableOpacity
            style={styles.reopenButton}
            onPress={handleReopenPeriod}
            disabled={loading}
          >
            <Text style={styles.reopenButtonText}>Reopen Period</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* What Will Happen */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What Will Happen</Text>
        
        <View style={styles.stepCard}>
          <Text style={styles.stepNumber}>1</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Close Subsidiary Books</Text>
            <Text style={styles.stepDescription}>
              All 9 subsidiary books will be closed and totaled
            </Text>
          </View>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepNumber}>2</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Post to Ledger</Text>
            <Text style={styles.stepDescription}>
              All entries posted to respective ledger accounts
            </Text>
          </View>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepNumber}>3</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Prepare Trial Balance</Text>
            <Text style={styles.stepDescription}>
              Trial balance prepared and verified (Dr = Cr)
            </Text>
          </View>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepNumber}>4</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Prepare Trading Account</Text>
            <Text style={styles.stepDescription}>
              Calculate gross profit/loss from trading activities
            </Text>
          </View>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepNumber}>5</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Prepare Profit & Loss</Text>
            <Text style={styles.stepDescription}>
              Calculate net profit/loss for the period
            </Text>
          </View>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepNumber}>6</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Prepare Balance Sheet</Text>
            <Text style={styles.stepDescription}>
              Show financial position (Assets = Liabilities)
            </Text>
          </View>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepNumber}>7</Text>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Generate PDFs</Text>
            <Text style={styles.stepDescription}>
              All reports saved to phone storage
            </Text>
          </View>
        </View>
      </View>

      {/* Close Button */}
      {!periodStatus && (
        <TouchableOpacity
          style={[styles.closeButton, loading && styles.closeButtonDisabled]}
          onPress={handleClosePeriod}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.closeButtonText}>
              ✨ Close Period (One-Click)
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ Important Notes</Text>
        <Text style={styles.infoText}>
          • Period closing is reversible (can reopen)
        </Text>
        <Text style={styles.infoText}>
          • All PDFs saved to /MindStack/period_closing/
        </Text>
        <Text style={styles.infoText}>
          • Financial year: April 1 - March 31 (India)
        </Text>
        <Text style={styles.infoText}>
          • Process takes 1-2 minutes
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#FF9800',
    padding: 20,
    paddingTop: 40
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white'
  },
  subtitle: {
    fontSize: 14,
    color: 'white',
    marginTop: 5,
    opacity: 0.9
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginTop: 10
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 10
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 10
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center'
  },
  typeButtonActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800'
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666'
  },
  typeButtonTextActive: {
    color: 'white',
    fontWeight: 'bold'
  },
  row: {
    flexDirection: 'row',
    gap: 10
  },
  col: {
    flex: 1
  },
  statusSection: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 10
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  reopenButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15
  },
  reopenButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center'
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF9800',
    color: 'white',
    textAlign: 'center',
    lineHeight: 30,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12
  },
  stepContent: {
    flex: 1
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3
  },
  stepDescription: {
    fontSize: 12,
    color: '#666'
  },
  closeButton: {
    backgroundColor: '#FF9800',
    padding: 18,
    margin: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3
  },
  closeButtonDisabled: {
    backgroundColor: '#ccc'
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    marginBottom: 30
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    marginBottom: 5
  }
});

export default PeriodClosingScreen;
