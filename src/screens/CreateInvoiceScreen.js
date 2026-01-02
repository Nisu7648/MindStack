// src/screens/CreateInvoiceScreen.js
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

const CreateInvoiceScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [invoiceType, setInvoiceType] = useState('SALES');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [formData, setFormData] = useState({
    partyId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    items: [],
    paymentMode: 'CASH',
    notes: ''
  });

  const [currentItem, setCurrentItem] = useState({
    productId: '',
    quantity: '',
    rate: '',
    discount: '0'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // TODO: Load customers and products from database
    setCustomers([
      { id: 1, name: 'Customer A' },
      { id: 2, name: 'Customer B' }
    ]);
    setProducts([
      { id: 1, name: 'Product 1', price: 100 },
      { id: 2, name: 'Product 2', price: 200 }
    ]);
  };

  const addItem = () => {
    if (!currentItem.productId || !currentItem.quantity || !currentItem.rate) {
      Alert.alert('Error', 'Please fill all item fields');
      return;
    }

    setFormData({
      ...formData,
      items: [...formData.items, { ...currentItem }]
    });

    setCurrentItem({
      productId: '',
      quantity: '',
      rate: '',
      discount: '0'
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const amount = (parseFloat(item.quantity) * parseFloat(item.rate)) - parseFloat(item.discount || 0);
      return sum + amount;
    }, 0);
  };

  const handleSubmit = async () => {
    if (!formData.partyId) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    if (formData.items.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    setLoading(true);
    try {
      // TODO: Call InvoiceService.createSalesInvoice or createPurchaseInvoice
      Alert.alert('Success', 'Invoice created successfully!', [
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
        <Text style={styles.title}>Create {invoiceType} Invoice</Text>
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

      {/* Customer/Vendor Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>{invoiceType === 'SALES' ? 'Customer' : 'Vendor'}</Text>
        <Picker
          selectedValue={formData.partyId}
          onValueChange={(value) => setFormData({ ...formData, partyId: value })}
          style={styles.picker}
        >
          <Picker.Item label="Select..." value="" />
          {customers.map(customer => (
            <Picker.Item key={customer.id} label={customer.name} value={customer.id} />
          ))}
        </Picker>
      </View>

      {/* Invoice Date */}
      <View style={styles.section}>
        <Text style={styles.label}>Invoice Date</Text>
        <TextInput
          style={styles.input}
          value={formData.invoiceDate}
          onChangeText={(text) => setFormData({ ...formData, invoiceDate: text })}
          placeholder="YYYY-MM-DD"
        />
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
              rate: product ? product.price.toString() : ''
            });
          }}
          style={styles.picker}
        >
          <Picker.Item label="Select Product..." value="" />
          {products.map(product => (
            <Picker.Item key={product.id} label={product.name} value={product.id} />
          ))}
        </Picker>

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
              <View style={styles.itemDetails}>
                <Text style={styles.itemText}>Product ID: {item.productId}</Text>
                <Text style={styles.itemText}>Qty: {item.quantity} × ₹{item.rate}</Text>
                <Text style={styles.itemAmount}>
                  ₹{((parseFloat(item.quantity) * parseFloat(item.rate)) - parseFloat(item.discount || 0)).toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeItem(index)}>
                <Text style={styles.removeButton}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Total */}
      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Total Amount:</Text>
        <Text style={styles.totalAmount}>₹{calculateTotal().toFixed(2)}</Text>
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
          <Text style={styles.submitButtonText}>Create Invoice</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 15
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
    fontSize: 16,
    color: '#666'
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  row: {
    flexDirection: 'row',
    gap: 10
  },
  col: {
    flex: 1
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 10
  },
  itemDetails: {
    flex: 1
  },
  itemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  removeButton: {
    fontSize: 24,
    color: '#f44336',
    paddingHorizontal: 10
  },
  totalSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666'
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50'
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

export default CreateInvoiceScreen;
