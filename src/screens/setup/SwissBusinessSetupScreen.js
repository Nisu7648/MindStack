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
  // Switzerland - PRIMARY TARGET
  { 
    code: 'CH', 
    name: 'Switzerland', 
    currency: 'CHF', 
    symbol: 'CHF', 
    taxSystem: 'VAT',
    taxRate: 7.7,
    features: {
      multiLanguage: true,
      languages: ['German', 'French', 'Italian', 'English'],
      cantonalTax: true,
      socialSecurity: true,
      premiumTarget: true,
    }
  },
  // Other European Countries
  { code: 'DE', name: 'Germany', currency: 'EUR', symbol: '€', taxSystem: 'VAT', taxRate: 19 },
  { code: 'FR', name: 'France', currency: 'EUR', symbol: '€', taxSystem: 'VAT', taxRate: 20 },
  { code: 'AT', name: 'Austria', currency: 'EUR', symbol: '€', taxSystem: 'VAT', taxRate: 20 },
  { code: 'IT', name: 'Italy', currency: 'EUR', symbol: '€', taxSystem: 'VAT', taxRate: 22 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', taxSystem: 'VAT', taxRate: 20 },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', symbol: '€', taxSystem: 'VAT', taxRate: 21 },
  { code: 'BE', name: 'Belgium', currency: 'EUR', symbol: '€', taxSystem: 'VAT', taxRate: 21 },
  { code: 'LU', name: 'Luxembourg', currency: 'EUR', symbol: '€', taxSystem: 'VAT', taxRate: 17 },
  
  // Global Markets
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', taxSystem: 'Sales Tax', taxRate: 0 },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'C$', taxSystem: 'GST/HST', taxRate: 5 },
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$', taxSystem: 'GST', taxRate: 10 },
  { code: 'SG', name: 'Singapore', currency: 'SGD', symbol: 'S$', taxSystem: 'GST', taxRate: 8 },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', symbol: 'د.إ', taxSystem: 'VAT', taxRate: 5 },
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', taxSystem: 'GST', taxRate: 18 },
];

const SWISS_CANTONS = [
  'Zürich', 'Bern', 'Luzern', 'Uri', 'Schwyz', 'Obwalden', 'Nidwalden',
  'Glarus', 'Zug', 'Fribourg', 'Solothurn', 'Basel-Stadt', 'Basel-Landschaft',
  'Schaffhausen', 'Appenzell Ausserrhoden', 'Appenzell Innerrhoden', 'St. Gallen',
  'Graubünden', 'Aargau', 'Thurgau', 'Ticino', 'Vaud', 'Valais', 'Neuchâtel',
  'Geneva', 'Jura'
];

const SWISS_LANGUAGES = ['German', 'French', 'Italian', 'English'];

const BUSINESS_TYPES = [
  'Einzelunternehmen (Sole Proprietorship)',
  'Kollektivgesellschaft (General Partnership)',
  'Kommanditgesellschaft (Limited Partnership)',
  'GmbH (Limited Liability Company)',
  'AG (Stock Corporation)',
  'Genossenschaft (Cooperative)',
  'Verein (Association)',
  'Stiftung (Foundation)',
  'Zweigniederlassung (Branch Office)',
  'Freelancer/Consultant',
  'E-commerce Business',
  'Other',
];

const INDUSTRIES = [
  'Banking & Finance',
  'Pharmaceuticals',
  'Watchmaking & Jewelry',
  'Chocolate & Food Production',
  'Tourism & Hospitality',
  'IT & Software',
  'Consulting',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Real Estate',
  'Legal Services',
  'Accounting & Audit',
  'Insurance',
  'Trading',
  'Transportation & Logistics',
  'Education',
  'Other',
];

const SUBSCRIPTION_PLANS = [
  {
    id: 'premium',
    name: 'Premium',
    price: 99,
    currency: 'CHF',
    period: 'month',
    features: [
      'Unlimited Invoices & Transactions',
      'Multi-Currency Support',
      'Advanced Tax Optimization',
      'Cantonal Tax Compliance',
      'Social Security Integration',
      'Multi-Language Support (DE/FR/IT/EN)',
      'Automated Period Closing',
      'Real-time Business Health Monitoring',
      'Bank Reconciliation',
      'Inventory Management (FIFO)',
      'Payroll Processing',
      'All Financial Reports',
      'PDF Generation & Storage',
      'Priority Support',
      'AI-Powered Insights',
    ],
    recommended: true,
    swissOptimized: true,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 49,
    currency: 'CHF',
    period: 'month',
    features: [
      'Up to 100 Invoices/month',
      'Basic Tax Compliance',
      'Standard Reports',
      'PDF Generation',
      'Email Support',
    ],
    recommended: false,
  },
];

const SwissBusinessSetupScreen = ({ navigation, route }) => {
  const { userId } = route.params || {};

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Country & Subscription
  const [selectedCountry, setSelectedCountry] = useState('CH'); // Default to Switzerland
  const [currency, setCurrency] = useState('CHF');
  const [currencySymbol, setCurrencySymbol] = useState('CHF');
  const [taxSystem, setTaxSystem] = useState('VAT');
  const [taxRate, setTaxRate] = useState('7.7');
  const [selectedPlan, setSelectedPlan] = useState('premium');

  // Step 2: Business Details (Swiss-specific)
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [industry, setIndustry] = useState('');
  const [uidNumber, setUidNumber] = useState(''); // Swiss UID (Unternehmens-Identifikationsnummer)
  const [vatNumber, setVatNumber] = useState(''); // Swiss VAT number
  const [selectedCanton, setSelectedCanton] = useState('Zürich');
  const [preferredLanguage, setPreferredLanguage] = useState('German');

  // Step 3: Contact Information
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Step 4: Financial Settings
  const [fiscalYearType, setFiscalYearType] = useState('jan-dec');
  const [accountingMethod, setAccountingMethod] = useState('accrual');
  const [enableInventory, setEnableInventory] = useState(true);
  const [enableMultiCurrency, setEnableMultiCurrency] = useState(true);
  const [enableCantonalTax, setEnableCantonalTax] = useState(true);
  const [enableSocialSecurity, setEnableSocialSecurity] = useState(true);

  // Step 5: Subscription Confirmation
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    const country = COUNTRIES.find(c => c.code === selectedCountry);
    if (country) {
      setCurrency(country.currency);
      setCurrencySymbol(country.symbol);
      setTaxSystem(country.taxSystem);
      setTaxRate(country.taxRate?.toString() || '0');
    }
  }, [selectedCountry]);

  const handleCountryChange = (countryCode) => {
    setSelectedCountry(countryCode);
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setCurrency(country.currency);
      setCurrencySymbol(country.symbol);
      setTaxSystem(country.taxSystem);
      setTaxRate(country.taxRate?.toString() || '0');
    }
  };

  const validateStep1 = () => {
    if (!selectedCountry) {
      Alert.alert('Error', 'Please select a country');
      return false;
    }
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a subscription plan');
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
    if (selectedCountry === 'CH' && !selectedCanton) {
      Alert.alert('Error', 'Please select your canton');
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
    if (!postalCode.trim()) {
      Alert.alert('Error', 'Please enter postal code');
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

  const validateStep5 = () => {
    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to the terms and conditions');
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
        isValid = validateStep5();
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
      const selectedPlanData = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);
      
      const businessData = {
        userId,
        country: selectedCountry,
        currency,
        currencySymbol,
        taxSystem,
        taxRate: parseFloat(taxRate),
        businessName,
        businessType,
        industry,
        uidNumber,
        vatNumber,
        canton: selectedCountry === 'CH' ? selectedCanton : null,
        preferredLanguage: selectedCountry === 'CH' ? preferredLanguage : 'English',
        email,
        phone,
        website,
        address,
        city,
        postalCode,
        fiscalYearType,
        accountingMethod,
        enableInventory,
        enableMultiCurrency,
        enableCantonalTax: selectedCountry === 'CH' ? enableCantonalTax : false,
        enableSocialSecurity: selectedCountry === 'CH' ? enableSocialSecurity : false,
        subscription: {
          plan: selectedPlan,
          price: selectedPlanData.price,
          currency: selectedPlanData.currency,
          period: selectedPlanData.period,
          startDate: new Date().toISOString(),
          status: 'trial', // Start with 14-day trial
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
        setupCompleted: true,
        createdAt: new Date().toISOString(),
      };

      // TODO: Save to Supabase
      console.log('Swiss Business Setup Data:', businessData);

      Alert.alert(
        'Success! 🎉',
        `Welcome to MindStack Premium!\n\nYour 14-day free trial has started.\n\nAfter trial: ${selectedPlanData.price} ${selectedPlanData.currency}/${selectedPlanData.period}`,
        [
          {
            text: 'Start Using MindStack',
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

  const renderStep1 = () => {
    const isSwiss = selectedCountry === 'CH';
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Choose Your Country & Plan</Text>
        <Text style={styles.stepDescription}>
          {isSwiss ? '🇨🇭 Optimized for Swiss businesses' : 'Select your country and subscription'}
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
                  label={`${country.name} ${country.code === 'CH' ? '🇨🇭 (Recommended)' : ''}`}
                  value={country.code}
                />
              ))}
            </Picker>
          </View>
        </View>

        {isSwiss && (
          <View style={styles.swissHighlight}>
            <Text style={styles.swissTitle}>🇨🇭 Swiss Business Features</Text>
            <Text style={styles.swissFeature}>✓ Cantonal tax compliance</Text>
            <Text style={styles.swissFeature}>✓ Multi-language support (DE/FR/IT/EN)</Text>
            <Text style={styles.swissFeature}>✓ Social security integration</Text>
            <Text style={styles.swissFeature}>✓ VAT 7.7% pre-configured</Text>
            <Text style={styles.swissFeature}>✓ Swiss accounting standards</Text>
          </View>
        )}

        <View style={styles.plansContainer}>
          <Text style={styles.plansTitle}>Select Your Plan</Text>
          
          {SUBSCRIPTION_PLANS.map(plan => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
                plan.recommended && styles.planCardRecommended,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              {plan.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>RECOMMENDED</Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.planPriceContainer}>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  <Text style={styles.planCurrency}>{plan.currency}</Text>
                </View>
                <Text style={styles.planPeriod}>per {plan.period}</Text>
              </View>

              <View style={styles.planFeatures}>
                {plan.features.slice(0, 5).map((feature, index) => (
                  <Text key={index} style={styles.planFeature}>✓ {feature}</Text>
                ))}
                {plan.features.length > 5 && (
                  <Text style={styles.planFeatureMore}>
                    + {plan.features.length - 5} more features
                  </Text>
                )}
              </View>

              {plan.swissOptimized && (
                <View style={styles.swissBadge}>
                  <Text style={styles.swissBadgeText}>🇨🇭 Swiss Optimized</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.trialNotice}>
          <Text style={styles.trialText}>🎁 Start with 14-day FREE trial</Text>
          <Text style={styles.trialSubtext}>No credit card required</Text>
        </View>
      </View>
    );
  };

  const renderStep2 = () => {
    const isSwiss = selectedCountry === 'CH';
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Business Details</Text>
        <Text style={styles.stepDescription}>
          {isSwiss ? 'Swiss business information' : 'Tell us about your business'}
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

        {isSwiss && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Canton *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedCanton}
                  onValueChange={setSelectedCanton}
                  style={styles.picker}
                >
                  {SWISS_CANTONS.map(canton => (
                    <Picker.Item key={canton} label={canton} value={canton} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preferred Language *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={preferredLanguage}
                  onValueChange={setPreferredLanguage}
                  style={styles.picker}
                >
                  {SWISS_LANGUAGES.map(lang => (
                    <Picker.Item key={lang} label={lang} value={lang} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>UID Number (CHE-xxx.xxx.xxx)</Text>
              <TextInput
                style={styles.input}
                value={uidNumber}
                onChangeText={setUidNumber}
                placeholder="CHE-123.456.789"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>VAT Number</Text>
              <TextInput
                style={styles.input}
                value={vatNumber}
                onChangeText={setVatNumber}
                placeholder="CHE-123.456.789 MWST"
                placeholderTextColor="#999"
              />
            </View>
          </>
        )}
      </View>
    );
  };

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Contact Information</Text>
      <Text style={styles.stepDescription}>How can we reach you?</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="business@example.ch"
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
          placeholder="+41 44 123 45 67"
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
          placeholder="www.example.ch"
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
          numberOfLines={2}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>City *</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Zürich"
            placeholderTextColor="#999"
          />
        </View>

        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Postal Code *</Text>
          <TextInput
            style={styles.input}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder="8001"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => {
    const isSwiss = selectedCountry === 'CH';
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Financial Settings</Text>
        <Text style={styles.stepDescription}>Configure your accounting preferences</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fiscal Year *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={fiscalYearType}
              onValueChange={setFiscalYearType}
              style={styles.picker}
            >
              <Picker.Item label="January - December (Calendar Year)" value="jan-dec" />
              <Picker.Item label="April - March" value="apr-mar" />
              <Picker.Item label="July - June" value="jul-jun" />
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
              <Picker.Item label="Accrual Basis (Recommended)" value="accrual" />
              <Picker.Item label="Cash Basis" value="cash" />
            </Picker>
          </View>
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

          {isSwiss && (
            <>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setEnableCantonalTax(!enableCantonalTax)}
              >
                <View style={[styles.checkboxBox, enableCantonalTax && styles.checkboxChecked]}>
                  {enableCantonalTax && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Enable Cantonal Tax Tracking</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setEnableSocialSecurity(!enableSocialSecurity)}
              >
                <View style={[styles.checkboxBox, enableSocialSecurity && styles.checkboxChecked]}>
                  {enableSocialSecurity && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Enable Social Security (AHV/IV/EO)</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderStep5 = () => {
    const selectedPlanData = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);
    const isSwiss = selectedCountry === 'CH';
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Confirm Your Subscription</Text>
        <Text style={styles.stepDescription}>Review and confirm your setup</Text>

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
          
          {isSwiss && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Canton:</Text>
              <Text style={styles.summaryValue}>{selectedCanton}</Text>
            </View>
          )}
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Currency:</Text>
            <Text style={styles.summaryValue}>{currency}</Text>
          </View>
        </View>

        <View style={styles.subscriptionCard}>
          <Text style={styles.subscriptionTitle}>Your Subscription</Text>
          
          <View style={styles.subscriptionDetails}>
            <Text style={styles.subscriptionPlan}>{selectedPlanData.name} Plan</Text>
            <View style={styles.subscriptionPriceRow}>
              <Text style={styles.subscriptionPrice}>
                {selectedPlanData.price} {selectedPlanData.currency}
              </Text>
              <Text style={styles.subscriptionPeriod}>/{selectedPlanData.period}</Text>
            </View>
          </View>

          <View style={styles.trialBox}>
            <Text style={styles.trialBoxTitle}>🎁 14-Day Free Trial</Text>
            <Text style={styles.trialBoxText}>
              Start using all premium features immediately. No credit card required.
            </Text>
            <Text style={styles.trialBoxText}>
              After trial: {selectedPlanData.price} {selectedPlanData.currency}/{selectedPlanData.period}
            </Text>
          </View>
        </View>

        <View style={styles.checkboxGroup}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View style={[styles.checkboxBox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the Terms of Service and Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
              {step === 5 ? 'Start Free Trial' : 'Next'}
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
    backgroundColor: '#DC143C', // Swiss red
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
    height: 60,
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  swissHighlight: {
    backgroundColor: '#DC143C',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  swissTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  swissFeature: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  plansContainer: {
    marginTop: 20,
  },
  plansTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#DC143C',
    backgroundColor: '#FFF5F5',
  },
  planCardRecommended: {
    borderColor: '#DC143C',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#DC143C',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#DC143C',
  },
  planCurrency: {
    fontSize: 20,
    fontWeight: '600',
    color: '#DC143C',
    marginLeft: 4,
  },
  planPeriod: {
    fontSize: 14,
    color: '#666',
  },
  planFeatures: {
    marginTop: 12,
  },
  planFeature: {
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  planFeatureMore: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  swissBadge: {
    marginTop: 12,
    backgroundColor: '#DC143C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  swissBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  trialNotice: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  trialText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  trialSubtext: {
    fontSize: 14,
    color: '#2E7D32',
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
    backgroundColor: '#DC143C',
    borderColor: '#DC143C',
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
    marginBottom: 16,
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
  subscriptionCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#DC143C',
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  subscriptionDetails: {
    marginBottom: 16,
  },
  subscriptionPlan: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subscriptionPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  subscriptionPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#DC143C',
  },
  subscriptionPeriod: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  trialBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
  },
  trialBoxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  trialBoxText: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 4,
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
    backgroundColor: '#DC143C',
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

export default SwissBusinessSetupScreen;
