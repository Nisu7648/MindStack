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
 * 5. Cash Book - All cash transactions (DOUBLE-SIDED FORMAT)
 * 6. Bank Book - All bank transactions (DOUBLE-SIDED FORMAT)
 * 7. Petty Cash Book - Small expenses (DOUBLE-SIDED FORMAT - Imprest System)
 * 8. Bills Receivable Book - Bills received from debtors
 * 9. Bills Payable Book - Bills given to creditors
 * 
 * YES - All 9 books logic is in this ONE file!
 * 
 * DOUBLE-SIDED FORMAT (Cash, Bank, Petty Cash):
 * ┌─────────────────────────────────────┬─────────────────────────────────────┐
 * │         DEBIT SIDE (Receipts)       │        CREDIT SIDE (Payments)       │
 * ├──────┬──────────┬─────────┬────┬────┼──────┬──────────┬─────────┬────┬────┤
 * │ Date │ Receipts │ Voucher │ LF │ ₹  │ Date │ Payments │ Voucher │ LF │ ₹  │
 * └──────┴──────────┴─────────┴────┴────┴──────┴──────────┴─────────┴────┴────┘
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import StorageService from '../storage/storageService';
import moment from 'moment';

export class SubsidiaryBooksService {
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER: FORMAT AMOUNT (INDIAN STYLE)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static formatAmount(amount) {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER: FORMAT BALANCE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static formatBalance(amount) {
    const absAmount = Math.abs(amount);
    const type = amount >= 0 ? 'Dr' : 'Cr';
    return `${this.formatAmount(absAmount)} ${type}`;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 1. PURCHASE BOOK - CREDIT PURCHASES ONLY
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
        voucherNumber: data.voucherNumber,
        journalId: data.journalId
      };

      await StorageService.saveToSubsidiaryBook('purchaseBook', entry);
      return { success: true, data: entry };
    } catch (error) {
      console.error('Record purchase error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 2. SALES BOOK - CREDIT SALES ONLY
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
        voucherNumber: data.voucherNumber,
        journalId: data.journalId
      };

      await StorageService.saveToSubsidiaryBook('salesBook', entry);
      return { success: true, data: entry };
    } catch (error) {
      console.error('Record sale error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 3. PURCHASE RETURN BOOK (DEBIT NOTE BOOK)
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
        debitNoteNumber: data.debitNoteNumber || data.invoiceNumber,
        particulars: data.particulars || data.description,
        amount: data.amount,
        gstRate: data.gstRate || 0,
        cgst: data.cgst || 0,
        sgst: data.sgst || 0,
        igst: data.igst || 0,
        totalGST: (data.cgst || 0) + (data.sgst || 0) + (data.igst || 0),
        total: data.total || data.amount,
        voucherNumber: data.voucherNumber,
        journalId: data.journalId
      };

      await StorageService.saveToSubsidiaryBook('purchaseReturnBook', entry);
      return { success: true, data: entry };
    } catch (error) {
      console.error('Record purchase return error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 4. SALES RETURN BOOK (CREDIT NOTE BOOK)
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
        creditNoteNumber: data.creditNoteNumber || data.invoiceNumber,
        particulars: data.particulars || data.description,
        amount: data.amount,
        gstRate: data.gstRate || 0,
        cgst: data.cgst || 0,
        sgst: data.sgst || 0,
        igst: data.igst || 0,
        totalGST: (data.cgst || 0) + (data.sgst || 0) + (data.igst || 0),
        total: data.total || data.amount,
        voucherNumber: data.voucherNumber,
        journalId: data.journalId
      };

      await StorageService.saveToSubsidiaryBook('salesReturnBook', entry);
      return { success: true, data: entry };
    } catch (error) {
      console.error('Record sales return error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 5. CASH BOOK - DOUBLE-SIDED FORMAT
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * DEBIT SIDE (Receipts):  Date | Receipts | Voucher No. | L.F. | Amount
   * CREDIT SIDE (Payments): Date | Payments | Voucher No. | L.F. | Amount
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordCashTransaction(data) {
    try {
      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: moment(data.date || new Date()).format('DD-MMM-YYYY'),
        
        // Transaction details
        particulars: data.particulars,
        voucherNumber: data.voucherNumber,
        ledgerFolio: data.ledgerFolio || '',
        
        // Debit side (Receipts)
        isReceipt: data.isReceipt || false,
        receiptParticulars: data.isReceipt ? data.particulars : '',
        receiptAmount: data.isReceipt ? data.amount : 0,
        
        // Credit side (Payments)
        isPayment: data.isPayment || false,
        paymentParticulars: data.isPayment ? data.particulars : '',
        paymentAmount: data.isPayment ? data.amount : 0,
        
        // Common
        amount: data.amount,
        journalId: data.journalId
      };

      await StorageService.saveToSubsidiaryBook('cashBook', entry);
      return { success: true, data: entry };
    } catch (error) {
      console.error('Record cash transaction error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 6. BANK BOOK - DOUBLE-SIDED FORMAT
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * DEBIT SIDE (Receipts):  Date | Receipts | Voucher No. | L.F. | Amount
   * CREDIT SIDE (Payments): Date | Payments | Voucher No. | L.F. | Amount
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordBankTransaction(data) {
    try {
      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: moment(data.date || new Date()).format('DD-MMM-YYYY'),
        
        // Transaction details
        particulars: data.particulars,
        voucherNumber: data.voucherNumber,
        ledgerFolio: data.ledgerFolio || '',
        
        // Debit side (Receipts)
        isReceipt: data.isReceipt || false,
        receiptParticulars: data.isReceipt ? data.particulars : '',
        receiptAmount: data.isReceipt ? data.amount : 0,
        
        // Credit side (Payments)
        isPayment: data.isPayment || false,
        paymentParticulars: data.isPayment ? data.particulars : '',
        paymentAmount: data.isPayment ? data.amount : 0,
        
        // Common
        amount: data.amount,
        journalId: data.journalId
      };

      await StorageService.saveToSubsidiaryBook('bankBook', entry);
      return { success: true, data: entry };
    } catch (error) {
      console.error('Record bank transaction error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 7. PETTY CASH BOOK - DOUBLE-SIDED FORMAT (IMPREST SYSTEM)
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * DEBIT SIDE (Receipts):  Date | Receipts | Voucher No. | L.F. | Amount
   * CREDIT SIDE (Payments): Date | Payments | Voucher No. | L.F. | Amount
   * 
   * Imprest System: Fixed amount maintained, replenished periodically
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordPettyCash(data) {
    try {
      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: moment(data.date || new Date()).format('DD-MMM-YYYY'),
        
        // Transaction details
        particulars: data.particulars,
        voucherNumber: data.voucherNumber,
        ledgerFolio: data.ledgerFolio || '',
        
        // Debit side (Receipts - Imprest received)
        isReceipt: data.isReceipt || false,
        receiptParticulars: data.isReceipt ? data.particulars : '',
        receiptAmount: data.isReceipt ? data.amount : 0,
        
        // Credit side (Payments - Expenses)
        isPayment: data.isPayment || false,
        paymentParticulars: data.isPayment ? data.particulars : '',
        paymentAmount: data.isPayment ? data.amount : 0,
        
        // Imprest details
        imprestAmount: data.imprestAmount || 10000, // Default ₹10,000
        
        // Common
        amount: data.amount,
        journalId: data.journalId
      };

      await StorageService.saveToSubsidiaryBook('pettyCashBook', entry);
      return { success: true, data: entry };
    } catch (error) {
      console.error('Record petty cash error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 8. BILLS RECEIVABLE BOOK
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Format: Date | From (Drawer) | Bill No. | Term (Days) | Due Date | Amount
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordBillReceivable(data) {
    try {
      const billDate = moment(data.date || new Date());
      const termDays = data.termDays || 90;
      const dueDate = billDate.clone().add(termDays, 'days');

      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: billDate.format('DD-MMM-YYYY'),
        drawerName: data.drawerName || data.customerName,
        billNumber: data.billNumber,
        termDays: termDays,
        dueDate: dueDate.toISOString(),
        dueDateFormatted: dueDate.format('DD-MMM-YYYY'),
        amount: data.amount,
        status: 'PENDING', // PENDING, RECEIVED, DISHONOURED
        voucherNumber: data.voucherNumber,
        journalId: data.journalId
      };

      await StorageService.saveToSubsidiaryBook('billsReceivableBook', entry);
      return { success: true, data: entry };
    } catch (error) {
      console.error('Record bill receivable error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * 9. BILLS PAYABLE BOOK
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Format: Date | To (Payee) | Bill No. | Term (Days) | Due Date | Amount
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordBillPayable(data) {
    try {
      const billDate = moment(data.date || new Date());
      const termDays = data.termDays || 90;
      const dueDate = billDate.clone().add(termDays, 'days');

      const entry = {
        id: Date.now().toString(),
        date: data.date || new Date().toISOString(),
        dateFormatted: billDate.format('DD-MMM-YYYY'),
        payeeName: data.payeeName || data.supplierName,
        billNumber: data.billNumber,
        termDays: termDays,
        dueDate: dueDate.toISOString(),
        dueDateFormatted: dueDate.format('DD-MMM-YYYY'),
        amount: data.amount,
        status: 'PENDING', // PENDING, PAID, DISHONOURED
        voucherNumber: data.voucherNumber,
        journalId: data.journalId
      };

      await StorageService.saveToSubsidiaryBook('billsPayableBook', entry);
      return { success: true, data: entry };
    } catch (error) {
      console.error('Record bill payable error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET BOOK ENTRIES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getBookEntries(bookName, filters = {}) {
    return await StorageService.getSubsidiaryBook(bookName, filters);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET CASH BOOK WITH BALANCES (DOUBLE-SIDED)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getCashBookWithBalances(filters = {}) {
    try {
      const result = await StorageService.getSubsidiaryBook('cashBook', filters);
      
      if (!result.success) return result;

      let entries = result.data;
      let runningBalance = 0;

      // Calculate running balance
      entries = entries.map(entry => {
        if (entry.isReceipt) {
          runningBalance += entry.receiptAmount;
        } else if (entry.isPayment) {
          runningBalance -= entry.paymentAmount;
        }
        
        return {
          ...entry,
          balance: runningBalance,
          balanceFormatted: this.formatAmount(runningBalance)
        };
      });

      return {
        success: true,
        data: entries,
        summary: {
          totalReceipts: entries.filter(e => e.isReceipt).reduce((sum, e) => sum + e.receiptAmount, 0),
          totalPayments: entries.filter(e => e.isPayment).reduce((sum, e) => sum + e.paymentAmount, 0),
          closingBalance: runningBalance
        }
      };
    } catch (error) {
      console.error('Get cash book with balances error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET BANK BOOK WITH BALANCES (DOUBLE-SIDED)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getBankBookWithBalances(filters = {}) {
    try {
      const result = await StorageService.getSubsidiaryBook('bankBook', filters);
      
      if (!result.success) return result;

      let entries = result.data;
      let runningBalance = 0;

      // Calculate running balance
      entries = entries.map(entry => {
        if (entry.isReceipt) {
          runningBalance += entry.receiptAmount;
        } else if (entry.isPayment) {
          runningBalance -= entry.paymentAmount;
        }
        
        return {
          ...entry,
          balance: runningBalance,
          balanceFormatted: this.formatAmount(runningBalance)
        };
      });

      return {
        success: true,
        data: entries,
        summary: {
          totalReceipts: entries.filter(e => e.isReceipt).reduce((sum, e) => sum + e.receiptAmount, 0),
          totalPayments: entries.filter(e => e.isPayment).reduce((sum, e) => sum + e.paymentAmount, 0),
          closingBalance: runningBalance
        }
      };
    } catch (error) {
      console.error('Get bank book with balances error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET PETTY CASH BOOK WITH BALANCES (DOUBLE-SIDED)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getPettyCashBookWithBalances(filters = {}) {
    try {
      const result = await StorageService.getSubsidiaryBook('pettyCashBook', filters);
      
      if (!result.success) return result;

      let entries = result.data;
      const imprestAmount = entries.length > 0 ? entries[0].imprestAmount : 10000;
      let runningBalance = imprestAmount;

      // Calculate running balance
      entries = entries.map(entry => {
        if (entry.isReceipt) {
          runningBalance += entry.receiptAmount;
        } else if (entry.isPayment) {
          runningBalance -= entry.paymentAmount;
        }
        
        return {
          ...entry,
          balance: runningBalance,
          balanceFormatted: this.formatAmount(runningBalance)
        };
      });

      return {
        success: true,
        data: entries,
        summary: {
          imprestAmount: imprestAmount,
          totalReceipts: entries.filter(e => e.isReceipt).reduce((sum, e) => sum + e.receiptAmount, 0),
          totalPayments: entries.filter(e => e.isPayment).reduce((sum, e) => sum + e.paymentAmount, 0),
          closingBalance: runningBalance
        }
      };
    } catch (error) {
      console.error('Get petty cash book with balances error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default SubsidiaryBooksService;
