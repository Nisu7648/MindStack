/**
 * INVENTORY SCREEN
 * Simple stock management - business focused
 * Color indicators: Green/Yellow/Red
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import inventoryEngine, { STOCK_STATUS } from '../../services/pos/inventoryEngine';

const InventoryScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, filterStatus, products]);

  const loadProducts = async () => {
    try {
      const result = await inventoryEngine.getAllProducts();
      if (result.success) {
        setProducts(result.products);
      }
    } catch (error) {
      console.error('Load products error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.item_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    setFilteredProducts(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case STOCK_STATUS.HEALTHY:
        return '#4CAF50';
      case STOCK_STATUS.LOW:
        return '#FF9800';
      case STOCK_STATUS.OUT:
        return '#F44336';
      case STOCK_STATUS.DEAD:
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case STOCK_STATUS.HEALTHY:
        return 'check-circle';
      case STOCK_STATUS.LOW:
        return 'alert-circle';
      case STOCK_STATUS.OUT:
        return 'close-circle';
      case STOCK_STATUS.DEAD:
        return 'information';
      default:
        return 'help-circle';
    }
  };

  const handleAdjustStock = (product) => {
    Alert.prompt(
      'Adjust Stock',
      `Current: ${product.current_stock} ${product.unit}\nEnter adjustment (+/-):`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Adjust',
          onPress: async (value) => {
            const qty = parseFloat(value);
            if (isNaN(qty)) {
              Alert.alert('Error', 'Invalid quantity');
              return;
            }

            Alert.prompt(
              'Reason Required',
              'Why are you adjusting stock?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm',
                  onPress: async (reason) => {
                    if (!reason || reason.trim() === '') {
                      Alert.alert('Error', 'Reason is mandatory');
                      return;
                    }

                    const result = await inventoryEngine.adjustStock(
                      product.id,
                      qty,
                      reason
                    );

                    if (result.success) {
                      Alert.alert('Success', 'Stock adjusted');
                      loadProducts();
                    } else {
                      Alert.alert('Error', result.error);
                    }
                  }
                }
              ],
              'plain-text'
            );
          }
        }
      ],
      'plain-text'
    );
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleAdjustStock(item)}
    >
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.item_name}</Text>
          <Text style={styles.productCategory}>{item.category || 'General'}</Text>
        </View>
        <Icon
          name={getStatusIcon(item.status)}
          size={32}
          color={getStatusColor(item.status)}
        />
      </View>

      <View style={styles.productDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Stock</Text>
          <Text style={[
            styles.detailValue,
            { color: getStatusColor(item.status) }
          ]}>
            {item.current_stock} {item.unit}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Min Level</Text>
          <Text style={styles.detailValue}>
            {item.min_stock_level} {item.unit}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price</Text>
          <Text style={styles.detailValue}>
            ₹{item.selling_price.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {item.status === STOCK_STATUS.OUT && (
        <View style={styles.alertBanner}>
          <Icon name="alert" size={16} color="#FFFFFF" />
          <Text style={styles.alertText}>OUT OF STOCK</Text>
        </View>
      )}

      {item.status === STOCK_STATUS.LOW && (
        <View style={[styles.alertBanner, { backgroundColor: '#FF9800' }]}>
          <Icon name="alert" size={16} color="#FFFFFF" />
          <Text style={styles.alertText}>LOW STOCK</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={24} color="#666666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {['ALL', STOCK_STATUS.HEALTHY, STOCK_STATUS.LOW, STOCK_STATUS.OUT].map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filterStatus === status && styles.filterButtonActive
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[
              styles.filterText,
              filterStatus === status && styles.filterTextActive
            ]}>
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="package-variant" size={80} color="#E0E0E0" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />

      {/* Add Product Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
      >
        <Icon name="plus" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  searchContainer: {
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
    fontSize: 16,
    marginLeft: 8,
    color: '#000000'
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3'
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666'
  },
  filterTextActive: {
    color: '#FFFFFF'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4
  },
  productCategory: {
    fontSize: 14,
    color: '#666666'
  },
  productDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000'
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 12
  },
  alertText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
    marginTop: 16
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  }
});

export default InventoryScreen;
