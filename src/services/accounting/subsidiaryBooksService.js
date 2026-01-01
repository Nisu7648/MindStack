/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUBSIDIARY BOOKS SERVICE - COMPLETE INDIAN ACCOUNTING SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * SUBSIDIARY BOOKS (Books of Original Entry):
 * 1. Purchase Book - Credit purchases only
 * 2. Sales Book - Credit sales only
 * 3. Purchase Return Book (Debit Note Book) - Goods returned to suppliers
 * 4. Sales Return Book (Credit Note Book) - Goods returned by customers
 * 5. Cash Book - All cash transactions
 * 6. Bank Book - All bank transactions
 * 7. Petty Cash Book - Small expenses (Imprest System)
 * 8. Bills Receivable Book - Bills received from debtors
 * 9. Bills Payable Book - Bills given to creditors
 * 
 * All books follow A4 size format with proper columns
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

export class SubsidiaryBooksService {
  static PURCHASE_BOOK_KEY = '@mindstack_purchase_book';
  static SALES_BOOK_KEY = '@mindstack_sales_book';
  static PURCHASE_RETURN_KEY = '@mindstack_purchase_return';
  static SALES_RETURN_KEY = '@mindstack_sales_return';
  static CASH_BOOK_KEY = '@mindstack_cash_book';
  static BANK_BOOK_KEY = '@mindstack_bank_book';
  static PETTY_CASH_KEY = '@mindstack_petty_cash';
  static BILLS_RECEIVABLE_KEY = '@mindstack_bills_receivable';
  static BILLS_PAYABLE_KEY = '@mindstack_bills_payable';

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PURCHASE BOOK - CREDIT PURCHASES ONLY
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Format: Date | Supplier | Invoice No. | Particulars | Amount | GST | Total
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordPurchase(data) {
    try {
      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: moment(data.date || new Date()).format('DD-MMM-YYYY'),
        supplierName: data.supplierName,
        invoiceNumber: data.invoiceNumber,
        particulars: data.particulars || data.description,
        amount: data.amount,
        gstRate: data.gstRate || 0,
        cgst: data.cgst || 0,
        sgst: data.sgst || 0,
        igst: data.igst || 0,
        totalGST: (data.cgst || 0) + (data.sgst || 0) + (data.igst || 0),
        total: data.total || data.amount,
        amountFormatted: this.formatAmount(data.amount),
        gstFormatted: this.formatAmount((data.cgst || 0) + (data.sgst || 0) + (data.igst || 0)),
        totalFormatted: this.formatAmount(data.total || data.amount),
        voucherNumber: data.voucherNumber,
        journalId: data.journalId
      };

      await this.saveToBook(this.PURCHASE_BOOK_KEY, entry);

      return { success: true, data: entry };
    } catch (error) {
      console.error('Record purchase error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SALES BOOK - CREDIT SALES ONLY
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Format: Date | Customer | Invoice No. | Particulars | Amount | GST | Total
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordSale(data) {
    try {
      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: moment(data.date || new Date()).format('DD-MMM-YYYY'),
        customerName: data.customerName,
        invoiceNumber: data.invoiceNumber,
        particulars: data.particulars || data.description,
        amount: data.amount,
        gstRate: data.gstRate || 0,
        cgst: data.cgst || 0,
        sgst: data.sgst || 0,
        igst: data.igst || 0,
        totalGST: (data.cgst || 0) + (data.sgst || 0) + (data.igst || 0),
        total: data.total || data.amount,
        amountFormatted: this.formatAmount(data.amount),
        gstFormatted: this.formatAmount((data.cgst || 0) + (data.sgst || 0) + (data.igst || 0)),
        totalFormatted: this.formatAmount(data.total || data.amount),
        voucherNumber: data.voucherNumber,
        journalId: data.journalId
      };

      await this.saveToBook(this.SALES_BOOK_KEY, entry);

      return { success: true, data: entry };
    } catch (error) {
      console.error('Record sale error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PURCHASE RETURN BOOK (DEBIT NOTE BOOK)
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Format: Date | Supplier | Debit Note No. | Particulars | Amount | GST | Total
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordPurchaseReturn(data) {
    try {
      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: moment(data.date || new Date()).format('DD-MMM-YYYY'),
        supplierName: data.supplierName,
        debitNoteNumber: data.debitNoteNumber || data.noteNumber,
        particulars: data.particulars || data.description,
        amount: data.amount,
        gstRate: data.gstRate || 0,
        cgst: data.cgst || 0,
        sgst: data.sgst || 0,
        igst: data.igst || 0,
        totalGST: (data.cgst || 0) + (data.sgst || 0) + (data.igst || 0),
        total: data.total || data.amount,
        amountFormatted: this.formatAmount(data.amount),
        gstFormatted: this.formatAmount((data.cgst || 0) + (data.sgst || 0) + (data.igst || 0)),
        totalFormatted: this.formatAmount(data.total || data.amount),
        voucherNumber: data.voucherNumber,
        journalId: data.journalId
      };

      await this.saveToBook(this.PURCHASE_RETURN_KEY, entry);

      return { success: true, data: entry };
    } catch (error) {
      console.error('Record purchase return error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SALES RETURN BOOK (CREDIT NOTE BOOK)
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Format: Date | Customer | Credit Note No. | Particulars | Amount | GST | Total
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordSalesReturn(data) {
    try {
      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: moment(data.date || new Date()).format('DD-MMM-YYYY'),
        customerName: data.customerName,
        creditNoteNumber: data.creditNoteNumber || data.noteNumber,
        particulars: data.particulars || data.description,
        amount: data.amount,
        gstRate: data.gstRate || 0,
        cgst: data.cgst || 0,
        sgst: data.sgst || 0,
        igst: data.igst || 0,
        totalGST: (data.cgst || 0) + (data.sgst || 0) + (data.igst || 0),
        total: data.total || data.amount,
        amountFormatted: this.formatAmount(data.amount),
        gstFormatted: this.formatAmount((data.cgst || 0) + (data.sgst || 0) + (data.igst || 0)),
        totalFormatted: this.formatAmount(data.total || data.amount),
        voucherNumber: data.voucherNumber,
        journalId: data.journalId
      };

      await this.saveToBook(this.SALES_RETURN_KEY, entry);

      return { success: true, data: entry };
    } catch (error) {
      console.error('Record sales return error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CASH BOOK - THREE COLUMN FORMAT
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Format: Date | Particulars | Voucher | Cash Debit | Cash Credit | Bank Debit | Bank Credit | Balance
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordCashTransaction(data) {
    try {
      const existingData = await AsyncStorage.getItem(this.CASH_BOOK_KEY);
      const cashBook = existingData ? JSON.parse(existingData) : [];

      // Calculate running balance
      const previousBalance = cashBook.length > 0 ? cashBook[0].balanceAmount : 0;
      const cashDebit = data.cashDebit || 0;
      const cashCredit = data.cashCredit || 0;
      const balanceAmount = previousBalance + cashDebit - cashCredit;

      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: moment(data.date || new Date()).format('DD-MMM-YYYY'),
        particulars: data.particulars,
        voucherNumber: data.voucherNumber,
        cashDebit: cashDebit,
        cashCredit: cashCredit,
        cashDebitFormatted: cashDebit > 0 ? this.formatAmount(cashDebit) : '',
        cashCreditFormatted: cashCredit > 0 ? this.formatAmount(cashCredit) : '',
        balanceAmount: balanceAmount,
        balance: this.formatBalance(balanceAmount),
        journalId: data.journalId
      };

      cashBook.unshift(entry);
      await AsyncStorage.setItem(this.CASH_BOOK_KEY, JSON.stringify(cashBook));

      return { success: true, data: entry };
    } catch (error) {
      console.error('Record cash transaction error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * BANK BOOK
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Format: Date | Particulars | Voucher | Debit | Credit | Balance
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordBankTransaction(data) {
    try {
      const existingData = await AsyncStorage.getItem(this.BANK_BOOK_KEY);
      const bankBook = existingData ? JSON.parse(existingData) : [];

      // Calculate running balance
      const previousBalance = bankBook.length > 0 ? bankBook[0].balanceAmount : 0;
      const debit = data.debit || 0;
      const credit = data.credit || 0;
      const balanceAmount = previousBalance + debit - credit;

      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: moment(data.date || new Date()).format('DD-MMM-YYYY'),
        particulars: data.particulars,
        voucherNumber: data.voucherNumber,
        debit: debit,
        credit: credit,
        debitFormatted: debit > 0 ? this.formatAmount(debit) : '',
        creditFormatted: credit > 0 ? this.formatAmount(credit) : '',
        balanceAmount: balanceAmount,
        balance: this.formatBalance(balanceAmount),
        journalId: data.journalId
      };

      bankBook.unshift(entry);
      await AsyncStorage.setItem(this.BANK_BOOK_KEY, JSON.stringify(bankBook));

      return { success: true, data: entry };
    } catch (error) {
      console.error('Record bank transaction error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PETTY CASH BOOK - IMPREST SYSTEM
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Format: Date | Particulars | Voucher | Receipt | Payment | Balance
   * 
   * Imprest System: Fixed amount maintained, replenished periodically
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordPettyCash(data) {
    try {
      const existingData = await AsyncStorage.getItem(this.PETTY_CASH_KEY);
      const pettyCash = existingData ? JSON.parse(existingData) : [];

      // Get imprest amount (fixed amount)
      const imprestAmount = data.imprestAmount || 10000; // Default ₹10,000

      // Calculate running balance
      const previousBalance = pettyCash.length > 0 ? pettyCash[0].balanceAmount : imprestAmount;
      const receipt = data.receipt || 0;
      const payment = data.payment || 0;
      const balanceAmount = previousBalance + receipt - payment;

      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: moment(data.date || new Date()).format('DD-MMM-YYYY'),
        particulars: data.particulars,
        voucherNumber: data.voucherNumber,
        receipt: receipt,
        payment: payment,
        receiptFormatted: receipt > 0 ? this.formatAmount(receipt) : '',
        paymentFormatted: payment > 0 ? this.formatAmount(payment) : '',
        balanceAmount: balanceAmount,
        balance: this.formatAmount(balanceAmount),
        imprestAmount: imprestAmount,
        journalId: data.journalId
      };

      pettyCash.unshift(entry);
      await AsyncStorage.setItem(this.PETTY_CASH_KEY, JSON.stringify(pettyCash));

      return { success: true, data: entry };
    } catch (error) {
      console.error('Record petty cash error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * BILLS RECEIVABLE BOOK
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Format: Date | From (Drawer) | Bill No. | Term (Days) | Due Date | Amount
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordBillReceivable(data) {
    try {
      const dueDate = moment(data.date).add(data.termDays || 90, 'days');

      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: moment(data.date || new Date()).format('DD-MMM-YYYY'),
        drawerName: data.drawerName || data.customerName,
        billNumber: data.billNumber,
        termDays: data.termDays || 90,
        dueDate: dueDate.toISOString(),
        dueDateFormatted: dueDate.format('DD-MMM-YYYY'),
        amount: data.amount,
        amountFormatted: this.formatAmount(data.amount),
        status: 'PENDING', // PENDING, RECEIVED, DISHONORED
        voucherNumber: data.voucherNumber,
        journalId: data.journalId
      };

      await this.saveToBook(this.BILLS_RECEIVABLE_KEY, entry);

      return { success: true, data: entry };
    } catch (error) {
      console.error('Record bill receivable error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * BILLS PAYABLE BOOK
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Format: Date | To (Payee) | Bill No. | Term (Days) | Due Date | Amount
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordBillPayable(data) {
    try {
      const dueDate = moment(data.date).add(data.termDays || 90, 'days');

      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: moment(data.date || new Date()).format('DD-MMM-YYYY'),
        payeeName: data.payeeName || data.supplierName,
        billNumber: data.billNumber,
        termDays: data.termDays || 90,
        dueDate: dueDate.toISOString(),
        dueDateFormatted: dueDate.format('DD-MMM-YYYY'),
        amount: data.amount,
        amountFormatted: this.formatAmount(data.amount),
        status: 'PENDING', // PENDING, PAID, DISHONORED
        voucherNumber: data.voucherNumber,
        journalId: data.journalId
      };

      await this.saveToBook(this.BILLS_PAYABLE_KEY, entry);

      return { success: true, data: entry };
    } catch (error) {
      console.error('Record bill payable error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER METHODS
   * ═══════════════════════════════════════════════════════════════════════
   */

  static async saveToBook(bookKey, entry) {
    try {
      const existingData = await AsyncStorage.getItem(bookKey);
      const book = existingData ? JSON.parse(existingData) : [];

      book.unshift(entry);

      await AsyncStorage.setItem(bookKey, JSON.stringify(book));

      return { success: true };
    } catch (error) {
      console.error('Save to book error:', error);
      throw error;
    }
  }

  static formatAmount(amount) {
    if (!amount || amount === 0) return '';
    
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  static formatBalance(amount) {
    if (amount === 0) return '0.00';
    
    const absAmount = Math.abs(amount);
    const formatted = absAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return amount >= 0 ? `${formatted} Dr` : `${formatted} Cr`;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET BOOK ENTRIES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getBook(bookKey, filters = {}) {
    try {
      const data = await AsyncStorage.getItem(bookKey);
      let entries = data ? JSON.parse(data) : [];

      // Apply filters
      if (filters.fromDate) {
        entries = entries.filter(e => 
          moment(e.date).isSameOrAfter(moment(filters.fromDate), 'day')
        );
      }

      if (filters.toDate) {
        entries = entries.filter(e => 
          moment(e.date).isSameOrBefore(moment(filters.toDate), 'day')
        );
      }

      if (filters.month) {
        entries = entries.filter(e => 
          moment(e.date).format('MMMM') === filters.month
        );
      }

      if (filters.year) {
        entries = entries.filter(e => 
          moment(e.date).format('YYYY') === filters.year
        );
      }

      return {
        success: true,
        data: entries,
        count: entries.length
      };
    } catch (error) {
      console.error('Get book error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Specific getters for each book
  static async getPurchaseBook(filters = {}) {
    return await this.getBook(this.PURCHASE_BOOK_KEY, filters);
  }

  static async getSalesBook(filters = {}) {
    return await this.getBook(this.SALES_BOOK_KEY, filters);
  }

  static async getPurchaseReturnBook(filters = {}) {
    return await this.getBook(this.PURCHASE_RETURN_KEY, filters);
  }

  static async getSalesReturnBook(filters = {}) {
    return await this.getBook(this.SALES_RETURN_KEY, filters);
  }

  static async getCashBook(filters = {}) {
    return await this.getBook(this.CASH_BOOK_KEY, filters);
  }

  static async getBankBook(filters = {}) {
    return await this.getBook(this.BANK_BOOK_KEY, filters);
  }

  static async getPettyCashBook(filters = {}) {
    return await this.getBook(this.PETTY_CASH_KEY, filters);
  }

  static async getBillsReceivableBook(filters = {}) {
    return await this.getBook(this.BILLS_RECEIVABLE_KEY, filters);
  }

  static async getBillsPayableBook(filters = {}) {
    return await this.getBook(this.BILLS_PAYABLE_KEY, filters);
  }
}

export default SubsidiaryBooksService;
