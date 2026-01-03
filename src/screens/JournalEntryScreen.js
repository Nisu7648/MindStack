/**
 * JOURNAL ENTRY SCREEN - COMPLETE & WORKING
 * 
 * Features:
 * - Create manual journal entries
 * - Multiple debit/credit lines
 * - Auto-balancing validation (Dr = Cr)
 * - Account selection from chart of accounts
 * - Narration/description
 * - Date selection
 * - Automatic posting to ledger
 * - Connected to ScreenConnector
 * - PDF generation
 * - Phone storage
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import ScreenConnector from '../../services/integration/ScreenConnector';
import { supabase } from '../../services/supabase';

const JournalEntryScreen = ({ navigation, route }) => {
  const { businessId } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([
    { id: 1, accountId: '', accountName: '', debit: '', credit: '', type: 'debit' },
    { id: 2, accountId: '', accountName: '', debit: '', credit: '', type: 'credit' }
  ]);
  const [narration, setNarration] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [voucherNumber, setVoucherNumber] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load chart of accounts
      const { data: accountsData } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('business_id', businessId)
        .order('account_code');
      
      setAccounts(accountsData || []);

      // Generate voucher number
      const { data: lastVoucher } = await supabase
        .from('journal_entries')
        .select('voucher_number')
        .eq('business_id', businessId)
        .order('voucher_number', { ascending: false })
        .limit(1)
        .single();
      
      const lastNumber = lastVoucher ? parseInt(lastVoucher.voucher_number.replace('JV', '')) : 0;
      setVoucherNumber(`JV${String(lastNumber + 1).padStart(6, '0')}`);
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const addEntry = (type) => {
    const newEntry = {
      id: Date.now(),
      accountId: '',
      accountName: '',
      debit: '',
      credit: '',
      type
    };
    setEntries([...entries, newEntry]);
  };

  const removeEntry = (id) => {
    if (entries.length <= 2) {
      Alert.alert('Error', 'Minimum 2 entries required (1 debit + 1 credit)');
      return;
    }
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id, field, value) => {
    setEntries(entries.map(entry => {
      if (entry.id === id) {
        const updated = { ...entry, [field]: value };
        
        // Update account name when account is selected
        if (field === 'accountId') {
          const account = accounts.find(a => a.id === value);
          updated.accountName = account ? account.account_name : '';
        }
        
        // Clear opposite field when entering amount
        if (field === 'debit' && value) {
          updated.credit = '';
          updated.type = 'debit';
        } else if (field === 'credit' && value) {
          updated.debit = '';
          updated.type = 'credit';
        }
        
        return updated;
      }
      return entry;
    }));
  };

  const calculateTotals = () => {
    let totalDebit = 0;
    let totalCredit = 0;
    
    entries.forEach(entry => {
      if (entry.debit) totalDebit += parseFloat(entry.debit) || 0;
      if (entry.credit) totalCredit += parseFloat(entry.credit) || 0;
    });
    
    return { totalDebit, totalCredit };
  };

  const validateEntry = () => {
    // Check if all entries have accounts
    for (const entry of entries) {
      if (!entry.accountId) {
        Alert.alert('Error', 'Please select account for all entries');
        return false;
      }
      if (!entry.debit && !entry.credit) {
        Alert.alert('Error', 'Please enter amount for all entries');
        return false;
      }
    }

    // Check if narration is provided
    if (!narration.trim()) {
      Alert.alert('Error', 'Please enter narration');
      return false;
    }

    // Check if debits equal credits
    const { totalDebit, totalCredit } = calculateTotals();
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      Alert.alert(
        'Error',
        `Entry not balanced!\nTotal Debit: ₹${totalDebit.toFixed(2)}\nTotal Credit: ₹${totalCredit.toFixed(2)}\nDifference: ₹${Math.abs(totalDebit - totalCredit).toFixed(2)}`
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateEntry()) return;

    setLoading(true);
    
    try {
      // Prepare journal entry data
      const journalData = {
        voucherNumber,
        date: date.toISOString(),
        narration,
        entries: entries.map(entry => ({
          accountId: entry.accountId,
          accountName: entry.accountName,
          debit: parseFloat(entry.debit) || 0,
          credit: parseFloat(entry.credit) || 0
        })),
        businessId
      };

      // Create journal entry through ScreenConnector
      const result = await ScreenConnector.createJournalEntry(journalData, businessId);

      if (result.success) {
        Alert.alert(
          '✅ Success',
          `Journal entry ${voucherNumber} created successfully!\n\n` +
          `✅ Posted to ledger\n` +
          `✅ PDF generated\n` +
          `✅ Saved to phone storage`,
          [
            { text: 'Create Another', onPress: () => resetForm() },
            { text: 'Done', onPress: () => navigation.goBack() }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create journal entry');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEntries([
      { id: Date.now(), accountId: '', accountName: '', debit: '', credit: '', type: 'debit' },
      { id: Date.now() + 1, accountId: '', accountName: '', debit: '', credit: '', type: 'credit' }
    ]);
    setNarration('');
    setDate(new Date());
    loadData(); // Reload to get new voucher number
  };

  const { totalDebit, totalCredit } = calculateTotals();
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Journal Entry</Text>
          <Text style={styles.voucherNumber}>{voucherNumber}</Text>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {date.toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
            </Text>
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}
        </View>

        {/* Journal Entries */}
        <View style={styles.section}>
          <View style={styles.entriesHeader}>
            <Text style={styles.sectionTitle}>Journal Entries</Text>
            <View style={styles.balanceIndicator}>
              <Text style={[styles.balanceText, isBalanced && styles.balanceTextGreen]}>
                {isBalanced ? '✓ Balanced' : '⚠ Not Balanced'}
              </Text>
            </View>
          </View>

          {entries.map((entry, index) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryNumber}>Entry {index + 1}</Text>
                {entries.length > 2 && (
                  <TouchableOpacity
                    onPress={() => removeEntry(entry.id)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Account Selection */}
              <Text style={styles.label}>Account</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={entry.accountId}
                  onValueChange={(value) => updateEntry(entry.id, 'accountId', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Account" value="" />
                  {accounts.map(account => (
                    <Picker.Item
                      key={account.id}
                      label={`${account.account_code} - ${account.account_name}`}
                      value={account.id}
                    />
                  ))}
                </Picker>
              </View>

              {/* Debit/Credit Inputs */}
              <View style={styles.amountRow}>
                <View style={styles.amountCol}>
                  <Text style={styles.label}>Debit (Dr)</Text>
                  <TextInput
                    style={[styles.input, entry.debit && styles.inputActive]}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={entry.debit}
                    onChangeText={(value) => updateEntry(entry.id, 'debit', value)}
                  />
                </View>
                <View style={styles.amountCol}>
                  <Text style={styles.label}>Credit (Cr)</Text>
                  <TextInput
                    style={[styles.input, entry.credit && styles.inputActive]}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={entry.credit}
                    onChangeText={(value) => updateEntry(entry.id, 'credit', value)}
                  />
                </View>
              </View>
            </View>
          ))}

          {/* Add Entry Buttons */}
          <View style={styles.addButtonsRow}>
            <TouchableOpacity
              style={[styles.addButton, styles.addDebitButton]}
              onPress={() => addEntry('debit')}
            >
              <Text style={styles.addButtonText}>+ Add Debit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, styles.addCreditButton]}
              onPress={() => addEntry('credit')}
            >
              <Text style={styles.addButtonText}>+ Add Credit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Debit:</Text>
            <Text style={[styles.totalValue, styles.debitValue]}>
              ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Credit:</Text>
            <Text style={[styles.totalValue, styles.creditValue]}>
              ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.differenceRow]}>
            <Text style={styles.totalLabel}>Difference:</Text>
            <Text style={[
              styles.totalValue,
              isBalanced ? styles.balancedValue : styles.unbalancedValue
            ]}>
              ₹{Math.abs(totalDebit - totalCredit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Narration */}
        <View style={styles.section}>
          <Text style={styles.label}>Narration *</Text>
          <TextInput
            style={styles.narrationInput}
            placeholder="Enter narration/description for this journal entry"
            multiline
            numberOfLines={4}
            value={narration}
            onChangeText={setNarration}
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Journal Entry Rules</Text>
          <Text style={styles.infoText}>• Total Debit must equal Total Credit</Text>
          <Text style={styles.infoText}>• Minimum 2 entries required</Text>
          <Text style={styles.infoText}>• Narration is mandatory</Text>
          <Text style={styles.infoText}>• Entry will be posted to ledger automatically</Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isBalanced || loading) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!isBalanced || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>
              Create Journal Entry
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollView: {
    flex: 1
  },
  header: {
    backgroundColor: '#673AB7',
    padding: 20,
    paddingTop: 40
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white'
  },
  voucherNumber: {
    fontSize: 16,
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
    color: '#333'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 10
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9'
  },
  dateText: {
    fontSize: 16,
    color: '#333'
  },
  entriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  balanceIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f5f5f5'
  },
  balanceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800'
  },
  balanceTextGreen: {
    color: '#4CAF50'
  },
  entryCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  entryNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#673AB7'
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center'
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white'
  },
  picker: {
    height: 50
  },
  amountRow: {
    flexDirection: 'row',
    gap: 10
  },
  amountCol: {
    flex: 1
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white'
  },
  inputActive: {
    borderColor: '#673AB7',
    borderWidth: 2
  },
  addButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10
  },
  addButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  addDebitButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3'
  },
  addCreditButton: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800'
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  totalsCard: {
    backgroundColor: 'white',
    padding: 15,
    marginTop: 10
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  differenceRow: {
    borderBottomWidth: 0,
    marginTop: 5,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#333'
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  debitValue: {
    color: '#2196F3'
  },
  creditValue: {
    color: '#FF9800'
  },
  balancedValue: {
    color: '#4CAF50'
  },
  unbalancedValue: {
    color: '#F44336'
  },
  narrationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    textAlignVertical: 'top',
    minHeight: 100
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    marginBottom: 100
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
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  submitButton: {
    backgroundColor: '#673AB7',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc'
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  }
});

export default JournalEntryScreen;
