/**
 * POS BILLING SCREEN (FAST MODE)
 * Lightning-fast billing interface
 * 
 * Features:
 * - Quick item addition
 * - Swipe to remove/edit
 * - Real-time total calculation
 * - One-tap payment
 * - No confirmation popups
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SwipeListView } from 'react-native-swipe-list-view';
import invoicePOSEngine from '../../services/business/invoicePOSEngine';
import stockManagementService from '../../services/business/stockManagementService';

const POSBillingScreen = ({ navigation, route }) => {
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [summary, setSummary] = useState({
    subtotal: 0,
    totalGST: 0,
    grandTotal: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    initializeInvoice();
  }, []);

  useEffect(() => {
    if (route.params?.prefilledData) {
      // Handle pre-filled data from voice/text input
      handlePrefilledData(route.params.prefilledData);
    }
  }, [route.params]);

  const initializeInvoice = async () => {
    await invoicePOSEngine.createInvoice({
      invoiceType: 'POS_RECEIPT',
      supplierGSTIN: '29AAAAA0000A1Z5', // From settings
      supplierState: '29'
    });
  };

  const handlePrefilledData = async (data) => {
    // Add item from voice/text input
    if (data.intent_type === 'CASH_SALE') {
      // Parse and add items
    }
  };

  const searchItems = async (text) => {
    if (text.length < 2) {
      setSearchResults([]);
      return;
    }

    const results = await stockManagementService.searchItems(text);
    setSearchResults(results);
    setShowSearch(true);
  };

  const addItem = async (stockItem) => {
    try {
      const result = await invoicePOSEngine.addItem({
        itemCode: stockItem.item_code,
        itemName: stockItem.item_name,
        quantity: 1,
        unit: stockItem.unit,
        rate: stockItem.selling_price,
        gstRate: stockItem.gst_rate,
        hsnCode: stockItem.hsn_code
      });

      if (result.success) {
        const invoice = invoicePOSEngine.getCurrentInvoice();
        setItems(invoice.items);
        updateSummary(invoice);
        setSearchText('');
        setShowSearch(false);
        Vibration.vibrate(50);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const updateQuantity = async (index, delta) => {
    const item = items[index];
    const newQuantity = item.quantity + delta;

    if (newQuantity <= 0) {
      removeItem(index);
      return;
    }

    try {
      const result = await invoicePOSEngine.updateItemQuantity(index, newQuantity);
      
      if (result.success) {
        const invoice = invoicePOSEngine.getCurrentInvoice();
        setItems(invoice.items);
        updateSummary(invoice);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const removeItem = async (index) => {
    try {
      const result = invoicePOSEngine.removeItem(index);
      
      if (result.success) {
        const invoice = invoicePOSEngine.getCurrentInvoice();
        setItems(invoice.items);
        updateSummary(invoice);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const updateSummary = (invoice) => {
    setSummary({
      subtotal: invoice.subtotal,
      totalGST: invoice.gstBreakup.cgst + invoice.gstBreakup.sgst + invoice.gstBreakup.igst,
      grandTotal: invoice.grandTotal
    });
  };

  const completeBill = async (paymentMode) => {
    if (items.length === 0) {
      Alert.alert('Error', 'Add items to bill');
      return;
    }

    setIsProcessing(true);

    try {
      // Set payment mode
      await invoicePOSEngine.setPaymentMode(paymentMode);

      // Confirm invoice
      const result = await invoicePOSEngine.confirmInvoice();

      if (result.status === 'INVOICE_READY') {
        Vibration.vibrate(100);
        
        // Navigate to invoice preview
        navigation.replace('InvoicePreview', {
          invoice: result,
          showPrintOptions: true
        });
      } else if (result.needsClarification) {
        Alert.alert('Clarification Needed', result.question);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const openScanner = () => {
    navigation.navigate('BarcodeScanner', {
      onScan: async (barcode) => {
        const result = await invoicePOSEngine.scanItem(barcode);
        
        if (result.success) {
          const invoice = invoicePOSEngine.getCurrentInvoice();
          setItems(invoice.items);
          updateSummary(invoice);
        } else if (result.needsAddToStock) {
          Alert.alert(
            'Item Not Found',
            'This item is not in your stock. Add it?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Add Item', 
                onPress: () => navigation.navigate('AddProduct', { barcode })
              }
            ]
          );
        }
      }
    });
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.itemName}</Text>
        <Text style={styles.itemRate}>₹{item.rate} × {item.quantity}</Text>
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateQuantity(index, -1)}
        >
          <Ionicons name="remove" size={20} color="#666" />
        </TouchableOpacity>
        
        <Text style={styles.qtyText}>{item.quantity}</Text>
        
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateQuantity(index, 1)}
        >
          <Ionicons name="add" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.itemTotal}>₹{item.itemTotal.toLocaleString('en-IN')}</Text>
    </View>
  );

  const renderHiddenItem = ({ item, index }) => (
    <View style={styles.hiddenItem}>
      <TouchableOpacity
        style={[styles.hiddenButton, styles.deleteButton]}
        onPress={() => removeItem(index)}
      >
        <Ionicons name="trash" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Bill</Text>
        <TouchableOpacity onPress={openScanner}>
          <Ionicons name="scan" size={28} color="#212121" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search or scan items..."
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            searchItems(text);
          }}
          autoFocus
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => {
            setSearchText('');
            setShowSearch(false);
          }}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results */}
      {showSearch && searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchResultItem}
                onPress={() => addItem(item)}
              >
                <View>
                  <Text style={styles.searchResultName}>{item.item_name}</Text>
                  <Text style={styles.searchResultCode}>{item.item_code}</Text>
                </View>
                <Text style={styles.searchResultPrice}>
                  ₹{item.selling_price}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Items List */}
      <SwipeListView
        data={items}
        renderItem={renderItem}
        renderHiddenItem={renderHiddenItem}
        rightOpenValue={-75}
        disableRightSwipe
        contentContainerStyle={styles.itemsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={64} color="#E0E0E0" />
            <Text style={styles.emptyText}>No items added</Text>
            <Text style={styles.emptySubtext}>Search or scan to add items</Text>
          </View>
        }
      />

      {/* Summary Panel */}
      {items.length > 0 && (
        <View style={styles.summaryPanel}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              ₹{summary.subtotal.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GST</Text>
            <Text style={styles.summaryValue}>
              ₹{summary.totalGST.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>
              ₹{summary.grandTotal.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      )}

      {/* Payment Buttons */}
      {items.length > 0 && (
        <View style={styles.paymentBar}>
          <TouchableOpacity
            style={[styles.paymentButton, styles.cashButton]}
            onPress={() => completeBill('CASH')}
            disabled={isProcessing}
          >
            <Ionicons name="cash" size={24} color="#FFFFFF" />
            <Text style={styles.paymentButtonText}>CASH</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentButton, styles.upiButton]}
            onPress={() => completeBill('UPI')}
            disabled={isProcessing}
          >
            <Ionicons name="phone-portrait" size={24} color="#FFFFFF" />
            <Text style={styles.paymentButtonText}>UPI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentButton, styles.cardButton]}
            onPress={() => completeBill('CARD')}
            disabled={isProcessing}
          >
            <Ionicons name="card" size={24} color="#FFFFFF" />
            <Text style={styles.paymentButtonText}>CARD</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentButton, styles.creditButton]}
            onPress={() => completeBill('CREDIT')}
            disabled={isProcessing}
          >
            <Ionicons name="time" size={24} color="#FFFFFF" />
            <Text style={styles.paymentButtonText}>CREDIT</Text>
          </TouchableOpacity>
        </View>
      )}
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#212121'
  },
  searchResults: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    maxHeight: 200,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212121'
  },
  searchResultCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  searchResultPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50'
  },
  itemsList: {
    padding: 16,
    paddingBottom: 300
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212121',
    marginBottom: 4
  },
  itemRate: {
    fontSize: 13,
    color: '#666'
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  qtyButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 16
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center'
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    minWidth: 80,
    textAlign: 'right'
  },
  hiddenItem: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    height: '100%',
    marginBottom: 8
  },
  hiddenButton: {
    width: 75,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8
  },
  deleteButton: {
    backgroundColor: '#F44336'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4
  },
  summaryPanel: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666'
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212121'
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121'
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50'
  },
  paymentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4
  },
  cashButton: {
    backgroundColor: '#4CAF50'
  },
  upiButton: {
    backgroundColor: '#2196F3'
  },
  cardButton: {
    backgroundColor: '#FF9800'
  },
  creditButton: {
    backgroundColor: '#9C27B0'
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6
  }
});

export default POSBillingScreen;
