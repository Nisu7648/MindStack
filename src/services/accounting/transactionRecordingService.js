/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TRANSACTION RECORDING SERVICE - WITH PHONE STORAGE INTEGRATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Complete integration with phone storage:
 * 1. Records transaction in journal
 * 2. Posts to ledger
 * 3. Records in subsidiary books (if enabled)
 * 4. Saves everything to phone storage
 * 5. Can generate and save PDFs
 * 
 * Storage Location: /storage/emulated/0/MindStack/
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { JournalService, VOUCHER_TYPES } from './journalService';
import { JournalHelpers } from './journalHelpers';
import { AccountingSettingsService, ACCOUNTING_BOOKS } from './accountingSettingsService';
import StorageService from '../storage/storageService';
import PDFGenerationService from './pdfGenerationService';

export class TransactionRecordingService {
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * INITIALIZE STORAGE ON APP START
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async initializeStorage() {
    return await StorageService.initialize();
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RECORD TRANSACTION - MAIN ENTRY POINT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordTransaction(transactionData) {
    try {
      console.log('📝 Recording transaction:', transactionData);

      // Step 1: Validate
      const validation = this.validateTransaction(transactionData);
      if (!validation.valid) {
        return { success: false, error: validation.error, step: 'VALIDATION' };
      }

      // Step 2: Get settings
      const settingsResult = await AccountingSettingsService.getSettings();
      const settings = settingsResult.data;

      // Step 3: Determine books
      let booksToRecord = transactionData.recordInBooks || [];
      if (booksToRecord.length === 0) {
        const booksResult = await AccountingSettingsService.getBooksForTransactionType(transactionData.type);
        booksToRecord = booksResult.data.map(b => b.type);
      }

      // Step 4: Create journal entry
      const journalResult = await this.createJournalEntry(transactionData);
      if (!journalResult.success) {
        return { success: false, error: journalResult.error, step: 'JOURNAL_ENTRY' };
      }

      const journalEntry = journalResult.data;
      console.log('✅ Journal entry created:', journalEntry.voucherNumber);

      // Step 5: Save to storage - Journal
      await StorageService.saveJournalEntry(journalEntry);
      console.log('✅ Saved to journal storage');

      // Step 6: Post to ledger and save
      for (const entry of journalEntry.entries) {
        const ledgerEntry = {
          date: journalEntry.date,
          voucherNumber: journalEntry.voucherNumber,
          particulars: entry.accountName,
          debit: entry.debit,
          credit: entry.credit,
          balance: 0,
          balanceType: 'Dr'
        };
        await StorageService.updateLedger(entry.accountCode, ledgerEntry);
      }
      console.log('✅ Posted to ledger storage');

      // Step 7: Record in subsidiary books
      const subsidiaryResults = await this.recordInSubsidiaryBooks(
        journalEntry,
        transactionData,
        booksToRecord,
        settings
      );

      // Prepare response
      const recordedBooks = ['Journal', 'Ledger', ...subsidiaryResults.recorded];
      const message = `✅ Transaction recorded successfully!\nVoucher: ${journalEntry.voucherNumber}\nAmount: ₹${journalEntry.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\nRecorded in: ${recordedBooks.join(', ')}\nSaved to phone storage`;

      return {
        success: true,
        data: {
          journalEntry,
          voucherNumber: journalEntry.voucherNumber,
          recordedBooks: recordedBooks,
          message: message
        },
        message: message
      };
    } catch (error) {
      console.error('❌ Record transaction error:', error);
      return { success: false, error: error.message, step: 'SYSTEM_ERROR' };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RECORD IN SUBSIDIARY BOOKS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordInSubsidiaryBooks(journalEntry, transactionData, booksToRecord, settings) {
    const recorded = [];
    const skipped = [];

    try {
      const bookData = {
        ...transactionData,
        voucherNumber: journalEntry.voucherNumber,
        journalId: journalEntry.id,
        date: journalEntry.date
      };

      // Purchase Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.PURCHASE_BOOK) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.PURCHASE_BOOK]) {
        if (this.shouldRecordInPurchaseBook(transactionData)) {
          await StorageService.saveToSubsidiaryBook('purchaseBook', bookData);
          recorded.push('Purchase Book');
        }
      }

      // Sales Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.SALES_BOOK) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.SALES_BOOK]) {
        if (this.shouldRecordInSalesBook(transactionData)) {
          await StorageService.saveToSubsidiaryBook('salesBook', bookData);
          recorded.push('Sales Book');
        }
      }

      // Purchase Return Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.PURCHASE_RETURN) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.PURCHASE_RETURN]) {
        if (transactionData.type === 'PURCHASE_RETURN') {
          await StorageService.saveToSubsidiaryBook('purchaseReturnBook', bookData);
          recorded.push('Purchase Return Book');
        }
      }

      // Sales Return Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.SALES_RETURN) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.SALES_RETURN]) {
        if (transactionData.type === 'SALES_RETURN') {
          await StorageService.saveToSubsidiaryBook('salesReturnBook', bookData);
          recorded.push('Sales Return Book');
        }
      }

      // Cash Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.CASH_BOOK) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.CASH_BOOK]) {
        if (this.shouldRecordInCashBook(transactionData)) {
          await StorageService.saveToSubsidiaryBook('cashBook', bookData);
          recorded.push('Cash Book');
        }
      }

      // Bank Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.BANK_BOOK) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.BANK_BOOK]) {
        if (this.shouldRecordInBankBook(transactionData)) {
          await StorageService.saveToSubsidiaryBook('bankBook', bookData);
          recorded.push('Bank Book');
        }
      }

      // Petty Cash Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.PETTY_CASH_BOOK) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.PETTY_CASH_BOOK]) {
        if (transactionData.type === 'PETTY_CASH') {
          await StorageService.saveToSubsidiaryBook('pettyCashBook', bookData);
          recorded.push('Petty Cash Book');
        }
      }

      // Bills Receivable Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.BILLS_RECEIVABLE) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.BILLS_RECEIVABLE]) {
        if (transactionData.type === 'BILL_RECEIVABLE') {
          await StorageService.saveToSubsidiaryBook('billsReceivableBook', bookData);
          recorded.push('Bills Receivable Book');
        }
      }

      // Bills Payable Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.BILLS_PAYABLE) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.BILLS_PAYABLE]) {
        if (transactionData.type === 'BILL_PAYABLE') {
          await StorageService.saveToSubsidiaryBook('billsPayableBook', bookData);
          recorded.push('Bills Payable Book');
        }
      }

      return { recorded, skipped };
    } catch (error) {
      console.error('Record in subsidiary books error:', error);
      return { recorded, skipped };
    }
  }

  /**
   * Helper methods
   */
  static shouldRecordInPurchaseBook(data) {
    const type = data.type.toUpperCase();
    return type.includes('PURCHASE') && !type.includes('RETURN');
  }

  static shouldRecordInSalesBook(data) {
    const type = data.type.toUpperCase();
    return type.includes('SALE') && !type.includes('RETURN');
  }

  static shouldRecordInCashBook(data) {
    const type = data.type.toUpperCase();
    return type.includes('CASH') || data.paymentMode === 'CASH';
  }

  static shouldRecordInBankBook(data) {
    const type = data.type.toUpperCase();
    return type.includes('BANK') || ['BANK', 'UPI', 'NEFT', 'RTGS', 'IMPS', 'CHEQUE'].includes(data.paymentMode);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * VALIDATE TRANSACTION
   * ═══════════════════════════════════════════════════════════════════════
   */
  static validateTransaction(data) {
    if (!data.type) return { valid: false, error: 'Transaction type is required' };
    if (!data.amount || data.amount <= 0) return { valid: false, error: 'Valid amount is required' };
    if (!data.description && !data.narration) return { valid: false, error: 'Description is required' };
    return { valid: true };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CREATE JOURNAL ENTRY
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async createJournalEntry(data) {
    try {
      const type = data.type.toUpperCase();

      switch (type) {
        case 'CASH_SALE':
        case 'SALE':
          return await JournalHelpers.recordCashSale({
            amount: data.amount,
            customerName: data.customerName || data.partyName,
            invoiceNumber: data.invoiceNumber || data.reference,
            gstRate: data.gstRate || 0,
            date: data.date
          });

        case 'CREDIT_SALE':
          return await JournalHelpers.recordCreditSale({
            amount: data.amount,
            customerName: data.customerName || data.partyName,
            invoiceNumber: data.invoiceNumber || data.reference,
            gstRate: data.gstRate || 0,
            date: data.date
          });

        case 'CASH_PURCHASE':
        case 'PURCHASE':
          return await JournalHelpers.recordCashPurchase({
            amount: data.amount,
            supplierName: data.supplierName || data.partyName,
            invoiceNumber: data.invoiceNumber || data.reference,
            gstRate: data.gstRate || 0,
            date: data.date
          });

        case 'PAYMENT':
          return await JournalHelpers.recordPaymentToCreditor({
            amount: data.amount,
            supplierName: data.supplierName || data.partyName,
            paymentMode: data.paymentMode || 'CASH',
            reference: data.reference,
            date: data.date
          });

        case 'RECEIPT':
          return await JournalHelpers.recordReceiptFromDebtor({
            amount: data.amount,
            customerName: data.customerName || data.partyName,
            paymentMode: data.paymentMode || 'CASH',
            reference: data.reference,
            date: data.date
          });

        case 'EXPENSE':
          return await JournalHelpers.recordExpensePayment({
            amount: data.amount,
            expenseType: data.expenseType || 'General Expense',
            description: data.description || data.narration,
            paymentMode: data.paymentMode || 'CASH',
            tdsSection: data.tdsSection,
            date: data.date
          });

        case 'CONTRA':
          return await JournalHelpers.recordContraEntry({
            amount: data.amount,
            fromAccount: data.fromAccount || 'CASH',
            toAccount: data.toAccount || 'BANK',
            description: data.description || data.narration,
            date: data.date
          });

        default:
          return await JournalService.createJournalEntry({
            voucherType: VOUCHER_TYPES.JOURNAL,
            date: data.date,
            narration: data.description || data.narration,
            reference: data.reference,
            entries: data.entries || [],
            createdBy: data.createdBy
          });
      }
    } catch (error) {
      console.error('Create journal entry error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET TRANSACTION HISTORY FROM STORAGE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getTransactionHistory(filters = {}) {
    return await StorageService.getJournalEntries(filters);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET LEDGER ACCOUNT FROM STORAGE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getLedgerAccount(accountCode) {
    return await StorageService.getLedgerAccount(accountCode);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET ALL LEDGER ACCOUNTS FROM STORAGE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getAllLedgerAccounts() {
    return await StorageService.getAllLedgerAccounts();
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET SUBSIDIARY BOOK FROM STORAGE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getSubsidiaryBook(bookName, filters = {}) {
    return await StorageService.getSubsidiaryBook(bookName, filters);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE AND SAVE JOURNAL BOOK PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateJournalBookPDF(filters = {}) {
    try {
      const result = await StorageService.getJournalEntries(filters);
      
      if (!result.success || result.data.length === 0) {
        return { success: false, error: 'No entries found' };
      }

      let period = 'All Transactions';
      if (filters.month && filters.year) {
        period = `${filters.month} ${filters.year}`;
      } else if (filters.fromDate && filters.toDate) {
        period = `${filters.fromDate} to ${filters.toDate}`;
      }

      return await PDFGenerationService.generateJournalBookPDF(result.data, period);
    } catch (error) {
      console.error('Generate journal book PDF error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE AND SAVE LEDGER PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateLedgerPDF(accountCode, filters = {}) {
    try {
      const result = await StorageService.getLedgerAccount(accountCode);
      
      if (!result.success) {
        return { success: false, error: 'Account not found' };
      }

      let entries = result.data.entries;
      
      // Apply filters
      if (filters.fromDate) {
        entries = entries.filter(e => new Date(e.date) >= new Date(filters.fromDate));
      }
      if (filters.toDate) {
        entries = entries.filter(e => new Date(e.date) <= new Date(filters.toDate));
      }

      let period = 'All Transactions';
      if (filters.fromDate && filters.toDate) {
        period = `${filters.fromDate} to ${filters.toDate}`;
      }

      return await PDFGenerationService.generateLedgerPDF(
        result.data.accountName,
        entries,
        period
      );
    } catch (error) {
      console.error('Generate ledger PDF error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LIST ALL SAVED PDFS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async listSavedPDFs() {
    return await PDFGenerationService.listSavedPDFs();
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * DELETE PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async deletePDF(filePath) {
    return await PDFGenerationService.deletePDF(filePath);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SHARE PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async sharePDF(filePath) {
    return await PDFGenerationService.sharePDF(filePath);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CREATE BACKUP
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async createBackup() {
    return await StorageService.createBackup();
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LIST BACKUPS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async listBackups() {
    return await StorageService.listBackups();
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RESTORE BACKUP
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async restoreBackup(backupPath) {
    return await StorageService.restoreBackup(backupPath);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET STORAGE INFO
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getStorageInfo() {
    return await StorageService.getStorageInfo();
  }
}

export default TransactionRecordingService;
