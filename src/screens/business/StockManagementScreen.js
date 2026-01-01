/**
 * STOCK MANAGEMENT SCREEN
 * Complete inventory management
 * 
 * Features:
 * - Stock list with search
 * - Low stock alerts
 * - Quick stock adjustment
 * - Add/Edit items
 * - Stock value summary
 * - Category filter
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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import stockManagementService from '../../services/business/stockManagementService';

const StockManagementScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState('all'); // all, low, out
  const [refreshing, setRefreshing] = useState(false);
  const [stockStats, setStockStats] = useState({
    totalItems: 0,
    inStock: 0,
    outOfStock: 0,
    lowStock: 0,
    totalValue: 0
  });

  useEffect(() => {
    loadStock();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchText, filter, items]);

  const loadStock = async () => {
    try {
      const allItems = await stockManagementService.listItems();
      setItems(allItems);

      const stats = await stockManagementService.getStockStatistics();
      setStockStats(stats);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Apply search
    if (searchText) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.item_code.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Apply filter
    if (filter === 'low') {
      filtered = filtered.filter(item => 
        item.current_stock > 0 && item.current_stock <= item.min_stock_level
      );
    } else if (filter === 'out') {
      filtered = filtered.filter(item => item.current_stock === 0);
    }

    setFilteredItems(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStock();
    setRefreshing(false);
  };

  const quickAdjustStock = (item) => {
    Alert.alert(
      'Adjust Stock',
      `Current: ${item.current_stock} ${item.unit}`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Add Stock',
          onPress: () => showStockInput(item, 'add')
        },
        {
          text: 'Remove Stock',
          onPress: () => showStockInput(item, 'remove')
        },
        {
          text: 'Set Stock',
          onPress: () => showStockInput(item, 'set')
        }
      ]
    );
  };

  const showStockInput = (item, action) => {
    Alert.prompt(
      action === 'set' ? 'Set Stock' : action === 'add' ? 'Add Stock' : 'Remove Stock',
      `Enter quantity (${item.unit})`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'OK',
          onPress: async (value) => {
            const quantity = parseFloat(value);
            if (isNaN(quantity) || quantity <= 0) {
              Alert.alert('Error', 'Invalid quantity');
              return;
            }

            try {
              let newStock;
              if (action === 'set') {
                newStock = quantity;
              } else if (action === 'add') {
                newStock = item.current_stock + quantity;
              } else {
                newStock = item.current_stock - quantity;
              }

              await stockManagementService.adjustStock(
                item.id,
                newStock,
                `Manual ${action} via app`
              );

              Alert.alert('Success', 'Stock updated');
              loadStock();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const deleteItem = (item) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.item_name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await stockManagementService.deleteItem(item.id);
              Alert.alert('Success', 'Item deleted');
              loadStock();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const getStockStatus = (item) => {
    if (item.current_stock === 0) {
      return { text: 'Out of Stock', color: '#F44336' };
    } else if (item.current_stock <= item.min_stock_level) {
      return { text: 'Low Stock', color: '#FF9800' };
    } else {
      return { text: 'In Stock', color: '#4CAF50' };
    }
  };

  const renderItem = ({ item }) => {
    const status = getStockStatus(item);

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => navigation.navigate('ProductDetails', { itemId: item.id })}
        onLongPress={() => quickAdjustStock(item)}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.item_name}</Text>
            <Text style={styles.itemCode}>{item.item_code}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="cube" size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.current_stock} {item.unit}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="cash" size={16} color="#666" />
            <Text style={styles.detailText}>
              ₹{item.selling_price}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="pricetag" size={16} color="#666" />
            <Text style={styles.detailText}>
              GST {item.gst_rate}%
            </Text>
          </View>
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('EditProduct', { item })}
          >
            <Ionicons name="create" size={18} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => quickAdjustStock(item)}
          >
            <Ionicons name="swap-vertical" size={18} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteItem(item)}
          >
            <Ionicons name="trash" size={18} color="#F44336" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stock Management</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddProduct')}>
          <Ionicons name="add-circle" size={28} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stockStats.totalItems}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>
            {stockStats.inStock}
          </Text>
          <Text style={styles.statLabel}>In Stock</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#FF9800' }]}>
            {stockStats.lowStock}
          </Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#F44336' }]}>
            {stockStats.outOfStock}
          </Text>
          <Text style={styles.statLabel}>Out of Stock</Text>
        </View>
      </View>

      {/* Stock Value */}
      <View style={styles.valueCard}>
        <Text style={styles.valueLabel}>Total Stock Value</Text>
        <Text style={styles.valueAmount}>
          ₹{stockStats.totalValue?.toLocaleString('en-IN') || 0}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'low' && styles.filterTabActive]}
          onPress={() => setFilter('low')}
        >
          <Text style={[styles.filterTabText, filter === 'low' && styles.filterTabTextActive]}>
            Low Stock
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'out' && styles.filterTabActive]}
          onPress={() => setFilter('out')}
        >
          <Text style={[styles.filterTabText, filter === 'out' && styles.filterTabTextActive]}>
            Out of Stock
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.itemsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#E0E0E0" />
            <Text style={styles.emptyText}>No items found</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddProduct')}
            >
              <Text style={styles.addButtonText}>Add First Item</Text>
            </TouchableOpacity>
          </View>
        }
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  statCard: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 11,
    color: '#666'
  },
  valueCard: {
    backgroundColor: '#2196F3',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  valueLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    marginBottom: 4
  },
  valueAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 8,
    color: '#212121'
  },
  filterTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 8
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  filterTabActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3'
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666'
  },
  filterTabTextActive: {
    color: '#FFFFFF'
  },
  itemsList: {
    padding: 16,
    paddingBottom: 100
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4
  },
  itemCode: {
    fontSize: 13,
    color: '#666'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600'
  },
  itemDetails: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  detailText: {
    fontSize: 13,
    color: '#666'
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5'
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 18
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600'
  }
});

export default StockManagementScreen;
