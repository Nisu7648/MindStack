/**
 * INVOICE CREATION SCREEN
 * 
 * One screen, minimum steps.
 * Invoice = Accounting done.
 * 
 * User provides:
 * - Customer
 * - Items/Amount
 * - Invoice type
 * 
 * Everything else is automatic.
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
  Modal,
  FlatList
} from 'react-native';
import { supabase } from '../../services/supabase';
import InvoiceEngine, { INVOICE_TYPES, PAYMENT_METHODS } from '../../services/invoice/InvoiceEngine';

const InvoiceCreationScreen = ({ navigation, businessId }) => {
  // Required inputs
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceType, setInvoiceType] = useState(INVOICE_TYPES.TAX_INVOICE);
  const [items, setItems] = useState([]);

  // Optional inputs (with smart defaults)
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CASH);
  const [paidAmount, setPaidAmount] = useState(0);

  // UI State
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  /**
   * LOAD CUSTOMERS
   */
  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .order('name');

    setCustomers(data || []);
  };

  /**
   * LOAD PRODUCTS
   */
  const loadProducts = async () => {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('business_id', businessId)
      .order('name');

    setProducts(data || []);
  };

  /**
   * ADD ITEM TO INVOICE
   */
  const addItem = (product) => {
    const existingItem = items.find(item => item.productId === product.id);

    if (existingItem) {
      // Increase quantity
      setItems(items.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Add new item
      setItems([...items, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        rate: product.sale_price,
        gstRate: product.gst_rate || 18,
        discount: 0,
        category: product.category
      }]);
    }

    setShowProductModal(false);
  };

  /**
   * UPDATE ITEM QUANTITY
   */
  const updateItemQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }

    const newItems = [...items];
    newItems[index].quantity = quantity;
    setItems(newItems);
  };

  /**
   * UPDATE ITEM RATE
   */
  const updateItemRate = (index, rate) => {
    const newItems = [...items];
    newItems[index].rate = parseFloat(rate) || 0;
    setItems(newItems);
  };

  /**
   * REMOVE ITEM
   */
  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  /**
   * CALCULATE TOTALS
   */
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    for (const item of items) {
      const itemTotal = item.quantity * item.rate;
      const itemDiscount = item.discount || 0;
      const itemSubtotal = itemTotal - itemDiscount;
      const itemTax = (itemSubtotal * item.gstRate) / 100;

      subtotal += itemSubtotal;
      totalTax += itemTax;
    }

    const total = subtotal + totalTax - discount;

    return {
      subtotal,
      totalTax,
      discount,
      total
    };
  };

  /**
   * CREATE INVOICE
   */
  const createInvoice = async () => {
    try {
      // Validate
      if (!selectedCustomer) {
        Alert.alert('Error', 'Please select a customer');
        return;
      }

      if (items.length === 0) {
        Alert.alert('Error', 'Please add at least one item');
        return;
      }

      setLoading(true);

      // Prepare invoice data
      const invoiceData = {
        businessId,
        customerId: selectedCustomer.id,
        invoiceType,
        items,
        discount,
        notes,
        terms,
        paymentMethod,
        paidAmount: parseFloat(paidAmount) || 0
      };

      // Optional overrides
      if (invoiceNumber) {
        invoiceData.invoiceNumber = invoiceNumber;
      }
      if (invoiceDate) {
        invoiceData.invoiceDate = new Date(invoiceDate).toISOString();
      }
      if (dueDate) {
        invoiceData.dueDate = new Date(dueDate).toISOString();
      }

      // Create invoice (this executes the entire transaction)
      const result = await InvoiceEngine.createInvoice(invoiceData);

      setLoading(false);

      // Show success
      Alert.alert(
        '✅ Invoice Created',
        `Invoice ${result.invoice.invoice_number} created successfully!\n\nAccounting, tax, inventory, and customer balance updated automatically.`,
        [
          {
            text: 'View Invoice',
            onPress: () => navigation.navigate('InvoiceDetail', { invoiceId: result.invoice.id })
          },
          {
            text: 'New Invoice',
            onPress: () => resetForm()
          }
        ]
      );

    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
    }
  };

  /**
   * RESET FORM
   */
  const resetForm = () => {
    setSelectedCustomer(null);
    setInvoiceType(INVOICE_TYPES.TAX_INVOICE);
    setItems([]);
    setInvoiceNumber('');
    setDiscount(0);
    setNotes('');
    setTerms('');
    setPaidAmount(0);
  };

  const totals = calculateTotals();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Invoice</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Invoice Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Type *</Text>
          <View style={styles.typeButtons}>
            <TouchableOpacity
              style={[styles.typeButton, invoiceType === INVOICE_TYPES.TAX_INVOICE && styles.typeButtonActive]}
              onPress={() => setInvoiceType(INVOICE_TYPES.TAX_INVOICE)}
            >
              <Text style={styles.typeButtonText}>Tax Invoice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, invoiceType === INVOICE_TYPES.BILL_OF_SUPPLY && styles.typeButtonActive]}
              onPress={() => setInvoiceType(INVOICE_TYPES.BILL_OF_SUPPLY)}
            >
              <Text style={styles.typeButtonText}>Bill of Supply</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, invoiceType === INVOICE_TYPES.PROFORMA && styles.typeButtonActive]}
              onPress={() => setInvoiceType(INVOICE_TYPES.PROFORMA)}
            >
              <Text style={styles.typeButtonText}>Proforma</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Customer Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowCustomerModal(true)}
          >
            <Text style={styles.selectButtonText}>
              {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items *</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowProductModal(true)}
            >
              <Text style={styles.addButtonText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <TouchableOpacity onPress={() => removeItem(index)}>
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.itemDetails}>
                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>Qty</Text>
                  <TextInput
                    style={styles.itemInput}
                    value={item.quantity.toString()}
                    onChangeText={(text) => updateItemQuantity(index, parseInt(text) || 0)}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>Rate</Text>
                  <TextInput
                    style={styles.itemInput}
                    value={item.rate.toString()}
                    onChangeText={(text) => updateItemRate(index, text)}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>GST</Text>
                  <Text style={styles.itemValue}>{item.gstRate}%</Text>
                </View>

                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>Total</Text>
                  <Text style={styles.itemValue}>
                    ₹{((item.quantity * item.rate) * (1 + item.gstRate / 100)).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {items.length === 0 && (
            <Text style={styles.emptyText}>No items added yet</Text>
          )}
        </View>

        {/* Discount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discount (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter discount amount"
            value={discount.toString()}
            onChangeText={(text) => setDiscount(parseFloat(text) || 0)}
            keyboardType="numeric"
          />
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment (Optional)</Text>
          
          <View style={styles.paymentMethods}>
            {Object.values(PAYMENT_METHODS).map(method => (
              <TouchableOpacity
                key={method}
                style={[styles.paymentMethod, paymentMethod === method && styles.paymentMethodActive]}
                onPress={() => setPaymentMethod(method)}
              >
                <Text style={styles.paymentMethodText}>{method.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Amount paid (leave 0 for unpaid)"
            value={paidAmount.toString()}
            onChangeText={(text) => setPaidAmount(parseFloat(text) || 0)}
            keyboardType="numeric"
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Totals Summary */}
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>₹{totals.subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax:</Text>
            <Text style={styles.totalValue}>₹{totals.totalTax.toFixed(2)}</Text>
          </View>

          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={[styles.totalValue, { color: '#F44336' }]}>
                -₹{discount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>TOTAL:</Text>
            <Text style={styles.grandTotalValue}>₹{totals.total.toFixed(2)}</Text>
          </View>

          {paidAmount > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Paid:</Text>
                <Text style={[styles.totalValue, { color: '#4CAF50' }]}>
                  ₹{paidAmount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Balance Due:</Text>
                <Text style={styles.totalValue}>
                  ₹{(totals.total - paidAmount).toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={createInvoice}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating Invoice...' : 'Create Invoice & Execute Transaction'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.autoNote}>
          ✨ Accounting, tax, inventory, and customer balance will be updated automatically
        </Text>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Customer Selection Modal */}
      <Modal
        visible={showCustomerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Customer</Text>

            <FlatList
              data={customers}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerItem}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setShowCustomerModal(false);
                  }}
                >
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.customerPhone}>{item.phone}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No customers found</Text>
              }
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCustomerModal(false)}
            >
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Product Selection Modal */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Product</Text>

            <FlatList
              data={products}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productItem}
                  onPress={() => addItem(item)}
                >
                  <View>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productPrice}>₹{item.sale_price}</Text>
                  </View>
                  <Text style={styles.productStock}>Stock: {item.quantity}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No products found</Text>
              }
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowProductModal(false)}
            >
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    paddingTop: 40
  },
  backButton: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF'
  },
  content: {
    flex: 1,
    padding: 15
  },
  section: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  typeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  typeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center'
  },
  typeButtonActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3'
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333'
  },
  selectButton: {
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  selectButtonText: {
    fontSize: 16,
    color: '#333'
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600'
  },
  itemCard: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  removeButton: {
    fontSize: 20,
    color: '#F44336',
    fontWeight: 'bold'
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  itemField: {
    flex: 1,
    marginHorizontal: 5
  },
  itemLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5
  },
  itemInput: {
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 6,
    fontSize: 14
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    paddingTop: 8
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10
  },
  paymentMethod: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8
  },
  paymentMethodActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3'
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '600'
  },
  totalsCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  totalLabel: {
    fontSize: 14,
    color: '#666'
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  grandTotal: {
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
    paddingTop: 10,
    marginTop: 10
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  createButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10
  },
  createButtonDisabled: {
    backgroundColor: '#BDBDBD'
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  autoNote: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic'
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 20
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '90%',
    maxHeight: '70%',
    borderRadius: 12,
    padding: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  customerItem: {
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 10
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  customerPhone: {
    fontSize: 14,
    color: '#666'
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 10
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  productPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600'
  },
  productStock: {
    fontSize: 12,
    color: '#666'
  },
  closeButton: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  }
});

export default InvoiceCreationScreen;
