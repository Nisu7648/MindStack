/**
 * INVOICE ENGINE - CORE SYSTEM
 * 
 * This is NOT just invoice creation.
 * This EXECUTES a complete business transaction.
 * 
 * Every invoice automatically:
 * - Updates accounting ledgers
 * - Updates tax (GST/VAT/Sales Tax)
 * - Updates customer balance
 * - Updates inventory
 * - Updates cash/bank
 * 
 * User NEVER does accounting manually after invoicing.
 */

import { supabase } from '../supabase';
import TaxAutopilotEngine from '../tax/TaxAutopilotEngine';
import GlobalTaxEngine from '../tax/GlobalTaxEngine';

const INVOICE_TYPES = {
  TAX_INVOICE: 'tax_invoice',
  BILL_OF_SUPPLY: 'bill_of_supply',
  PROFORMA: 'proforma',
  CREDIT_NOTE: 'credit_note',
  DEBIT_NOTE: 'debit_note'
};

const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
};

const PAYMENT_METHODS = {
  CASH: 'cash',
  BANK: 'bank',
  UPI: 'upi',
  CARD: 'card',
  CHEQUE: 'cheque'
};

class InvoiceEngine {
  /**
   * ========================================
   * CREATE INVOICE (MAIN FUNCTION)
   * ========================================
   * 
   * This is the ONLY function user calls.
   * Everything else happens automatically.
   */
  static async createInvoice(invoiceData) {
    try {
      console.log('🚀 Creating invoice and executing transaction...');

      // Step 1: Validate inputs
      this.validateInvoiceData(invoiceData);

      // Step 2: Get business info
      const business = await this.getBusinessInfo(invoiceData.businessId);

      // Step 3: Get customer info
      const customer = await this.getCustomerInfo(invoiceData.customerId);

      // Step 4: Apply smart defaults
      const completeInvoiceData = await this.applySmartDefaults(
        invoiceData,
        business,
        customer
      );

      // Step 5: Calculate amounts and tax
      const calculations = await this.calculateInvoice(
        completeInvoiceData,
        business,
        customer
      );

      // Step 6: Save invoice
      const invoice = await this.saveInvoice({
        ...completeInvoiceData,
        ...calculations
      });

      // Step 7: Execute automatic accounting
      await this.executeAccounting(invoice, business, customer);

      // Step 8: Update inventory (if applicable)
      if (invoice.items && invoice.items.length > 0) {
        await this.updateInventory(invoice);
      }

      // Step 9: Update customer balance
      await this.updateCustomerBalance(invoice, customer);

      // Step 10: Handle payment (if paid)
      if (invoice.paymentStatus === 'paid' || invoice.paidAmount > 0) {
        await this.recordPayment(invoice);
      }

      console.log('✅ Invoice created and transaction executed successfully');

      return {
        success: true,
        invoice,
        message: 'Invoice created and accounting done automatically'
      };

    } catch (error) {
      console.error('❌ Invoice creation error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * VALIDATE INVOICE DATA
   * ========================================
   */
  static validateInvoiceData(data) {
    if (!data.businessId) {
      throw new Error('Business ID is required');
    }

    if (!data.customerId) {
      throw new Error('Customer is required');
    }

    if (!data.invoiceType) {
      throw new Error('Invoice type is required');
    }

    if (!data.items || data.items.length === 0) {
      if (!data.amount || data.amount <= 0) {
        throw new Error('Items or amount is required');
      }
    }

    // Validate invoice type
    if (!Object.values(INVOICE_TYPES).includes(data.invoiceType)) {
      throw new Error('Invalid invoice type');
    }
  }

  /**
   * ========================================
   * GET BUSINESS INFO
   * ========================================
   */
  static async getBusinessInfo(businessId) {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (error || !data) {
      throw new Error('Business not found');
    }

    return data;
  }

  /**
   * ========================================
   * GET CUSTOMER INFO
   * ========================================
   */
  static async getCustomerInfo(customerId) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error || !data) {
      throw new Error('Customer not found');
    }

    return data;
  }

  /**
   * ========================================
   * APPLY SMART DEFAULTS
   * ========================================
   * 
   * System auto-decides:
   * - Invoice number
   * - Invoice date
   * - Due date
   * - Tax type (GST/IGST)
   * - Payment status
   */
  static async applySmartDefaults(invoiceData, business, customer) {
    const defaults = { ...invoiceData };

    // Auto-generate invoice number
    if (!defaults.invoiceNumber) {
      defaults.invoiceNumber = await this.generateInvoiceNumber(business.id);
    }

    // Auto-set invoice date
    if (!defaults.invoiceDate) {
      defaults.invoiceDate = new Date().toISOString();
    }

    // Auto-set due date (30 days default)
    if (!defaults.dueDate) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (business.defaultPaymentTerms || 30));
      defaults.dueDate = dueDate.toISOString();
    }

    // Auto-decide tax type (GST vs IGST)
    if (business.country === 'IN' && !defaults.taxType) {
      defaults.taxType = this.decideTaxType(business, customer);
    }

    // Auto-set payment status
    if (!defaults.paymentStatus) {
      defaults.paymentStatus = defaults.paidAmount > 0 
        ? (defaults.paidAmount >= defaults.amount ? INVOICE_STATUS.PAID : INVOICE_STATUS.PARTIALLY_PAID)
        : INVOICE_STATUS.SENT;
    }

    // Auto-set currency
    if (!defaults.currency) {
      defaults.currency = business.currency || 'INR';
    }

    return defaults;
  }

  /**
   * ========================================
   * GENERATE INVOICE NUMBER
   * ========================================
   */
  static async generateInvoiceNumber(businessId) {
    // Get last invoice number
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;

    if (data && data.length > 0) {
      const lastNumber = data[0].invoice_number;
      const match = lastNumber.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    // Format: INV-2024-0001
    const year = new Date().getFullYear();
    return `INV-${year}-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * ========================================
   * DECIDE TAX TYPE (GST vs IGST)
   * ========================================
   */
  static decideTaxType(business, customer) {
    // Same state = CGST + SGST
    // Different state = IGST
    
    if (business.state === customer.state) {
      return 'INTRA_STATE'; // CGST + SGST
    } else {
      return 'INTER_STATE'; // IGST
    }
  }

  /**
   * ========================================
   * CALCULATE INVOICE
   * ========================================
   * 
   * Calculates:
   * - Subtotal
   * - Tax (GST/VAT/Sales Tax)
   * - Discount
   * - Total
   */
  static async calculateInvoice(invoiceData, business, customer) {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = invoiceData.discount || 0;
    let itemsWithTax = [];

    // Calculate from items
    if (invoiceData.items && invoiceData.items.length > 0) {
      for (const item of invoiceData.items) {
        const itemTotal = item.quantity * item.rate;
        const itemDiscount = item.discount || 0;
        const itemSubtotal = itemTotal - itemDiscount;

        // Calculate tax for this item
        const taxCalculation = await TaxAutopilotEngine.calculateTaxForTransaction({
          country: business.country,
          amount: itemSubtotal,
          transactionType: 'SALES',
          customerState: customer.state,
          businessState: business.state,
          productCategory: item.category,
          gstRate: item.gstRate || business.defaultGstRate || 18
        });

        subtotal += itemSubtotal;
        totalTax += taxCalculation.taxAmount;

        itemsWithTax.push({
          ...item,
          subtotal: itemSubtotal,
          taxAmount: taxCalculation.taxAmount,
          taxComponents: taxCalculation.components,
          total: itemSubtotal + taxCalculation.taxAmount
        });
      }
    } else {
      // Manual amount (for service invoices)
      subtotal = invoiceData.amount || 0;

      // Calculate tax on total amount
      const taxCalculation = await TaxAutopilotEngine.calculateTaxForTransaction({
        country: business.country,
        amount: subtotal,
        transactionType: 'SALES',
        customerState: customer.state,
        businessState: business.state,
        gstRate: business.defaultGstRate || 18
      });

      totalTax = taxCalculation.taxAmount;
    }

    const total = subtotal + totalTax - totalDiscount;

    return {
      items: itemsWithTax,
      subtotal,
      taxAmount: totalTax,
      discount: totalDiscount,
      total,
      balanceDue: total - (invoiceData.paidAmount || 0)
    };
  }

  /**
   * ========================================
   * SAVE INVOICE
   * ========================================
   */
  static async saveInvoice(invoiceData) {
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        business_id: invoiceData.businessId,
        customer_id: invoiceData.customerId,
        invoice_number: invoiceData.invoiceNumber,
        invoice_type: invoiceData.invoiceType,
        invoice_date: invoiceData.invoiceDate,
        due_date: invoiceData.dueDate,
        items: invoiceData.items,
        subtotal: invoiceData.subtotal,
        tax_amount: invoiceData.taxAmount,
        discount: invoiceData.discount,
        total: invoiceData.total,
        paid_amount: invoiceData.paidAmount || 0,
        balance_due: invoiceData.balanceDue,
        payment_status: invoiceData.paymentStatus,
        payment_method: invoiceData.paymentMethod,
        currency: invoiceData.currency,
        tax_type: invoiceData.taxType,
        notes: invoiceData.notes,
        terms: invoiceData.terms,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save invoice: ${error.message}`);
    }

    return data;
  }

  /**
   * ========================================
   * EXECUTE ACCOUNTING (AUTOMATIC)
   * ========================================
   * 
   * Creates accounting entries automatically:
   * - Sales/Income ledger
   * - Tax ledger
   * - Customer ledger
   * - Cash/Bank ledger (if paid)
   * 
   * User NEVER sees this. It just happens.
   */
  static async executeAccounting(invoice, business, customer) {
    try {
      console.log('📊 Executing automatic accounting...');

      const entries = [];

      // Entry 1: Debit Customer (Accounts Receivable)
      entries.push({
        business_id: business.id,
        invoice_id: invoice.id,
        date: invoice.invoice_date,
        account_name: `${customer.name} (Customer)`,
        account_type: 'ACCOUNTS_RECEIVABLE',
        debit: invoice.total,
        credit: 0,
        description: `Invoice ${invoice.invoice_number}`
      });

      // Entry 2: Credit Sales/Income
      entries.push({
        business_id: business.id,
        invoice_id: invoice.id,
        date: invoice.invoice_date,
        account_name: 'Sales Revenue',
        account_type: 'INCOME',
        debit: 0,
        credit: invoice.subtotal,
        description: `Invoice ${invoice.invoice_number}`
      });

      // Entry 3: Credit Tax Liability
      if (invoice.tax_amount > 0) {
        // Parse tax components
        const taxComponents = this.parseTaxComponents(invoice);

        for (const [component, amount] of Object.entries(taxComponents)) {
          entries.push({
            business_id: business.id,
            invoice_id: invoice.id,
            date: invoice.invoice_date,
            account_name: `${component} Payable`,
            account_type: 'LIABILITY',
            debit: 0,
            credit: amount,
            description: `Invoice ${invoice.invoice_number} - ${component}`
          });
        }
      }

      // Entry 4: If paid, record cash/bank
      if (invoice.paid_amount > 0) {
        const paymentAccount = this.getPaymentAccount(invoice.payment_method);

        // Debit Cash/Bank
        entries.push({
          business_id: business.id,
          invoice_id: invoice.id,
          date: invoice.invoice_date,
          account_name: paymentAccount,
          account_type: 'ASSET',
          debit: invoice.paid_amount,
          credit: 0,
          description: `Payment for Invoice ${invoice.invoice_number}`
        });

        // Credit Customer (reduce receivable)
        entries.push({
          business_id: business.id,
          invoice_id: invoice.id,
          date: invoice.invoice_date,
          account_name: `${customer.name} (Customer)`,
          account_type: 'ACCOUNTS_RECEIVABLE',
          debit: 0,
          credit: invoice.paid_amount,
          description: `Payment received for Invoice ${invoice.invoice_number}`
        });
      }

      // Save all entries
      const { error } = await supabase
        .from('ledger_entries')
        .insert(entries);

      if (error) {
        throw new Error(`Failed to create accounting entries: ${error.message}`);
      }

      console.log('✅ Accounting entries created automatically');

    } catch (error) {
      console.error('❌ Accounting execution error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * PARSE TAX COMPONENTS
   * ========================================
   */
  static parseTaxComponents(invoice) {
    const components = {};

    if (invoice.items && invoice.items.length > 0) {
      for (const item of invoice.items) {
        if (item.taxComponents) {
          for (const [component, amount] of Object.entries(item.taxComponents)) {
            components[component] = (components[component] || 0) + amount;
          }
        }
      }
    } else {
      // Default to single tax component
      if (invoice.tax_type === 'INTRA_STATE') {
        components.CGST = invoice.tax_amount / 2;
        components.SGST = invoice.tax_amount / 2;
      } else {
        components.IGST = invoice.tax_amount;
      }
    }

    return components;
  }

  /**
   * ========================================
   * GET PAYMENT ACCOUNT
   * ========================================
   */
  static getPaymentAccount(paymentMethod) {
    const accounts = {
      [PAYMENT_METHODS.CASH]: 'Cash in Hand',
      [PAYMENT_METHODS.BANK]: 'Bank Account',
      [PAYMENT_METHODS.UPI]: 'Bank Account',
      [PAYMENT_METHODS.CARD]: 'Bank Account',
      [PAYMENT_METHODS.CHEQUE]: 'Bank Account'
    };

    return accounts[paymentMethod] || 'Cash in Hand';
  }

  /**
   * ========================================
   * UPDATE INVENTORY
   * ========================================
   * 
   * Reduces stock immediately
   * Prevents negative stock
   */
  static async updateInventory(invoice) {
    try {
      console.log('📦 Updating inventory...');

      for (const item of invoice.items) {
        if (!item.productId) continue;

        // Get current stock
        const { data: product } = await supabase
          .from('inventory_items')
          .select('quantity')
          .eq('id', item.productId)
          .single();

        if (!product) {
          throw new Error(`Product ${item.name} not found in inventory`);
        }

        const newQuantity = product.quantity - item.quantity;

        // Prevent negative stock
        if (newQuantity < 0) {
          throw new Error(`Insufficient stock for ${item.name}. Available: ${product.quantity}, Required: ${item.quantity}`);
        }

        // Update stock
        const { error } = await supabase
          .from('inventory_items')
          .update({
            quantity: newQuantity,
            last_sold_date: new Date().toISOString()
          })
          .eq('id', item.productId);

        if (error) {
          throw new Error(`Failed to update inventory: ${error.message}`);
        }

        // Record stock movement
        await supabase
          .from('stock_movements')
          .insert({
            product_id: item.productId,
            invoice_id: invoice.id,
            movement_type: 'SALE',
            quantity: -item.quantity,
            date: invoice.invoice_date,
            reference: invoice.invoice_number
          });
      }

      console.log('✅ Inventory updated');

    } catch (error) {
      console.error('❌ Inventory update error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * UPDATE CUSTOMER BALANCE
   * ========================================
   */
  static async updateCustomerBalance(invoice, customer) {
    try {
      const newBalance = (customer.balance || 0) + invoice.balance_due;

      await supabase
        .from('customers')
        .update({
          balance: newBalance,
          last_invoice_date: invoice.invoice_date
        })
        .eq('id', customer.id);

      console.log('✅ Customer balance updated');

    } catch (error) {
      console.error('❌ Customer balance update error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * RECORD PAYMENT
   * ========================================
   */
  static async recordPayment(invoice) {
    try {
      if (invoice.paid_amount <= 0) return;

      await supabase
        .from('payments')
        .insert({
          business_id: invoice.business_id,
          invoice_id: invoice.id,
          customer_id: invoice.customer_id,
          amount: invoice.paid_amount,
          payment_method: invoice.payment_method,
          payment_date: invoice.invoice_date,
          reference: invoice.invoice_number
        });

      console.log('✅ Payment recorded');

    } catch (error) {
      console.error('❌ Payment recording error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * RECORD PARTIAL PAYMENT
   * ========================================
   */
  static async recordPartialPayment(invoiceId, paymentData) {
    try {
      // Get invoice
      const { data: invoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Calculate new balance
      const newPaidAmount = invoice.paid_amount + paymentData.amount;
      const newBalanceDue = invoice.total - newPaidAmount;

      // Determine new status
      let newStatus = INVOICE_STATUS.PARTIALLY_PAID;
      if (newBalanceDue <= 0) {
        newStatus = INVOICE_STATUS.PAID;
      }

      // Update invoice
      await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          balance_due: newBalanceDue,
          payment_status: newStatus
        })
        .eq('id', invoiceId);

      // Record payment
      await supabase
        .from('payments')
        .insert({
          business_id: invoice.business_id,
          invoice_id: invoiceId,
          customer_id: invoice.customer_id,
          amount: paymentData.amount,
          payment_method: paymentData.paymentMethod,
          payment_date: paymentData.paymentDate || new Date().toISOString(),
          reference: paymentData.reference
        });

      // Create accounting entries for payment
      await this.createPaymentAccountingEntries(invoice, paymentData);

      // Update customer balance
      const { data: customer } = await supabase
        .from('customers')
        .select('balance')
        .eq('id', invoice.customer_id)
        .single();

      await supabase
        .from('customers')
        .update({
          balance: (customer.balance || 0) - paymentData.amount
        })
        .eq('id', invoice.customer_id);

      console.log('✅ Partial payment recorded');

      return {
        success: true,
        newPaidAmount,
        newBalanceDue,
        newStatus
      };

    } catch (error) {
      console.error('❌ Partial payment error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * CREATE PAYMENT ACCOUNTING ENTRIES
   * ========================================
   */
  static async createPaymentAccountingEntries(invoice, paymentData) {
    const { data: customer } = await supabase
      .from('customers')
      .select('name')
      .eq('id', invoice.customer_id)
      .single();

    const paymentAccount = this.getPaymentAccount(paymentData.paymentMethod);

    const entries = [
      // Debit Cash/Bank
      {
        business_id: invoice.business_id,
        invoice_id: invoice.id,
        date: paymentData.paymentDate || new Date().toISOString(),
        account_name: paymentAccount,
        account_type: 'ASSET',
        debit: paymentData.amount,
        credit: 0,
        description: `Payment received for Invoice ${invoice.invoice_number}`
      },
      // Credit Customer (reduce receivable)
      {
        business_id: invoice.business_id,
        invoice_id: invoice.id,
        date: paymentData.paymentDate || new Date().toISOString(),
        account_name: `${customer.name} (Customer)`,
        account_type: 'ACCOUNTS_RECEIVABLE',
        debit: 0,
        credit: paymentData.amount,
        description: `Payment received for Invoice ${invoice.invoice_number}`
      }
    ];

    await supabase
      .from('ledger_entries')
      .insert(entries);
  }

  /**
   * ========================================
   * GET INVOICE
   * ========================================
   */
  static async getInvoice(invoiceId) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        business:businesses(*),
        payments(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (error) {
      throw new Error(`Failed to get invoice: ${error.message}`);
    }

    return data;
  }

  /**
   * ========================================
   * UPDATE INVOICE STATUS
   * ========================================
   */
  static async updateInvoiceStatus(invoiceId, status) {
    await supabase
      .from('invoices')
      .update({ payment_status: status })
      .eq('id', invoiceId);
  }

  /**
   * ========================================
   * CHECK OVERDUE INVOICES
   * ========================================
   */
  static async checkOverdueInvoices(businessId) {
    const today = new Date().toISOString();

    const { data } = await supabase
      .from('invoices')
      .select('id')
      .eq('business_id', businessId)
      .lt('due_date', today)
      .neq('payment_status', INVOICE_STATUS.PAID)
      .neq('payment_status', INVOICE_STATUS.CANCELLED);

    if (data && data.length > 0) {
      for (const invoice of data) {
        await this.updateInvoiceStatus(invoice.id, INVOICE_STATUS.OVERDUE);
      }
    }

    return data?.length || 0;
  }
}

export default InvoiceEngine;
export { INVOICE_TYPES, INVOICE_STATUS, PAYMENT_METHODS };
