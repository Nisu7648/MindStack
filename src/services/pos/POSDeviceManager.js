/**
 * POS DEVICE MANAGER
 * 
 * Connects POS devices via:
 * - Bluetooth (thermal printers, card readers, barcode scanners)
 * - USB (printers, cash drawers, pole displays)
 * 
 * Supported Devices:
 * - Thermal Printers (80mm, 58mm)
 * - Barcode Scanners
 * - Cash Drawers
 * - Customer Displays
 * - Card Payment Terminals
 */

import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { RNSerialport, definitions, actions } from 'react-native-serialport';

const DEVICE_TYPES = {
  THERMAL_PRINTER: 'thermal_printer',
  BARCODE_SCANNER: 'barcode_scanner',
  CASH_DRAWER: 'cash_drawer',
  CUSTOMER_DISPLAY: 'customer_display',
  CARD_TERMINAL: 'card_terminal'
};

const CONNECTION_TYPES = {
  BLUETOOTH: 'bluetooth',
  USB: 'usb',
  NETWORK: 'network'
};

class POSDeviceManager {
  constructor() {
    this.connectedDevices = new Map();
    this.eventListeners = new Map();
    this.isScanning = false;
  }

  /**
   * ========================================
   * BLUETOOTH DEVICE MANAGEMENT
   * ========================================
   */

  /**
   * SCAN FOR BLUETOOTH DEVICES
   */
  async scanBluetoothDevices(duration = 10000) {
    try {
      console.log('🔍 Scanning for Bluetooth devices...');

      // Check if Bluetooth is enabled
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        throw new Error('Bluetooth is not enabled. Please enable Bluetooth.');
      }

      // Start scanning
      this.isScanning = true;
      const devices = await RNBluetoothClassic.startDiscovery();

      // Wait for scan duration
      await new Promise(resolve => setTimeout(resolve, duration));

      // Stop scanning
      await RNBluetoothClassic.cancelDiscovery();
      this.isScanning = false;

      console.log(`✅ Found ${devices.length} Bluetooth devices`);

      // Filter for POS devices (typically have "printer", "scanner", etc. in name)
      const posDevices = devices.filter(device => {
        const name = device.name?.toLowerCase() || '';
        return (
          name.includes('printer') ||
          name.includes('pos') ||
          name.includes('scanner') ||
          name.includes('thermal') ||
          name.includes('rp') || // Common printer prefix
          name.includes('tm') || // Epson TM series
          name.includes('tsp') // Star TSP series
        );
      });

      return posDevices.map(device => ({
        id: device.address,
        name: device.name || 'Unknown Device',
        address: device.address,
        type: this.detectDeviceType(device.name),
        connectionType: CONNECTION_TYPES.BLUETOOTH,
        isConnected: false,
        rawDevice: device
      }));

    } catch (error) {
      console.error('Bluetooth scan error:', error);
      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * CONNECT TO BLUETOOTH DEVICE
   */
  async connectBluetoothDevice(deviceAddress) {
    try {
      console.log(`📡 Connecting to Bluetooth device: ${deviceAddress}`);

      // Check if already connected
      const existingDevice = this.connectedDevices.get(deviceAddress);
      if (existingDevice && existingDevice.isConnected) {
        console.log('✅ Device already connected');
        return existingDevice;
      }

      // Connect to device
      const connection = await RNBluetoothClassic.connectToDevice(deviceAddress);

      if (!connection) {
        throw new Error('Failed to connect to device');
      }

      // Store connection
      const deviceInfo = {
        id: deviceAddress,
        address: deviceAddress,
        connection,
        connectionType: CONNECTION_TYPES.BLUETOOTH,
        isConnected: true,
        connectedAt: new Date().toISOString()
      };

      this.connectedDevices.set(deviceAddress, deviceInfo);

      console.log('✅ Bluetooth device connected successfully');

      // Set up data listener
      this.setupBluetoothListener(deviceAddress);

      return deviceInfo;

    } catch (error) {
      console.error('Bluetooth connection error:', error);
      throw error;
    }
  }

  /**
   * DISCONNECT BLUETOOTH DEVICE
   */
  async disconnectBluetoothDevice(deviceAddress) {
    try {
      const device = this.connectedDevices.get(deviceAddress);
      if (!device) {
        throw new Error('Device not found');
      }

      await RNBluetoothClassic.disconnectFromDevice(deviceAddress);

      this.connectedDevices.delete(deviceAddress);
      this.eventListeners.delete(deviceAddress);

      console.log('✅ Bluetooth device disconnected');

      return true;

    } catch (error) {
      console.error('Bluetooth disconnection error:', error);
      throw error;
    }
  }

  /**
   * SETUP BLUETOOTH DATA LISTENER
   */
  setupBluetoothListener(deviceAddress) {
    const subscription = RNBluetoothClassic.onDeviceRead((event) => {
      if (event.device.address === deviceAddress) {
        console.log('📨 Received data from device:', event.data);
        
        // Process received data (e.g., from barcode scanner)
        this.handleDeviceData(deviceAddress, event.data);
      }
    });

    this.eventListeners.set(deviceAddress, subscription);
  }

  /**
   * WRITE DATA TO BLUETOOTH DEVICE
   */
  async writeToBluetoothDevice(deviceAddress, data) {
    try {
      const device = this.connectedDevices.get(deviceAddress);
      if (!device || !device.isConnected) {
        throw new Error('Device not connected');
      }

      const result = await RNBluetoothClassic.writeToDevice(deviceAddress, data);

      console.log('✅ Data written to Bluetooth device');

      return result;

    } catch (error) {
      console.error('Bluetooth write error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * USB DEVICE MANAGEMENT
   * ========================================
   */

  /**
   * SCAN FOR USB DEVICES
   */
  async scanUSBDevices() {
    try {
      console.log('🔍 Scanning for USB devices...');

      // Get list of USB devices
      const usbDeviceList = await RNSerialport.getDeviceList();

      console.log(`✅ Found ${usbDeviceList.length} USB devices`);

      return usbDeviceList.map(device => ({
        id: device.name,
        name: device.name,
        productId: device.productId,
        vendorId: device.vendorId,
        type: this.detectDeviceTypeFromUSB(device),
        connectionType: CONNECTION_TYPES.USB,
        isConnected: false,
        rawDevice: device
      }));

    } catch (error) {
      console.error('USB scan error:', error);
      throw error;
    }
  }

  /**
   * CONNECT TO USB DEVICE
   */
  async connectUSBDevice(deviceName, baudRate = 9600) {
    try {
      console.log(`📡 Connecting to USB device: ${deviceName}`);

      // Check if already connected
      const existingDevice = this.connectedDevices.get(deviceName);
      if (existingDevice && existingDevice.isConnected) {
        console.log('✅ Device already connected');
        return existingDevice;
      }

      // Connect to USB device
      const connection = await RNSerialport.connectDevice(deviceName, baudRate);

      if (!connection) {
        throw new Error('Failed to connect to USB device');
      }

      // Store connection
      const deviceInfo = {
        id: deviceName,
        name: deviceName,
        connection,
        connectionType: CONNECTION_TYPES.USB,
        isConnected: true,
        baudRate,
        connectedAt: new Date().toISOString()
      };

      this.connectedDevices.set(deviceName, deviceInfo);

      console.log('✅ USB device connected successfully');

      // Set up data listener
      this.setupUSBListener(deviceName);

      return deviceInfo;

    } catch (error) {
      console.error('USB connection error:', error);
      throw error;
    }
  }

  /**
   * DISCONNECT USB DEVICE
   */
  async disconnectUSBDevice(deviceName) {
    try {
      const device = this.connectedDevices.get(deviceName);
      if (!device) {
        throw new Error('Device not found');
      }

      await RNSerialport.disconnect();

      this.connectedDevices.delete(deviceName);
      this.eventListeners.delete(deviceName);

      console.log('✅ USB device disconnected');

      return true;

    } catch (error) {
      console.error('USB disconnection error:', error);
      throw error;
    }
  }

  /**
   * SETUP USB DATA LISTENER
   */
  setupUSBListener(deviceName) {
    const emitter = new NativeEventEmitter(NativeModules.RNSerialport);
    
    const subscription = emitter.addListener(
      actions.ON_READ_DATA,
      (data) => {
        console.log('📨 Received data from USB device:', data);
        
        // Process received data
        this.handleDeviceData(deviceName, data.payload);
      }
    );

    this.eventListeners.set(deviceName, subscription);
  }

  /**
   * WRITE DATA TO USB DEVICE
   */
  async writeToUSBDevice(deviceName, data) {
    try {
      const device = this.connectedDevices.get(deviceName);
      if (!device || !device.isConnected) {
        throw new Error('Device not connected');
      }

      await RNSerialport.writeString(data);

      console.log('✅ Data written to USB device');

      return true;

    } catch (error) {
      console.error('USB write error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * THERMAL PRINTER OPERATIONS
   * ========================================
   */

  /**
   * PRINT RECEIPT
   */
  async printReceipt(deviceId, receiptData) {
    try {
      const device = this.connectedDevices.get(deviceId);
      if (!device || !device.isConnected) {
        throw new Error('Printer not connected');
      }

      // Build ESC/POS commands
      const commands = this.buildReceiptCommands(receiptData);

      // Send to printer
      if (device.connectionType === CONNECTION_TYPES.BLUETOOTH) {
        await this.writeToBluetoothDevice(deviceId, commands);
      } else if (device.connectionType === CONNECTION_TYPES.USB) {
        await this.writeToUSBDevice(deviceId, commands);
      }

      console.log('✅ Receipt printed successfully');

      return true;

    } catch (error) {
      console.error('Print receipt error:', error);
      throw error;
    }
  }

  /**
   * BUILD ESC/POS COMMANDS FOR RECEIPT
   */
  buildReceiptCommands(receiptData) {
    const ESC = '\x1B';
    const GS = '\x1D';
    const LF = '\x0A';
    const CENTER = ESC + 'a' + '\x01';
    const LEFT = ESC + 'a' + '\x00';
    const RIGHT = ESC + 'a' + '\x02';
    const BOLD_ON = ESC + 'E' + '\x01';
    const BOLD_OFF = ESC + 'E' + '\x00';
    const DOUBLE_SIZE = GS + '!' + '\x11';
    const NORMAL_SIZE = GS + '!' + '\x00';
    const CUT = GS + 'V' + '\x00';

    let commands = '';

    // Initialize printer
    commands += ESC + '@';

    // Header - Business name
    commands += CENTER + DOUBLE_SIZE + BOLD_ON;
    commands += receiptData.businessName + LF;
    commands += NORMAL_SIZE + BOLD_OFF;

    // Business details
    commands += receiptData.businessAddress + LF;
    if (receiptData.businessPhone) {
      commands += 'Phone: ' + receiptData.businessPhone + LF;
    }
    if (receiptData.gstNumber) {
      commands += 'GSTIN: ' + receiptData.gstNumber + LF;
    }

    commands += '--------------------------------' + LF;

    // Invoice details
    commands += LEFT;
    commands += 'Invoice: ' + receiptData.invoiceNumber + LF;
    commands += 'Date: ' + receiptData.date + LF;
    if (receiptData.customerName) {
      commands += 'Customer: ' + receiptData.customerName + LF;
    }

    commands += '--------------------------------' + LF;

    // Items header
    commands += LEFT;
    commands += this.pad('Item', 20) + this.pad('Qty', 5, 'right') + this.pad('Price', 10, 'right') + LF;
    commands += '--------------------------------' + LF;

    // Items
    for (const item of receiptData.items) {
      commands += this.pad(item.name, 20) + LF;
      commands += this.pad('', 20) + this.pad(item.quantity.toString(), 5, 'right');
      commands += this.pad(item.price.toFixed(2), 10, 'right') + LF;
    }

    commands += '--------------------------------' + LF;

    // Totals
    commands += RIGHT;
    commands += 'Subtotal: ' + receiptData.subtotal.toFixed(2) + LF;
    
    if (receiptData.tax > 0) {
      commands += 'Tax: ' + receiptData.tax.toFixed(2) + LF;
    }

    if (receiptData.discount > 0) {
      commands += 'Discount: -' + receiptData.discount.toFixed(2) + LF;
    }

    commands += BOLD_ON;
    commands += 'TOTAL: ' + receiptData.total.toFixed(2) + LF;
    commands += BOLD_OFF;

    commands += '--------------------------------' + LF;

    // Footer
    commands += CENTER;
    commands += 'Thank you for your business!' + LF;
    commands += 'Visit again!' + LF + LF;

    // Cut paper
    commands += CUT + LF;

    return commands;
  }

  /**
   * PAD STRING (helper for receipt formatting)
   */
  pad(str, length, align = 'left') {
    str = str.toString();
    if (str.length >= length) {
      return str.substring(0, length);
    }

    const padding = ' '.repeat(length - str.length);
    
    if (align === 'right') {
      return padding + str;
    } else if (align === 'center') {
      const leftPad = Math.floor((length - str.length) / 2);
      const rightPad = length - str.length - leftPad;
      return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
    } else {
      return str + padding;
    }
  }

  /**
   * OPEN CASH DRAWER
   */
  async openCashDrawer(deviceId) {
    try {
      const device = this.connectedDevices.get(deviceId);
      if (!device || !device.isConnected) {
        throw new Error('Printer not connected');
      }

      // ESC/POS command to open cash drawer
      const openDrawerCommand = '\x1B\x70\x00\x19\xFA';

      if (device.connectionType === CONNECTION_TYPES.BLUETOOTH) {
        await this.writeToBluetoothDevice(deviceId, openDrawerCommand);
      } else if (device.connectionType === CONNECTION_TYPES.USB) {
        await this.writeToUSBDevice(deviceId, openDrawerCommand);
      }

      console.log('✅ Cash drawer opened');

      return true;

    } catch (error) {
      console.error('Open cash drawer error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * DEVICE MANAGEMENT HELPERS
   * ========================================
   */

  /**
   * DETECT DEVICE TYPE FROM NAME
   */
  detectDeviceType(deviceName) {
    const name = deviceName?.toLowerCase() || '';

    if (name.includes('printer') || name.includes('thermal') || name.includes('rp') || name.includes('tm') || name.includes('tsp')) {
      return DEVICE_TYPES.THERMAL_PRINTER;
    } else if (name.includes('scanner') || name.includes('barcode')) {
      return DEVICE_TYPES.BARCODE_SCANNER;
    } else if (name.includes('display')) {
      return DEVICE_TYPES.CUSTOMER_DISPLAY;
    } else if (name.includes('terminal') || name.includes('card') || name.includes('payment')) {
      return DEVICE_TYPES.CARD_TERMINAL;
    } else if (name.includes('drawer')) {
      return DEVICE_TYPES.CASH_DRAWER;
    }

    return DEVICE_TYPES.THERMAL_PRINTER; // Default
  }

  /**
   * DETECT DEVICE TYPE FROM USB INFO
   */
  detectDeviceTypeFromUSB(device) {
    // Common USB vendor IDs for POS devices
    const printerVendors = ['0x0416', '0x04b8', '0x154f', '0x1fc9'];
    const scannerVendors = ['0x05e0', '0x0c2e', '0x1a86'];

    if (printerVendors.includes(device.vendorId)) {
      return DEVICE_TYPES.THERMAL_PRINTER;
    } else if (scannerVendors.includes(device.vendorId)) {
      return DEVICE_TYPES.BARCODE_SCANNER;
    }

    return DEVICE_TYPES.THERMAL_PRINTER; // Default
  }

  /**
   * HANDLE DEVICE DATA (from scanner, etc.)
   */
  handleDeviceData(deviceId, data) {
    const device = this.connectedDevices.get(deviceId);
    if (!device) return;

    // Emit event for data received
    if (this.onDataReceived) {
      this.onDataReceived({
        deviceId,
        deviceType: device.type,
        data
      });
    }
  }

  /**
   * GET ALL CONNECTED DEVICES
   */
  getConnectedDevices() {
    return Array.from(this.connectedDevices.values());
  }

  /**
   * CHECK IF DEVICE IS CONNECTED
   */
  isDeviceConnected(deviceId) {
    const device = this.connectedDevices.get(deviceId);
    return device && device.isConnected;
  }

  /**
   * DISCONNECT ALL DEVICES
   */
  async disconnectAll() {
    try {
      const deviceIds = Array.from(this.connectedDevices.keys());

      for (const deviceId of deviceIds) {
        const device = this.connectedDevices.get(deviceId);
        
        if (device.connectionType === CONNECTION_TYPES.BLUETOOTH) {
          await this.disconnectBluetoothDevice(deviceId);
        } else if (device.connectionType === CONNECTION_TYPES.USB) {
          await this.disconnectUSBDevice(deviceId);
        }
      }

      console.log('✅ All devices disconnected');

      return true;

    } catch (error) {
      console.error('Disconnect all error:', error);
      throw error;
    }
  }

  /**
   * SET DATA RECEIVED CALLBACK
   */
  setOnDataReceived(callback) {
    this.onDataReceived = callback;
  }
}

// Export singleton instance
export default new POSDeviceManager();
export { DEVICE_TYPES, CONNECTION_TYPES };
