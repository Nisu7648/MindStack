/**
 * SCREEN 6: ADD/EDIT PRODUCT
 * Simple product form without CA language
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AddProductScreen = ({ navigation, route }) => {
  const [product, setProduct] = useState({
    name: '',
    category: '',
    unit: 'pcs',
    sellingPrice: '',
    gstRate: '0',
    openingStock: '0',
    barcode: route.params?.barcode || ''
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const units = ['pcs', 'kg', 'litre', 'meter', 'box', 'dozen'];
  const gstRates = ['0', '5', '12', '18', '28'];

  const saveProduct = async () => {
    if (!product.name || !product.sellingPrice) {
      Alert.alert('Error', 'Please enter product name and price');
      return;
    }

    // TODO: Save to database
    console.log('Saving product:', product);

    Alert.alert(
      'Success',
      'Product saved successfully',
      [
        {
          text: 'Add Another',
          onPress: () => {
            setProduct({
              name: '',
              category: '',
              unit: 'pcs',
              sellingPrice: '',
              gstRate: '0',
              openingStock: '0',
              barcode: ''
            });
          }
        },
        {
          text: 'Done',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Product</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Basic Details */}
        <View style={styles.section}>
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Milk, Bread, Rice"
            value={product.name}
            onChangeText={(text) => setProduct({ ...product, name: text })}
          />

          <Text style={styles.label}>Category</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Grocery, Stationery"
            value={product.category}
            onChangeText={(text) => setProduct({ ...product, category: text })}
          />

          <Text style={styles.label}>Unit</Text>
          <View style={styles.unitSelector}>
            {units.map(unit => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.unitButton,
                  product.unit === unit && styles.unitButtonActive
                ]}
                onPress={() => setProduct({ ...product, unit })}
              >
                <Text style={[
                  styles.unitText,
                  product.unit === unit && styles.unitTextActive
                ]}>
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Selling Price *</Text>
          <View style={styles.priceInput}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.priceField}
              placeholder="0"
              keyboardType="numeric"
              value={product.sellingPrice}
              onChangeText={(text) => setProduct({ ...product, sellingPrice: text })}
            />
          </View>

          <Text style={styles.label}>GST Rate</Text>
          <View style={styles.gstSelector}>
            {gstRates.map(rate => (
              <TouchableOpacity
                key={rate}
                style={[
                  styles.gstButton,
                  product.gstRate === rate && styles.gstButtonActive
                ]}
                onPress={() => setProduct({ ...product, gstRate: rate })}
              >
                <Text style={[
                  styles.gstText,
                  product.gstRate === rate && styles.gstTextActive
                ]}>
                  {rate}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Opening Stock</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
            value={product.openingStock}
            onChangeText={(text) => setProduct({ ...product, openingStock: text })}
          />
        </View>

        {/* Advanced Fields */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.advancedText}>Advanced Options</Text>
          <Icon
            name={showAdvanced ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#2196F3"
          />
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.section}>
            <Text style={styles.label}>Barcode</Text>
            <TextInput
              style={styles.input}
              placeholder="Scan or enter barcode"
              value={product.barcode}
              onChangeText={(text) => setProduct({ ...product, barcode: text })}
            />

            <Text style={styles.label}>Purchase Price</Text>
            <View style={styles.priceInput}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.priceField}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.label}>Min Stock Level</Text>
            <TextInput
              style={styles.input}
              placeholder="Alert when stock goes below"
              keyboardType="numeric"
            />

            <Text style={styles.label}>HSN Code</Text>
            <TextInput
              style={styles.input}
              placeholder="For GST reporting"
              keyboardType="numeric"
            />
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveProduct}
        >
          <Icon name="check" size={24} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>SAVE PRODUCT</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 18,
    marginBottom: 20,
    backgroundColor: '#FAFAFA'
  },
  unitSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20
  },
  unitButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginRight: 12,
    marginBottom: 12
  },
  unitButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3'
  },
  unitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666'
  },
  unitTextActive: {
    color: '#FFFFFF'
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#FAFAFA'
  },
  rupeeSymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2196F3',
    marginRight: 8
  },
  priceField: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#000000'
  },
  gstSelector: {
    flexDirection: 'row',
    marginBottom: 20
  },
  gstButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center'
  },
  gstButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50'
  },
  gstText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666'
  },
  gstTextActive: {
    color: '#FFFFFF'
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0'
  },
  advancedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3'
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF'
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8
  }
});

export default AddProductScreen;
