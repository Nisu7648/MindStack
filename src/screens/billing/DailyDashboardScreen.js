/**
 * SCREEN 1: DAILY BILLING DASHBOARD
 * Main entry point - Default screen when app opens
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SmartInputBar from '../../components/billing/SmartInputBar';

const DailyDashboardScreen = ({ navigation }) => {
  const [bills, setBills] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState({
    totalBills: 0,
    totalAmount: 0,
    cashAmount: 0,
    upiAmount: 0
  });

  useEffect(() => {
    loadTodayBills();
  }, []);

  const loadTodayBills = async () => {
    // TODO: Load from database
    const mockBills = [
      { id: '1', invoiceNo: 'INV001', amount: 1250, paymentMode: 'CASH', time: '10:30 AM' },
      { id: '2', invoiceNo: 'INV002', amount: 3400, paymentMode: 'UPI', time: '11:15 AM' },
      { id: '3', invoiceNo: 'INV003', amount: 850, paymentMode: 'CASH', time: '12:05 PM' }
    ];
    setBills(mockBills);
    
    setTodayStats({
      totalBills: mockBills.length,
      totalAmount: mockBills.reduce((sum, b) => sum + b.amount, 0),
      cashAmount: mockBills.filter(b => b.paymentMode === 'CASH').reduce((sum, b) => sum + b.amount, 0),
      upiAmount: mockBills.filter(b => b.paymentMode === 'UPI').reduce((sum, b) => sum + b.amount, 0)
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodayBills();
    setRefreshing(false);
  };

  const renderBillItem = ({ item }) => (
    <TouchableOpacity
      style={styles.billCard}
      onPress={() => navigation.navigate('InvoicePreview', { invoiceId: item.id })}
    >
      <View style={styles.billHeader}>
        <Text style={styles.invoiceNo}>{item.invoiceNo}</Text>
        <Text style={styles.billTime}>{item.time}</Text>
      </View>
      <View style={styles.billFooter}>
        <Text style={styles.billAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
        <View style={[styles.paymentBadge, { backgroundColor: item.paymentMode === 'CASH' ? '#4CAF50' : '#2196F3' }]}>
          <Text style={styles.paymentText}>{item.paymentMode}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.businessName}>My Shop</Text>
          <Text style={styles.dateText}>{new Date().toLocaleDateString('en-IN', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          })}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      {/* Today's Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{todayStats.totalBills}</Text>
          <Text style={styles.statLabel}>Bills</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>₹{todayStats.totalAmount.toLocaleString('en-IN')}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>₹{todayStats.cashAmount.toLocaleString('en-IN')}</Text>
          <Text style={styles.statLabel}>Cash</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>₹{todayStats.upiAmount.toLocaleString('en-IN')}</Text>
          <Text style={styles.statLabel}>UPI</Text>
        </View>
      </View>

      {/* Bills List */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Today's Bills</Text>
      </View>

      <FlatList
        data={bills}
        renderItem={renderBillItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt-text-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyText}>No bills today</Text>
            <Text style={styles.emptySubtext}>Tap + to create your first bill</Text>
          </View>
        }
      />

      {/* Floating Action Buttons */}
      <TouchableOpacity
        style={[styles.fab, styles.fabPrimary]}
        onPress={() => navigation.navigate('POSQuickBill')}
      >
        <Icon name="plus" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.fab, styles.fabSecondary]}
        onPress={() => navigation.navigate('BarcodeScanner')}
      >
        <Icon name="camera" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Smart Input Bar */}
      <SmartInputBar
        onCommand={(command) => {
          console.log('Command:', command);
          // Handle voice/text commands
        }}
      />
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
    borderBottomColor: '#F0F0F0'
  },
  headerLeft: {
    flex: 1
  },
  businessName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4
  },
  dateText: {
    fontSize: 14,
    color: '#666666'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6
  },
  statusText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500'
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA'
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666666'
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  invoiceNo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000'
  },
  billTime: {
    fontSize: 14,
    color: '#666666'
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  billAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2196F3'
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
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
  fab: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  fabPrimary: {
    backgroundColor: '#2196F3',
    right: 20,
    bottom: 100
  },
  fabSecondary: {
    backgroundColor: '#FF9800',
    right: 20,
    bottom: 180
  }
});

export default DailyDashboardScreen;
