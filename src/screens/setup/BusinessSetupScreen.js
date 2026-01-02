/**
 * BUSINESS SETUP SCREEN - ENHANCED WITH GLOBAL CURRENCY
 * 
 * Country selection with automatic currency and number formatting
 * Real-time preview of formatting based on selected country
 * Supports 30+ countries with proper formatting rules
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Switch
} from 'react-native';
import { 
  getCountryList, 
  getCountryConfig, 
  formatCurrency, 
  formatNumber,
  numberToWords 
} from '../../services/global/CurrencyFormattingService';
import { SetupService } from '../../services/SetupService';

const BusinessSetupScreen = ({ navigation }) => {
  const [businessData, setBusinessData] = useState({
    businessName: '',
    businessType: '',
    country: 'IN',
    address: '',
    phone: '',
    email: '',
    taxRegistrationNumber: '',
    financialYearStart: '04', // April for India
    financialYearEnd: '03',    // March for India
    gstRegistered: false,
    confirmationChecked: false
  });

  const [countryConfig, setCountryConfig] = useState(getCountryConfig('IN'));
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countryList] = useState(getCountryList());
  const [searchQuery, setSearchQuery] = useState('');
  const [previewAmount, setPreviewAmount] = useState('100000');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Update country config when country changes
    const config = getCountryConfig(businessData.country);
    setCountryConfig(config);
  }, [businessData.country]);

  const handleCountrySelect = (countryCode) => {
    const config = getCountryConfig(countryCode);
    
    setBusinessData({
      ...businessData,
      country: countryCode,
      // Auto-set financial year based on country
      financialYearStart: getDefaultFinancialYearStart(countryCode),
      financialYearEnd: getDefaultFinancialYearEnd(countryCode)
    });
    
    setShowCountryPicker(false);
    setSearchQuery('');
  };

  const getDefaultFinancialYearStart = (countryCode) => {
    const defaults = {
      IN: '04', US: '01', GB: '04', AU: '07', CA: '01',
      SG: '01', AE: '01', JP: '04', CN: '01'
    };
    return defaults[countryCode] || '01';
  };

  const getDefaultFinancialYearEnd = (countryCode) => {
    const defaults = {
      IN: '03', US: '12', GB: '03', AU: '06', CA: '12',
      SG: '12', AE: '12', JP: '03', CN: '12'
    };
    return defaults[countryCode] || '12';
  };

  const filteredCountries = countryList.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.currency.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateForm = () => {
    const newErrors = {};

    if (!businessData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!businessData.businessType) {
      newErrors.businessType = 'Please select a business type';
    }

    if (!businessData.country) {
      newErrors.country = 'Please select country';
    }

    if (!businessData.confirmationChecked) {
      newErrors.confirmation = 'Please confirm to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // Save business data with country config
      const businessSetup = {
        ...businessData,
        currency: countryConfig.currency,
        currencySymbol: countryConfig.currencySymbol,
        currencyName: countryConfig.currencyName,
        numberFormat: countryConfig.numberFormat,
        decimalSeparator: countryConfig.decimalSeparator,
        thousandSeparator: countryConfig.thousandSeparator,
        decimalPlaces: countryConfig.decimalPlaces,
        currencyPosition: countryConfig.currencyPosition,
        taxSystem: countryConfig.taxSystem,
        dateFormat: countryConfig.dateFormat,
        timeFormat: countryConfig.timeFormat,
        createdAt: new Date().toISOString()
      };

      const result = await SetupService.saveBusinessSetup(businessSetup);

      if (result.success) {
        Alert.alert(
          'Success',
          'Business setup completed successfully!',
          [{ text: 'OK', onPress: () => navigation.replace('Dashboard') }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to save setup');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save business setup');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFormattedPreview = () => {
    const amount = parseFloat(previewAmount) || 100000;
    return {
      formatted: formatCurrency(amount, businessData.country),
      number: formatNumber(amount, businessData.country),
      words: numberToWords(Math.floor(amount), businessData.country)
    };
  };

  const preview = getFormattedPreview();

  return (
    <View style={styles.container}>
      {/* Top Bar with Menu */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => navigation.openDrawer?.() || Alert.alert('Menu', 'Menu functionality')}
        >
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏢 Set up your business</Text>
          <Text style={styles.subtitle}>Configure your business details with global currency support</Text>
        </View>

        {/* Business Identity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧩 BUSINESS IDENTITY</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Business Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.businessName && styles.inputError]}
              placeholder="Enter business name"
              value={businessData.businessName}
              onChangeText={(text) => {
                setBusinessData({ ...businessData, businessName: text });
                setErrors({ ...errors, businessName: '' });
              }}
            />
            {errors.businessName && <Text style={styles.errorText}>{errors.businessName}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Business Type <Text style={styles.required}>*</Text></Text>
            <View style={styles.businessTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.businessTypeCard,
                  businessData.businessType === 'trader' && styles.businessTypeCardSelected
                ]}
                onPress={() => {
                  setBusinessData({ ...businessData, businessType: 'trader' });
                  setErrors({ ...errors, businessType: '' });
                }}
              >
                <Text style={styles.businessTypeIcon}>🏪</Text>
                <Text style={[
                  styles.businessTypeText,
                  businessData.businessType === 'trader' && styles.businessTypeTextSelected
                ]}>
                  Trader / Shop
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.businessTypeCard,
                  businessData.businessType === 'service' && styles.businessTypeCardSelected
                ]}
                onPress={() => {
                  setBusinessData({ ...businessData, businessType: 'service' });
                  setErrors({ ...errors, businessType: '' });
                }}
              >
                <Text style={styles.businessTypeIcon}>🧑‍💻</Text>
                <Text style={[
                  styles.businessTypeText,
                  businessData.businessType === 'service' && styles.businessTypeTextSelected
                ]}>
                  Service Business
                </Text>
              </TouchableOpacity>
            </View>
            {errors.businessType && <Text style={styles.errorText}>{errors.businessType}</Text>}
          </View>
        </View>

        {/* Country & Currency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌍 COUNTRY & CURRENCY</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Country <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={styles.countrySelector}
              onPress={() => setShowCountryPicker(true)}
            >
              <View style={styles.countrySelectorContent}>
                <View>
                  <Text style={styles.countryName}>{countryConfig.name}</Text>
                  <Text style={styles.countryDetails}>
                    {countryConfig.currency} ({countryConfig.currencySymbol}) • {countryConfig.taxSystem}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Currency Preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>💰 Currency & Format Preview</Text>
            
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Currency:</Text>
              <Text style={styles.previewValue}>
                {countryConfig.currencyName} ({countryConfig.currencySymbol})
              </Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Number Format:</Text>
              <Text style={styles.previewValue}>
                {countryConfig.numberFormat === 'indian' ? 'Indian (Lakhs/Crores)' : 
                 countryConfig.numberFormat === 'european' ? 'European' : 'Western'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.exampleSection}>
              <Text style={styles.exampleTitle}>Example: {previewAmount}</Text>
              
              <View style={styles.exampleRow}>
                <Text style={styles.exampleLabel}>Currency:</Text>
                <Text style={styles.exampleValue}>{preview.formatted}</Text>
              </View>

              <View style={styles.exampleRow}>
                <Text style={styles.exampleLabel}>Number:</Text>
                <Text style={styles.exampleValue}>{preview.number}</Text>
              </View>

              <View style={styles.exampleRow}>
                <Text style={styles.exampleLabel}>In Words:</Text>
                <Text style={styles.exampleValueWords}>{preview.words}</Text>
              </View>
            </View>

            <TextInput
              style={styles.previewInput}
              placeholder="Enter amount to preview"
              keyboardType="numeric"
              value={previewAmount}
              onChangeText={setPreviewAmount}
            />
          </View>
        </View>

        {/* Contact Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 CONTACT DETAILS</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Business Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter business address"
              value={businessData.address}
              onChangeText={(text) => setBusinessData({ ...businessData, address: text })}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={businessData.phone}
              onChangeText={(text) => setBusinessData({ ...businessData, phone: text })}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              value={businessData.email}
              onChangeText={(text) => setBusinessData({ ...businessData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Tax Registration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧾 TAX REGISTRATION</Text>

          <View style={styles.inputContainer}>
            <View style={styles.toggleContainer}>
              <Text style={styles.label}>
                {countryConfig.taxSystem} Registered?
              </Text>
              <Switch
                value={businessData.gstRegistered}
                onValueChange={(value) => setBusinessData({ ...businessData, gstRegistered: value })}
                trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {businessData.gstRegistered && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {countryConfig.taxSystem} Registration Number
              </Text>
              <TextInput
                style={styles.input}
                placeholder={`Enter ${countryConfig.taxSystem} number`}
                value={businessData.taxRegistrationNumber}
                onChangeText={(text) => setBusinessData({ ...businessData, taxRegistrationNumber: text })}
              />
              <Text style={styles.hint}>
                {getTaxHint(countryConfig.taxSystem)}
              </Text>
            </View>
          )}
        </View>

        {/* Financial Year */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 FINANCIAL YEAR</Text>
          <View style={styles.financialYearRow}>
            <View style={styles.financialYearItem}>
              <Text style={styles.financialYearLabel}>Start Month</Text>
              <TextInput
                style={styles.financialYearInput}
                placeholder="MM"
                value={businessData.financialYearStart}
                onChangeText={(text) => setBusinessData({ ...businessData, financialYearStart: text })}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <View style={styles.financialYearItem}>
              <Text style={styles.financialYearLabel}>End Month</Text>
              <TextInput
                style={styles.financialYearInput}
                placeholder="MM"
                value={businessData.financialYearEnd}
                onChangeText={(text) => setBusinessData({ ...businessData, financialYearEnd: text })}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>
          <Text style={styles.hint}>
            Default: {getMonthName(businessData.financialYearStart)} to {getMonthName(businessData.financialYearEnd)}
          </Text>
        </View>

        {/* Confirmation */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.confirmationContainer}
            onPress={() => {
              setBusinessData({ ...businessData, confirmationChecked: !businessData.confirmationChecked });
              setErrors({ ...errors, confirmation: '' });
            }}
          >
            <View style={[
              styles.checkbox,
              businessData.confirmationChecked && styles.checkboxChecked
            ]}>
              {businessData.confirmationChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.confirmationText}>
              I confirm that the information provided is accurate
            </Text>
          </TouchableOpacity>
          {errors.confirmation && <Text style={styles.errorText}>{errors.confirmation}</Text>}
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Complete Setup'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search country or currency..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView style={styles.countryList}>
              {filteredCountries.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.countryItem,
                    businessData.country === country.code && styles.countryItemSelected
                  ]}
                  onPress={() => handleCountrySelect(country.code)}
                >
                  <View style={styles.countryItemContent}>
                    <Text style={styles.countryItemName}>{country.name}</Text>
                    <Text style={styles.countryItemDetails}>
                      {country.currency} ({country.currencySymbol}) • {country.taxSystem}
                    </Text>
                  </View>
                  {businessData.country === country.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  function getTaxHint(taxSystem) {
    const hints = {
      'GST': 'e.g., 29ABCDE1234F1Z5',
      'VAT': 'e.g., GB123456789',
      'SALES_TAX': 'State-specific registration number',
      'CONSUMPTION_TAX': 'Japanese consumption tax number',
      'IVA': 'Mexican IVA number',
      'ICMS': 'Brazilian ICMS number',
      'PPN': 'Indonesian PPN number',
      'SST': 'Malaysian SST number',
      'MOMS': 'Nordic VAT number',
      'KDV': 'Turkish KDV number',
      'MWST': 'Swiss MWST number',
      'MVA': 'Norwegian MVA number',
      'GST_HST': 'Canadian GST/HST number'
    };
    return hints[taxSystem] || 'Tax registration number';
  }

  function getMonthName(monthNum) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[parseInt(monthNum) - 1] || '';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  topBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  menuButton: {
    width: 30,
    height: 24,
    justifyContent: 'space-between'
  },
  menuLine: {
    height: 3,
    backgroundColor: '#1A1A1A',
    borderRadius: 2
  },
  scrollView: {
    flex: 1
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#666'
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 15,
    padding: 15
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 15
  },
  inputContainer: {
    marginBottom: 15
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8
  },
  required: {
    color: '#f44336'
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A'
  },
  inputError: {
    borderColor: '#f44336'
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  businessTypeContainer: {
    flexDirection: 'row',
    gap: 10
  },
  businessTypeCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center'
  },
  businessTypeCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9'
  },
  businessTypeIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  businessTypeText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  businessTypeTextSelected: {
    color: '#4CAF50',
    fontWeight: '600'
  },
  countrySelector: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12
  },
  countrySelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  countryDetails: {
    fontSize: 12,
    color: '#666'
  },
  chevron: {
    fontSize: 24,
    color: '#666'
  },
  previewCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 15,
    marginTop: 10
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  previewLabel: {
    fontSize: 13,
    color: '#666'
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12
  },
  exampleSection: {
    marginBottom: 12
  },
  exampleTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8
  },
  exampleRow: {
    marginBottom: 6
  },
  exampleLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2
  },
  exampleValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  exampleValueWords: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    fontStyle: 'italic'
  },
  previewInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff'
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  financialYearRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 8
  },
  financialYearItem: {
    flex: 1
  },
  financialYearLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6
  },
  financialYearInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A',
    textAlign: 'center'
  },
  confirmationContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50'
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  confirmationText: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    margin: 15,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc'
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  modalClose: {
    fontSize: 24,
    color: '#666'
  },
  searchInput: {
    margin: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    fontSize: 16
  },
  countryList: {
    maxHeight: 400
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  countryItemSelected: {
    backgroundColor: '#E8F5E9'
  },
  countryItemContent: {
    flex: 1
  },
  countryItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  countryItemDetails: {
    fontSize: 12,
    color: '#666'
  }
});

export default BusinessSetupScreen;
