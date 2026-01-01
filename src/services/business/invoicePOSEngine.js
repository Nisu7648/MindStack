/**
 * MINDSLATE INVOICE, POS & STOCK INTELLIGENCE
 * Complete front-office system for Indian businesses
 * 
 * Features:
 * - Invoice generation (Cash, Tax, Credit, POS)
 * - Item scanning (Barcode/QR)
 * - Voice item input
 * - Stock management
 * - GST calculation
 * - Automatic accounting integration
 * - Offline support
 */

/**
 * INVOICE TYPES
 */
export const INVOICE_TYPES = {
  CASH_BILL: 'CASH_BILL',       // B2C, no buyer GST
  TAX_INVOICE: 'TAX_INVOICE',   // B2B, GST applicable
  CREDIT_INVOICE: 'CREDIT_INVOICE', // Udhar/payment later
  POS_RECEIPT: 'POS_RECEIPT'    // Fast billing
};

/**
 * ITEM INPUT MODES
 */
export const INPUT_MODES = {
  SCAN: 'SCAN',       // Barcode/QR
  TYPE: 'TYPE',       // Manual typing
  VOICE: 'VOICE',     // Voice input
  SELECT: 'SELECT'    // From stock list
};

/**
 * PAYMENT MODES
 */
export const PAYMENT_MODES = {
  CASH: 'CASH',
  UPI: 'UPI',
  BANK: 'BANK',
  CARD: 'CARD',
  CREDIT: 'CREDIT'
};

/**
 * UNITS
 */
export const UNITS = {
  PCS: 'PCS',
  KG: 'KG',
  GRAM: 'GRAM',
  LITER: 'LITER',
  ML: 'ML',
  BOX: 'BOX',
  DOZEN: 'DOZEN',
  METER: 'METER',
  PAIR: 'PAIR'
};

/**
 * Invoice & POS Engine
 */
class InvoicePOSEngine {
  constructor() {
    this.currentInvoice = null;
    this.invoiceCounter = 1;
    this.lowStockThreshold = 10;
  }

  /**
   * Create new invoice
   */
  async createInvoice(params) {
    const {
      invoiceType = INVOICE_TYPES.CASH_BILL,
      customerName = null,
      customerGSTIN = null,
      customerPhone = null,
      supplierGSTIN,
      supplierState
    } = params;

    // Generate invoice number
    const invoiceNumber = this.generateInvoiceNumber(invoiceType);
    const invoiceDate = new Date().toISOString().split('T')[0];

    this.currentInvoice = {
      invoiceNumber,
      invoiceDate,
      invoiceType,
      customerName,
      customerGSTIN,
      customerPhone,
      supplierGSTIN,
      supplierState,
      items: [],
      subtotal: 0,
      gstBreakup: {
        cgst: 0,
        sgst: 0,
        igst: 0,
        cess: 0
      },
      grandTotal: 0,
      roundOff: 0,
      paymentMode: null,
      status: 'DRAFT',
      createdAt: new Date().toISOString()
    };

    return {
      success: true,
      invoice: this.currentInvoice
    };
  }

  /**
   * Add item to invoice
   */
  async addItem(params) {
    const {
      itemCode,
      itemName,
      quantity,
      unit = UNITS.PCS,
      rate,
      gstRate,
      hsnCode,
      discount = 0,
      discountType = 'AMOUNT',
      inputMode = INPUT_MODES.TYPE
    } = params;

    if (!this.currentInvoice) {
      throw new Error('No active invoice. Create invoice first.');
    }

    // Validate item
    const validation = await this.validateItem(params);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        needsClarification: validation.needsClarification,
        question: validation.question
      };
    }

    // Check stock availability
    const stockCheck = await this.checkStock(itemCode, quantity);
    if (!stockCheck.available) {
      return {
        success: false,
        error: `Insufficient stock. Available: ${stockCheck.currentStock}`,
        warning: true
      };
    }

    // Calculate item total
    const grossAmount = quantity * rate;
    let discountAmount = 0;
    
    if (discountType === 'PERCENTAGE') {
      discountAmount = (grossAmount * discount) / 100;
    } else {
      discountAmount = discount;
    }

    const taxableValue = grossAmount - discountAmount;

    // Calculate GST
    const gst = this.calculateItemGST(
      taxableValue,
      gstRate,
      this.currentInvoice.customerGSTIN,
      this.currentInvoice.supplierState
    );

    const itemTotal = taxableValue + gst.totalGST;

    // Add item to invoice
    const item = {
      itemCode,
      itemName,
      hsnCode,
      quantity,
      unit,
      rate: this.round(rate),
      grossAmount: this.round(grossAmount),
      discount: this.round(discountAmount),
      taxableValue: this.round(taxableValue),
      gstRate,
      cgst: this.round(gst.cgst),
      sgst: this.round(gst.sgst),
      igst: this.round(gst.igst),
      cess: this.round(gst.cess),
      totalGST: this.round(gst.totalGST),
      itemTotal: this.round(itemTotal),
      inputMode
    };

    this.currentInvoice.items.push(item);

    // Recalculate invoice totals
    this.recalculateInvoice();

    return {
      success: true,
      item,
      invoice: this.currentInvoice
    };
  }

  /**
   * Add item by scanning barcode
   */
  async scanItem(barcode) {
    // Fetch item from stock database
    const item = await this.getItemByBarcode(barcode);

    if (!item) {
      return {
        success: false,
        error: 'Item not found',
        needsAddToStock: true,
        question: 'Item not found. Add to stock?',
        barcode
      };
    }

    // Add item with default quantity 1
    return this.addItem({
      itemCode: item.itemCode,
      itemName: item.itemName,
      quantity: 1,
      unit: item.unit,
      rate: item.sellingPrice,
      gstRate: item.gstRate,
      hsnCode: item.hsnCode,
      inputMode: INPUT_MODES.SCAN
    });
  }

  /**
   * Add item by voice
   */
  async addItemByVoice(voiceInput) {
    // Parse voice input
    const parsed = this.parseVoiceInput(voiceInput);

    if (!parsed.itemName) {
      return {
        success: false,
        error: 'Could not understand item name',
        needsClarification: true,
        question: 'Which item do you want to add?'
      };
    }

    // Search item in stock
    const item = await this.searchItem(parsed.itemName);

    if (!item) {
      return {
        success: false,
        error: 'Item not found in stock',
        needsAddToStock: true,
        question: `Add "${parsed.itemName}" to stock?`
      };
    }

    // Add item
    return this.addItem({
      itemCode: item.itemCode,
      itemName: item.itemName,
      quantity: parsed.quantity || 1,
      unit: parsed.unit || item.unit,
      rate: parsed.rate || item.sellingPrice,
      gstRate: item.gstRate,
      hsnCode: item.hsnCode,
      inputMode: INPUT_MODES.VOICE
    });
  }

  /**
   * Parse voice input
   */
  parseVoiceInput(input) {
    const normalized = input.toLowerCase();
    
    // Extract quantity
    let quantity = 1;
    const qtyMatch = normalized.match(/(\d+)\s*(pcs|kg|piece|pieces|box|liter)/i);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1]);
    }

    // Extract rate
    let rate = null;
    const rateMatch = normalized.match(/(\d+)\s*(rupees|rs|each)/i);
    if (rateMatch) {
      rate = parseFloat(rateMatch[1]);
    }

    // Extract unit
    let unit = UNITS.PCS;
    if (/kg|kilo/i.test(normalized)) unit = UNITS.KG;
    else if (/liter|litre/i.test(normalized)) unit = UNITS.LITER;
    else if (/box/i.test(normalized)) unit = UNITS.BOX;
    else if (/dozen/i.test(normalized)) unit = UNITS.DOZEN;

    // Extract item name (remove quantity and rate parts)
    let itemName = normalized
      .replace(/(\d+)\s*(pcs|kg|piece|pieces|box|liter)/gi, '')
      .replace(/(\d+)\s*(rupees|rs|each)/gi, '')
      .trim();

    return {
      itemName,
      quantity,
      rate,
      unit
    };
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(itemIndex, newQuantity) {
    if (!this.currentInvoice) {
      throw new Error('No active invoice');
    }

    if (itemIndex < 0 || itemIndex >= this.currentInvoice.items.length) {
      throw new Error('Invalid item index');
    }

    const item = this.currentInvoice.items[itemIndex];

    // Check stock
    const stockCheck = await this.checkStock(item.itemCode, newQuantity);
    if (!stockCheck.available) {
      return {
        success: false,
        error: `Insufficient stock. Available: ${stockCheck.currentStock}`
      };
    }

    // Update quantity
    item.quantity = newQuantity;
    item.grossAmount = newQuantity * item.rate;
    item.taxableValue = item.grossAmount - item.discount;

    // Recalculate GST
    const gst = this.calculateItemGST(
      item.taxableValue,
      item.gstRate,
      this.currentInvoice.customerGSTIN,
      this.currentInvoice.supplierState
    );

    item.cgst = this.round(gst.cgst);
    item.sgst = this.round(gst.sgst);
    item.igst = this.round(gst.igst);
    item.totalGST = this.round(gst.totalGST);
    item.itemTotal = this.round(item.taxableValue + gst.totalGST);

    // Recalculate invoice
    this.recalculateInvoice();

    return {
      success: true,
      item,
      invoice: this.currentInvoice
    };
  }

  /**
   * Remove item from invoice
   */
  removeItem(itemIndex) {
    if (!this.currentInvoice) {
      throw new Error('No active invoice');
    }

    if (itemIndex < 0 || itemIndex >= this.currentInvoice.items.length) {
      throw new Error('Invalid item index');
    }

    this.currentInvoice.items.splice(itemIndex, 1);
    this.recalculateInvoice();

    return {
      success: true,
      invoice: this.currentInvoice
    };
  }

  /**
   * Set payment mode
   */
  setPaymentMode(paymentMode) {
    if (!this.currentInvoice) {
      throw new Error('No active invoice');
    }

    if (!Object.values(PAYMENT_MODES).includes(paymentMode)) {
      throw new Error('Invalid payment mode');
    }

    this.currentInvoice.paymentMode = paymentMode;

    return {
      success: true,
      invoice: this.currentInvoice
    };
  }

  /**
   * Confirm and finalize invoice
   */
  async confirmInvoice() {
    if (!this.currentInvoice) {
      throw new Error('No active invoice');
    }

    if (this.currentInvoice.items.length === 0) {
      throw new Error('Cannot confirm empty invoice');
    }

    if (!this.currentInvoice.paymentMode) {
      return {
        success: false,
        needsClarification: true,
        question: 'Payment mode? (Cash/UPI/Bank/Card/Credit)'
      };
    }

    // Validate all items have GST rates
    const missingGST = this.currentInvoice.items.find(item => 
      item.gstRate === undefined || item.gstRate === null
    );

    if (missingGST) {
      return {
        success: false,
        needsClarification: true,
        question: `GST rate for ${missingGST.itemName}?`
      };
    }

    // Mark as confirmed
    this.currentInvoice.status = 'CONFIRMED';
    this.currentInvoice.confirmedAt = new Date().toISOString();

    // Update stock (will be implemented in integration)
    const stockUpdated = await this.updateStock();

    // Create accounting entry (will be implemented in integration)
    const accountingPosted = await this.postToAccounting();

    return {
      status: 'INVOICE_READY',
      invoice_type: this.currentInvoice.invoiceType,
      invoice_number: this.currentInvoice.invoiceNumber,
      invoice_date: this.currentInvoice.invoiceDate,
      customer_name: this.currentInvoice.customerName,
      items: this.currentInvoice.items,
      subtotal: this.currentInvoice.subtotal,
      gst_breakup: this.currentInvoice.gstBreakup,
      grand_total: this.currentInvoice.grandTotal,
      round_off: this.currentInvoice.roundOff,
      payment_mode: this.currentInvoice.paymentMode,
      stock_updated: stockUpdated,
      accounting_action: accountingPosted ? 'SALES_JOURNAL_POSTED' : 'PENDING'
    };
  }

  /**
   * Calculate item GST
   */
  calculateItemGST(taxableValue, gstRate, customerGSTIN, supplierState) {
    const totalGST = (taxableValue * gstRate) / 100;

    // Determine if intra-state or inter-state
    let isIntraState = true;
    if (customerGSTIN) {
      const customerState = customerGSTIN.substring(0, 2);
      isIntraState = customerState === supplierState;
    }

    if (isIntraState) {
      // CGST + SGST
      return {
        cgst: totalGST / 2,
        sgst: totalGST / 2,
        igst: 0,
        cess: 0,
        totalGST
      };
    } else {
      // IGST
      return {
        cgst: 0,
        sgst: 0,
        igst: totalGST,
        cess: 0,
        totalGST
      };
    }
  }

  /**
   * Recalculate invoice totals
   */
  recalculateInvoice() {
    if (!this.currentInvoice) return;

    let subtotal = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalCess = 0;

    this.currentInvoice.items.forEach(item => {
      subtotal += item.taxableValue;
      totalCGST += item.cgst;
      totalSGST += item.sgst;
      totalIGST += item.igst;
      totalCess += item.cess || 0;
    });

    const totalGST = totalCGST + totalSGST + totalIGST + totalCess;
    const totalBeforeRoundOff = subtotal + totalGST;
    const roundOff = Math.round(totalBeforeRoundOff) - totalBeforeRoundOff;
    const grandTotal = Math.round(totalBeforeRoundOff);

    this.currentInvoice.subtotal = this.round(subtotal);
    this.currentInvoice.gstBreakup = {
      cgst: this.round(totalCGST),
      sgst: this.round(totalSGST),
      igst: this.round(totalIGST),
      cess: this.round(totalCess)
    };
    this.currentInvoice.roundOff = this.round(roundOff);
    this.currentInvoice.grandTotal = grandTotal;
  }

  /**
   * Validate item
   */
  async validateItem(params) {
    const { itemName, quantity, rate, gstRate } = params;

    if (!itemName) {
      return {
        valid: false,
        error: 'Item name is required',
        needsClarification: true,
        question: 'Which item?'
      };
    }

    if (!quantity || quantity <= 0) {
      return {
        valid: false,
        error: 'Invalid quantity',
        needsClarification: true,
        question: 'How many?'
      };
    }

    if (!rate || rate <= 0) {
      return {
        valid: false,
        error: 'Invalid rate',
        needsClarification: true,
        question: 'What is the price?'
      };
    }

    if (gstRate === undefined || gstRate === null) {
      return {
        valid: false,
        error: 'GST rate is required',
        needsClarification: true,
        question: 'GST rate? (0%, 5%, 18%, 28%)'
      };
    }

    return { valid: true };
  }

  /**
   * Check stock availability
   */
  async checkStock(itemCode, quantity) {
    // This will be implemented in integration service
    // For now, return available
    return {
      available: true,
      currentStock: 1000
    };
  }

  /**
   * Get item by barcode
   */
  async getItemByBarcode(barcode) {
    // This will be implemented in integration service
    return null;
  }

  /**
   * Search item by name
   */
  async searchItem(itemName) {
    // This will be implemented in integration service
    return null;
  }

  /**
   * Update stock
   */
  async updateStock() {
    // This will be implemented in integration service
    return true;
  }

  /**
   * Post to accounting
   */
  async postToAccounting() {
    // This will be implemented in integration service
    return true;
  }

  /**
   * Generate invoice number
   */
  generateInvoiceNumber(invoiceType) {
    const prefix = {
      [INVOICE_TYPES.CASH_BILL]: 'CB',
      [INVOICE_TYPES.TAX_INVOICE]: 'TI',
      [INVOICE_TYPES.CREDIT_INVOICE]: 'CI',
      [INVOICE_TYPES.POS_RECEIPT]: 'POS'
    };

    const year = new Date().getFullYear().toString().substr(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const number = this.invoiceCounter.toString().padStart(4, '0');

    this.invoiceCounter++;

    return `${prefix[invoiceType]}${year}${month}${number}`;
  }

  /**
   * Round to 2 decimals
   */
  round(value) {
    return Math.round(value * 100) / 100;
  }

  /**
   * Get current invoice
   */
  getCurrentInvoice() {
    return this.currentInvoice;
  }

  /**
   * Cancel current invoice
   */
  cancelInvoice() {
    this.currentInvoice = null;
    return { success: true };
  }

  /**
   * Get invoice preview
   */
  getInvoicePreview() {
    if (!this.currentInvoice) {
      throw new Error('No active invoice');
    }

    return {
      invoiceNumber: this.currentInvoice.invoiceNumber,
      invoiceDate: this.currentInvoice.invoiceDate,
      invoiceType: this.currentInvoice.invoiceType,
      customerName: this.currentInvoice.customerName,
      itemCount: this.currentInvoice.items.length,
      subtotal: this.currentInvoice.subtotal,
      totalGST: this.currentInvoice.gstBreakup.cgst + 
                this.currentInvoice.gstBreakup.sgst + 
                this.currentInvoice.gstBreakup.igst,
      grandTotal: this.currentInvoice.grandTotal,
      paymentMode: this.currentInvoice.paymentMode
    };
  }
}

// Create singleton instance
const invoicePOSEngine = new InvoicePOSEngine();

export default invoicePOSEngine;
export { InvoicePOSEngine };
