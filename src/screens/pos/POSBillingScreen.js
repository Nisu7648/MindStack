/**
 * POS BILLING SCREEN
 * 
 * Complete POS system with:
 * - Product search & selection
 * - Barcode scanning
 * - Quantity & discount
 * - Multiple payment methods
 * - Thermal receipt printing
 * - Cash drawer integration
 * - Customer display
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ScrollView
} from 'react-native';
import { supabase } from '../../services/supabase';
import POSDeviceManager, { DEVICE_TYPES } from '../../services/pos/POSDeviceManager';
import TaxOptimizationEngine from '../../services/tax/TaxOptimizationEngine';

const POSBillingScreen = ({ navigation, businessId }) => {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [connectedPrinter, setConnectedPrinter] = useState(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    loadProducts();
    setupBarcodeScanner();

    return () => {
      // Cleanup
      POSDeviceManager.setOnDataReceived(null);
    };
  }, []);

  /**
   * LOAD PRODUCTS
   */
  const loadProducts = async () => {
    try {
      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', businessId)
        .gt('quantity', 0)
        .order('name');

      setProducts(data || []);
    } catch (error) {
      console.error('Load products error:', error);
    }
  };

  /**
   * SETUP BARCODE SCANNER
   */
  const setupBarcodeScanner = () => {
    POSDeviceManager.setOnDataReceived((event) => {
      if (event.deviceType === DEVICE_TYPES.BARCODE_SCANNER) {
        handleBarcodeScanned(event.data);
      }
    });
  };

  /**
   * HANDLE BARCODE SCANNED
   */
  const handleBarcodeScanned = (barcode) => {
    // Find product by barcode
    const product = products.find(p => p.barcode === barcode);

    if (product) {
      addToCart(product);
      Alert.alert('✅ Product Added', product.name);
    } else {
      Alert.alert('❌ Not Found', `No product found with barcode: ${barcode}`);
    }
  };

  /**
   * ADD TO CART
   */
  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item.id === product.id);

    if (existingItem) {
      // Increase quantity
      setCartItems(cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Add new item
      setCartItems([...cartItems, {
        ...product,
        quantity: 1,
        discount: 0
      }]);
    }
  };

  /**
   * UPDATE QUANTITY
   */
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartItems(cartItems.map(item =>
      item.id === itemId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  /**
   * REMOVE FROM CART
   */
  const removeFromCart = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  /**
   * CALCULATE TOTALS
   */
  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (item.sale_price * item.quantity) - (item.discount || 0);
    }, 0);

    const taxAmount = cartItems.reduce((sum, item) => {
      const itemTotal = (item.sale_price * item.quantity) - (item.discount || 0);
      return sum + (itemTotal * (item.gst_rate || 0) / 100);
    }, 0);

    const total = subtotal + taxAmount - discount;

    return {
      subtotal,
      taxAmount,
      discount,
      total
    };
  };

  /**
   * SCAN FOR DEVICES
   */
  const scanForDevices = async (connectionType) => {
    try {
      setIsScanning(true);

      let devices = [];
      
      if (connectionType === 'bluetooth') {
        devices = await POSDeviceManager.scanBluetoothDevices();
      } else if (connectionType === 'usb') {
        devices = await POSDeviceManager.scanUSBDevices();
      }

      setAvailableDevices(devices);
      setShowDeviceModal(true);

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * CONNECT TO PRINTER
   */
  const connectToPrinter = async (device) => {
    try {
      let connection;

      if (device.connectionType === 'bluetooth') {
        connection = await POSDeviceManager.connectBluetoothDevice(device.address);
      } else if (device.connectionType === 'usb') {
        connection = await POSDeviceManager.connectUSBDevice(device.name);
      }

      setConnectedPrinter(connection);
      setShowDeviceModal(false);

      Alert.alert('✅ Connected', `Printer ${device.name} connected successfully`);

    } catch (error) {
      Alert.alert('❌ Connection Failed', error.message);
    }
  };

  /**
   * PROCESS PAYMENT & PRINT RECEIPT
   */
  const processPayment = async () => {
    try {
      if (cartItems.length === 0) {
        Alert.alert('Empty Cart', 'Please add items to cart');
        return;
      }

      // Get business info
      const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;

      // Calculate totals
      const totals = calculateTotals();

      // Save transaction
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          business_id: businessId,
          type: 'sale',
          invoice_number: invoiceNumber,
          date: new Date().toISOString(),
          amount: totals.total,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          discount: totals.discount,
          payment_method: paymentMethod,
          payment_status: 'paid',
          items: cartItems,
          customer_id: customerInfo?.id || null
        })
        .select()
        .single();

      if (error) throw error;

      // Update inventory
      for (const item of cartItems) {
        await supabase
          .from('inventory_items')
          .update({
            quantity: item.quantity - item.quantity
          })
          .eq('id', item.id);
      }

      // Print receipt if printer connected
      if (connectedPrinter) {
        await printReceipt(transaction, business);
      }

      // Show success
      Alert.alert(
        '✅ Payment Successful',
        `Invoice: ${invoiceNumber}\nTotal: ₹${totals.total.toFixed(2)}`,
        [
          {
            text: 'New Sale',
            onPress: () => {
              setCartItems([]);
              setCustomerInfo(null);
              setDiscount(0);
            }
          },
          {
            text: 'View Receipt',
            onPress: () => navigation.navigate('TransactionDetail', { transactionId: transaction.id })
          }
        ]
      );

      // Open cash drawer if connected
      if (connectedPrinter && paymentMethod === 'cash') {
        await POSDeviceManager.openCashDrawer(connectedPrinter.id);
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      Alert.alert('❌ Error', error.message);
    }
  };

  /**
   * PRINT RECEIPT
   */
  const printReceipt = async (transaction, business) => {
    try {
      const receiptData = {
        businessName: business.name,
        businessAddress: business.address,
        businessPhone: business.phone,
        gstNumber: business.gstin,
        invoiceNumber: transaction.invoice_number,
        date: new Date(transaction.date).toLocaleString('en-IN'),
        customerName: customerInfo?.name || 'Walk-in Customer',
        items: cartItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.sale_price * item.quantity
        })),
        subtotal: transaction.subtotal,
        tax: transaction.tax_amount,
        discount: transaction.discount,
        total: transaction.amount
      };

      await POSDeviceManager.printReceipt(connectedPrinter.id, receiptData);

      console.log('✅ Receipt printed');

    } catch (error) {
      console.error('Print receipt error:', error);
      Alert.alert('Print Error', 'Failed to print receipt');
    }
  };

  /**
   * SEARCH PRODUCTS
   */
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode?.includes(searchQuery)
  );

  const totals = calculateTotals();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>POS Billing</Text>
        <TouchableOpacity
          style={styles.printerButton}
          onPress={() => scanForDevices('bluetooth')}
        >
          <Text style={styles.printerButtonText}>
            {connectedPrinter ? '🖨️ Connected' : '🖨️ Connect Printer'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Left Side - Product Selection */}
        <View style={styles.leftPanel}>
          {/* Search */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search products or scan barcode..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Product List */}
          <FlatList
            data={filteredProducts}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.productCard}
                onPress={() => addToCart(item)}
              >
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productPrice}>₹{item.sale_price}</Text>
                </View>
                <View style={styles.productStock}>
                  <Text style={styles.productStockText}>
                    Stock: {item.quantity}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No products found</Text>
            }
          />
        </View>

        {/* Right Side - Cart & Billing */}
        <View style={styles.rightPanel}>
          {/* Cart Items */}
          <View style={styles.cartSection}>
            <Text style={styles.sectionTitle}>Cart Items</Text>

            <ScrollView style={styles.cartList}>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemPrice}>
                      ₹{item.sale_price} × {item.quantity} = ₹{(item.sale_price * item.quantity).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.cartItemControls}>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Text style={styles.qtyButtonText}>-</Text>
                    </TouchableOpacity>

                    <Text style={styles.qtyText}>{item.quantity}</Text>

                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Text style={styles.qtyButtonText}>+</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromCart(item.id)}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {cartItems.length === 0 && (
                <Text style={styles.emptyCartText}>Cart is empty</Text>
              )}
            </ScrollView>
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>₹{totals.subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>₹{totals.taxAmount.toFixed(2)}</Text>
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
          </View>

          {/* Payment Methods */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[styles.paymentMethod, paymentMethod === 'cash' && styles.paymentMethodActive]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Text style={styles.paymentMethodText}>💵 Cash</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentMethod, paymentMethod === 'card' && styles.paymentMethodActive]}
                onPress={() => setPaymentMethod('card')}
              >
                <Text style={styles.paymentMethodText}>💳 Card</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentMethod, paymentMethod === 'upi' && styles.paymentMethodActive]}
                onPress={() => setPaymentMethod('upi')}
              >
                <Text style={styles.paymentMethodText}>📱 UPI</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={() => setCartItems([])}
            >
              <Text style={styles.actionButtonText}>Clear Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.payButton]}
              onPress={processPayment}
              disabled={cartItems.length === 0}
            >
              <Text style={[styles.actionButtonText, { color: '#FFF' }]}>
                Pay ₹{totals.total.toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Device Selection Modal */}
      <Modal
        visible={showDeviceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeviceModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Printer</Text>

            {isScanning ? (
              <Text style={styles.scanningText}>Scanning for devices...</Text>
            ) : (
              <>
                <FlatList
                  data={availableDevices}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.deviceItem}
                      onPress={() => connectToPrinter(item)}
                    >
                      <Text style={styles.deviceName}>{item.name}</Text>
                      <Text style={styles.deviceType}>{item.type}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No devices found</Text>
                  }
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.scanButton}
                    onPress={() => scanForDevices('bluetooth')}
                  >
                    <Text>Scan Bluetooth</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.scanButton}
                    onPress={() => scanForDevices('usb')}
                  >
                    <Text>Scan USB</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDeviceModal(false)}
                  >
                    <Text>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF'
  },
  printerButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8
  },
  printerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3'
  },
  content: {
    flex: 1,
    flexDirection: 'row'
  },
  leftPanel: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 15,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0'
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 10
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  productStock: {
    marginLeft: 10
  },
  productStockText: {
    fontSize: 12,
    color: '#999'
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 15
  },
  cartSection: {
    flex: 1,
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  cartList: {
    flex: 1
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 8
  },
  cartItemInfo: {
    flex: 1
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  cartItemPrice: {
    fontSize: 13,
    color: '#666'
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  qtyButton: {
    width: 32,
    height: 32,
    backgroundColor: '#2196F3',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5
  },
  qtyButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 10
  },
  removeButton: {
    width: 32,
    height: 32,
    backgroundColor: '#F44336',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10
  },
  removeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  emptyCartText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 30
  },
  totalsSection: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
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
  paymentSection: {
    marginBottom: 15
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  paymentMethod: {
    flex: 1,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center'
  },
  paymentMethodActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3'
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600'
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5
  },
  clearButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  payButton: {
    backgroundColor: '#4CAF50'
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '80%',
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
  scanningText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 30
  },
  deviceItem: {
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 10
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  deviceType: {
    fontSize: 14,
    color: '#666'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20
  },
  scanButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5
  },
  closeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5
  }
});

export default POSBillingScreen;
