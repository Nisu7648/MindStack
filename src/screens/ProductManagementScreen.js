// src/screens/ProductManagementScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput
} from 'react-native';

const ProductManagementScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    // TODO: Load from database
    setProducts([
      { id: 1, name: 'Product A', price: 100, stock: 50, category: 'Electronics' },
      { id: 2, name: 'Product B', price: 200, stock: 30, category: 'Furniture' },
      { id: 3, name: 'Product C', price: 150, stock: 0, category: 'Clothing' }
    ]);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddProduct')}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.list}>
        {filteredProducts.map(product => (
          <TouchableOpacity
            key={product.id}
            style={styles.productCard}
            onPress={() => navigation.navigate('AddProduct', { productId: product.id })}
          >
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productCategory}>{product.category}</Text>
              <View style={styles.productDetails}>
                <Text style={styles.productPrice}>₹{product.price}</Text>
                <Text style={[
                  styles.productStock,
                  { color: product.stock > 0 ? '#4CAF50' : '#f44336' }
                ]}>
                  Stock: {product.stock}
                </Text>
              </View>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  searchSection: {
    backgroundColor: '#fff',
    padding: 15
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  list: {
    flex: 1
  },
  productCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 5
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  productDetails: {
    flexDirection: 'row',
    gap: 15
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50'
  },
  productStock: {
    fontSize: 14,
    fontWeight: '600'
  },
  arrow: {
    fontSize: 24,
    color: '#ccc'
  }
});

export default ProductManagementScreen;
