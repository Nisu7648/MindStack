/**
 * SCREEN 4: FULL INVOICE SCREEN
 * For GST invoices and B2B transactions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const FullInvoiceScreen = ({ navigation }) => {
  const [customer, setCustomer] = useState({
    name: '',
    mobile: '',
    gstin: '',
    state: ''
  });

  const [items, setItems] = useState([
    { id: '1', name: 'Product 1', qty: 1, rate: 1000, taxRate: 18 }
  ]);

  const [paymentMode, setPaymentMode] = useState('CASH');

  const calculateTax = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const isIGST = customer.state && customer.state !== 'Maharashtra'; // Example
    
    let cgst = 0, sgst = 0, igst = 0;
    
    items.forEach(item => {
      const itemTotal = item.qty * item.rate;
      const tax = (itemTotal * item.taxRate) / 100;
      
      if (isIGST) {
        igst += tax;
      } else {
        cgst += tax / 2;
        sgst += tax / 2;
      }
    });

    return { subtotal, cgst, sgst, igst, total: subtotal + cgst + sgst + igst };
  };

  const tax = calculateTax();

  const generateInvoice = () => {
    if (!customer.name || !customer.mobile) {
      Alert.alert('Error', 'Please enter customer details');
      return;
    }

    Alert.alert(
      'Invoice Generated',
      `Total: ₹${tax.total.toLocaleString('en-IN')}`,
      [
        { text: 'Print', onPress: () => {} },
        { text: 'Share', onPress: () => {} },
        { text: 'Done', onPress: () => navigation.goBack() }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GST Invoice</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Customer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Customer Name *"
            value={customer.name}
            onChangeText={(text) => setCustomer({ ...customer, name: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Mobile Number *"
            keyboardType="phone-pad"
            value={customer.mobile}
            onChangeText={(text) => setCustomer({ ...customer, mobile: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="GSTIN (Optional)"
            value={customer.gstin}
            onChangeText={(text) => setCustomer({ ...customer, gstin: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="State"
            value={customer.state}
            onChangeText={(text) => setCustomer({ ...customer, state: text })}
          />
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          
          {items.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <TextInput
                style={styles.itemInput}
                placeholder="Item Name"
                value={item.name}
              />
              <View style={styles.itemRow}>
                <TextInput
                  style={[styles.itemInput, { flex: 1 }]}
                  placeholder="Qty"
                  keyboardType="numeric"
                  value={item.qty.toString()}
                />
                <TextInput
                  style={[styles.itemInput, { flex: 1, marginLeft: 8 }]}
                  placeholder="Rate"
                  keyboardType="numeric"
                  value={item.rate.toString()}
                />
                <TextInput
                  style={[styles.itemInput, { flex: 1, marginLeft: 8 }]}
                  placeholder="Tax %"
                  keyboardType="numeric"
                  value={item.taxRate.toString()}
                />
              </View>
              <Text style={styles.itemTotal}>
                Total: ₹{(item.qty * item.rate).toLocaleString('en-IN')}
              </Text>
            </View>
          ))}

          <TouchableOpacity style={styles.addItemButton}>
            <Icon name="plus" size={20} color="#2196F3" />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Tax Breakup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Breakup</Text>
          
          <View style={styles.taxTable}>
            <View style={styles.taxRow}>
              <Text style={styles.taxLabel}>Taxable Amount</Text>
              <Text style={styles.taxValue}>₹{tax.subtotal.toLocaleString('en-IN')}</Text>
            </View>
            
            {tax.cgst > 0 && (
              <>
                <View style={styles.taxRow}>
                  <Text style={styles.taxLabel}>CGST</Text>
                  <Text style={styles.taxValue}>₹{tax.cgst.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.taxRow}>
                  <Text style={styles.taxLabel}>SGST</Text>
                  <Text style={styles.taxValue}>₹{tax.sgst.toLocaleString('en-IN')}</Text>
                </View>
              </>
            )}
            
            {tax.igst > 0 && (
              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>IGST</Text>
                <Text style={styles.taxValue}>₹{tax.igst.toLocaleString('en-IN')}</Text>
              </View>
            )}
            
            <View style={[styles.taxRow, styles.totalTaxRow]}>
              <Text style={styles.totalTaxLabel}>Total GST</Text>
              <Text style={styles.totalTaxValue}>
                ₹{(tax.cgst + tax.sgst + tax.igst).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Mode</Text>
          
          <View style={styles.paymentModes}>
            {['CASH', 'BANK', 'UPI', 'CREDIT'].map(mode => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.paymentModeButton,
                  paymentMode === mode && styles.paymentModeActive
                ]}
                onPress={() => setPaymentMode(mode)}
              >
                <Text style={[
                  styles.paymentModeText,
                  paymentMode === mode && styles.paymentModeTextActive
                ]}>
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Grand Total</Text>
          <Text style={styles.totalAmount}>₹{tax.total.toLocaleString('en-IN')}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateInvoice}
        >
          <Text style={styles.generateButtonText}>GENERATE INVOICE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000'
  },
  content: {
    flex: 1
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#FAFAFA'
  },
  itemCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12
  },
  itemInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF'
  },
  itemRow: {
    flexDirection: 'row'
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    textAlign: 'right',
    marginTop: 8
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    borderStyle: 'dashed'
  },
  addItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 8
  },
  taxTable: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  taxLabel: {
    fontSize: 16,
    color: '#666666'
  },
  taxValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000'
  },
  totalTaxRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
    paddingTop: 12
  },
  totalTaxLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000'
  },
  totalTaxValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2196F3'
  },
  paymentModes: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  paymentModeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginRight: 12,
    marginBottom: 12
  },
  paymentModeActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3'
  },
  paymentModeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666'
  },
  paymentModeTextActive: {
    color: '#FFFFFF'
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF'
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666'
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2196F3'
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});

export default FullInvoiceScreen;
