/**
 * BLUETOOTH PRINT SERVICE
 * Complete Bluetooth thermal printer integration
 * 
 * Features:
 * - Bluetooth printer discovery
 * - Auto-connect to last printer
 * - ESC/POS command support
 * - Invoice formatting
 * - Receipt printing
 * - 58mm and 80mm paper support
 */

import { PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ESC/POS Commands
 */
const ESC = '\x1B';
const GS = '\x1D';

const COMMANDS = {
  INIT: ESC + '@',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  UNDERLINE_ON: ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  FONT_SMALL: ESC + 'M' + '\x01',
  FONT_NORMAL: ESC + 'M' + '\x00',
  DOUBLE_HEIGHT: ESC + '!' + '\x10',
  DOUBLE_WIDTH: ESC + '!' + '\x20',
  DOUBLE_SIZE: ESC + '!' + '\x30',
  NORMAL_SIZE: ESC + '!' + '\x00',
  CUT_PAPER: GS + 'V' + '\x41' + '\x00',
  FEED_LINE: '\n',
  FEED_LINES_3: '\n\n\n'
};

/**
 * Bluetooth Print Service
 */
class BluetoothPrintService {
  constructor() {
    this.connectedDevice = null;
    this.paperWidth = 48; // 58mm = 48 chars, 80mm = 64 chars
  }

  /**
   * Request Bluetooth permissions (Android)
   */
  async requestPermissions() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      ]);

      return Object.values(granted).every(
        permission => permission === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true;
  }

  /**
   * Scan for Bluetooth devices
   */
  async scanDevices() {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Bluetooth permissions not granted');
      }

      const devices = await RNBluetoothClassic.list();
      return devices;
    } catch (error) {
      throw new Error(`Failed to scan devices: ${error.message}`);
    }
  }

  /**
   * Connect to printer
   */
  async connectToPrinter(deviceId) {
    try {
      const device = await RNBluetoothClassic.connectToDevice(deviceId);
      this.connectedDevice = device;

      // Save last connected printer
      await AsyncStorage.setItem('lastPrinter', deviceId);

      return true;
    } catch (error) {
      throw new Error(`Failed to connect: ${error.message}`);
    }
  }

  /**
   * Connect to last used printer
   */
  async connectToLastPrinter() {
    try {
      const lastPrinterId = await AsyncStorage.getItem('lastPrinter');
      if (!lastPrinterId) {
        return false;
      }

      const isConnected = await RNBluetoothClassic.isDeviceConnected(lastPrinterId);
      if (isConnected) {
        this.connectedDevice = await RNBluetoothClassic.getConnectedDevice(lastPrinterId);
        return true;
      }

      return await this.connectToPrinter(lastPrinterId);
    } catch (error) {
      return false;
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect() {
    try {
      if (this.connectedDevice) {
        await this.connectedDevice.disconnect();
        this.connectedDevice = null;
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connectedDevice !== null;
  }

  /**
   * Send raw data to printer
   */
  async sendData(data) {
    if (!this.connectedDevice) {
      throw new Error('Printer not connected');
    }

    try {
      await this.connectedDevice.write(data);
    } catch (error) {
      throw new Error(`Print failed: ${error.message}`);
    }
  }

  /**
   * Print text
   */
  async printText(text, options = {}) {
    let data = '';

    // Alignment
    if (options.align === 'center') {
      data += COMMANDS.ALIGN_CENTER;
    } else if (options.align === 'right') {
      data += COMMANDS.ALIGN_RIGHT;
    } else {
      data += COMMANDS.ALIGN_LEFT;
    }

    // Font size
    if (options.size === 'double') {
      data += COMMANDS.DOUBLE_SIZE;
    } else if (options.size === 'wide') {
      data += COMMANDS.DOUBLE_WIDTH;
    } else if (options.size === 'tall') {
      data += COMMANDS.DOUBLE_HEIGHT;
    } else {
      data += COMMANDS.NORMAL_SIZE;
    }

    // Bold
    if (options.bold) {
      data += COMMANDS.BOLD_ON;
    }

    // Underline
    if (options.underline) {
      data += COMMANDS.UNDERLINE_ON;
    }

    // Text
    data += text + COMMANDS.FEED_LINE;

    // Reset
    data += COMMANDS.BOLD_OFF;
    data += COMMANDS.UNDERLINE_OFF;
    data += COMMANDS.NORMAL_SIZE;

    await this.sendData(data);
  }

  /**
   * Print line separator
   */
  async printLine(char = '-') {
    const line = char.repeat(this.paperWidth);
    await this.printText(line);
  }

  /**
   * Print two-column text
   */
  async printTwoColumn(left, right) {
    const leftLen = left.length;
    const rightLen = right.length;
    const spaces = this.paperWidth - leftLen - rightLen;
    
    const line = left + ' '.repeat(Math.max(0, spaces)) + right;
    await this.printText(line);
  }

  /**
   * Print invoice
   */
  async printInvoice(invoice, businessInfo) {
    try {
      // Initialize
      await this.sendData(COMMANDS.INIT);

      // Business header
      await this.printText(businessInfo.businessName, { 
        align: 'center', 
        size: 'double', 
        bold: true 
      });
      await this.printText(businessInfo.address, { align: 'center' });
      await this.printText(`Phone: ${businessInfo.phone}`, { align: 'center' });
      await this.printText(`GSTIN: ${businessInfo.gstin}`, { align: 'center' });
      
      await this.printLine('=');

      // Invoice title
      await this.printText('TAX INVOICE', { 
        align: 'center', 
        bold: true,
        size: 'wide'
      });

      await this.printLine('-');

      // Invoice details
      await this.printTwoColumn('Invoice No:', invoice.invoice_number);
      await this.printTwoColumn('Date:', invoice.invoice_date);
      
      if (invoice.customer_name) {
        await this.printTwoColumn('Customer:', invoice.customer_name);
      }

      await this.printLine('=');

      // Items header
      await this.printText('ITEMS', { bold: true });
      await this.printLine('-');

      // Items
      for (const item of invoice.items) {
        await this.printText(item.itemName, { bold: true });
        await this.printTwoColumn(
          `  ${item.quantity} ${item.unit} x ${item.rate}`,
          `${item.itemTotal}`
        );
        if (item.gstRate > 0) {
          await this.printTwoColumn(
            `  GST ${item.gstRate}%`,
            `${item.totalGST}`
          );
        }
      }

      await this.printLine('=');

      // Summary
      await this.printTwoColumn('Subtotal:', `₹${invoice.subtotal}`);
      
      if (invoice.gst_breakup.cgst > 0) {
        await this.printTwoColumn('CGST:', `₹${invoice.gst_breakup.cgst}`);
        await this.printTwoColumn('SGST:', `₹${invoice.gst_breakup.sgst}`);
      } else if (invoice.gst_breakup.igst > 0) {
        await this.printTwoColumn('IGST:', `₹${invoice.gst_breakup.igst}`);
      }

      if (invoice.round_off !== 0) {
        await this.printTwoColumn('Round Off:', `₹${invoice.round_off}`);
      }

      await this.printLine('=');

      // Grand total
      await this.printTwoColumn('GRAND TOTAL:', `₹${invoice.grand_total}`);
      await this.printText(`₹${invoice.grand_total}`, { 
        align: 'right', 
        size: 'double', 
        bold: true 
      });

      await this.printLine('=');

      // Payment mode
      await this.printTwoColumn('Payment Mode:', invoice.payment_mode);

      await this.printLine('-');

      // Footer
      await this.printText('Thank you for your business!', { 
        align: 'center' 
      });
      await this.printText('Visit Again!', { 
        align: 'center',
        bold: true
      });

      // Feed and cut
      await this.sendData(COMMANDS.FEED_LINES_3);
      await this.sendData(COMMANDS.CUT_PAPER);

    } catch (error) {
      throw new Error(`Print failed: ${error.message}`);
    }
  }

  /**
   * Print receipt (simplified)
   */
  async printReceipt(invoice, businessInfo) {
    try {
      await this.sendData(COMMANDS.INIT);

      // Header
      await this.printText(businessInfo.businessName, { 
        align: 'center', 
        bold: true 
      });
      await this.printText(businessInfo.phone, { align: 'center' });
      
      await this.printLine('-');

      // Invoice info
      await this.printTwoColumn('Bill:', invoice.invoice_number);
      await this.printTwoColumn('Date:', invoice.invoice_date);

      await this.printLine('-');

      // Items
      for (const item of invoice.items) {
        await this.printText(item.itemName);
        await this.printTwoColumn(
          `${item.quantity} x ${item.rate}`,
          `${item.itemTotal}`
        );
      }

      await this.printLine('-');

      // Total
      await this.printTwoColumn('TOTAL:', `₹${invoice.grand_total}`);
      await this.printTwoColumn('Paid:', invoice.payment_mode);

      await this.printLine('-');

      await this.printText('Thank You!', { align: 'center', bold: true });

      await this.sendData(COMMANDS.FEED_LINES_3);
      await this.sendData(COMMANDS.CUT_PAPER);

    } catch (error) {
      throw new Error(`Print failed: ${error.message}`);
    }
  }

  /**
   * Test print
   */
  async testPrint() {
    try {
      await this.sendData(COMMANDS.INIT);
      await this.printText('TEST PRINT', { 
        align: 'center', 
        size: 'double', 
        bold: true 
      });
      await this.printLine('=');
      await this.printText('Printer connected successfully!', { 
        align: 'center' 
      });
      await this.printLine('-');
      await this.printText('Normal text');
      await this.printText('Bold text', { bold: true });
      await this.printText('Large text', { size: 'double' });
      await this.printLine('=');
      await this.sendData(COMMANDS.FEED_LINES_3);
      await this.sendData(COMMANDS.CUT_PAPER);
    } catch (error) {
      throw new Error(`Test print failed: ${error.message}`);
    }
  }

  /**
   * Set paper width
   */
  setPaperWidth(width) {
    // 58mm = 48 chars, 80mm = 64 chars
    this.paperWidth = width === 80 ? 64 : 48;
  }
}

// Create singleton instance
const bluetoothPrintService = new BluetoothPrintService();

export default bluetoothPrintService;
export { BluetoothPrintService };
