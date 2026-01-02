/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENHANCED POS BILLING SCREEN WITH BLUETOOTH SCANNER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * - Bluetooth barcode scanner integration
 * - Numeric code support for items without barcodes
 * - Auto-add items on scan
 * - Real-time total calculation
 * - Quick payment
 * - Thermal printer support
 * - Scanner status indicator
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Vibration,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BluetoothManager from '../../services/bluetooth/bluetoothManager';
import ProductCodeService from '../../services/pos/productCodeService';
import ThermalPrinterService from '../../services/bluetooth/thermalPrinterService';
import DatabaseService from '../../services/database/databaseService';

const EnhancedPOSScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [scannerConnected, setScannerConnected] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    initializeBluetooth();
    calculateTotals();
    
    return () => {
      // Cleanup listeners
      if (scanUnsubscribe) scanUnsubscribe();
      if (connectionUnsubscribe) connectionUnsubscribe();
    };
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [items]);

  let scanUnsubscribe = null;
  let connectionUnsubscribe = null;

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * INITIALIZE BLUETOOTH
   * ═══════════════════════════════════════════════════════════════════════
   */
  const initializeBluetooth = async () => {
    await BluetoothManager.initialize();

    // Get connection status
    const status = BluetoothManager.getConnectionStatus();
    setScannerConnected(status.scanner.connected);
    setPrinterConnected(status.printer.connected);

    // Listen for scans
    scanUnsubscribe = BluetoothManager.addScanListener(handleScan);

    // Listen for connection changes
    connectionUnsubscribe = BluetoothManager.addConnectionListener((event) => {
      if (event.deviceType === 'scanner') {
        setScannerConnected(event.connected);
      } else if (event.deviceType === 'printer') {
        setPrinterConnected(event.connected);
      }
    });
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HANDLE BARCODE SCAN
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handleScan = async (code) => {
    try {
      Vibration.vibrate(50);
      
      // Lookup product by code
      const result = await ProductCodeService.lookupByCode(code);
      
      if (result.success) {
        await addItemToCart(result.product);
      } else {
        // Product not found - ask to add
        Alert.alert(
          'Product Not Found',
          `No product found with code: ${code}\n\nWould you like to add this product?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add Product',
              onPress: () => navigation.navigate('AddProduct', { code })
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HANDLE MANUAL CODE ENTRY
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handleManualCodeSubmit = async () => {
    if (!manualCode.trim()) return;

    try {
      setProcessing(true);
      
      // Lookup product
      const result = await ProductCodeService.lookupByCode(manualCode.trim());
      
      if (result.success) {
        await addItemToCart(result.product);
        setManualCode('');
        inputRef.current?.focus();
      } else {
        Alert.alert('Not Found', `No product found with code: ${manualCode}`);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * ADD ITEM TO CART
   * ═══════════════════════════════════════════════════════════════════════
   */
  const addItemToCart = async (product) => {
    // Check if item already in cart
    const existingIndex = items.findIndex(item => item.product_id === product.id);

    if (existingIndex >= 0) {
      // Increase quantity
      const updatedItems = [...items];
      updatedItems[existingIndex].quantity += 1;
      updatedItems[existingIndex].total = 
        updatedItems[existingIndex].quantity * updatedItems[existingIndex].price;
      setItems(updatedItems);
    } else {
      // Add new item
      const newItem = {
        id: Date.now().toString(),
        product_id: product.id,
        product_name: product.product_name,
        quantity: 1,
        unit: product.unit,
        price: product.selling_price,
        gst_percentage: product.gst_percentage || 0,
        total: product.selling_price
      };
      setItems([...items, newItem]);
    }

    Vibration.vibrate(50);
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CALCULATE TOTALS
   * ═══════════════════════════════════════════════════════════════════════
   */
  const calculateTotals = () => {
    const sub = items.reduce((sum, item) => sum + item.total, 0);
    
    const gst = items.reduce((sum, item) => {
      const taxableAmount = item.total;
      const itemGst = (taxableAmount * item.gst_percentage) / (100 + item.gst_percentage);
      return sum + itemGst;
    }, 0);

    setSubtotal(sub - gst);
    setGstAmount(gst);
    setGrandTotal(sub);
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * UPDATE QUANTITY
   * ═══════════════════════════════════════════════════════════════════════
   */
  const updateQuantity = (itemId, delta) => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: newQty,
          total: newQty * item.price
        };
      }
      return item;
    });
    setItems(updatedItems);
    Vibration.vibrate(30);
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * REMOVE ITEM
   * ═══════════════════════════════════════════════════════════════════════
   */
  const removeItem = (itemId) => {
    setItems(items.filter(item => item.id !== itemId));
    Vibration.vibrate(50);
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PROCESS PAYMENT
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handlePayment = () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart');
      return;
    }

    Alert.alert(
      'Payment Method',
      'Select payment method',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Cash', onPress: () => processPayment('CASH') },
        { text: 'UPI', onPress: () => processPayment('UPI') },
        { text: 'Card', onPress: () => processPayment('CARD') }
      ]
    );
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PROCESS PAYMENT
   * ═══════════════════════════════════════════════════════════════════════
   */
  const processPayment = async (paymentMode) => {
    try {
      setProcessing(true);

      const db = await DatabaseService.getDatabase();

      // Generate invoice number
      const invoiceNumber = 'INV-' + Date.now();

      // Calculate GST breakdown
      const cgstAmount = gstAmount / 2;
      const sgstAmount = gstAmount / 2;

      // Insert invoice
      const [invoiceResult] = await db.executeSql(
        `INSERT INTO invoices 
        (invoice_number, invoice_date, invoice_time, subtotal, cgst_amount, 
         sgst_amount, total_tax, grand_total, payment_mode, created_by) 
        VALUES (?, DATE('now'), TIME('now'), ?, ?, ?, ?, ?, ?, 'SYSTEM')`,
        [invoiceNumber, subtotal, cgstAmount, sgstAmount, gstAmount, grandTotal, paymentMode]
      );

      const invoiceId = invoiceResult.insertId;

      // Insert invoice items
      for (const item of items) {
        const taxableAmount = item.total / (1 + item.gst_percentage / 100);
        const itemCgst = (taxableAmount * item.gst_percentage / 100) / 2;
        const itemSgst = (taxableAmount * item.gst_percentage / 100) / 2;

        await db.executeSql(
          `INSERT INTO invoice_items 
          (invoice_id, product_id, product_name, quantity, unit, price, 
           taxable_amount, gst_percentage, cgst_amount, sgst_amount, total_amount) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId, item.product_id, item.product_name, item.quantity,
            item.unit, item.price, taxableAmount, item.gst_percentage,
            itemCgst, itemSgst, item.total
          ]
        );

        // Update stock
        await db.executeSql(
          'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );

        // Record stock movement
        await db.executeSql(
          `INSERT INTO stock_movements 
          (product_id, movement_type, quantity, reference_type, reference_id, created_by) 
          VALUES (?, 'SALE', ?, 'INVOICE', ?, 'SYSTEM')`,
          [item.product_id, item.quantity, invoiceNumber]
        );
      }

      // Print if printer connected
      if (printerConnected) {
        await printInvoice(invoiceId);
      }

      // Clear cart
      setItems([]);

      Alert.alert(
        'Success',
        `Invoice ${invoiceNumber} created successfully!`,
        [
          { text: 'OK' },
          {
            text: 'Print',
            onPress: () => printInvoice(invoiceId)
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PRINT INVOICE
   * ═══════════════════════════════════════════════════════════════════════
   */
  const printInvoice = async (invoiceId) => {
    try {
      const db = await DatabaseService.getDatabase();

      // Get invoice
      const [invoiceResult] = await db.executeSql(
        'SELECT * FROM invoices WHERE id = ?',
        [invoiceId]
      );

      // Get items
      const [itemsResult] = await db.executeSql(
        'SELECT * FROM invoice_items WHERE invoice_id = ?',
        [invoiceId]
      );

      // Get company
      const [companyResult] = await db.executeSql(
        'SELECT * FROM company_master LIMIT 1'
      );

      const invoice = invoiceResult.rows.item(0);
      const invoiceItems = [];
      for (let i = 0; i < itemsResult.rows.length; i++) {
        invoiceItems.push(itemsResult.rows.item(i));
      }
      const company = companyResult.rows.length > 0 ? companyResult.rows.item(0) : {};

      // Print
      await ThermalPrinterService.printInvoice({
        invoice,
        items: invoiceItems,
        company
      });

      Alert.alert('Success', 'Invoice sent to printer');
    } catch (error) {
      Alert.alert('Print Error', error.message);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RENDER ITEM
   * ═══════════════════════════════════════════════════════════════════════
   */
  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product_name}</Text>
        <Text style={styles.itemDetails}>
          ₹{item.price} × {item.quantity} {item.unit}
        </Text>
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateQuantity(item.id, -1)}
        >
          <Icon name="minus" size={16} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.quantity}>{item.quantity}</Text>

        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateQuantity(item.id, 1)}
        >
          <Icon name="plus" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.itemTotal}>
        <Text style={styles.totalAmount}>₹{item.total.toFixed(2)}</Text>
        <TouchableOpacity onPress={() => removeItem(item.id)}>
          <Icon name="delete" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>POS Billing</Text>

        <View style={styles.headerIcons}>
          {/* Scanner Status */}
          <TouchableOpacity
            onPress={() => navigation.navigate('BluetoothSettings')}
            style={styles.statusIcon}
          >
            <Icon
              name="barcode-scan"
              size={24}
              color={scannerConnected ? '#4CAF50' : '#FFF'}
            />
          </TouchableOpacity>

          {/* Printer Status */}
          <TouchableOpacity
            onPress={() => navigation.navigate('BluetoothSettings')}
            style={styles.statusIcon}
          >
            <Icon
              name="printer"
              size={24}
              color={printerConnected ? '#4CAF50' : '#FFF'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Manual Code Input */}
      <View style={styles.inputSection}>
        <TextInput
          ref={inputRef}
          style={styles.codeInput}
          placeholder="Enter product code or scan barcode"
          value={manualCode}
          onChangeText={setManualCode}
          onSubmitEditing={handleManualCodeSubmit}
          keyboardType="numeric"
          returnKeyType="done"
          autoFocus
        />
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleManualCodeSubmit}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Icon name="magnify" size={24} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Cart Items */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyCart}>
            <Icon name="cart-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>Cart is empty</Text>
            <Text style={styles.emptySubtext}>
              {scannerConnected
                ? 'Scan items or enter product code'
                : 'Connect scanner or enter product code'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.cartList}
      />

      {/* Totals */}
      {items.length > 0 && (
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST:</Text>
            <Text style={styles.totalValue}>₹{gstAmount.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>TOTAL:</Text>
            <Text style={styles.grandTotalValue}>₹{grandTotal.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={styles.payButton}
            onPress={handlePayment}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Icon name="cash" size={24} color="#FFF" />
                <Text style={styles.payButtonText}>PAY NOW</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2196F3',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  statusIcon: {
    padding: 4,
  },
  inputSection: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  codeInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginRight: 8,
  },
  submitButton: {
    width: 48,
    height: 48,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartList: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  qtyButton: {
    width: 32,
    height: 32,
    backgroundColor: '#2196F3',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  itemTotal: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 8,
  },
  totalsSection: {
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  grandTotalLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2196F3',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default EnhancedPOSScreen;
