/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ADVANCED POS SERVICE - COMPLETE POINT OF SALE SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * - Quick sale processing
 * - Barcode scanning
 * - Multiple payment methods
 * - Split payments
 * - Discounts & promotions
 * - Customer loyalty
 * - Receipt printing
 * - Real-time inventory update
 * - Sales analytics
 * - Cash drawer management
 * - Shift management
 * - Returns & refunds
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { JournalService } from '../accounting/journalService';
import { LedgerService } from '../accounting/ledgerService';
import { SubsidiaryBooksService } from '../accounting/subsidiaryBooksService';

export class POSService {
  static POS_SALES_KEY = '@mindstack_pos_sales';
  static POS_SHIFTS_KEY = '@mindstack_pos_shifts';
  static POS_CASH_DRAWER_KEY = '@mindstack_pos_cash_drawer';
  static POS_SETTINGS_KEY = '@mindstack_pos_settings';

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PROCESS SALE - COMPLETE POS TRANSACTION
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async processSale(saleData) {
    try {
      const {
        items,              // Array of items with quantity, price, discount
        customer,           // Customer info (optional)
        payments,           // Array of payment methods
        discount,           // Overall discount
        tax,                // Tax details
        notes,              // Sale notes
        cashier,            // Cashier info
        shiftId,            // Current shift ID
      } = saleData;

      // 1. Validate sale
      const validation = await this.validateSale(saleData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 2. Calculate totals
      const calculations = this.calculateSaleTotals(items, discount, tax);

      // 3. Generate sale ID
      const saleId = `POS-${moment().format('YYYYMMDD')}-${Date.now()}`;
      const receiptNumber = await this.generateReceiptNumber();

      // 4. Create sale record
      const sale = {
        id: saleId,
        receiptNumber,
        date: moment().toISOString(),
        dateFormatted: moment().format('DD-MMM-YYYY HH:mm:ss'),
        
        // Items
        items: items.map((item, index) => ({
          lineNumber: index + 1,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          discountType: item.discountType || 'PERCENTAGE', // PERCENTAGE or AMOUNT
          taxRate: item.taxRate || 0,
          taxAmount: this.calculateItemTax(item),
          subtotal: this.calculateItemSubtotal(item),
          total: this.calculateItemTotal(item)
        })),
        
        // Calculations
        subtotal: calculations.subtotal,
        discountAmount: calculations.discountAmount,
        taxAmount: calculations.taxAmount,
        totalAmount: calculations.totalAmount,
        roundOff: calculations.roundOff,
        finalAmount: calculations.finalAmount,
        
        // Payments
        payments: payments.map((payment, index) => ({
          lineNumber: index + 1,
          method: payment.method, // CASH, CARD, UPI, WALLET, etc.
          amount: payment.amount,
          reference: payment.reference,
          cardType: payment.cardType, // VISA, MASTERCARD, etc.
          cardLast4: payment.cardLast4,
          transactionId: payment.transactionId,
          status: payment.status || 'COMPLETED'
        })),
        
        totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
        changeAmount: this.calculateChange(calculations.finalAmount, payments),
        
        // Customer
        customer: customer ? {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          loyaltyPoints: customer.loyaltyPoints || 0,
          pointsEarned: this.calculateLoyaltyPoints(calculations.finalAmount),
          pointsRedeemed: customer.pointsRedeemed || 0
        } : null,
        
        // Additional info
        discount: discount || null,
        tax: tax || null,
        notes: notes || '',
        cashier: cashier,
        shiftId: shiftId,
        
        // Status
        status: 'COMPLETED',
        type: 'SALE',
        
        // Metadata
        createdAt: moment().toISOString(),
        createdBy: cashier.id
      };

      // 5. Update inventory
      await this.updateInventoryForSale(sale.items);

      // 6. Update cash drawer
      await this.updateCashDrawer(sale.payments, 'SALE', sale.id);

      // 7. Update customer loyalty
      if (customer) {
        await this.updateCustomerLoyalty(customer.id, sale.customer.pointsEarned);
      }

      // 8. Create accounting entries
      await this.createAccountingEntries(sale);

      // 9. Save sale
      await this.saveSale(sale);

      // 10. Update shift totals
      await this.updateShiftTotals(shiftId, sale);

      // 11. Generate receipt
      const receipt = await this.generateReceipt(sale);

      return {
        success: true,
        data: {
          sale,
          receipt,
          message: 'Sale completed successfully!'
        }
      };

    } catch (error) {
      console.error('Process sale error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate sale totals
   */
  static calculateSaleTotals(items, discount, tax) {
    // Calculate subtotal (before discount and tax)
    const subtotal = items.reduce((sum, item) => {
      return sum + this.calculateItemSubtotal(item);
    }, 0);

    // Calculate discount
    let discountAmount = 0;
    if (discount) {
      if (discount.type === 'PERCENTAGE') {
        discountAmount = (subtotal * discount.value) / 100;
      } else {
        discountAmount = discount.value;
      }
    }

    // Calculate tax
    let taxAmount = 0;
    if (tax) {
      const taxableAmount = subtotal - discountAmount;
      if (tax.type === 'PERCENTAGE') {
        taxAmount = (taxableAmount * tax.value) / 100;
      } else {
        taxAmount = tax.value;
      }
    }

    // Calculate total
    const totalAmount = subtotal - discountAmount + taxAmount;

    // Round off
    const finalAmount = Math.round(totalAmount * 100) / 100;
    const roundOff = finalAmount - totalAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      roundOff,
      finalAmount
    };
  }

  /**
   * Calculate item subtotal (before tax)
   */
  static calculateItemSubtotal(item) {
    const baseAmount = item.quantity * item.unitPrice;
    
    let discountAmount = 0;
    if (item.discount) {
      if (item.discountType === 'PERCENTAGE') {
        discountAmount = (baseAmount * item.discount) / 100;
      } else {
        discountAmount = item.discount;
      }
    }
    
    return baseAmount - discountAmount;
  }

  /**
   * Calculate item tax
   */
  static calculateItemTax(item) {
    const subtotal = this.calculateItemSubtotal(item);
    return (subtotal * (item.taxRate || 0)) / 100;
  }

  /**
   * Calculate item total (with tax)
   */
  static calculateItemTotal(item) {
    const subtotal = this.calculateItemSubtotal(item);
    const tax = this.calculateItemTax(item);
    return subtotal + tax;
  }

  /**
   * Calculate change amount
   */
  static calculateChange(totalAmount, payments) {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, totalPaid - totalAmount);
  }

  /**
   * Calculate loyalty points
   */
  static calculateLoyaltyPoints(amount) {
    // 1 point per CHF 10 spent
    return Math.floor(amount / 10);
  }

  /**
   * Validate sale
   */
  static async validateSale(saleData) {
    const { items, payments } = saleData;

    // Check items
    if (!items || items.length === 0) {
      return { valid: false, error: 'No items in sale' };
    }

    // Check payments
    if (!payments || payments.length === 0) {
      return { valid: false, error: 'No payment method provided' };
    }

    // Check inventory availability
    for (const item of items) {
      const available = await this.checkInventoryAvailability(
        item.productId,
        item.quantity
      );
      
      if (!available) {
        return {
          valid: false,
          error: `Insufficient stock for ${item.productName}`
        };
      }
    }

    // Check payment total
    const calculations = this.calculateSaleTotals(items, saleData.discount, saleData.tax);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    
    if (totalPaid < calculations.finalAmount) {
      return {
        valid: false,
        error: 'Insufficient payment amount'
      };
    }

    return { valid: true };
  }

  /**
   * Check inventory availability
   */
  static async checkInventoryAvailability(productId, quantity) {
    try {
      const inventoryData = await AsyncStorage.getItem('@mindstack_inventory');
      const inventory = inventoryData ? JSON.parse(inventoryData) : [];
      
      const product = inventory.find(p => p.id === productId);
      
      if (!product) return false;
      
      return product.quantity >= quantity;
    } catch (error) {
      console.error('Check inventory error:', error);
      return false;
    }
  }

  /**
   * Update inventory for sale
   */
  static async updateInventoryForSale(items) {
    try {
      const inventoryData = await AsyncStorage.getItem('@mindstack_inventory');
      const inventory = inventoryData ? JSON.parse(inventoryData) : [];
      
      for (const item of items) {
        const productIndex = inventory.findIndex(p => p.id === item.productId);
        
        if (productIndex !== -1) {
          inventory[productIndex].quantity -= item.quantity;
          inventory[productIndex].lastSold = moment().toISOString();
          inventory[productIndex].totalSold = (inventory[productIndex].totalSold || 0) + item.quantity;
        }
      }
      
      await AsyncStorage.setItem('@mindstack_inventory', JSON.stringify(inventory));
      
      return { success: true };
    } catch (error) {
      console.error('Update inventory error:', error);
      throw error;
    }
  }

  /**
   * Update cash drawer
   */
  static async updateCashDrawer(payments, type, referenceId) {
    try {
      const drawerData = await AsyncStorage.getItem(this.POS_CASH_DRAWER_KEY);
      const drawer = drawerData ? JSON.parse(drawerData) : {
        openingBalance: 0,
        currentBalance: 0,
        transactions: []
      };
      
      for (const payment of payments) {
        if (payment.method === 'CASH') {
          const transaction = {
            id: `CD-${Date.now()}`,
            date: moment().toISOString(),
            type: type, // SALE, REFUND, EXPENSE, etc.
            amount: payment.amount,
            referenceId: referenceId,
            method: payment.method
          };
          
          drawer.transactions.push(transaction);
          
          if (type === 'SALE') {
            drawer.currentBalance += payment.amount;
          } else if (type === 'REFUND') {
            drawer.currentBalance -= payment.amount;
          }
        }
      }
      
      await AsyncStorage.setItem(this.POS_CASH_DRAWER_KEY, JSON.stringify(drawer));
      
      return { success: true };
    } catch (error) {
      console.error('Update cash drawer error:', error);
      throw error;
    }
  }

  /**
   * Update customer loyalty
   */
  static async updateCustomerLoyalty(customerId, pointsEarned) {
    try {
      const customersData = await AsyncStorage.getItem('@mindstack_customers');
      const customers = customersData ? JSON.parse(customersData) : [];
      
      const customerIndex = customers.findIndex(c => c.id === customerId);
      
      if (customerIndex !== -1) {
        customers[customerIndex].loyaltyPoints = 
          (customers[customerIndex].loyaltyPoints || 0) + pointsEarned;
        customers[customerIndex].lastPurchase = moment().toISOString();
        customers[customerIndex].totalPurchases = 
          (customers[customerIndex].totalPurchases || 0) + 1;
      }
      
      await AsyncStorage.setItem('@mindstack_customers', JSON.stringify(customers));
      
      return { success: true };
    } catch (error) {
      console.error('Update customer loyalty error:', error);
      throw error;
    }
  }

  /**
   * Create accounting entries for sale
   */
  static async createAccountingEntries(sale) {
    try {
      // Determine payment accounts
      const paymentEntries = [];
      
      for (const payment of sale.payments) {
        let accountCode, accountName;
        
        switch (payment.method) {
          case 'CASH':
            accountCode = 'CASH-001';
            accountName = 'Cash A/c';
            break;
          case 'CARD':
            accountCode = 'BANK-001';
            accountName = 'Bank A/c';
            break;
          case 'UPI':
            accountCode = 'BANK-002';
            accountName = 'UPI A/c';
            break;
          default:
            accountCode = 'BANK-001';
            accountName = 'Bank A/c';
        }
        
        paymentEntries.push({
          accountCode,
          accountName,
          debit: payment.amount,
          credit: 0
        });
      }

      // Create journal entry
      const journalEntry = {
        voucherType: 'SALES',
        voucherNumber: sale.receiptNumber,
        date: sale.date,
        entries: [
          ...paymentEntries,
          {
            accountCode: 'SALES-001',
            accountName: 'Sales A/c',
            debit: 0,
            credit: sale.subtotal
          }
        ],
        totalDebit: sale.totalPaid,
        totalCredit: sale.subtotal,
        narration: `Being goods sold vide receipt ${sale.receiptNumber}`,
        reference: sale.id
      };

      // Add tax entry if applicable
      if (sale.taxAmount > 0) {
        journalEntry.entries.push({
          accountCode: 'TAX-001',
          accountName: 'Tax Payable A/c',
          debit: 0,
          credit: sale.taxAmount
        });
        journalEntry.totalCredit += sale.taxAmount;
      }

      // Record in journal
      await JournalService.createJournalEntry(journalEntry);

      // Post to ledger
      await LedgerService.postToLedger(journalEntry);

      // Record in subsidiary books
      await SubsidiaryBooksService.recordInSalesBook({
        ...sale,
        type: 'CASH_SALE'
      });

      return { success: true };
    } catch (error) {
      console.error('Create accounting entries error:', error);
      throw error;
    }
  }

  /**
   * Save sale
   */
  static async saveSale(sale) {
    try {
      const salesData = await AsyncStorage.getItem(this.POS_SALES_KEY);
      const sales = salesData ? JSON.parse(salesData) : [];
      
      sales.unshift(sale);
      
      await AsyncStorage.setItem(this.POS_SALES_KEY, JSON.stringify(sales));
      
      return { success: true };
    } catch (error) {
      console.error('Save sale error:', error);
      throw error;
    }
  }

  /**
   * Generate receipt number
   */
  static async generateReceiptNumber() {
    try {
      const today = moment().format('YYYYMMDD');
      const salesData = await AsyncStorage.getItem(this.POS_SALES_KEY);
      const sales = salesData ? JSON.parse(salesData) : [];
      
      const todaySales = sales.filter(s => 
        moment(s.date).format('YYYYMMDD') === today
      );
      
      const nextNumber = todaySales.length + 1;
      
      return `RCP-${today}-${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      console.error('Generate receipt number error:', error);
      return `RCP-${moment().format('YYYYMMDDHHmmss')}`;
    }
  }

  /**
   * Update shift totals
   */
  static async updateShiftTotals(shiftId, sale) {
    try {
      const shiftsData = await AsyncStorage.getItem(this.POS_SHIFTS_KEY);
      const shifts = shiftsData ? JSON.parse(shiftsData) : [];
      
      const shiftIndex = shifts.findIndex(s => s.id === shiftId);
      
      if (shiftIndex !== -1) {
        shifts[shiftIndex].totalSales = (shifts[shiftIndex].totalSales || 0) + 1;
        shifts[shiftIndex].totalAmount = (shifts[shiftIndex].totalAmount || 0) + sale.finalAmount;
        shifts[shiftIndex].lastSale = moment().toISOString();
      }
      
      await AsyncStorage.setItem(this.POS_SHIFTS_KEY, JSON.stringify(shifts));
      
      return { success: true };
    } catch (error) {
      console.error('Update shift totals error:', error);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE RECEIPT - THERMAL PRINTER FORMAT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateReceipt(sale) {
    const businessData = await AsyncStorage.getItem('@mindstack_business');
    const business = businessData ? JSON.parse(businessData) : {};

    const receipt = {
      id: sale.id,
      receiptNumber: sale.receiptNumber,
      date: sale.dateFormatted,
      
      // Business info
      businessName: business.name || 'MindStack Business',
      businessAddress: business.address || '',
      businessPhone: business.phone || '',
      businessEmail: business.email || '',
      businessTaxId: business.taxId || '',
      
      // Sale info
      items: sale.items,
      subtotal: sale.subtotal,
      discount: sale.discountAmount,
      tax: sale.taxAmount,
      total: sale.finalAmount,
      
      // Payment info
      payments: sale.payments,
      totalPaid: sale.totalPaid,
      change: sale.changeAmount,
      
      // Customer info
      customer: sale.customer,
      
      // Footer
      cashier: sale.cashier.name,
      notes: sale.notes,
      
      // Format for printing
      printFormat: this.formatReceiptForPrinting(sale, business)
    };

    return receipt;
  }

  /**
   * Format receipt for thermal printer
   */
  static formatReceiptForPrinting(sale, business) {
    const width = 32; // Characters per line for thermal printer
    
    const center = (text) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return ' '.repeat(padding) + text;
    };
    
    const line = () => '='.repeat(width);
    const dottedLine = () => '-'.repeat(width);
    
    const formatAmount = (amount) => {
      return `CHF ${amount.toFixed(2)}`.padStart(12);
    };
    
    let receipt = '\n';
    receipt += center(business.name || 'MindStack Business') + '\n';
    receipt += center(business.address || '') + '\n';
    receipt += center(`Tel: ${business.phone || ''}`) + '\n';
    receipt += center(`Tax ID: ${business.taxId || ''}`) + '\n';
    receipt += line() + '\n';
    receipt += center('SALES RECEIPT') + '\n';
    receipt += line() + '\n';
    receipt += `Receipt: ${sale.receiptNumber}\n`;
    receipt += `Date: ${sale.dateFormatted}\n`;
    receipt += `Cashier: ${sale.cashier.name}\n`;
    
    if (sale.customer) {
      receipt += `Customer: ${sale.customer.name}\n`;
    }
    
    receipt += line() + '\n';
    
    // Items
    receipt += 'Item                 Qty   Price\n';
    receipt += dottedLine() + '\n';
    
    for (const item of sale.items) {
      const name = item.productName.substring(0, 20).padEnd(20);
      const qty = String(item.quantity).padStart(3);
      const price = formatAmount(item.total);
      receipt += `${name} ${qty} ${price}\n`;
      
      if (item.discount > 0) {
        receipt += `  Discount: -${formatAmount(item.discount * item.quantity)}\n`;
      }
    }
    
    receipt += dottedLine() + '\n';
    
    // Totals
    receipt += `Subtotal:${formatAmount(sale.subtotal)}\n`;
    
    if (sale.discountAmount > 0) {
      receipt += `Discount:${formatAmount(-sale.discountAmount)}\n`;
    }
    
    if (sale.taxAmount > 0) {
      receipt += `Tax:${formatAmount(sale.taxAmount)}\n`;
    }
    
    receipt += line() + '\n';
    receipt += `TOTAL:${formatAmount(sale.finalAmount)}\n`;
    receipt += line() + '\n';
    
    // Payments
    for (const payment of sale.payments) {
      receipt += `${payment.method}:${formatAmount(payment.amount)}\n`;
    }
    
    if (sale.changeAmount > 0) {
      receipt += `Change:${formatAmount(sale.changeAmount)}\n`;
    }
    
    receipt += line() + '\n';
    
    // Loyalty points
    if (sale.customer && sale.customer.pointsEarned > 0) {
      receipt += `Points Earned: ${sale.customer.pointsEarned}\n`;
      receipt += `Total Points: ${sale.customer.loyaltyPoints}\n`;
      receipt += dottedLine() + '\n';
    }
    
    // Footer
    receipt += '\n';
    receipt += center('Thank you for your business!') + '\n';
    receipt += center('Please visit again') + '\n';
    receipt += '\n';
    receipt += center(moment().format('DD-MMM-YYYY HH:mm:ss')) + '\n';
    receipt += '\n\n\n';
    
    return receipt;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PROCESS RETURN/REFUND
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async processReturn(returnData) {
    try {
      const {
        originalSaleId,
        items,              // Items being returned
        reason,
        refundMethod,
        cashier
      } = returnData;

      // Get original sale
      const salesData = await AsyncStorage.getItem(this.POS_SALES_KEY);
      const sales = salesData ? JSON.parse(salesData) : [];
      const originalSale = sales.find(s => s.id === originalSaleId);

      if (!originalSale) {
        return {
          success: false,
          error: 'Original sale not found'
        };
      }

      // Calculate refund amount
      const refundAmount = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unitPrice);
      }, 0);

      // Create return record
      const returnRecord = {
        id: `RTN-${moment().format('YYYYMMDD')}-${Date.now()}`,
        returnNumber: await this.generateReturnNumber(),
        date: moment().toISOString(),
        dateFormatted: moment().format('DD-MMM-YYYY HH:mm:ss'),
        
        originalSaleId: originalSaleId,
        originalReceiptNumber: originalSale.receiptNumber,
        
        items: items,
        refundAmount: refundAmount,
        refundMethod: refundMethod,
        reason: reason,
        
        cashier: cashier,
        status: 'COMPLETED',
        type: 'RETURN',
        
        createdAt: moment().toISOString(),
        createdBy: cashier.id
      };

      // Update inventory (add back)
      await this.updateInventoryForReturn(items);

      // Update cash drawer
      await this.updateCashDrawer(
        [{ method: refundMethod, amount: refundAmount }],
        'REFUND',
        returnRecord.id
      );

      // Create accounting entries
      await this.createReturnAccountingEntries(returnRecord);

      // Save return
      await this.saveReturn(returnRecord);

      return {
        success: true,
        data: {
          return: returnRecord,
          message: 'Return processed successfully!'
        }
      };

    } catch (error) {
      console.error('Process return error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update inventory for return
   */
  static async updateInventoryForReturn(items) {
    try {
      const inventoryData = await AsyncStorage.getItem('@mindstack_inventory');
      const inventory = inventoryData ? JSON.parse(inventoryData) : [];
      
      for (const item of items) {
        const productIndex = inventory.findIndex(p => p.id === item.productId);
        
        if (productIndex !== -1) {
          inventory[productIndex].quantity += item.quantity;
        }
      }
      
      await AsyncStorage.setItem('@mindstack_inventory', JSON.stringify(inventory));
      
      return { success: true };
    } catch (error) {
      console.error('Update inventory for return error:', error);
      throw error;
    }
  }

  /**
   * Create accounting entries for return
   */
  static async createReturnAccountingEntries(returnRecord) {
    try {
      const journalEntry = {
        voucherType: 'SALES_RETURN',
        voucherNumber: returnRecord.returnNumber,
        date: returnRecord.date,
        entries: [
          {
            accountCode: 'SALES-RETURN-001',
            accountName: 'Sales Return A/c',
            debit: returnRecord.refundAmount,
            credit: 0
          },
          {
            accountCode: returnRecord.refundMethod === 'CASH' ? 'CASH-001' : 'BANK-001',
            accountName: returnRecord.refundMethod === 'CASH' ? 'Cash A/c' : 'Bank A/c',
            debit: 0,
            credit: returnRecord.refundAmount
          }
        ],
        totalDebit: returnRecord.refundAmount,
        totalCredit: returnRecord.refundAmount,
        narration: `Being goods returned vide return ${returnRecord.returnNumber}`,
        reference: returnRecord.id
      };

      await JournalService.createJournalEntry(journalEntry);
      await LedgerService.postToLedger(journalEntry);

      return { success: true };
    } catch (error) {
      console.error('Create return accounting entries error:', error);
      throw error;
    }
  }

  /**
   * Save return
   */
  static async saveReturn(returnRecord) {
    try {
      const returnsData = await AsyncStorage.getItem('@mindstack_pos_returns');
      const returns = returnsData ? JSON.parse(returnsData) : [];
      
      returns.unshift(returnRecord);
      
      await AsyncStorage.setItem('@mindstack_pos_returns', JSON.stringify(returns));
      
      return { success: true };
    } catch (error) {
      console.error('Save return error:', error);
      throw error;
    }
  }

  /**
   * Generate return number
   */
  static async generateReturnNumber() {
    try {
      const today = moment().format('YYYYMMDD');
      const returnsData = await AsyncStorage.getItem('@mindstack_pos_returns');
      const returns = returnsData ? JSON.parse(returnsData) : [];
      
      const todayReturns = returns.filter(r => 
        moment(r.date).format('YYYYMMDD') === today
      );
      
      const nextNumber = todayReturns.length + 1;
      
      return `RTN-${today}-${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      console.error('Generate return number error:', error);
      return `RTN-${moment().format('YYYYMMDDHHmmss')}`;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SHIFT MANAGEMENT
   * ═══════════════════════════════════════════════════════════════════════
   */
  
  /**
   * Start shift
   */
  static async startShift(cashier, openingBalance) {
    try {
      const shift = {
        id: `SHIFT-${Date.now()}`,
        cashier: cashier,
        startTime: moment().toISOString(),
        startTimeFormatted: moment().format('DD-MMM-YYYY HH:mm:ss'),
        openingBalance: openingBalance,
        currentBalance: openingBalance,
        totalSales: 0,
        totalAmount: 0,
        status: 'OPEN'
      };

      const shiftsData = await AsyncStorage.getItem(this.POS_SHIFTS_KEY);
      const shifts = shiftsData ? JSON.parse(shiftsData) : [];
      
      shifts.unshift(shift);
      
      await AsyncStorage.setItem(this.POS_SHIFTS_KEY, JSON.stringify(shifts));

      // Initialize cash drawer
      await AsyncStorage.setItem(this.POS_CASH_DRAWER_KEY, JSON.stringify({
        openingBalance: openingBalance,
        currentBalance: openingBalance,
        transactions: []
      }));

      return {
        success: true,
        data: shift
      };
    } catch (error) {
      console.error('Start shift error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * End shift
   */
  static async endShift(shiftId, closingBalance) {
    try {
      const shiftsData = await AsyncStorage.getItem(this.POS_SHIFTS_KEY);
      const shifts = shiftsData ? JSON.parse(shiftsData) : [];
      
      const shiftIndex = shifts.findIndex(s => s.id === shiftId);
      
      if (shiftIndex === -1) {
        return {
          success: false,
          error: 'Shift not found'
        };
      }

      shifts[shiftIndex].endTime = moment().toISOString();
      shifts[shiftIndex].endTimeFormatted = moment().format('DD-MMM-YYYY HH:mm:ss');
      shifts[shiftIndex].closingBalance = closingBalance;
      shifts[shiftIndex].difference = closingBalance - shifts[shiftIndex].currentBalance;
      shifts[shiftIndex].status = 'CLOSED';

      await AsyncStorage.setItem(this.POS_SHIFTS_KEY, JSON.stringify(shifts));

      return {
        success: true,
        data: shifts[shiftIndex]
      };
    } catch (error) {
      console.error('End shift error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current shift
   */
  static async getCurrentShift() {
    try {
      const shiftsData = await AsyncStorage.getItem(this.POS_SHIFTS_KEY);
      const shifts = shiftsData ? JSON.parse(shiftsData) : [];
      
      const currentShift = shifts.find(s => s.status === 'OPEN');
      
      return {
        success: true,
        data: currentShift || null
      };
    } catch (error) {
      console.error('Get current shift error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * ANALYTICS & REPORTS
   * ═══════════════════════════════════════════════════════════════════════
   */
  
  /**
   * Get sales summary
   */
  static async getSalesSummary(fromDate, toDate) {
    try {
      const salesData = await AsyncStorage.getItem(this.POS_SALES_KEY);
      const sales = salesData ? JSON.parse(salesData) : [];
      
      const filteredSales = sales.filter(s => {
        const saleDate = moment(s.date);
        return saleDate.isBetween(fromDate, toDate, 'day', '[]');
      });

      const summary = {
        totalSales: filteredSales.length,
        totalAmount: filteredSales.reduce((sum, s) => sum + s.finalAmount, 0),
        totalDiscount: filteredSales.reduce((sum, s) => sum + s.discountAmount, 0),
        totalTax: filteredSales.reduce((sum, s) => sum + s.taxAmount, 0),
        averageSale: filteredSales.length > 0 
          ? filteredSales.reduce((sum, s) => sum + s.finalAmount, 0) / filteredSales.length 
          : 0,
        
        // Payment methods breakdown
        paymentMethods: this.getPaymentMethodsBreakdown(filteredSales),
        
        // Top selling products
        topProducts: this.getTopSellingProducts(filteredSales, 10),
        
        // Hourly sales
        hourlySales: this.getHourlySales(filteredSales),
        
        // Daily sales
        dailySales: this.getDailySales(filteredSales)
      };

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      console.error('Get sales summary error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment methods breakdown
   */
  static getPaymentMethodsBreakdown(sales) {
    const breakdown = {};
    
    for (const sale of sales) {
      for (const payment of sale.payments) {
        if (!breakdown[payment.method]) {
          breakdown[payment.method] = {
            count: 0,
            amount: 0
          };
        }
        breakdown[payment.method].count++;
        breakdown[payment.method].amount += payment.amount;
      }
    }
    
    return breakdown;
  }

  /**
   * Get top selling products
   */
  static getTopSellingProducts(sales, limit = 10) {
    const products = {};
    
    for (const sale of sales) {
      for (const item of sale.items) {
        if (!products[item.productId]) {
          products[item.productId] = {
            productId: item.productId,
            productName: item.productName,
            quantity: 0,
            amount: 0
          };
        }
        products[item.productId].quantity += item.quantity;
        products[item.productId].amount += item.total;
      }
    }
    
    return Object.values(products)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  /**
   * Get hourly sales
   */
  static getHourlySales(sales) {
    const hourly = {};
    
    for (const sale of sales) {
      const hour = moment(sale.date).format('HH:00');
      
      if (!hourly[hour]) {
        hourly[hour] = {
          hour,
          count: 0,
          amount: 0
        };
      }
      
      hourly[hour].count++;
      hourly[hour].amount += sale.finalAmount;
    }
    
    return Object.values(hourly).sort((a, b) => a.hour.localeCompare(b.hour));
  }

  /**
   * Get daily sales
   */
  static getDailySales(sales) {
    const daily = {};
    
    for (const sale of sales) {
      const day = moment(sale.date).format('YYYY-MM-DD');
      
      if (!daily[day]) {
        daily[day] = {
          date: day,
          count: 0,
          amount: 0
        };
      }
      
      daily[day].count++;
      daily[day].amount += sale.finalAmount;
    }
    
    return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
  }
}

export default POSService;