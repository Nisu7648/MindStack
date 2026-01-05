import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

const COUNTRIES = [
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', taxSystem: 'GST' },
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', taxSystem: 'Sales Tax' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', taxSystem: 'VAT' },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'C$', taxSystem: 'GST/HST' },
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$', taxSystem: 'GST' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', symbol: 'د.إ', taxSystem: 'VAT' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', symbol: 'S$', taxSystem: 'GST' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', symbol: 'RM', taxSystem: 'SST' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', symbol: 'NZ$', taxSystem: 'GST' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', symbol: 'R', taxSystem: 'VAT' },
  { code: 'EU', name: 'European Union', currency: 'EUR', symbol: '€', taxSystem: 'VAT' },
  { code: 'JP', name: 'Japan', currency: 'JPY', symbol: '¥', taxSystem: 'Consumption Tax' },
  { code: 'CN', name: 'China', currency: 'CNY', symbol: '¥', taxSystem: 'VAT' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', symbol: 'R$', taxSystem: 'ICMS/IPI' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', symbol: 'Mex$', taxSystem: 'IVA' },
];

const BUSINESS_TYPES = [
  'Sole Proprietorship',
  'Partnership',
  'Limited Liability Partnership (LLP)',
  'Private Limited Company',
  'Public Limited Company',
  'One Person Company (OPC)',
  'Non-Profit Organization',
  'Freelancer/Consultant',
  'E-commerce Business',
  'Manufacturing',
  'Trading',
  'Service Provider',
  'Retail Store',
  'Restaurant/Cafe',
  'Other',
];

const INDUSTRIES = [
  'Accounting & Finance',
  'Agriculture',
  'Automotive',
  'Construction',
  'Consulting',
  'E-commerce',
  'Education',
  'Entertainment',
  'Food & Beverage',
  'Healthcare',
  'Hospitality',
  'IT & Software',
  'Legal Services',
  'Manufacturing',
  'Marketing & Advertising',
  'Real Estate',
  'Retail',
  'Transportation',
  'Wholesale',
  'Other',
];

const FISCAL_YEAR_TYPES = [
  { label: 'April - March (India Standard)', value: 'apr-mar' },
  { label: 'January - December (Calendar Year)', value: 'jan-dec' },
  { label: 'July - June (Australia)', value: 'jul-jun' },
  { label: 'October - September', value: 'oct-sep' },
  { label: 'Custom', value: 'custom' },
];

const EnhancedBusinessSetupScreen = ({ navigation, route }) => {
  const { userId } = route.params || {};

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Country & Currency
  const [selectedCountry, setSelectedCountry] = useState('IN');
  const [currency, setCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [taxSystem, setTaxSystem] = useState('GST');

  // Step 2: Business Details
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [industry, setIndustry] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxNumber, setTaxNumber] = useState('');

  // Step 3: Contact Information
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Step 4: Financial Settings
  const [fiscalYearType, setFiscalYearType] = useState('apr-mar');
  const [fiscalYearStart, setFiscalYearStart] = useState('April');
  const [fiscalYearEnd, setFiscalYearEnd] = useState('March');
  const [accountingMethod, setAccountingMethod] = useState('accrual');
  const [enableInventory, setEnableInventory] = useState(true);
  const [enableMultiCurrency, setEnableMultiCurrency] = useState(false);

  // Step 5: Tax Configuration
  const [taxRegistered, setTaxRegistered] = useState(true);
  const [taxRate, setTaxRate] = useState('18');
  const [enableTDS, setEnableTDS] = useState(false);
  const [enableReverseCharge, setEnableReverseCharge] = useState(false);

  useEffect(() => {
    const country = COUNTRIES.find(c => c.code === selectedCountry);
    if (country) {
      setCurrency(country.currency);
      setCurrencySymbol(country.symbol);
      setTaxSystem(country.taxSystem);
    }
  }, [selectedCountry]);

  const handleCountryChange = (countryCode) => {
    setSelectedCountry(countryCode);
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setCurrency(country.currency);
      setCurrencySymbol(country.symbol);
      setTaxSystem(country.taxSystem);
    }
  };

  const validateStep1 = () => {
    if (!selectedCountry) {
      Alert.alert('Error', 'Please select a country');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'Please enter business name');
      return false;
    }
    if (!businessType) {
      Alert.alert('Error', 'Please select business type');
      return false;
    }
    if (!industry) {
      Alert.alert('Error', 'Please select industry');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return false;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter address');
      return false;
    }
    if (!city.trim()) {
      Alert.alert('Error', 'Please enter city');
      return false;
    }
    if (!state.trim()) {
      Alert.alert('Error', 'Please enter state/province');
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!fiscalYearType) {
      Alert.alert('Error', 'Please select fiscal year type');
      return false;
    }
    if (!accountingMethod) {
      Alert.alert('Error', 'Please select accounting method');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    let isValid = false;
    
    switch (step) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
      case 4:
        isValid = validateStep4();
        break;
      case 5:
        isValid = true;
        break;
    }

    if (isValid) {
      if (step < 5) {
        setStep(step + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const businessData = {
        userId,
        country: selectedCountry,
        currency,
        currencySymbol,
        taxSystem,
        businessName,
        businessType,
        industry,
        registrationNumber,
        taxNumber,
        email,
        phone,
        website,
        address,
        city,
        state,
        postalCode,
        fiscalYearType,
        fiscalYearStart,
        fiscalYearEnd,
        accountingMethod,
        enableInventory,
        enableMultiCurrency,
        taxRegistered,
        taxRate: parseFloat(taxRate),
        enableTDS,
        enableReverseCharge,
        setupCompleted: true,
        createdAt: new Date().toISOString(),
      };

      // TODO: Save to Supabase
      console.log('Business Setup Data:', businessData);

      Alert.alert(
        'Success',
        'Business setup completed successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('Dashboard', { userId, businessId: 'temp-id' }),
          },
        ]
      );
    } catch (error) {
      console.error('Setup error:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Your Country & Currency</Text>
      <Text style={styles.stepDescription}>
        Choose your country to configure currency and tax settings
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Country *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCountry}
            onValueChange={handleCountryChange}
            style={styles.picker}
          >
            {COUNTRIES.map(country => (
              <Picker.Item
                key={country.code}
                label={`${country.name} (${country.currency})`}
                value={country.code}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Currency:</Text>
          <Text style={styles.infoValue}>{currency} ({currencySymbol})</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tax System:</Text>
          <Text style={styles.infoValue}>{taxSystem}</Text>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Business Details</Text>
      <Text style={styles.stepDescription}>
        Tell us about your business
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Business Name *</Text>
        <TextInput
          style={styles.input}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Enter business name"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Business Type *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={businessType}
            onValueChange={setBusinessType}
            style={styles.picker}
          >
            <Picker.Item label="Select business type" value="" />
            {BUSINESS_TYPES.map(type => (
              <Picker.Item key={type} label={type} value={type} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Industry *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={industry}
            onValueChange={setIndustry}
            style={styles.picker}
          >
            <Picker.Item label="Select industry" value="" />
            {INDUSTRIES.map(ind => (
              <Picker.Item key={ind} label={ind} value={ind} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Registration Number</Text>
        <TextInput
          style={styles.input}
          value={registrationNumber}
          onChangeText={setRegistrationNumber}
          placeholder="Company registration number"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tax Number ({taxSystem})</Text>
        <TextInput
          style={styles.input}
          value={taxNumber}
          onChangeText={setTaxNumber}
          placeholder={`Enter ${taxSystem} number`}
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Contact Information</Text>
      <Text style={styles.stepDescription}>
        How can we reach you?
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="business@example.com"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 234 567 8900"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Website</Text>
        <TextInput
          style={styles.input}
          value={website}
          onChangeText={setWebsite}
          placeholder="www.example.com"
          placeholderTextColor="#999"
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={address}
          onChangeText={setAddress}
          placeholder="Street address"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>City *</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="City"
            placeholderTextColor="#999"
          />
        </View>

        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>State/Province *</Text>
          <TextInput
            style={styles.input}
            value={state}
            onChangeText={setState}
            placeholder="State"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Postal Code</Text>
        <TextInput
          style={styles.input}
          value={postalCode}
          onChangeText={setPostalCode}
          placeholder="Postal code"
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Financial Settings</Text>
      <Text style={styles.stepDescription}>
        Configure your accounting preferences
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Fiscal Year *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={fiscalYearType}
            onValueChange={setFiscalYearType}
            style={styles.picker}
          >
            {FISCAL_YEAR_TYPES.map(type => (
              <Picker.Item key={type.value} label={type.label} value={type.value} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Accounting Method *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={accountingMethod}
            onValueChange={setAccountingMethod}
            style={styles.picker}
          >
            <Picker.Item label="Accrual Basis" value="accrual" />
            <Picker.Item label="Cash Basis" value="cash" />
          </Picker>
        </View>
        <Text style={styles.helpText}>
          {accountingMethod === 'accrual'
            ? 'Record income when earned and expenses when incurred'
            : 'Record income when received and expenses when paid'}
        </Text>
      </View>

      <View style={styles.checkboxGroup}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setEnableInventory(!enableInventory)}
        >
          <View style={[styles.checkboxBox, enableInventory && styles.checkboxChecked]}>
            {enableInventory && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Enable Inventory Management</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setEnableMultiCurrency(!enableMultiCurrency)}
        >
          <View style={[styles.checkboxBox, enableMultiCurrency && styles.checkboxChecked]}>
            {enableMultiCurrency && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Enable Multi-Currency</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tax Configuration</Text>
      <Text style={styles.stepDescription}>
        Configure your tax settings for {taxSystem}
      </Text>

      <View style={styles.checkboxGroup}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setTaxRegistered(!taxRegistered)}
        >
          <View style={[styles.checkboxBox, taxRegistered && styles.checkboxChecked]}>
            {taxRegistered && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Business is {taxSystem} Registered</Text>
        </TouchableOpacity>
      </View>

      {taxRegistered && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Default Tax Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={taxRate}
              onChangeText={setTaxRate}
              placeholder="18"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />
          </View>

          {selectedCountry === 'IN' && (
            <>
              <View style={styles.checkboxGroup}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setEnableTDS(!enableTDS)}
                >
                  <View style={[styles.checkboxBox, enableTDS && styles.checkboxChecked]}>
                    {enableTDS && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Enable TDS (Tax Deducted at Source)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setEnableReverseCharge(!enableReverseCharge)}
                >
                  <View style={[styles.checkboxBox, enableReverseCharge && styles.checkboxChecked]}>
                    {enableReverseCharge && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Enable Reverse Charge Mechanism</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Setup Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Country:</Text>
          <Text style={styles.summaryValue}>
            {COUNTRIES.find(c => c.code === selectedCountry)?.name}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Business:</Text>
          <Text style={styles.summaryValue}>{businessName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Type:</Text>
          <Text style={styles.summaryValue}>{businessType}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Currency:</Text>
          <Text style={styles.summaryValue}>{currency} ({currencySymbol})</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax System:</Text>
          <Text style={styles.summaryValue}>{taxSystem}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 5) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>Step {step} of 5</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        {step > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={handleBack}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.nextButton, step === 1 && styles.fullWidthButton]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === 5 ? 'Complete Setup' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#1976D2',
  },
  checkboxGroup: {
    marginTop: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fullWidthButton: {
    marginRight: 0,
  },
});

export default EnhancedBusinessSetupScreen;
