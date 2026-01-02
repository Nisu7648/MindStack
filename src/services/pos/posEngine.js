/**
 * AI POS ENGINE - CORE BILLING LOGIC
 * Fast • Practical • Shopkeeper-First
 * 
 * This is NOT a chatbot. This is a business machine.
 */

import { table } from '../database/queryBuilder';
import offlineSyncService from '../offline/syncService';
import { v4 as uuidv4 } from 'uuid';

/**
 * POS Engine
 */
class POSEngine {
  constructor() {
    this.currentBill = null;
    this.billItems = [];
    this.discount = 0;
    this.paymentMode = 'CASH';
  }

  /**
   * START NEW BILL
   * Opens instantly, no questions
   */
  async startNewBill() {
    this.currentBill = {
      id: uuidv4(),
      invoiceNo: await this.generateInvoiceNumber(),
      date: new Date().toISOString(),
      items: [],
      subtotal: 0,
      gstAmount: 0,
      discount: 0,
      grandTotal: 0,
      paymentMode: 'CASH',
      status: 'DRAFT'
    };

    this.billItems = [];
    this.discount = 0;

    return this.currentBill;
  }

  /**
   * SCAN BARCODE
   * Auto-add if exists, ask once if new
   */
  async scanBarcode(barcode) {
    try {
      // Search product
      const product = await this.findProductByBarcode(barcode);

      if (product) {
        // Product exists - Add instantly
        return await this.addItem({
          productId: product.id,
          name: product.item_name,
          quantity: 1,
          unit: product.unit,
          rate: product.selling_price,
          gstRate: product.gst_rate
        });
      } else {
        // New product - Ask ONCE
        return {
          success: false,
          newProduct: true,
          barcode,
          message: 'New product. Enter price, tax, unit.'
        };
      }
    } catch (error) {
      console.error('Scan error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * SAVE NEW PRODUCT FROM SCAN
   * Never ask again for same barcode
   */
  async saveNewProductFromScan(barcode, productData) {
    try {
      const product = {
        id: uuidv4(),
        item_code: `ITEM${Date.now()}`,
        item_name: productData.name,
        barcode,
        unit: productData.unit || 'pcs',
        selling_price: productData.price,
        purchase_price: productData.price * 0.8, // Default 20% margin
        gst_rate: productData.gstRate || 0,
        current_stock: 0,
        is_active: 1,
        created_at: new Date().toISOString()
      };

      await table('inventory').insert(product);

      // Add to current bill
      return await this.addItem({
        productId: product.id,
        name: product.item_name,
        quantity: 1,
        unit: product.unit,
        rate: product.selling_price,
        gstRate: product.gst_rate
      });
    } catch (error) {
      console.error('Save new product error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * TEXT INPUT PARSING
   * "2 sugar 1 oil" → Add items
   */
  async parseTextInput(text) {
    try {
      const items = this.parseItemsFromText(text);
      const results = [];

      for (const item of items) {
        const products = await this.searchProducts(item.name);

        if (products.length === 0) {
          results.push({
            success: false,
            query: item.name,
            message: `Product "${item.name}" not found`
          });
        } else if (products.length === 1) {
          // Exact match - Add instantly
          const result = await this.addItem({
            productId: products[0].id,
            name: products[0].item_name,
            quantity: item.quantity,
            unit: products[0].unit,
            rate: products[0].selling_price,
            gstRate: products[0].gst_rate
          });
          results.push(result);
        } else {
          // Multiple matches - Ask ONCE
          results.push({
            success: false,
            ambiguous: true,
            query: item.name,
            quantity: item.quantity,
            options: products.map(p => ({
              id: p.id,
              name: p.item_name,
              price: p.selling_price
            })),
            message: `Which ${item.name}?`
          });
        }
      }

      return { success: true, results };
    } catch (error) {
      console.error('Parse text error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * PARSE ITEMS FROM TEXT
   * "2 sugar 1 oil" → [{qty: 2, name: 'sugar'}, {qty: 1, name: 'oil'}]
   */
  parseItemsFromText(text) {
    const items = [];
    const words = text.toLowerCase().trim().split(/\s+/);

    let i = 0;
    while (i < words.length) {
      const word = words[i];

      // Check if number
      const qty = parseFloat(word);
      if (!isNaN(qty) && i + 1 < words.length) {
        // Next word is item name
        items.push({
          quantity: qty,
          name: words[i + 1]
        });
        i += 2;
      } else {
        // No quantity, assume 1
        items.push({
          quantity: 1,
          name: word
        });
        i++;
      }
    }

    return items;
  }

  /**
   * ADD ITEM TO BILL
   * Updates in real-time, no confirmation
   */
  async addItem(itemData) {
    try {
      // Check if item already in bill
      const existingIndex = this.billItems.findIndex(
        item => item.productId === itemData.productId
      );

      if (existingIndex >= 0) {
        // Update quantity
        this.billItems[existingIndex].quantity += itemData.quantity;
      } else {
        // Add new item
        this.billItems.push({
          id: uuidv4(),
          productId: itemData.productId,
          name: itemData.name,
          quantity: itemData.quantity,
          unit: itemData.unit,
          rate: itemData.rate,
          gstRate: itemData.gstRate,
          lineTotal: itemData.quantity * itemData.rate
        });
      }

      // Recalculate bill
      this.calculateBill();

      return {
        success: true,
        item: itemData,
        bill: this.getBillSummary()
      };
    } catch (error) {
      console.error('Add item error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * UPDATE ITEM QUANTITY
   * +/- buttons
   */
  updateItemQuantity(itemId, delta) {
    const item = this.billItems.find(i => i.id === itemId);
    if (!item) return { success: false, error: 'Item not found' };

    item.quantity = Math.max(1, item.quantity + delta);
    item.lineTotal = item.quantity * item.rate;

    this.calculateBill();

    return {
      success: true,
      item,
      bill: this.getBillSummary()
    };
  }

  /**
   * REMOVE ITEM
   */
  removeItem(itemId) {
    this.billItems = this.billItems.filter(i => i.id !== itemId);
    this.calculateBill();

    return {
      success: true,
      bill: this.getBillSummary()
    };
  }

  /**
   * CALCULATE BILL
   * Real-time updates
   */
  calculateBill() {
    let subtotal = 0;
    let gstAmount = 0;

    for (const item of this.billItems) {
      const itemTotal = item.quantity * item.rate;
      const itemGst = (itemTotal * item.gstRate) / 100;

      subtotal += itemTotal;
      gstAmount += itemGst;
    }

    const grandTotal = subtotal + gstAmount - this.discount;

    this.currentBill.items = this.billItems;
    this.currentBill.subtotal = subtotal;
    this.currentBill.gstAmount = gstAmount;
    this.currentBill.discount = this.discount;
    this.currentBill.grandTotal = grandTotal;
  }

  /**
   * APPLY DISCOUNT
   */
  applyDiscount(amount) {
    this.discount = amount;
    this.calculateBill();

    return {
      success: true,
      bill: this.getBillSummary()
    };
  }

  /**
   * SET PAYMENT MODE
   */
  setPaymentMode(mode) {
    this.paymentMode = mode;
    this.currentBill.paymentMode = mode;

    return { success: true };
  }

  /**
   * COMPLETE PAYMENT
   * Lock invoice, reduce stock, save permanently
   */
  async completePayment(paymentData) {
    try {
      if (!this.currentBill || this.billItems.length === 0) {
        return { success: false, error: 'No items in bill' };
      }

      // Lock invoice
      this.currentBill.status = 'COMPLETED';
      this.currentBill.paymentMode = paymentData.mode || this.paymentMode;
      this.currentBill.paidAmount = paymentData.amount || this.currentBill.grandTotal;
      this.currentBill.completedAt = new Date().toISOString();

      // Save invoice
      await this.saveInvoice();

      // Reduce stock instantly
      await this.reduceStock();

      // Save transaction
      await this.saveTransaction();

      // Generate invoice
      const invoice = await this.generateInvoice();

      // Clear current bill
      const completedBill = { ...this.currentBill };
      this.currentBill = null;
      this.billItems = [];
      this.discount = 0;

      return {
        success: true,
        invoice,
        bill: completedBill
      };
    } catch (error) {
      console.error('Complete payment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * SAVE INVOICE
   */
  async saveInvoice() {
    try {
      // Save invoice header
      await table('invoices').insert({
        id: this.currentBill.id,
        invoice_no: this.currentBill.invoiceNo,
        invoice_date: this.currentBill.date,
        invoice_type: 'SALE',
        subtotal: this.currentBill.subtotal,
        discount: this.currentBill.discount,
        taxable_amount: this.currentBill.subtotal,
        cgst_amount: this.currentBill.gstAmount / 2,
        sgst_amount: this.currentBill.gstAmount / 2,
        total_amount: this.currentBill.grandTotal,
        payment_mode: this.currentBill.paymentMode,
        payment_status: 'paid',
        status: 'active',
        created_at: new Date().toISOString()
      });

      // Save invoice items
      for (const item of this.billItems) {
        await table('invoice_items').insert({
          id: uuidv4(),
          invoice_id: this.currentBill.id,
          product_id: item.productId,
          item_name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          gst_rate: item.gstRate,
          amount: item.lineTotal,
          created_at: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Save invoice error:', error);
      throw error;
    }
  }

  /**
   * REDUCE STOCK INSTANTLY
   */
  async reduceStock() {
    try {
      for (const item of this.billItems) {
        // Get current stock
        const product = await table('inventory')
          .where('id', item.productId)
          .first();

        if (product.success && product.data) {
          const currentStock = product.data.current_stock || 0;
          const newStock = currentStock - item.quantity;

          // Update stock
          await table('inventory')
            .where('id', item.productId)
            .update({
              current_stock: newStock,
              updated_at: new Date().toISOString()
            });

          // Log stock movement
          await table('stock_movements').insert({
            id: uuidv4(),
            product_id: item.productId,
            movement_type: 'SALE',
            quantity: -item.quantity,
            reference_type: 'INVOICE',
            reference_id: this.currentBill.id,
            date: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Reduce stock error:', error);
      throw error;
    }
  }

  /**
   * SAVE TRANSACTION
   */
  async saveTransaction() {
    try {
      // Create transaction
      const txnId = uuidv4();

      await table('transactions').insert({
        id: txnId,
        txn_date: this.currentBill.date,
        txn_type: 'SALE',
        reference: this.currentBill.invoiceNo,
        description: `Sale Invoice ${this.currentBill.invoiceNo}`,
        total_amount: this.currentBill.grandTotal,
        status: 'posted',
        created_at: new Date().toISOString()
      });

      // Create ledger entries (double-entry)
      // Debit: Cash/Bank
      await table('ledger').insert({
        id: uuidv4(),
        transaction_id: txnId,
        date: this.currentBill.date,
        account_id: 'CASH', // TODO: Get from payment mode
        description: `Sale ${this.currentBill.invoiceNo}`,
        debit: this.currentBill.grandTotal,
        credit: 0,
        created_at: new Date().toISOString()
      });

      // Credit: Sales
      await table('ledger').insert({
        id: uuidv4(),
        transaction_id: txnId,
        date: this.currentBill.date,
        account_id: 'SALES',
        description: `Sale ${this.currentBill.invoiceNo}`,
        debit: 0,
        credit: this.currentBill.subtotal,
        created_at: new Date().toISOString()
      });

      // Credit: GST Output
      if (this.currentBill.gstAmount > 0) {
        await table('ledger').insert({
          id: uuidv4(),
          transaction_id: txnId,
          date: this.currentBill.date,
          account_id: 'GST_OUTPUT',
          description: `GST on ${this.currentBill.invoiceNo}`,
          debit: 0,
          credit: this.currentBill.gstAmount,
          created_at: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Save transaction error:', error);
      throw error;
    }
  }

  /**
   * GENERATE INVOICE
   */
  async generateInvoice() {
    return {
      invoiceNo: this.currentBill.invoiceNo,
      date: this.currentBill.date,
      items: this.billItems,
      subtotal: this.currentBill.subtotal,
      gstAmount: this.currentBill.gstAmount,
      discount: this.currentBill.discount,
      grandTotal: this.currentBill.grandTotal,
      paymentMode: this.currentBill.paymentMode
    };
  }

  /**
   * GET BILL SUMMARY
   */
  getBillSummary() {
    return {
      items: this.billItems,
      itemCount: this.billItems.length,
      subtotal: this.currentBill?.subtotal || 0,
      gstAmount: this.currentBill?.gstAmount || 0,
      discount: this.discount,
      grandTotal: this.currentBill?.grandTotal || 0
    };
  }

  /**
   * SEARCH PRODUCTS
   */
  async searchProducts(query) {
    try {
      const result = await table('inventory')
        .where('item_name', 'LIKE', `%${query}%`)
        .where('is_active', 1)
        .limit(10)
        .get();

      return result.success ? result.data : [];
    } catch (error) {
      console.error('Search products error:', error);
      return [];
    }
  }

  /**
   * FIND PRODUCT BY BARCODE
   */
  async findProductByBarcode(barcode) {
    try {
      const result = await table('inventory')
        .where('barcode', barcode)
        .where('is_active', 1)
        .first();

      return result.success ? result.data : null;
    } catch (error) {
      console.error('Find product error:', error);
      return null;
    }
  }

  /**
   * GENERATE INVOICE NUMBER
   */
  async generateInvoiceNumber() {
    const today = new Date();
    const year = today.getFullYear().toString().substr(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    
    // Get last invoice number for today
    const result = await table('invoices')
      .where('invoice_date', '>=', new Date().setHours(0, 0, 0, 0))
      .orderBy('created_at', 'DESC')
      .limit(1)
      .first();

    let sequence = 1;
    if (result.success && result.data) {
      const lastNo = result.data.invoice_no;
      const lastSeq = parseInt(lastNo.split('-').pop());
      sequence = lastSeq + 1;
    }

    return `INV-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  }
}

// Create singleton instance
const posEngine = new POSEngine();

export default posEngine;
export { POSEngine };
