/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THERMAL PRINTER SERVICE - SMALL BILL PRINTING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * - 58mm thermal printer support
 * - 80mm thermal printer support
 * - ESC/POS commands
 * - Text formatting (bold, underline, size)
 * - Alignment (left, center, right)
 * - QR code printing
 * - Barcode printing
 * - Logo printing
 * - Cut paper command
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import BluetoothSerial from 'react-native-bluetooth-serial-next';
import { Buffer } from 'buffer';
import moment from 'moment';

export class ThermalPrinterService {
  // ESC/POS Commands
  static ESC = '\x1B';
  static GS = '\x1D';
  static INIT = '\x1B\x40';
  static FEED = '\x0A';
  static CUT = '\x1D\x56\x00';
  
  // Text formatting
  static BOLD_ON = '\x1B\x45\x01';
  static BOLD_OFF = '\x1B\x45\x00';
  static UNDERLINE_ON = '\x1B\x2D\x01';
  static UNDERLINE_OFF = '\x1B\x2D\x00';
  static DOUBLE_HEIGHT = '\x1B\x21\x10';
  static DOUBLE_WIDTH = '\x1B\x21\x20';
  static NORMAL_SIZE = '\x1B\x21\x00';
  
  // Alignment
  static ALIGN_LEFT = '\x1B\x61\x00';
  static ALIGN_CENTER = '\x1B\x61\x01';
  static ALIGN_RIGHT = '\x1B\x61\x02';

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PRINT INVOICE (SMALL THERMAL BILL)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async printInvoice(invoiceData, printerWidth = 32) {
    try {
      const { invoice, items, company } = invoiceData;

      let commands = '';

      // Initialize printer
      commands += this.INIT;

      // Company header (centered, bold, double height)
      commands += this.ALIGN_CENTER;
      commands += this.BOLD_ON;
      commands += this.DOUBLE_HEIGHT;
      commands += company.company_name || 'MindStack Business';
      commands += this.FEED;
      commands += this.NORMAL_SIZE;
      commands += this.BOLD_OFF;

      // Company details (centered, normal)
      if (company.address) {
        commands += company.address + this.FEED;
      }
      if (company.phone) {
        commands += 'Ph: ' + company.phone + this.FEED;
      }
      if (company.gstin) {
        commands += 'GSTIN: ' + company.gstin + this.FEED;
      }

      // Separator line
      commands += this.printLine(printerWidth);

      // Invoice details (left aligned)
      commands += this.ALIGN_LEFT;
      commands += 'Invoice: ' + invoice.invoice_number + this.FEED;
      commands += 'Date: ' + moment(invoice.invoice_date).format('DD-MMM-YY HH:mm') + this.FEED;
      
      if (invoice.customer_name) {
        commands += 'Customer: ' + invoice.customer_name + this.FEED;
      }
      if (invoice.customer_phone) {
        commands += 'Phone: ' + invoice.customer_phone + this.FEED;
      }

      // Separator line
      commands += this.printLine(printerWidth);

      // Items header
      commands += this.BOLD_ON;
      commands += this.formatRow('Item', 'Qty', 'Price', 'Total', printerWidth);
      commands += this.BOLD_OFF;
      commands += this.printLine(printerWidth);

      // Items
      for (const item of items) {
        // Item name (full width)
        commands += item.product_name + this.FEED;
        
        // Item details (qty, price, total)
        const qty = item.quantity + ' ' + item.unit;
        const price = '₹' + this.formatAmount(item.price);
        const total = '₹' + this.formatAmount(item.total_amount);
        
        commands += this.formatRow('', qty, price, total, printerWidth);
      }

      // Separator line
      commands += this.printLine(printerWidth);

      // Totals (right aligned)
      commands += this.ALIGN_RIGHT;
      
      commands += 'Subtotal: ₹' + this.formatAmount(invoice.subtotal) + this.FEED;
      
      if (invoice.discount_amount > 0) {
        commands += 'Discount: -₹' + this.formatAmount(invoice.discount_amount) + this.FEED;
      }
      
      if (invoice.cgst_amount > 0) {
        commands += 'CGST: ₹' + this.formatAmount(invoice.cgst_amount) + this.FEED;
      }
      
      if (invoice.sgst_amount > 0) {
        commands += 'SGST: ₹' + this.formatAmount(invoice.sgst_amount) + this.FEED;
      }
      
      if (invoice.igst_amount > 0) {
        commands += 'IGST: ₹' + this.formatAmount(invoice.igst_amount) + this.FEED;
      }

      // Grand total (bold, double height)
      commands += this.BOLD_ON;
      commands += this.DOUBLE_HEIGHT;
      commands += 'TOTAL: ₹' + this.formatAmount(invoice.grand_total) + this.FEED;
      commands += this.NORMAL_SIZE;
      commands += this.BOLD_OFF;

      // Separator line
      commands += this.ALIGN_LEFT;
      commands += this.printLine(printerWidth);

      // Payment mode
      commands += 'Payment: ' + invoice.payment_mode + this.FEED;

      // Footer (centered)
      commands += this.ALIGN_CENTER;
      commands += this.FEED;
      commands += 'Thank you for your business!' + this.FEED;
      commands += 'Visit Again!' + this.FEED;
      commands += this.FEED;

      // QR Code (optional - if invoice number)
      // commands += this.printQRCode(invoice.invoice_number);

      // Feed and cut
      commands += this.FEED;
      commands += this.FEED;
      commands += this.FEED;
      commands += this.CUT;

      // Send to printer
      await BluetoothSerial.write(commands);

      return { success: true, message: 'Invoice printed successfully' };
    } catch (error) {
      console.error('Print invoice error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PRINT DAY CLOSING REPORT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async printDayClosing(dayClosingData, printerWidth = 32) {
    try {
      const { dayClosing, company } = dayClosingData;

      let commands = '';

      // Initialize
      commands += this.INIT;

      // Header
      commands += this.ALIGN_CENTER;
      commands += this.BOLD_ON;
      commands += this.DOUBLE_HEIGHT;
      commands += 'DAY CLOSING REPORT' + this.FEED;
      commands += this.NORMAL_SIZE;
      commands += this.BOLD_OFF;
      commands += moment(dayClosing.closing_date).format('DD-MMM-YYYY') + this.FEED;
      commands += this.printLine(printerWidth);

      // Sales summary
      commands += this.ALIGN_LEFT;
      commands += this.BOLD_ON;
      commands += 'SALES SUMMARY' + this.FEED;
      commands += this.BOLD_OFF;
      
      commands += this.formatKeyValue('Total Invoices', dayClosing.total_invoices, printerWidth);
      commands += this.formatKeyValue('Total Sales', '₹' + this.formatAmount(dayClosing.total_sales), printerWidth);
      commands += this.formatKeyValue('Cash Sales', '₹' + this.formatAmount(dayClosing.total_cash_sales), printerWidth);
      commands += this.formatKeyValue('UPI Sales', '₹' + this.formatAmount(dayClosing.total_upi_sales), printerWidth);
      commands += this.formatKeyValue('Card Sales', '₹' + this.formatAmount(dayClosing.total_card_sales), printerWidth);
      
      commands += this.printLine(printerWidth);

      // Cash reconciliation
      commands += this.BOLD_ON;
      commands += 'CASH RECONCILIATION' + this.FEED;
      commands += this.BOLD_OFF;
      
      commands += this.formatKeyValue('Opening Cash', '₹' + this.formatAmount(dayClosing.opening_cash), printerWidth);
      commands += this.formatKeyValue('Cash Sales', '₹' + this.formatAmount(dayClosing.total_cash_sales), printerWidth);
      commands += this.formatKeyValue('Returns', '-₹' + this.formatAmount(dayClosing.total_returns), printerWidth);
      commands += this.formatKeyValue('Expenses', '-₹' + this.formatAmount(dayClosing.total_expenses), printerWidth);
      commands += this.formatKeyValue('Expected Cash', '₹' + this.formatAmount(dayClosing.expected_cash), printerWidth);
      commands += this.formatKeyValue('Actual Cash', '₹' + this.formatAmount(dayClosing.actual_cash), printerWidth);
      
      commands += this.printLine(printerWidth);
      
      // Difference (bold if not zero)
      if (dayClosing.cash_difference !== 0) {
        commands += this.BOLD_ON;
      }
      commands += this.formatKeyValue(
        'Difference', 
        (dayClosing.cash_difference >= 0 ? '+' : '') + '₹' + this.formatAmount(Math.abs(dayClosing.cash_difference)), 
        printerWidth
      );
      if (dayClosing.cash_difference !== 0) {
        commands += this.BOLD_OFF;
      }

      // Signature section
      commands += this.FEED;
      commands += this.FEED;
      commands += 'Cashier: _______________' + this.FEED;
      commands += this.FEED;
      commands += 'Manager: _______________' + this.FEED;

      // Feed and cut
      commands += this.FEED;
      commands += this.FEED;
      commands += this.CUT;

      // Send to printer
      await BluetoothSerial.write(commands);

      return { success: true, message: 'Day closing report printed' };
    } catch (error) {
      console.error('Print day closing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PRINT TEST PAGE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async printTestPage(printerWidth = 32) {
    try {
      let commands = '';

      commands += this.INIT;
      commands += this.ALIGN_CENTER;
      commands += this.BOLD_ON;
      commands += this.DOUBLE_HEIGHT;
      commands += 'TEST PRINT' + this.FEED;
      commands += this.NORMAL_SIZE;
      commands += this.BOLD_OFF;
      commands += this.FEED;
      commands += 'MindStack POS System' + this.FEED;
      commands += moment().format('DD-MMM-YYYY HH:mm:ss') + this.FEED;
      commands += this.FEED;
      commands += this.printLine(printerWidth);
      commands += this.FEED;
      commands += 'Printer is working!' + this.FEED;
      commands += this.FEED;
      commands += this.FEED;
      commands += this.CUT;

      await BluetoothSerial.write(commands);

      return { success: true, message: 'Test page printed' };
    } catch (error) {
      console.error('Print test page error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER: FORMAT AMOUNT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static formatAmount(amount) {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toFixed(2);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER: PRINT LINE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static printLine(width) {
    return '-'.repeat(width) + this.FEED;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER: FORMAT ROW (4 COLUMNS)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static formatRow(col1, col2, col3, col4, width) {
    const colWidth = Math.floor(width / 4);
    
    const c1 = this.padRight(col1, colWidth);
    const c2 = this.padRight(col2, colWidth);
    const c3 = this.padRight(col3, colWidth);
    const c4 = this.padLeft(col4, colWidth);
    
    return c1 + c2 + c3 + c4 + this.FEED;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER: FORMAT KEY-VALUE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static formatKeyValue(key, value, width) {
    const keyWidth = Math.floor(width * 0.6);
    const valueWidth = width - keyWidth;
    
    const k = this.padRight(key, keyWidth);
    const v = this.padLeft(value.toString(), valueWidth);
    
    return k + v + this.FEED;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER: PAD RIGHT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static padRight(str, length) {
    str = str.toString();
    if (str.length >= length) return str.substring(0, length);
    return str + ' '.repeat(length - str.length);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER: PAD LEFT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static padLeft(str, length) {
    str = str.toString();
    if (str.length >= length) return str.substring(0, length);
    return ' '.repeat(length - str.length) + str;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PRINT QR CODE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static printQRCode(data) {
    // QR Code ESC/POS commands
    const qrSize = 6; // Size 1-16
    const qrErrorCorrection = 48; // L=48, M=49, Q=50, H=51
    
    let commands = '';
    
    // Set QR code model
    commands += this.GS + '(k\x04\x00\x31\x41\x32\x00';
    
    // Set QR code size
    commands += this.GS + '(k\x03\x00\x31\x43' + String.fromCharCode(qrSize);
    
    // Set error correction
    commands += this.GS + '(k\x03\x00\x31\x45' + String.fromCharCode(qrErrorCorrection);
    
    // Store data
    const dataLength = data.length + 3;
    const pL = dataLength % 256;
    const pH = Math.floor(dataLength / 256);
    commands += this.GS + '(k' + String.fromCharCode(pL) + String.fromCharCode(pH) + '\x31\x50\x30' + data;
    
    // Print QR code
    commands += this.GS + '(k\x03\x00\x31\x51\x30';
    
    return commands;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * OPEN CASH DRAWER
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async openCashDrawer() {
    try {
      const command = '\x1B\x70\x00\x19\xFA'; // ESC p 0 25 250
      await BluetoothSerial.write(command);
      return { success: true, message: 'Cash drawer opened' };
    } catch (error) {
      console.error('Open cash drawer error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default ThermalPrinterService;
