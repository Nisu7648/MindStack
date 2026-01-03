/**
 * EXAMPLE: HOW TO USE SCREEN CONNECTOR
 * 
 * This shows how ANY screen can use one-click services
 * Just import ScreenConnector and call functions
 * 
 * NO manual service integration needed
 * NO complex logic needed
 * Just ONE function call
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import ScreenConnector from '../services/integration/ScreenConnector';

const ExampleInvoiceScreen = ({ businessId, userId }) => {
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * ONE-CLICK INVOICE CREATION
   * User clicks button → Everything happens automatically
   */
  const handleCreateInvoice = async () => {
    setLoading(true);

    // Just call ScreenConnector - that's it!
    const result = await ScreenConnector.createInvoice({
      customerId: null, // Will auto-create customer
      customerName: customerName,
      items: [
        { name: 'Product', quantity: 1, rate: parseFloat(amount) }
      ],
      totalAmount: parseFloat(amount),
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString()
    }, businessId);

    setLoading(false);

    // Result contains:
    // - invoice object
    // - PDF file path
    // - tax savings amount
    // - success message

    if (result.success) {
      console.log('Invoice created:', result.invoice);
      console.log('PDF saved at:', result.pdf);
      console.log('Tax savings:', result.taxSavings);
    }
  };

  /**
   * ONE-CLICK AI TRANSACTION
   * User types natural language → Everything happens automatically
   */
  const [aiInput, setAiInput] = useState('');

  const handleAITransaction = async () => {
    setLoading(true);

    // Just call ScreenConnector with natural language - that's it!
    const result = await ScreenConnector.createAITransaction(
      aiInput,
      businessId,
      userId
    );

    setLoading(false);

    if (result.success) {
      console.log('AI transaction created:', result);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Example: One-Click Invoice</Text>

      {/* Manual Invoice */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manual Invoice</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Customer Name"
          value={customerName}
          onChangeText={setCustomerName}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleCreateInvoice}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : '✨ Create Invoice (One-Click)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Transaction */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Transaction</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Type in any language: Sold 5 laptops to John for 50000"
          value={aiInput}
          onChangeText={setAiInput}
          multiline
        />
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleAITransaction}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Processing...' : '🤖 Create with AI (One-Click)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Other One-Click Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Other One-Click Actions</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => ScreenConnector.closePeriod('monthly', businessId)}
        >
          <Text style={styles.buttonText}>📊 Close Month (One-Click)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => ScreenConnector.processPayroll(1, 2024, businessId)}
        >
          <Text style={styles.buttonText}>💼 Process Payroll (One-Click)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => ScreenConnector.reconcileBank('connection_id')}
        >
          <Text style={styles.buttonText}>🏦 Reconcile Bank (One-Click)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => ScreenConnector.checkBusinessHealth(businessId)}
        >
          <Text style={styles.buttonText}>🏥 Check Health (One-Click)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          ✨ That's it! Just call ScreenConnector functions.
        </Text>
        <Text style={styles.infoText}>
          ✅ Everything happens automatically:
        </Text>
        <Text style={styles.infoText}>
          • Invoice created
        </Text>
        <Text style={styles.infoText}>
          • Accounting entries created (5+)
        </Text>
        <Text style={styles.infoText}>
          • Inventory updated
        </Text>
        <Text style={styles.infoText}>
          • Customer balance updated
        </Text>
        <Text style={styles.infoText}>
          • Tax calculated
        </Text>
        <Text style={styles.infoText}>
          • PDF generated
        </Text>
        <Text style={styles.infoText}>
          • Saved to phone storage
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333'
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2196F3'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  info: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginTop: 20
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 5
  }
});

export default ExampleInvoiceScreen;
