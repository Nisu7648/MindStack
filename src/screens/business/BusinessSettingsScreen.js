/**
 * BUSINESS SETTINGS SCREEN
 * Configure business information and app settings
 * 
 * Features:
 * - Business profile
 * - Printer settings
 * - Invoice settings
 * - GST settings
 * - Backup & sync
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
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bluetoothPrintService from '../../services/print/bluetoothPrintService';

const BusinessSettingsScreen = ({ navigation }) => {
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    address: '',
    city: '',
    state: '',
    stateCode: '',
    pincode: '',
    phone: '',
    email: '',
    gstin: '',
    pan: '',
    website: ''
  });

  const [invoiceSettings, setInvoiceSettings] = useState({
    invoicePrefix: 'INV',
    startingNumber: 1,
    showHSN: true,
    showGST: true,
    termsAndConditions: 'Thank you for your business!',
    bankDetails: ''
  });

  const [printerSettings, setPrinterSettings] = useState({
    autoPrint: false,
    paperSize: 58, // 58mm or 80mm
    printCopies: 1,
    connectedPrinter: null
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const businessData = await AsyncStorage.getItem('businessInfo');
      const invoiceData = await AsyncStorage.getItem('invoiceSettings');
      const printerData = await AsyncStorage.getItem('printerSettings');

      if (businessData) {
        setBusinessInfo(JSON.parse(businessData));
      }
      if (invoiceData) {
        setInvoiceSettings(JSON.parse(invoiceData));
      }
      if (printerData) {
        setPrinterSettings(JSON.parse(printerData));
      }
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBusinessInfo = async () => {
    try {
      await AsyncStorage.setItem('businessInfo', JSON.stringify(businessInfo));
      Alert.alert('Success', 'Business information saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save business information');
    }
  };

  const saveInvoiceSettings = async () => {
    try {
      await AsyncStorage.setItem('invoiceSettings', JSON.stringify(invoiceSettings));
      Alert.alert('Success', 'Invoice settings saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save invoice settings');
    }
  };

  const savePrinterSettings = async () => {
    try {
      await AsyncStorage.setItem('printerSettings', JSON.stringify(printerSettings));
      bluetoothPrintService.setPaperWidth(printerSettings.paperSize);
      Alert.alert('Success', 'Printer settings saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save printer settings');
    }
  };

  const connectPrinter = async () => {
    try {
      const devices = await bluetoothPrintService.scanDevices();
      
      if (devices.length === 0) {
        Alert.alert('No Devices', 'No Bluetooth printers found');
        return;
      }

      // Show device selection
      navigation.navigate('PrinterSelection', {
        devices,
        onSelect: async (device) => {
          try {
            await bluetoothPrintService.connectToPrinter(device.id);
            setPrinterSettings({
              ...printerSettings,
              connectedPrinter: device.name
            });
            Alert.alert('Success', `Connected to ${device.name}`);
          } catch (error) {
            Alert.alert('Error', error.message);
          }
        }
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const testPrint = async () => {
    try {
      if (!bluetoothPrintService.isConnected()) {
        Alert.alert('Error', 'Printer not connected');
        return;
      }

      await bluetoothPrintService.testPrint();
      Alert.alert('Success', 'Test print sent');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const validateGSTIN = (gstin) => {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Business Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={styles.input}
              value={businessInfo.businessName}
              onChangeText={(text) => setBusinessInfo({ ...businessInfo, businessName: text })}
              placeholder="Enter business name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={businessInfo.address}
              onChangeText={(text) => setBusinessInfo({ ...businessInfo, address: text })}
              placeholder="Enter address"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={businessInfo.city}
                onChangeText={(text) => setBusinessInfo({ ...businessInfo, city: text })}
                placeholder="City"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                style={styles.input}
                value={businessInfo.pincode}
                onChangeText={(text) => setBusinessInfo({ ...businessInfo, pincode: text })}
                placeholder="Pincode"
                keyboardType="numeric"
                maxLength={6}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={styles.input}
                value={businessInfo.state}
                onChangeText={(text) => setBusinessInfo({ ...businessInfo, state: text })}
                placeholder="State"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>State Code *</Text>
              <TextInput
                style={styles.input}
                value={businessInfo.stateCode}
                onChangeText={(text) => setBusinessInfo({ ...businessInfo, stateCode: text })}
                placeholder="29"
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone *</Text>
            <TextInput
              style={styles.input}
              value={businessInfo.phone}
              onChangeText={(text) => setBusinessInfo({ ...businessInfo, phone: text })}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={businessInfo.email}
              onChangeText={(text) => setBusinessInfo({ ...businessInfo, email: text })}
              placeholder="business@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GSTIN *</Text>
            <TextInput
              style={styles.input}
              value={businessInfo.gstin}
              onChangeText={(text) => setBusinessInfo({ ...businessInfo, gstin: text.toUpperCase() })}
              placeholder="29AAAAA0000A1Z5"
              autoCapitalize="characters"
              maxLength={15}
            />
            {businessInfo.gstin && !validateGSTIN(businessInfo.gstin) && (
              <Text style={styles.errorText}>Invalid GSTIN format</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PAN</Text>
            <TextInput
              style={styles.input}
              value={businessInfo.pan}
              onChangeText={(text) => setBusinessInfo({ ...businessInfo, pan: text.toUpperCase() })}
              placeholder="AAAAA0000A"
              autoCapitalize="characters"
              maxLength={10}
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveBusinessInfo}
          >
            <Text style={styles.saveButtonText}>Save Business Info</Text>
          </TouchableOpacity>
        </View>

        {/* Invoice Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Settings</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Invoice Prefix</Text>
              <TextInput
                style={styles.input}
                value={invoiceSettings.invoicePrefix}
                onChangeText={(text) => setInvoiceSettings({ ...invoiceSettings, invoicePrefix: text })}
                placeholder="INV"
                autoCapitalize="characters"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Starting Number</Text>
              <TextInput
                style={styles.input}
                value={String(invoiceSettings.startingNumber)}
                onChangeText={(text) => setInvoiceSettings({ ...invoiceSettings, startingNumber: parseInt(text) || 1 })}
                placeholder="1"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Show HSN Code</Text>
            <Switch
              value={invoiceSettings.showHSN}
              onValueChange={(value) => setInvoiceSettings({ ...invoiceSettings, showHSN: value })}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Show GST Breakup</Text>
            <Switch
              value={invoiceSettings.showGST}
              onValueChange={(value) => setInvoiceSettings({ ...invoiceSettings, showGST: value })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Terms & Conditions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={invoiceSettings.termsAndConditions}
              onChangeText={(text) => setInvoiceSettings({ ...invoiceSettings, termsAndConditions: text })}
              placeholder="Enter terms and conditions"
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveInvoiceSettings}
          >
            <Text style={styles.saveButtonText}>Save Invoice Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Printer Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Printer Settings</Text>

          <View style={styles.printerInfo}>
            <Ionicons name="print" size={24} color="#666" />
            <View style={styles.printerInfoText}>
              <Text style={styles.printerLabel}>Connected Printer</Text>
              <Text style={styles.printerName}>
                {printerSettings.connectedPrinter || 'Not connected'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.printerButton}
            onPress={connectPrinter}
          >
            <Ionicons name="bluetooth" size={20} color="#2196F3" />
            <Text style={styles.printerButtonText}>Connect Printer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.printerButton, styles.testButton]}
            onPress={testPrint}
            disabled={!printerSettings.connectedPrinter}
          >
            <Ionicons name="print" size={20} color="#4CAF50" />
            <Text style={[styles.printerButtonText, styles.testButtonText]}>Test Print</Text>
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Auto Print After Bill</Text>
            <Switch
              value={printerSettings.autoPrint}
              onValueChange={(value) => setPrinterSettings({ ...printerSettings, autoPrint: value })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Paper Size</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() => setPrinterSettings({ ...printerSettings, paperSize: 58 })}
              >
                <View style={[styles.radio, printerSettings.paperSize === 58 && styles.radioSelected]} />
                <Text style={styles.radioLabel}>58mm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() => setPrinterSettings({ ...printerSettings, paperSize: 80 })}
              >
                <View style={[styles.radio, printerSettings.paperSize === 80 && styles.radioSelected]} />
                <Text style={styles.radioLabel}>80mm</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={savePrinterSettings}
          >
            <Text style={styles.saveButtonText}>Save Printer Settings</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 16,
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 20
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
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  halfWidth: {
    width: '48%'
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  saveButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  printerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  printerInfoText: {
    marginLeft: 12,
    flex: 1
  },
  printerLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  printerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121'
  },
  printerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 12
  },
  printerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 8
  },
  testButton: {
    backgroundColor: '#E8F5E9'
  },
  testButtonText: {
    color: '#4CAF50'
  },
  radioGroup: {
    flexDirection: 'row'
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 8
  },
  radioSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3'
  },
  radioLabel: {
    fontSize: 15,
    color: '#212121'
  }
});

export default BusinessSettingsScreen;
