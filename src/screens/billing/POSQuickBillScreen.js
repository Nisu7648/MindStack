/**
 * SCREEN 3: POS QUICK BILL SCREEN
 * Fastest billing mode for walk-in customers
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Vibration
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Swipeable } from 'react-native-gesture-handler';
import SmartInputBar from '../../components/billing/SmartInputBar';

const POSQuickBillScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    calculateTotals();
  }, [items]);

  const calculateTotals = () => {
    const sub = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const gst = items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.rate;
      const itemGst = (itemTotal * item.gstRate) / 100;
      return sum + itemGst;
    }, 0);
    
    setSubtotal(sub);
    setGstAmount(gst);
    setGrandTotal(sub + gst);
  };

  const addItem = (itemData) => {
    const existingIndex = items.findIndex(i => i.id === itemData.id);
    
    if (existingIndex >= 0) {
      // Update quantity
      const updatedItems = [...items];
      updatedItems[existingIndex].quantity += itemData.quantity || 1;
      setItems(updatedItems);
    } else {
      // Add new item
      setItems([...items, {
        id: Date.now().toString(),
        name: itemData.name,
        quantity: itemData.quantity || 1,
        rate: itemData.rate || 0,
        gstRate: itemData.gstRate || 0,
        unit: itemData.unit || 'pcs'
      }]);
    }
    
    Vibration.vibrate(50);
  };

  const updateQuantity = (itemId, delta) => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setItems(updatedItems);
    Vibration.vibrate(30);
  };

  const removeItem = (itemId) => {
    setItems(items.filter(item => item.id !== itemId));
    Vibration.vibrate(50);
  };

  const editItem = (itemId) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      Alert.prompt(
        'Edit Price',
        `Enter new price for ${item.name}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update',
            onPress: (value) => {
              const newRate = parseFloat(value);
              if (!isNaN(newRate) && newRate > 0) {
                const updatedItems = items.map(i =>
                  i.id === itemId ? { ...i, rate: newRate } : i
                );
                setItems(updatedItems);
              }
            }
          }
        ],
        'plain-text',
        item.rate.toString()
      );
    }
  };

  const completeBill = async (paymentMode) => {
    if (items.length === 0) {
      Alert.alert('Empty Bill', 'Please add items to the bill');
      return;
    }

    Vibration.vibrate(100);

    // TODO: Save to database
    const invoice = {
      invoiceNo: `INV${Date.now()}`,
      date: new Date().toISOString(),
      items,
      subtotal,
      gstAmount,
      grandTotal,
      paymentMode,
      status: 'COMPLETED'
    };

    console.log('Invoice:', invoice);

    // Show success and navigate back
    Alert.alert(
      'Bill Completed',
      `₹${grandTotal.toLocaleString('en-IN')} - ${paymentMode}`,
      [
        {
          text: 'Print',
          onPress: () => {
            // TODO: Print invoice
            navigation.goBack();
          }
        },
        {
          text: 'Done',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const handleCommand = (command) => {
    if (command.type === 'ADD_ITEM') {
      // TODO: Search item from database
      addItem({
        id: Date.now().toString(),
        name: command.item,
        quantity: command.quantity,
        rate: 50, // Mock price
        gstRate: 5,
        unit: command.unit
      });
    } else if (command.type === 'REMOVE_ITEM') {
      const item = items.find(i => 
        i.name.toLowerCase().includes(command.item.toLowerCase())
      );
      if (item) {
        removeItem(item.id);
      }
    } else if (command.type === 'PAYMENT') {
      completeBill(command.mode);
    }
  };

  const renderRightActions = (itemId) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => removeItem(itemId)}
    >
      <Icon name="delete" size={24} color="#FFFFFF" />
      <Text style={styles.actionText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderLeftActions = (itemId) => (
    <TouchableOpacity
      style={styles.editAction}
      onPress={() => editItem(itemId)}
    >
      <Icon name="pencil" size={24} color="#FFFFFF" />
      <Text style={styles.actionText}>Edit</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item.id)}
      renderLeftActions={() => renderLeftActions(item.id)}
    >
      <View style={styles.itemRow}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemUnit}>{item.unit}</Text>
        </View>

        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => updateQuantity(item.id, -1)}
          >
            <Icon name="minus" size={20} color="#666666" />
          </TouchableOpacity>
          
          <Text style={styles.quantity}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => updateQuantity(item.id, 1)}
          >
            <Icon name="plus" size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        <View style={styles.priceInfo}>
          <Text style={styles.rate}>₹{item.rate}</Text>
          <Text style={styles.lineTotal}>₹{(item.quantity * item.rate).toLocaleString('en-IN')}</Text>
        </View>
      </View>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Bill</Text>
        <TouchableOpacity onPress={() => navigation.navigate('FullInvoice')}>
          <Icon name="file-document-outline" size={28} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="cart-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyText}>No items added</Text>
            <Text style={styles.emptySubtext}>Use voice or type to add items</Text>
          </View>
        }
      />

      {/* Total Panel */}
      {items.length > 0 && (
        <View style={styles.totalPanel}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>₹{subtotal.toLocaleString('en-IN')}</Text>
          </View>
          
          <TouchableOpacity style={styles.gstRow}>
            <Text style={styles.gstLabel}>GST</Text>
            <Text style={styles.gstValue}>₹{gstAmount.toLocaleString('en-IN')}</Text>
            <Icon name="chevron-down" size={20} color="#666666" />
          </TouchableOpacity>

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>₹{grandTotal.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      )}

      {/* Payment Bar */}
      {items.length > 0 && (
        <View style={styles.paymentBar}>
          <TouchableOpacity
            style={[styles.paymentButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => completeBill('CASH')}
          >
            <Icon name="cash" size={28} color="#FFFFFF" />
            <Text style={styles.paymentText}>CASH</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentButton, { backgroundColor: '#2196F3' }]}
            onPress={() => completeBill('UPI')}
          >
            <Icon name="cellphone" size={28} color="#FFFFFF" />
            <Text style={styles.paymentText}>UPI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentButton, { backgroundColor: '#FF9800' }]}
            onPress={() => completeBill('BANK')}
          >
            <Icon name="bank" size={28} color="#FFFFFF" />
            <Text style={styles.paymentText}>BANK</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => completeBill('CREDIT')}
          >
            <Icon name="credit-card-outline" size={28} color="#FFFFFF" />
            <Text style={styles.paymentText}>CREDIT</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Smart Input Bar */}
      <SmartInputBar onCommand={handleCommand} />
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
  listContent: {
    paddingBottom: 300
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4
  },
  itemUnit: {
    fontSize: 14,
    color: '#999999'
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  quantity: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginHorizontal: 16,
    minWidth: 40,
    textAlign: 'center'
  },
  priceInfo: {
    alignItems: 'flex-end'
  },
  rate: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4
  },
  lineTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2196F3'
  },
  deleteAction: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%'
  },
  editAction: {
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%'
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999999',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 8
  },
  totalPanel: {
    position: 'absolute',
    bottom: 160,
    left: 0,
    right: 0,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  totalLabel: {
    fontSize: 16,
    color: '#666666'
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000'
  },
  gstRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8
  },
  gstLabel: {
    fontSize: 14,
    color: '#666666'
  },
  gstValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'right',
    marginRight: 8
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0'
  },
  grandTotalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000'
  },
  grandTotalValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2196F3'
  },
  paymentBar: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  paymentButton: {
    flex: 1,
    paddingVertical: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4
  }
});

export default POSQuickBillScreen;
