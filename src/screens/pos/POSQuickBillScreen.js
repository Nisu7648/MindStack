/**
 * POS QUICK BILL SCREEN
 * 
 * Fast billing interface for retail
 * Auto-captures transactions, updates inventory, calculates profit
 * Zero accounting knowledge required
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
  FlatList,
  Modal,
  ActivityIndicator
} from 'react-native';
import TransactionCaptureEngine from '../../services/autonomous/TransactionCaptureEngine';
import InventoryAccountingEngine from '../../services/autonomous/InventoryAccountingEngine';

const POSQuickBillScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load products and customers from database
    // This is a placeholder - actual implementation would query database
    setProducts([
      { id: 1, name: 'Product A', sku: 'SKU001', price: 100, stock: 50, costPrice: 60 },
      { id: 2, name: 'Product B', sku: 'SKU002', price: 200, stock: 30, costPrice: 120 },
      { id: 3, name: 'Product C', sku: 'SKU003', price: 150, stock: 40, costPrice: 90 }
    ]);

    setCustomers([
      { id: 1, name: 'Walk-in Customer', phone: '', type: 'RETAIL' },
      { id: 2, name: 'Customer A', phone: '9876543210', type: 'REGULAR' },
      { id: 3, name: 'Customer B', phone: '9876543211', type: 'WHOLESALE' }
    ]);

    // Set default customer
    setSelectedCustomer({ id: 1, name: 'Walk-in Customer', phone: '', type: 'RETAIL' });
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.productId === product.id);

    if (existingItem) {
      // Increase quantity
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Add new item
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        sellingPrice: product.price,
        costPrice: product.costPrice,
        discount: 0
      }]);
    }

    setShowProductModal(false);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const updateItemDiscount = (productId, discountAmount) => {
    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, discount: parseFloat(discountAmount) || 0 }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      return sum + (item.sellingPrice * item.quantity) - item.discount;
    }, 0);
  };

  const calculateGST = () => {
    const subtotal = calculateSubtotal();
    return subtotal * 0.18; // 18% GST
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST() - discount;
  };

  const calculateProfit = () => {
    return cart.reduce((sum, item) => {
      const revenue = (item.sellingPrice * item.quantity) - item.discount;
      const cost = item.costPrice * item.quantity;
      return sum + (revenue - cost);
    }, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    setLoading(true);
    setShowPaymentModal(false);

    try {
      const saleData = {
        customerId: selectedCustomer.id,
        items: cart,
        totalAmount: calculateTotal(),
        taxAmount: calculateGST(),
        paymentMode: paymentMode,
        timestamp: new Date().toISOString()
      };

      // AUTO-CAPTURE TRANSACTION
      // This automatically:
      // 1. Creates sales entry
      // 2. Updates inventory
      // 3. Records GST
      // 4. Updates customer balance
      // 5. Creates cash/bank entry
      // 6. Calculates profit
      const result = await TransactionCaptureEngine.captureFromPOSSale(saleData);

      if (result.success) {
        const profit = calculateProfit();
        const profitMargin = (profit / calculateSubtotal()) * 100;

        Alert.alert(
          '✅ Sale Completed!',
          `Total: ₹${calculateTotal().toFixed(2)}\n` +
          `Profit: ₹${profit.toFixed(2)} (${profitMargin.toFixed(1)}%)\n\n` +
          `All accounting entries created automatically!`,
          [
            {
              text: 'Print Receipt',
              onPress: () => printReceipt()
            },
            {
              text: 'New Sale',
              onPress: () => resetCart()
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetCart = () => {
    setCart([]);
    setDiscount(0);
    setSelectedCustomer({ id: 1, name: 'Walk-in Customer', phone: '', type: 'RETAIL' });
    setPaymentMode('CASH');
  };

  const printReceipt = () => {
    // TODO: Implement receipt printing
    Alert.alert('Print', 'Receipt printing not implemented yet');
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>⚡ Quick Bill</Text>
        <TouchableOpacity
          style={styles.customerButton}
          onPress={() => setShowCustomerModal(true)}
        >
          <Text style={styles.customerButtonText}>
            👤 {selectedCustomer?.name || 'Select Customer'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Left: Product Selection */}
        <View style={styles.leftPanel}>
          <View style={styles.searchSection}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products (name or SKU)..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => Alert.alert('Scan', 'Barcode scanning not implemented')}
            >
              <Text style={styles.scanButtonText}>📷 Scan</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.productGrid}>
            {filteredProducts.map(product => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => addToCart(product)}
              >
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productSku}>{product.sku}</Text>
                  <Text style={styles.productPrice}>₹{product.price}</Text>
                  <Text style={[
                    styles.productStock,
                    { color: product.stock > 10 ? '#4CAF50' : '#FF9800' }
                  ]}>
                    Stock: {product.stock}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Right: Cart & Checkout */}
        <View style={styles.rightPanel}>
          <Text style={styles.cartTitle}>Cart ({cart.length} items)</Text>

          <ScrollView style={styles.cartList}>
            {cart.map((item, index) => (
              <View key={index} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemSku}>{item.sku}</Text>
                </View>

                <View style={styles.cartItemControls}>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                    >
                      <Text style={styles.qtyButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                    >
                      <Text style={styles.qtyButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cartItemPrice}>
                    ₹{(item.sellingPrice * item.quantity - item.discount).toFixed(2)}
                  </Text>

                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFromCart(item.productId)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Bill Summary */}
          <View style={styles.billSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>₹{calculateSubtotal().toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST (18%):</Text>
              <Text style={styles.summaryValue}>₹{calculateGST().toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount:</Text>
              <TextInput
                style={styles.discountInput}
                value={discount.toString()}
                onChangeText={(text) => setDiscount(parseFloat(text) || 0)}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={styles.totalValue}>₹{calculateTotal().toFixed(2)}</Text>
            </View>

            <View style={styles.profitInfo}>
              <Text style={styles.profitLabel}>Expected Profit:</Text>
              <Text style={[styles.profitValue, { color: '#4CAF50' }]}>
                ₹{calculateProfit().toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Checkout Button */}
          <TouchableOpacity
            style={[styles.checkoutButton, cart.length === 0 && styles.checkoutButtonDisabled]}
            onPress={handleCheckout}
            disabled={cart.length === 0 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkoutButtonText}>
                💳 Checkout - ₹{calculateTotal().toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Payment Mode Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModal}>
            <Text style={styles.modalTitle}>Select Payment Mode</Text>

            <TouchableOpacity
              style={[styles.paymentOption, paymentMode === 'CASH' && styles.paymentOptionSelected]}
              onPress={() => setPaymentMode('CASH')}
            >
              <Text style={styles.paymentOptionText}>💵 Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOption, paymentMode === 'CARD' && styles.paymentOptionSelected]}
              onPress={() => setPaymentMode('CARD')}
            >
              <Text style={styles.paymentOptionText}>💳 Card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOption, paymentMode === 'UPI' && styles.paymentOptionSelected]}
              onPress={() => setPaymentMode('UPI')}
            >
              <Text style={styles.paymentOptionText}>📱 UPI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOption, paymentMode === 'CREDIT' && styles.paymentOptionSelected]}
              onPress={() => setPaymentMode('CREDIT')}
            >
              <Text style={styles.paymentOptionText}>📝 Credit</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={processPayment}
              >
                <Text style={styles.confirmButtonText}>Confirm Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Selection Modal */}
      <Modal
        visible={showCustomerModal}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customerModal}>
            <Text style={styles.modalTitle}>Select Customer</Text>

            <ScrollView style={styles.customerList}>
              {customers.map(customer => (
                <TouchableOpacity
                  key={customer.id}
                  style={styles.customerOption}
                  onPress={() => {
                    setSelectedCustomer(customer);
                    setShowCustomerModal(false);
                  }}
                >
                  <Text style={styles.customerOptionName}>{customer.name}</Text>
                  {customer.phone && (
                    <Text style={styles.customerOptionPhone}>{customer.phone}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowCustomerModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
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
    backgroundColor: '#1A1A1A',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  customerButton: {
    backgroundColor: '#333',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8
  },
  customerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row'
  },
  leftPanel: {
    flex: 2,
    backgroundColor: '#fff',
    padding: 15
  },
  searchSection: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center'
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  productGrid: {
    flex: 1
  },
  productCard: {
    backgroundColor: '#F9F9F9',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  productSku: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4
  },
  productStock: {
    fontSize: 12,
    fontWeight: '600'
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
    padding: 15
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 15
  },
  cartList: {
    flex: 1,
    marginBottom: 15
  },
  cartItem: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8
  },
  cartItemInfo: {
    marginBottom: 10
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  cartItemSku: {
    fontSize: 12,
    color: '#666'
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  qtyButton: {
    backgroundColor: '#E0E0E0',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center'
  },
  qtyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center'
  },
  cartItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  removeButton: {
    backgroundColor: '#f44336',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center'
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  billSummary: {
    backgroundColor: '#F9F9F9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666'
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  discountInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    padding: 4,
    width: 80,
    textAlign: 'right',
    fontSize: 14
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#1A1A1A',
    paddingTop: 10,
    marginTop: 5
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  profitInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  profitLabel: {
    fontSize: 14,
    color: '#666'
  },
  profitValue: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  checkoutButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  checkoutButtonDisabled: {
    backgroundColor: '#ccc'
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  paymentModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400
  },
  customerModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    maxHeight: '70%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center'
  },
  paymentOption: {
    backgroundColor: '#F9F9F9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  paymentOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9'
  },
  paymentOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#E0E0E0'
  },
  cancelButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600'
  },
  confirmButton: {
    backgroundColor: '#4CAF50'
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  customerList: {
    flex: 1,
    marginBottom: 15
  },
  customerOption: {
    backgroundColor: '#F9F9F9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  customerOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  customerOptionPhone: {
    fontSize: 14,
    color: '#666'
  },
  closeModalButton: {
    backgroundColor: '#E0E0E0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  closeModalButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default POSQuickBillScreen;
