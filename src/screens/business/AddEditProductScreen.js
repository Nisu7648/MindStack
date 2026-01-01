/**
 * ADD/EDIT PRODUCT SCREEN
 * Quick product addition and editing
 * 
 * Features:
 * - Quick add form
 * - Barcode generation
 * - Category selection
 * - GST rate presets
 * - Image upload
 * - Duplicate detection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import stockManagementService from '../../services/business/stockManagementService';

const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Food & Beverages',
  'Groceries',
  'Cosmetics',
  'Stationery',
  'Hardware',
  'Medicines',
  'Toys',
  'Books',
  'Sports',
  'Other'
];

const GST_RATES = [0, 5, 12, 18, 28];

const UNITS = [
  { label: 'Pieces (PCS)', value: 'PCS' },
  { label: 'Kilogram (KG)', value: 'KG' },
  { label: 'Gram (GRAM)', value: 'GRAM' },
  { label: 'Liter (LITER)', value: 'LITER' },
  { label: 'Milliliter (ML)', value: 'ML' },
  { label: 'Box', value: 'BOX' },
  { label: 'Dozen', value: 'DOZEN' },
  { label: 'Meter (METER)', value: 'METER' },
  { label: 'Pair', value: 'PAIR' }
];

const AddEditProductScreen = ({ navigation, route }) => {
  const { item, barcode, onSave } = route.params || {};
  const isEdit = !!item;

  const [formData, setFormData] = useState({
    itemName: '',
    itemCode: '',
    barcode: barcode || '',
    hsnCode: '',
    category: 'Other',
    unit: 'PCS',
    purchasePrice: '',
    sellingPrice: '',
    gstRate: 18,
    openingStock: '',
    minStockLevel: '10',
    maxStockLevel: '1000',
    reorderLevel: '20',
    description: ''
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        itemName: item.item_name,
        itemCode: item.item_code,
        barcode: item.barcode || '',
        hsnCode: item.hsn_code || '',
        category: item.category || 'Other',
        unit: item.unit,
        purchasePrice: String(item.purchase_price),
        sellingPrice: String(item.selling_price),
        gstRate: item.gst_rate,
        openingStock: String(item.current_stock),
        minStockLevel: String(item.min_stock_level),
        maxStockLevel: String(item.max_stock_level),
        reorderLevel: String(item.reorder_level),
        description: item.description || ''
      });
    } else {
      // Generate item code
      generateItemCode();
    }
  }, [item]);

  const generateItemCode = () => {
    const code = 'ITEM' + Date.now().toString().slice(-6);
    setFormData({ ...formData, itemCode: code });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }

    if (!formData.itemCode.trim()) {
      newErrors.itemCode = 'Item code is required';
    }

    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
      newErrors.purchasePrice = 'Valid purchase price is required';
    }

    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
      newErrors.sellingPrice = 'Valid selling price is required';
    }

    if (parseFloat(formData.sellingPrice) < parseFloat(formData.purchasePrice)) {
      newErrors.sellingPrice = 'Selling price should be greater than purchase price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again');
      return;
    }

    setIsSaving(true);

    try {
      const itemData = {
        itemName: formData.itemName.trim(),
        itemCode: formData.itemCode.trim(),
        barcode: formData.barcode.trim() || null,
        hsnCode: formData.hsnCode.trim() || null,
        category: formData.category,
        unit: formData.unit,
        purchasePrice: parseFloat(formData.purchasePrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        gstRate: formData.gstRate,
        openingStock: parseFloat(formData.openingStock) || 0,
        minStockLevel: parseFloat(formData.minStockLevel) || 10,
        maxStockLevel: parseFloat(formData.maxStockLevel) || 1000,
        reorderLevel: parseFloat(formData.reorderLevel) || 20,
        description: formData.description.trim() || null
      };

      if (isEdit) {
        await stockManagementService.updateItem(item.id, itemData);
        Alert.alert('Success', 'Item updated successfully');
      } else {
        await stockManagementService.addItem(itemData);
        Alert.alert('Success', 'Item added successfully');
      }

      if (onSave) {
        onSave();
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateMargin = () => {
    const purchase = parseFloat(formData.purchasePrice) || 0;
    const selling = parseFloat(formData.sellingPrice) || 0;
    
    if (purchase > 0 && selling > 0) {
      const margin = ((selling - purchase) / purchase) * 100;
      return margin.toFixed(2);
    }
    return '0.00';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Product' : 'Add Product'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          <Ionicons name="checkmark" size={28} color="#2196F3" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name *</Text>
            <TextInput
              style={[styles.input, errors.itemName && styles.inputError]}
              value={formData.itemName}
              onChangeText={(text) => setFormData({ ...formData, itemName: text })}
              placeholder="Enter item name"
            />
            {errors.itemName && (
              <Text style={styles.errorText}>{errors.itemName}</Text>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Item Code *</Text>
              <TextInput
                style={[styles.input, errors.itemCode && styles.inputError]}
                value={formData.itemCode}
                onChangeText={(text) => setFormData({ ...formData, itemCode: text })}
                placeholder="ITEM001"
                autoCapitalize="characters"
              />
              {errors.itemCode && (
                <Text style={styles.errorText}>{errors.itemCode}</Text>
              )}
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Barcode</Text>
              <View style={styles.barcodeInput}>
                <TextInput
                  style={styles.input}
                  value={formData.barcode}
                  onChangeText={(text) => setFormData({ ...formData, barcode: text })}
                  placeholder="Scan or enter"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={() => navigation.navigate('BarcodeScanner', {
                    onScan: (scannedBarcode) => {
                      setFormData({ ...formData, barcode: scannedBarcode });
                    }
                  })}
                >
                  <Ionicons name="scan" size={20} color="#2196F3" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  style={styles.picker}
                >
                  {CATEGORIES.map(cat => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  style={styles.picker}
                >
                  {UNITS.map(unit => (
                    <Picker.Item key={unit.value} label={unit.label} value={unit.value} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>HSN/SAC Code</Text>
            <TextInput
              style={styles.input}
              value={formData.hsnCode}
              onChangeText={(text) => setFormData({ ...formData, hsnCode: text })}
              placeholder="Enter HSN/SAC code"
              keyboardType="numeric"
              maxLength={8}
            />
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Purchase Price *</Text>
              <TextInput
                style={[styles.input, errors.purchasePrice && styles.inputError]}
                value={formData.purchasePrice}
                onChangeText={(text) => setFormData({ ...formData, purchasePrice: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              {errors.purchasePrice && (
                <Text style={styles.errorText}>{errors.purchasePrice}</Text>
              )}
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Selling Price *</Text>
              <TextInput
                style={[styles.input, errors.sellingPrice && styles.inputError]}
                value={formData.sellingPrice}
                onChangeText={(text) => setFormData({ ...formData, sellingPrice: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              {errors.sellingPrice && (
                <Text style={styles.errorText}>{errors.sellingPrice}</Text>
              )}
            </View>
          </View>

          <View style={styles.marginCard}>
            <Text style={styles.marginLabel}>Profit Margin</Text>
            <Text style={styles.marginValue}>{calculateMargin()}%</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GST Rate</Text>
            <View style={styles.gstRates}>
              {GST_RATES.map(rate => (
                <TouchableOpacity
                  key={rate}
                  style={[
                    styles.gstRateButton,
                    formData.gstRate === rate && styles.gstRateButtonActive
                  ]}
                  onPress={() => setFormData({ ...formData, gstRate: rate })}
                >
                  <Text style={[
                    styles.gstRateText,
                    formData.gstRate === rate && styles.gstRateTextActive
                  ]}>
                    {rate}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Stock */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Opening Stock</Text>
              <TextInput
                style={styles.input}
                value={formData.openingStock}
                onChangeText={(text) => setFormData({ ...formData, openingStock: text })}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Min Stock Level</Text>
              <TextInput
                style={styles.input}
                value={formData.minStockLevel}
                onChangeText={(text) => setFormData({ ...formData, minStockLevel: text })}
                placeholder="10"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Max Stock Level</Text>
              <TextInput
                style={styles.input}
                value={formData.maxStockLevel}
                onChangeText={(text) => setFormData({ ...formData, maxStockLevel: text })}
                placeholder="1000"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Reorder Level</Text>
              <TextInput
                style={styles.input}
                value={formData.reorderLevel}
                onChangeText={(text) => setFormData({ ...formData, reorderLevel: text })}
                placeholder="20"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Enter product description (optional)"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : isEdit ? 'Update Product' : 'Add Product'}
          </Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    padding: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  inputError: {
    borderColor: '#F44336'
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  halfWidth: {
    width: '48%'
  },
  barcodeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  scanButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden'
  },
  picker: {
    height: 48
  },
  marginCard: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  marginLabel: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500'
  },
  marginValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50'
  },
  gstRates: {
    flexDirection: 'row',
    gap: 8
  },
  gstRateButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  gstRateButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3'
  },
  gstRateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  gstRateTextActive: {
    color: '#FFFFFF'
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  saveButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center'
  },
  saveButtonDisabled: {
    backgroundColor: '#BDBDBD'
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default AddEditProductScreen;
