/**
 * INVOICE LIST SCREEN
 * 
 * Shows:
 * - Invoice number
 * - Customer
 * - Amount
 * - Status
 * - Due indicator
 * 
 * Simple, fast, actionable
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl
} from 'react-native';
import { supabase } from '../../services/supabase';

const INVOICE_STATUS_COLORS = {
  draft: '#9E9E9E',
  sent: '#2196F3',
  partially_paid: '#FF9800',
  paid: '#4CAF50',
  overdue: '#F44336',
  cancelled: '#757575'
};

const INVOICE_STATUS_EMOJI = {
  draft: '📝',
  sent: '📤',
  partially_paid: '💰',
  paid: '✅',
  overdue: '⚠️',
  cancelled: '❌'
};

const InvoiceListScreen = ({ navigation, businessId }) => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [searchQuery, filterStatus, invoices]);

  const loadInvoices = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(name, phone)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvoices(data || []);

    } catch (error) {
      console.error('Load invoices error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    let filtered = [...invoices];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(inv => inv.payment_status === filterStatus);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.invoice_number.toLowerCase().includes(query) ||
        inv.customer?.name.toLowerCase().includes(query)
      );
    }

    setFilteredInvoices(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const isDueToday = (dueDate) => {
    const today = new Date().toISOString().split('T')[0];
    return dueDate.split('T')[0] === today;
  };

  const isOverdue = (dueDate, status) => {
    if (status === 'paid' || status === 'cancelled') return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  const renderInvoiceItem = ({ item }) => {
    const statusColor = INVOICE_STATUS_COLORS[item.payment_status] || '#9E9E9E';
    const statusEmoji = INVOICE_STATUS_EMOJI[item.payment_status] || '📄';
    const overdue = isOverdue(item.due_date, item.payment_status);
    const dueToday = isDueToday(item.due_date);

    return (
      <TouchableOpacity
        style={styles.invoiceCard}
        onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
      >
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
            <Text style={styles.customerName}>{item.customer?.name}</Text>
          </View>
          
          <View style={styles.invoiceAmount}>
            <Text style={styles.amount}>₹{item.total.toLocaleString('en-IN')}</Text>
            {item.balance_due > 0 && (
              <Text style={styles.balanceDue}>
                Due: ₹{item.balance_due.toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.invoiceFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusEmoji}>{statusEmoji}</Text>
            <Text style={styles.statusText}>
              {item.payment_status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>

          <View style={styles.dueInfo}>
            {overdue && (
              <View style={styles.overdueIndicator}>
                <Text style={styles.overdueText}>OVERDUE</Text>
              </View>
            )}
            {dueToday && !overdue && (
              <View style={styles.dueTodayIndicator}>
                <Text style={styles.dueTodayText}>DUE TODAY</Text>
              </View>
            )}
            {!overdue && !dueToday && (
              <Text style={styles.dueDate}>
                Due: {new Date(item.due_date).toLocaleDateString('en-IN')}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📄</Text>
      <Text style={styles.emptyTitle}>No Invoices Yet</Text>
      <Text style={styles.emptyText}>Create your first invoice to get started</Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateInvoice', { businessId })}
      >
        <Text style={styles.createButtonText}>+ Create Invoice</Text>
      </TouchableOpacity>
    </View>
  );

  const statusFilters = [
    { key: 'all', label: 'All' },
    { key: 'sent', label: 'Sent' },
    { key: 'partially_paid', label: 'Partial' },
    { key: 'paid', label: 'Paid' },
    { key: 'overdue', label: 'Overdue' }
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoices</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateInvoice', { businessId })}>
          <Text style={styles.addButton}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search invoices..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        {statusFilters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              filterStatus === filter.key && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus(filter.key)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === filter.key && styles.filterButtonTextActive
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Invoice List */}
      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyList}
      />
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
  addButton: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#FFF'
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 15,
    paddingTop: 0,
    backgroundColor: '#FFF'
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 10
  },
  filterButtonActive: {
    backgroundColor: '#2196F3'
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  filterButtonTextActive: {
    color: '#FFF'
  },
  listContainer: {
    padding: 15
  },
  invoiceCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  invoiceInfo: {
    flex: 1
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  customerName: {
    fontSize: 14,
    color: '#666'
  },
  invoiceAmount: {
    alignItems: 'flex-end'
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  balanceDue: {
    fontSize: 13,
    color: '#F44336',
    fontWeight: '600'
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15
  },
  statusEmoji: {
    fontSize: 14,
    marginRight: 5
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF'
  },
  dueInfo: {
    alignItems: 'flex-end'
  },
  dueDate: {
    fontSize: 12,
    color: '#666'
  },
  overdueIndicator: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12
  },
  overdueText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F44336'
  },
  dueTodayIndicator: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12
  },
  dueTodayText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF9800'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center'
  },
  createButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default InvoiceListScreen;
