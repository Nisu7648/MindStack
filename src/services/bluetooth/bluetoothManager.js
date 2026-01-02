/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BLUETOOTH MANAGER - SCANNER & PRINTER CONNECTIVITY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * - Bluetooth barcode scanner connection
 * - Bluetooth thermal printer connection
 * - Auto-reconnect on disconnect
 * - Device pairing management
 * - Real-time scan events
 * - Print queue management
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import BluetoothSerial from 'react-native-bluetooth-serial-next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SCANNER_DEVICE: '@mindstack_scanner_device',
  PRINTER_DEVICE: '@mindstack_printer_device',
  AUTO_RECONNECT: '@mindstack_auto_reconnect'
};

export class BluetoothManager {
  static scannerDevice = null;
  static printerDevice = null;
  static scannerConnected = false;
  static printerConnected = false;
  static scanListeners = [];
  static connectionListeners = [];
  static autoReconnect = true;

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * INITIALIZE BLUETOOTH
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async initialize() {
    try {
      // Check if Bluetooth is enabled
      const enabled = await BluetoothSerial.isEnabled();
      
      if (!enabled) {
        if (Platform.OS === 'android') {
          await BluetoothSerial.enable();
        } else {
          return { 
            success: false, 
            error: 'Please enable Bluetooth in Settings' 
          };
        }
      }

      // Load saved devices
      await this.loadSavedDevices();

      // Setup scan listener
      this.setupScanListener();

      // Auto-reconnect to saved devices
      if (this.autoReconnect) {
        await this.autoReconnectDevices();
      }

      return { success: true };
    } catch (error) {
      console.error('Bluetooth initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SCAN FOR DEVICES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async scanDevices() {
    try {
      // Get paired devices
      const paired = await BluetoothSerial.list();
      
      // Discover unpaired devices
      const unpaired = await BluetoothSerial.discoverUnpairedDevices();

      return {
        success: true,
        paired: paired || [],
        unpaired: unpaired || []
      };
    } catch (error) {
      console.error('Scan devices error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CONNECT SCANNER
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async connectScanner(device) {
    try {
      // Disconnect if already connected
      if (this.scannerConnected) {
        await this.disconnectScanner();
      }

      // Connect to device
      await BluetoothSerial.connect(device.id);

      this.scannerDevice = device;
      this.scannerConnected = true;

      // Save device
      await AsyncStorage.setItem(
        STORAGE_KEYS.SCANNER_DEVICE,
        JSON.stringify(device)
      );

      // Notify listeners
      this.notifyConnectionChange('scanner', true, device);

      return { 
        success: true, 
        message: `Scanner connected: ${device.name}` 
      };
    } catch (error) {
      console.error('Connect scanner error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * DISCONNECT SCANNER
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async disconnectScanner() {
    try {
      if (this.scannerDevice) {
        await BluetoothSerial.disconnect(this.scannerDevice.id);
      }

      const device = this.scannerDevice;
      this.scannerDevice = null;
      this.scannerConnected = false;

      // Notify listeners
      this.notifyConnectionChange('scanner', false, device);

      return { success: true, message: 'Scanner disconnected' };
    } catch (error) {
      console.error('Disconnect scanner error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CONNECT PRINTER
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async connectPrinter(device) {
    try {
      // Disconnect if already connected
      if (this.printerConnected) {
        await this.disconnectPrinter();
      }

      // Connect to device
      await BluetoothSerial.connect(device.id);

      this.printerDevice = device;
      this.printerConnected = true;

      // Save device
      await AsyncStorage.setItem(
        STORAGE_KEYS.PRINTER_DEVICE,
        JSON.stringify(device)
      );

      // Notify listeners
      this.notifyConnectionChange('printer', true, device);

      return { 
        success: true, 
        message: `Printer connected: ${device.name}` 
      };
    } catch (error) {
      console.error('Connect printer error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * DISCONNECT PRINTER
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async disconnectPrinter() {
    try {
      if (this.printerDevice) {
        await BluetoothSerial.disconnect(this.printerDevice.id);
      }

      const device = this.printerDevice;
      this.printerDevice = null;
      this.printerConnected = false;

      // Notify listeners
      this.notifyConnectionChange('printer', false, device);

      return { success: true, message: 'Printer disconnected' };
    } catch (error) {
      console.error('Disconnect printer error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SETUP SCAN LISTENER (FOR BARCODE SCANNER)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static setupScanListener() {
    BluetoothSerial.on('read', (data) => {
      if (this.scannerConnected && data.data) {
        const scannedCode = data.data.trim();
        
        // Notify all scan listeners
        this.scanListeners.forEach(listener => {
          try {
            listener(scannedCode);
          } catch (error) {
            console.error('Scan listener error:', error);
          }
        });
      }
    });

    // Handle disconnection
    BluetoothSerial.on('connectionLost', () => {
      if (this.scannerConnected) {
        this.scannerConnected = false;
        this.notifyConnectionChange('scanner', false, this.scannerDevice);
        
        // Auto-reconnect if enabled
        if (this.autoReconnect && this.scannerDevice) {
          setTimeout(() => {
            this.connectScanner(this.scannerDevice);
          }, 3000);
        }
      }

      if (this.printerConnected) {
        this.printerConnected = false;
        this.notifyConnectionChange('printer', false, this.printerDevice);
        
        // Auto-reconnect if enabled
        if (this.autoReconnect && this.printerDevice) {
          setTimeout(() => {
            this.connectPrinter(this.printerDevice);
          }, 3000);
        }
      }
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * ADD SCAN LISTENER
   * ═══════════════════════════════════════════════════════════════════════
   */
  static addScanListener(callback) {
    this.scanListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.scanListeners = this.scanListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * ADD CONNECTION LISTENER
   * ═══════════════════════════════════════════════════════════════════════
   */
  static addConnectionListener(callback) {
    this.connectionListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.connectionListeners = this.connectionListeners.filter(
        cb => cb !== callback
      );
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * NOTIFY CONNECTION CHANGE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static notifyConnectionChange(deviceType, connected, device) {
    this.connectionListeners.forEach(listener => {
      try {
        listener({ deviceType, connected, device });
      } catch (error) {
        console.error('Connection listener error:', error);
      }
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LOAD SAVED DEVICES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async loadSavedDevices() {
    try {
      const scannerData = await AsyncStorage.getItem(STORAGE_KEYS.SCANNER_DEVICE);
      const printerData = await AsyncStorage.getItem(STORAGE_KEYS.PRINTER_DEVICE);
      const autoReconnectData = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_RECONNECT);

      if (scannerData) {
        this.scannerDevice = JSON.parse(scannerData);
      }

      if (printerData) {
        this.printerDevice = JSON.parse(printerData);
      }

      if (autoReconnectData !== null) {
        this.autoReconnect = JSON.parse(autoReconnectData);
      }

      return { success: true };
    } catch (error) {
      console.error('Load saved devices error:', error);
      return { success: false };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * AUTO-RECONNECT DEVICES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async autoReconnectDevices() {
    try {
      if (this.scannerDevice && !this.scannerConnected) {
        await this.connectScanner(this.scannerDevice);
      }

      if (this.printerDevice && !this.printerConnected) {
        await this.connectPrinter(this.printerDevice);
      }

      return { success: true };
    } catch (error) {
      console.error('Auto-reconnect error:', error);
      return { success: false };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SET AUTO-RECONNECT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async setAutoReconnect(enabled) {
    try {
      this.autoReconnect = enabled;
      await AsyncStorage.setItem(
        STORAGE_KEYS.AUTO_RECONNECT,
        JSON.stringify(enabled)
      );
      return { success: true };
    } catch (error) {
      console.error('Set auto-reconnect error:', error);
      return { success: false };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET CONNECTION STATUS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static getConnectionStatus() {
    return {
      scanner: {
        connected: this.scannerConnected,
        device: this.scannerDevice
      },
      printer: {
        connected: this.printerConnected,
        device: this.printerDevice
      },
      autoReconnect: this.autoReconnect
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * FORGET DEVICE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async forgetDevice(deviceType) {
    try {
      if (deviceType === 'scanner') {
        await this.disconnectScanner();
        await AsyncStorage.removeItem(STORAGE_KEYS.SCANNER_DEVICE);
        this.scannerDevice = null;
      } else if (deviceType === 'printer') {
        await this.disconnectPrinter();
        await AsyncStorage.removeItem(STORAGE_KEYS.PRINTER_DEVICE);
        this.printerDevice = null;
      }

      return { success: true, message: 'Device forgotten' };
    } catch (error) {
      console.error('Forget device error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CLEANUP
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async cleanup() {
    try {
      await this.disconnectScanner();
      await this.disconnectPrinter();
      this.scanListeners = [];
      this.connectionListeners = [];
      return { success: true };
    } catch (error) {
      console.error('Cleanup error:', error);
      return { success: false };
    }
  }
}

export default BluetoothManager;
