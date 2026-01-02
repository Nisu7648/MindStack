/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BLUETOOTH SETTINGS SCREEN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * - Scan for Bluetooth devices
 * - Connect scanner
 * - Connect printer
 * - Test printer
 * - Auto-reconnect toggle
 * - Device status indicators
 * - Forget devices
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Switch,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BluetoothManager from '../../services/bluetooth/bluetoothManager';
import ThermalPrinterService from '../../services/bluetooth/thermalPrinterService';

const BluetoothSettingsScreen = ({ navigation }) => {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState({ paired: [], unpaired: [] });
  const [connectionStatus, setConnectionStatus] = useState({
    scanner: { connected: false, device: null },
    printer: { connected: false, device: null },
    autoReconnect: true
  });
  const [connecting, setConnecting] = useState(null);

  useEffect(() => {
    initializeBluetooth();
    
    // Add connection listener
    const unsubscribe = BluetoothManager.addConnectionListener(handleConnectionChange);
    
    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * INITIALIZE BLUETOOTH
   * ═══════════════════════════════════════════════════════════════════════
   */
  const initializeBluetooth = async () => {
    const result = await BluetoothManager.initialize();
    
    if (!result.success) {
      Alert.alert('Bluetooth Error', result.error);
      return;
    }

    // Get current status
    const status = BluetoothManager.getConnectionStatus();
    setConnectionStatus(status);

    // Scan for devices
    handleScanDevices();
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SCAN FOR DEVICES
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handleScanDevices = async () => {
    try {
      setScanning(true);
      
      const result = await BluetoothManager.scanDevices();
      
      if (result.success) {
        setDevices({
          paired: result.paired,
          unpaired: result.unpaired
        });
      } else {
        Alert.alert('Scan Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setScanning(false);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CONNECT DEVICE
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handleConnectDevice = async (device, deviceType) => {
    try {
      setConnecting(device.id);

      let result;
      if (deviceType === 'scanner') {
        result = await BluetoothManager.connectScanner(device);
      } else {
        result = await BluetoothManager.connectPrinter(device);
      }

      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Connection Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setConnecting(null);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * DISCONNECT DEVICE
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handleDisconnectDevice = async (deviceType) => {
    try {
      let result;
      if (deviceType === 'scanner') {
        result = await BluetoothManager.disconnectScanner();
      } else {
        result = await BluetoothManager.disconnectPrinter();
      }

      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * FORGET DEVICE
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handleForgetDevice = (deviceType) => {
    Alert.alert(
      'Forget Device',
      `Are you sure you want to forget this ${deviceType}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: async () => {
            const result = await BluetoothManager.forgetDevice(deviceType);
            if (result.success) {
              Alert.alert('Success', result.message);
            }
          }
        }
      ]
    );
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TEST PRINTER
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handleTestPrinter = async () => {
    if (!connectionStatus.printer.connected) {
      Alert.alert('Error', 'Please connect printer first');
      return;
    }

    try {
      const result = await ThermalPrinterService.printTestPage();
      
      if (result.success) {
        Alert.alert('Success', 'Test page sent to printer');
      } else {
        Alert.alert('Print Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HANDLE CONNECTION CHANGE
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handleConnectionChange = (event) => {
    const status = BluetoothManager.getConnectionStatus();
    setConnectionStatus(status);
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TOGGLE AUTO-RECONNECT
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handleToggleAutoReconnect = async (value) => {
    await BluetoothManager.setAutoReconnect(value);
    setConnectionStatus(prev => ({
      ...prev,
      autoReconnect: value
    }));
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SHOW DEVICE MENU
   * ═══════════════════════════════════════════════════════════════════════
   */
  const showDeviceMenu = (device) => {
    Alert.alert(
      device.name,
      'Select device type',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Scanner',
          onPress: () => handleConnectDevice(device, 'scanner')
        },
        {
          text: 'Printer',
          onPress: () => handleConnectDevice(device, 'printer')
        }
      ]
    );
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RENDER DEVICE ITEM
   * ═══════════════════════════════════════════════════════════════════════
   */
  const renderDeviceItem = ({ item }) => {
    const isConnectedScanner = connectionStatus.scanner.connected && 
                               connectionStatus.scanner.device?.id === item.id;
    const isConnectedPrinter = connectionStatus.printer.connected && 
                               connectionStatus.printer.device?.id === item.id;
    const isConnecting = connecting === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.deviceItem,
          (isConnectedScanner || isConnectedPrinter) && styles.deviceItemConnected
        ]}
        onPress={() => showDeviceMenu(item)}
        disabled={isConnecting}
      >
        <View style={styles.deviceIcon}>
          <Icon
            name={isConnectedScanner ? 'barcode-scan' : isConnectedPrinter ? 'printer' : 'bluetooth'}
            size={24}
            color={isConnectedScanner || isConnectedPrinter ? '#4CAF50' : '#666'}
          />
        </View>

        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceAddress}>{item.id}</Text>
          {isConnectedScanner && (
            <Text style={styles.deviceStatus}>Connected as Scanner</Text>
          )}
          {isConnectedPrinter && (
            <Text style={styles.deviceStatus}>Connected as Printer</Text>
          )}
        </View>

        {isConnecting ? (
          <ActivityIndicator color="#2196F3" />
        ) : (
          <Icon
            name="chevron-right"
            size={24}
            color="#CCC"
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bluetooth Settings</Text>
        <TouchableOpacity onPress={handleScanDevices} disabled={scanning}>
          <Icon
            name="refresh"
            size={24}
            color={scanning ? '#CCC' : '#2196F3'}
          />
        </TouchableOpacity>
      </View>

      {/* Connection Status */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Connected Devices</Text>

        {/* Scanner Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIcon}>
              <Icon
                name="barcode-scan"
                size={24}
                color={connectionStatus.scanner.connected ? '#4CAF50' : '#999'}
              />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Barcode Scanner</Text>
              <Text style={styles.statusSubtitle}>
                {connectionStatus.scanner.connected
                  ? connectionStatus.scanner.device?.name
                  : 'Not connected'}
              </Text>
            </View>
            <View style={[
              styles.statusIndicator,
              connectionStatus.scanner.connected && styles.statusIndicatorConnected
            ]} />
          </View>

          {connectionStatus.scanner.connected && (
            <View style={styles.statusActions}>
              <TouchableOpacity
                style={styles.statusButton}
                onPress={() => handleDisconnectDevice('scanner')}
              >
                <Text style={styles.statusButtonText}>Disconnect</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusButton, styles.statusButtonDanger]}
                onPress={() => handleForgetDevice('scanner')}
              >
                <Text style={[styles.statusButtonText, styles.statusButtonTextDanger]}>
                  Forget
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Printer Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIcon}>
              <Icon
                name="printer"
                size={24}
                color={connectionStatus.printer.connected ? '#4CAF50' : '#999'}
              />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Thermal Printer</Text>
              <Text style={styles.statusSubtitle}>
                {connectionStatus.printer.connected
                  ? connectionStatus.printer.device?.name
                  : 'Not connected'}
              </Text>
            </View>
            <View style={[
              styles.statusIndicator,
              connectionStatus.printer.connected && styles.statusIndicatorConnected
            ]} />
          </View>

          {connectionStatus.printer.connected && (
            <View style={styles.statusActions}>
              <TouchableOpacity
                style={styles.statusButton}
                onPress={handleTestPrinter}
              >
                <Text style={styles.statusButtonText}>Test Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statusButton}
                onPress={() => handleDisconnectDevice('printer')}
              >
                <Text style={styles.statusButtonText}>Disconnect</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusButton, styles.statusButtonDanger]}
                onPress={() => handleForgetDevice('printer')}
              >
                <Text style={[styles.statusButtonText, styles.statusButtonTextDanger]}>
                  Forget
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Auto-reconnect */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Auto-reconnect</Text>
            <Text style={styles.settingSubtitle}>
              Automatically reconnect on app start
            </Text>
          </View>
          <Switch
            value={connectionStatus.autoReconnect}
            onValueChange={handleToggleAutoReconnect}
            trackColor={{ false: '#CCC', true: '#4CAF50' }}
          />
        </View>
      </View>

      {/* Available Devices */}
      <View style={styles.devicesSection}>
        <Text style={styles.sectionTitle}>Available Devices</Text>

        {scanning && (
          <View style={styles.scanningIndicator}>
            <ActivityIndicator color="#2196F3" />
            <Text style={styles.scanningText}>Scanning for devices...</Text>
          </View>
        )}

        <FlatList
          data={[...devices.paired, ...devices.unpaired]}
          keyExtractor={(item) => item.id}
          renderItem={renderDeviceItem}
          ListEmptyComponent={
            !scanning && (
              <View style={styles.emptyState}>
                <Icon name="bluetooth-off" size={48} color="#CCC" />
                <Text style={styles.emptyText}>No devices found</Text>
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={handleScanDevices}
                >
                  <Text style={styles.scanButtonText}>Scan for Devices</Text>
                </TouchableOpacity>
              </View>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={scanning}
              onRefresh={handleScanDevices}
            />
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CCC',
  },
  statusIndicatorConnected: {
    backgroundColor: '#4CAF50',
  },
  statusActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  statusButtonDanger: {
    backgroundColor: '#FFEBEE',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  statusButtonTextDanger: {
    color: '#F44336',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  devicesSection: {
    flex: 1,
    padding: 16,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 12,
  },
  scanningText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  deviceItemConnected: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  deviceAddress: {
    fontSize: 12,
    color: '#999',
  },
  deviceStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BluetoothSettingsScreen;
