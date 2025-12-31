import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SetupService } from '../../services/SetupService';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const BusinessSetupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    gstRegistered: false,
    gstin: '',
    state: '',
    financialYearStart: '1 April',
    monthlyTransactions: '',
    confirmationChecked: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.businessType) {
      newErrors.businessType = 'Please select a business type';
    }

    if (!formData.state) {
      newErrors.state = 'Please select your state';
    }

    if (formData.gstRegistered && formData.gstin && formData.gstin.length !== 15) {
      newErrors.gstin = 'GSTIN must be 15 characters';
    }

    if (!formData.confirmationChecked) {
      newErrors.confirmation = 'Please confirm to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const result = await SetupService.saveBusinessSetup(formData);

      if (result.success) {
        navigation.replace('Dashboard');
      } else {
        Alert.alert('Error', result.error || 'Failed to save setup');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.businessName.trim() &&
      formData.businessType &&
      formData.state &&
      formData.confirmationChecked
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Set up your business</Text>
        <Text style={styles.subtitle}>This helps us prepare correct books for you</Text>
      </View>

      {/* Section 1: Business Identity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧩 BUSINESS IDENTITY</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Business Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.businessName && styles.inputError]}
            placeholder="e.g. Shree Ram Kirana Store"
            placeholderTextColor="#999"
            value={formData.businessName}
            onChangeText={(text) => {
              setFormData({ ...formData, businessName: text });
              setErrors({ ...errors, businessName: '' });
            }}
          />
          {errors.businessName && (
            <Text style={styles.errorText}>{errors.businessName}</Text>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Business Type <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.businessTypeContainer}>
            <TouchableOpacity
              style={[
                styles.businessTypeCard,
                formData.businessType === 'trader' && styles.businessTypeCardSelected,
                errors.businessType && styles.inputError,
              ]}
              onPress={() => {
                setFormData({ ...formData, businessType: 'trader' });
                setErrors({ ...errors, businessType: '' });
              }}
            >
              <Text style={styles.businessTypeIcon}>🏪</Text>
              <Text
                style={[
                  styles.businessTypeText,
                  formData.businessType === 'trader' && styles.businessTypeTextSelected,
                ]}
              >
                Trader / Shop
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.businessTypeCard,
                formData.businessType === 'service' && styles.businessTypeCardSelected,
                errors.businessType && styles.inputError,
              ]}
              onPress={() => {
                setFormData({ ...formData, businessType: 'service' });
                setErrors({ ...errors, businessType: '' });
              }}
            >
              <Text style={styles.businessTypeIcon}>🧑‍💻</Text>
              <Text
                style={[
                  styles.businessTypeText,
                  formData.businessType === 'service' && styles.businessTypeTextSelected,
                ]}
              >
                Service Business
              </Text>
            </TouchableOpacity>
          </View>
          {errors.businessType && (
            <Text style={styles.errorText}>{errors.businessType}</Text>
          )}
          <Text style={styles.helperText}>
            This controls Trading A/c vs Service P&L logic
          </Text>
        </View>
      </View>

      {/* Section 2: GST & Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧾 GST & LOCATION</Text>

        <View style={styles.inputContainer}>
          <View style={styles.toggleContainer}>
            <Text style={styles.label}>
              GST Registered? <Text style={styles.required}>*</Text>
            </Text>
            <Switch
              value={formData.gstRegistered}
              onValueChange={(value) =>
                setFormData({ ...formData, gstRegistered: value })
              }
              trackColor={{ false: '#E0E0E0', true: '#1A1A1A' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {formData.gstRegistered && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>GSTIN (Optional)</Text>
            <TextInput
              style={[styles.input, errors.gstin && styles.inputError]}
              placeholder="e.g. 27AABCU9603R1ZM"
              placeholderTextColor="#999"
              value={formData.gstin}
              onChangeText={(text) => {
                setFormData({ ...formData, gstin: text.toUpperCase() });
                setErrors({ ...errors, gstin: '' });
              }}
              maxLength={15}
              autoCapitalize="characters"
            />
            {errors.gstin && <Text style={styles.errorText}>{errors.gstin}</Text>}
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            State <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.pickerContainer, errors.state && styles.inputError]}>
            <Picker
              selectedValue={formData.state}
              onValueChange={(value) => {
                setFormData({ ...formData, state: value });
                setErrors({ ...errors, state: '' });
              }}
              style={styles.picker}
            >
              <Picker.Item label="Select your state" value="" />
              {INDIAN_STATES.map((state) => (
                <Picker.Item key={state} label={state} value={state} />
              ))}
            </Picker>
          </View>
          {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
          <Text style={styles.helperText}>
            Needed for CGST/SGST vs IGST logic
          </Text>
        </View>
      </View>

      {/* Section 3: Financial Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📆 FINANCIAL SETTINGS</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Financial Year Start <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.financialYearStart}
              onValueChange={(value) =>
                setFormData({ ...formData, financialYearStart: value })
              }
              style={styles.picker}
            >
              <Picker.Item label="1 April" value="1 April" />
              <Picker.Item label="1 January" value="1 January" />
              <Picker.Item label="1 July" value="1 July" />
              <Picker.Item label="1 October" value="1 October" />
            </Picker>
          </View>
          <Text style={styles.helperText}>Locks reporting periods</Text>
        </View>
      </View>

      {/* Section 4: Business Scale */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💼 BUSINESS SCALE</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Monthly Transactions (Estimate)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.monthlyTransactions}
              onValueChange={(value) =>
                setFormData({ ...formData, monthlyTransactions: value })
              }
              style={styles.picker}
            >
              <Picker.Item label="Select (Optional)" value="" />
              <Picker.Item label="< 100" value="<100" />
              <Picker.Item label="100 – 500" value="100-500" />
              <Picker.Item label="500+" value="500+" />
            </Picker>
          </View>
          <Text style={styles.helperText}>
            Used only for internal tuning, not user-facing
          </Text>
        </View>
      </View>

      {/* Section 5: Confirmation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 CONFIRMATION</Text>

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() =>
            setFormData({
              ...formData,
              confirmationChecked: !formData.confirmationChecked,
            })
          }
        >
          <View
            style={[
              styles.checkbox,
              formData.confirmationChecked && styles.checkboxChecked,
              errors.confirmation && styles.inputError,
            ]}
          >
            {formData.confirmationChecked && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            I understand MindStack prepares accounting books automatically based on
            my entries
          </Text>
        </TouchableOpacity>
        {errors.confirmation && (
          <Text style={styles.errorText}>{errors.confirmation}</Text>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (!isFormValid() || loading) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!isFormValid() || loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Setting up...' : 'Start Accounting'}
        </Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  businessTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  businessTypeCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  businessTypeCardSelected: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  businessTypeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  businessTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  businessTypeTextSelected: {
    color: '#FFFFFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  checkboxChecked: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});

export default BusinessSetupScreen;
