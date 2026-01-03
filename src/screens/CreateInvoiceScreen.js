/**
 * CREATE INVOICE SCREEN - CONNECTED TO SERVICES
 * 
 * User clicks "Create Invoice" → Everything happens automatically
 * - Invoice created
 * - 5+ accounting entries
 * - Inventory updated
 * - Customer balance updated
 * - Tax calculated
 * - PDF generated
 * 
 * Background logic handles everything
 */

import React, { useState, useEffect } from 'react';
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
import ScreenConnector from '../services/integration/ScreenConnector';
import { supabase } from '../services/supabase';

const CreateInvoiceScreen = ({ navigation, route }) => {
  const { businessId, userId } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [invoiceType, setInvoiceType] = useState('SALES');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [formData, setFormData] = useState({
    partyId: '',
    partyName: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    items: [],
    paymentMode: 'CASH',
    notes: '',
    discount: 0
  });

  const [currentItem, setCurrentItem] = useState({
    productId: '',
    productName: '',
    quantity: '',
    rate: '',
    discount: '0',
    taxRate: 18
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId);
      
      setCustomers(customersData || []);

      // Load products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId);
      
      setProducts(productsData || []);
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const addItem = () => {
    if (!currentItem.productId || !currentItem.quantity || !currentItem.rate) {
      Alert.alert('Error', 'Please fill all item fields');
      return;
    }

    const product = products.find(p => p.id === currentItem.productId);
    
    setFormData({
      ...formData,
      items: [...formData.items, {
        productId: currentItem.productId,
        productName: product?.name || currentItem.productName,
        quantity: parseFloat(currentItem.quantity),
        rate: parseFloat(currentItem.rate),
        discount: parseFloat(currentItem.discount || 0),
        taxRate: parseFloat(currentItem.taxRate || 18)
      }]
    });

    setCurrentItem({
      productId: '',
      productName: '',
      quantity: '',
      rate: '',
      discount: '0',
      taxRate: 18
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateItemTotal = (item) => {
    const subtotal = item.quantity * item.rate;
    const discountAmount = item.discount || 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * item.taxRate) / 100;
    return taxableAmount + taxAmount;
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  /**
   * ONE-CLICK INVOICE CREATION
   * Background logic handles everything automatically
   */
  const handleSubmit = async () => {
    if (!formData.partyId && !formData.partyName) {
      Alert.alert('Error', 'Please select or enter customer name');
      return;
    }

    if (formData.items.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    setLoading(true);
    
    try {
      // ONE-CLICK: Everything happens automatically
      const result = await ScreenConnector.createInvoice({
        customerId: formData.partyId || null,
        customerName: formData.partyName || customers.find(c => c.id === formData.partyId)?.name,
        items: formData.items,
        totalAmount: calculateTotal(),
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        paymentMode: formData.paymentMode,
        notes: formData.notes,
        discount: formData.discount
      }, businessId);

      if (result.success) {
        // Show success with details
        Alert.alert(
          '✅ Invoice Created!',
          `Invoice: ${result.invoice?.invoice_number || 'Created'}\n` +
          `Amount: ₹${calculateTotal().toFixed(2)}\n` +
          `PDF: Saved to phone\n` +
          (result.taxSavings ? `💰 Tax Savings: ₹${result.taxSavings}` : ''),
          [
            { text: 'View PDF', onPress: () => {/* Open PDF */} },
            { text: 'Send', onPress: () => {/* Send invoice */} },
            { text: 'Done', onPress: () => navigation.goBack() }
          ]
        );
      }
    } catch (error) {
      console.error('Create invoice error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Invoice</Text>
        <Text style={styles.subtitle}>One-click creation with automatic accounting</Text>
      </View>

      {/* Invoice Type */}
      <View style={styles.section}>
        <Text style={styles.label}>Invoice Type</Text>
        <View style={styles.typeButtons}>
          <TouchableOpacity
            style={[styles.typeButton, invoiceType === 'SALES' && styles.typeButtonActive]}
            onPress={() => setInvoiceType('SALES')}
          >
            <Text style={[styles.typeButtonText, invoiceType === 'SALES' && styles.typeButtonTextActive]}>
              Sales
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, invoiceType === 'PURCHASE' && styles.typeButtonActive]}
            onPress={() => setInvoiceType('PURCHASE')}
          >
            <Text style={[styles.typeButtonText, invoiceType === 'PURCHASE' && styles.typeButtonTextActive]}>
              Purchase
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Customer Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Customer</Text>
        <Picker
          selectedValue={formData.partyId}
          onValueChange={(value) => setFormData({ ...formData, partyId: value })}
          style={styles.picker}
        >
          <Picker.Item label="Select Customer..." value="" />
          {customers.map(customer => (
            <Picker.Item key={customer.id} label={customer.name} value={customer.id} />
          ))}
        </Picker>
        
        <Text style={styles.orText}>OR</Text>
        
        <TextInput
          style={styles.input}
          value={formData.partyName}
          onChangeText={(text) => setFormData({ ...formData, partyName: text, partyId: '' })}
          placeholder="Enter new customer name"
        />
      </View>

      {/* Dates */}
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Invoice Date</Text>
          <TextInput
            style={styles.input}
            value={formData.invoiceDate}
            onChangeText={(text) => setFormData({ ...formData, invoiceDate: text })}
            placeholder="YYYY-MM-DD"
          />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Due Date</Text>
          <TextInput
            style={styles.input}
            value={formData.dueDate}
            onChangeText={(text) => setFormData({ ...formData, dueDate: text })}
            placeholder="YYYY-MM-DD"
          />
        </View>
      </View>

      {/* Add Item Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Items</Text>
        
        <Text style={styles.label}>Product</Text>
        <Picker
          selectedValue={currentItem.productId}
          onValueChange={(value) => {
            const product = products.find(p => p.id === value);
            setCurrentItem({
              ...currentItem,
              productId: value,
              productName: product?.name || '',
              rate: product?.price?.toString() || ''
            });
          }}
          style={styles.picker}
        >
          <Picker.Item label="Select Product..." value="" />
          {products.map(product => (
            <Picker.Item key={product.id} label={product.name} value={product.id} />
          ))}
        </Picker>

        <Text style={styles.orText}>OR</Text>
        
        <TextInput
          style={styles.input}
          value={currentItem.productName}
          onChangeText={(text) => setCurrentItem({ ...currentItem, productName: text, productId: '' })}
          placeholder="Enter product name"
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={currentItem.quantity}
              onChangeText={(text) => setCurrentItem({ ...currentItem, quantity: text })}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Rate</Text>
            <TextInput
              style={styles.input}
              value={currentItem.rate}
              onChangeText={(text) => setCurrentItem({ ...currentItem, rate: text })}
              keyboardType="numeric"
              placeholder="0.00"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Discount</Text>
            <TextInput
              style={styles.input}
              value={currentItem.discount}
              onChangeText={(text) => setCurrentItem({ ...currentItem, discount: text })}
              keyboardType="numeric"
              placeholder="0.00"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Tax Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={currentItem.taxRate?.toString()}
              onChangeText={(text) => setCurrentItem({ ...currentItem, taxRate: parseFloat(text) || 0 })}
              keyboardType="numeric"
              placeholder="18"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={addItem}>
          <Text style={styles.addButtonText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      {formData.items.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({formData.items.length})</Text>
          {formData.items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <TouchableOpacity onPress={() => removeItem(index)}>
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.itemDetails}>
                Qty: {item.quantity} × ₹{item.rate} | Discount: ₹{item.discount} | Tax: {item.taxRate}%
              </Text>
              <Text style={styles.itemTotal}>Total: ₹{calculateItemTotal(item).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Payment & Notes */}
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
          <Picker.Item label="Credit" value="CREDIT" />
        </Picker>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Additional notes..."
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Total */}
      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalAmount}>₹{calculateTotal().toFixed(2)}</Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitButtonText}>
            ✨ Create Invoice (One-Click)
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ✅ Invoice will be created automatically
        </Text>
        <Text style={styles.infoText}>
          ✅ Accounting entries will be posted
        </Text>
        <Text style={styles.infoText}>
          ✅ Inventory will be updated
        </Text>
        <Text style={styles.infoText}>
          ✅ Customer balance will be updated
        </Text>
        <Text style={styles.infoText}>
          ✅ Tax will be calculated
        </Text>
        <Text style={styles.infoText}>
          ✅ PDF will be generated
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
    backgroundColor: '#4CAF50',
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white'
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
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
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50'
  },
  typeButtonText: {
    fontSize: 16,
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
  orText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 10,
    fontSize: 12
  },
  addButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  itemCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  removeButton: {
    fontSize: 20,
    color: '#F44336',
    fontWeight: 'bold'
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  totalSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 10,
    alignItems: 'center'
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    margin: 15,
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
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    marginBottom: 30
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    marginBottom: 5
  }
});

export default CreateInvoiceScreen;
