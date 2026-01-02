// src/screens/RecordPaymentScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

const RecordPaymentScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [transactionType, setTransactionType] = useState('PAYMENT');
  
  const [formData, setFormData] = useState({
    amount: '',
    paymentMode: 'CASH',
    partyId: '',
    narration: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      // TODO: Call PaymentService.recordPayment or recordReceipt
      Alert.alert('Success', `${transactionType} recorded successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Record {transactionType}</Text>
      </View>

      {/* Transaction Type */}
      <View style={styles.section}>
        <Text style={styles.label}>Transaction Type</Text>
        <View style={styles.typeButtons}>
          <TouchableOpacity
            style={[styles.typeButton, transactionType === 'PAYMENT' && styles.typeButtonActive]}
            onPress={() => setTransactionType('PAYMENT')}
          >
            <Text style={[styles.typeButtonText, transactionType === 'PAYMENT' && styles.typeButtonTextActive]}>
              Payment (Out)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, transactionType === 'RECEIPT' && styles.typeButtonActive]}
            onPress={() => setTransactionType('RECEIPT')}
          >
            <Text style={[styles.typeButtonText, transactionType === 'RECEIPT' && styles.typeButtonTextActive]}>
              Receipt (In)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Amount */}
      <View style={styles.section}>
        <Text style={styles.label}>Amount *</Text>
        <TextInput
          style={styles.input}
          value={formData.amount}
          onChangeText={(text) => setFormData({ ...formData, amount: text })}
          keyboardType="numeric"
          placeholder="0.00"
        />
      </View>

      {/* Payment Mode */}
      <View style={styles.section}>
        <Text style={styles.label}>Payment Mode</Text>
        <Picker
          selectedValue={formData.paymentMode}
          onValueChange={(value) => setFormData({ ...formData, paymentMode: value })}
          style={styles.picker}
        >
          <Picker.Item label="Cash" value="CASH" />
          <Picker.Item label="Bank Transfer" value="BANK" />
          <Picker.Item label="UPI" value="UPI" />
          <Picker.Item label="Card" value="CARD" />
          <Picker.Item label="Cheque" value="CHEQUE" />
        </Picker>
      </View>

      {/* Date */}
      <View style={styles.section}>
        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          value={formData.date}
          onChangeText={(text) => setFormData({ ...formData, date: text })}
          placeholder="YYYY-MM-DD"
        />
      </View>

      {/* Narration */}
      <View style={styles.section}>
        <Text style={styles.label}>Narration</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.narration}
          onChangeText={(text) => setFormData({ ...formData, narration: text })}
          placeholder="Enter description..."
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Record {transactionType}</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    marginTop: 10
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  picker: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    borderColor: '#E0E0E0',
    alignItems: 'center'
  },
  typeButtonActive: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A'
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666'
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  submitButton: {
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 15
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  }
});

export default RecordPaymentScreen;
