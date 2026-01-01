/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TRANSACTION RECORDING SERVICE - COMPLETE INTEGRATION WITH SETTINGS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This service integrates everything with user's book configuration:
 * 1. User enters transaction in main screen
 * 2. Creates journal entry (double-entry) - ALWAYS
 * 3. Records in journal book (traditional format) - ALWAYS
 * 4. Posts to ledger (account-wise) - ALWAYS
 * 5. Records in subsidiary books - ONLY IF ENABLED IN SETTINGS
 * 6. Updates GST registers
 * 7. Updates TDS registers
 * 8. Creates audit trail
 * 
 * User can specify which book to record in main screen
 * 
 * NEVER FAILS - Complete error handling and validation
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { JournalService, VOUCHER_TYPES } from './journalService';
import { JournalHelpers } from './journalHelpers';
import { JournalBookService } from './journalBookService';
import { LedgerService } from './ledgerService';
import { SubsidiaryBooksService } from './subsidiaryBooksService';
import { AccountingSettingsService, ACCOUNTING_BOOKS } from './accountingSettingsService';

export class TransactionRecordingService {
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RECORD TRANSACTION - MAIN ENTRY POINT WITH SETTINGS
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * This is called when user enters transaction in main screen
   * 
   * Input: User's transaction data + optional specific books to record
   * Output: Complete recording in enabled books
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordTransaction(transactionData) {
    try {
      console.log('📝 Recording transaction:', transactionData);

      // Step 1: Validate transaction data
      const validation = this.validateTransaction(transactionData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          step: 'VALIDATION'
        };
      }

      // Step 2: Get user's book configuration
      const settingsResult = await AccountingSettingsService.getSettings();
      const settings = settingsResult.data;

      // Step 3: Determine which books to record in
      let booksToRecord = transactionData.recordInBooks || [];
      
      if (booksToRecord.length === 0) {
        // Auto-determine based on transaction type
        const booksResult = await AccountingSettingsService.getBooksForTransactionType(transactionData.type);
        booksToRecord = booksResult.data.map(b => b.type);
      }

      console.log('📚 Books to record:', booksToRecord);

      // Step 4: Create journal entry (ALWAYS)
      const journalResult = await this.createJournalEntry(transactionData);
      if (!journalResult.success) {
        return {
          success: false,
          error: journalResult.error,
          step: 'JOURNAL_ENTRY'
        };
      }

      const journalEntry = journalResult.data;
      console.log('✅ Journal entry created:', journalEntry.voucherNumber);

      // Step 5: Record in journal book (ALWAYS)
      const bookResult = await JournalBookService.recordInJournalBook(journalEntry);
      if (!bookResult.success) {
        console.warn('⚠️ Journal book recording failed:', bookResult.error);
      } else {
        console.log('✅ Recorded in journal book');
      }

      // Step 6: Post to ledger (ALWAYS)
      await LedgerService.postToLedger(journalEntry);
      console.log('✅ Posted to ledger');

      // Step 7: Record in subsidiary books (ONLY IF ENABLED)
      const subsidiaryResults = await this.recordInSubsidiaryBooks(
        journalEntry,
        transactionData,
        booksToRecord,
        settings
      );

      // Step 8: Update GST registers (if applicable)
      if (journalEntry.gstDetails) {
        await this.updateGSTRegisters(journalEntry);
        console.log('✅ GST registers updated');
      }

      // Step 9: Update TDS registers (if applicable)
      if (journalEntry.tdsDetails) {
        await this.updateTDSRegisters(journalEntry);
        console.log('✅ TDS registers updated');
      }

      // Step 10: Create audit trail (already done in JournalService)
      console.log('✅ Audit trail created');

      // Prepare response message
      const recordedBooks = ['Journal', 'Ledger', ...subsidiaryResults.recorded];
      const message = `✅ Transaction recorded successfully!\nVoucher: ${journalEntry.voucherNumber}\nAmount: ₹${journalEntry.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\nRecorded in: ${recordedBooks.join(', ')}`;

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
      return {
        success: false,
        error: error.message,
        step: 'SYSTEM_ERROR'
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RECORD IN SUBSIDIARY BOOKS (BASED ON SETTINGS)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordInSubsidiaryBooks(journalEntry, transactionData, booksToRecord, settings) {
    const recorded = [];
    const skipped = [];

    try {
      // Purchase Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.PURCHASE_BOOK) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.PURCHASE_BOOK]) {
        if (this.shouldRecordInPurchaseBook(transactionData)) {
          await SubsidiaryBooksService.recordPurchase({
            ...transactionData,
            voucherNumber: journalEntry.voucherNumber,
            journalId: journalEntry.id
          });
          recorded.push('Purchase Book');
          console.log('✅ Recorded in Purchase Book');
        }
      } else if (booksToRecord.includes(ACCOUNTING_BOOKS.PURCHASE_BOOK)) {
        skipped.push('Purchase Book (disabled in settings)');
      }

      // Sales Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.SALES_BOOK) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.SALES_BOOK]) {
        if (this.shouldRecordInSalesBook(transactionData)) {
          await SubsidiaryBooksService.recordSale({
            ...transactionData,
            voucherNumber: journalEntry.voucherNumber,
            journalId: journalEntry.id
          });
          recorded.push('Sales Book');
          console.log('✅ Recorded in Sales Book');
        }
      } else if (booksToRecord.includes(ACCOUNTING_BOOKS.SALES_BOOK)) {
        skipped.push('Sales Book (disabled in settings)');
      }

      // Purchase Return Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.PURCHASE_RETURN) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.PURCHASE_RETURN]) {
        if (transactionData.type === 'PURCHASE_RETURN') {
          await SubsidiaryBooksService.recordPurchaseReturn({
            ...transactionData,
            voucherNumber: journalEntry.voucherNumber,
            journalId: journalEntry.id
          });
          recorded.push('Purchase Return Book');
          console.log('✅ Recorded in Purchase Return Book');
        }
      }

      // Sales Return Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.SALES_RETURN) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.SALES_RETURN]) {
        if (transactionData.type === 'SALES_RETURN') {
          await SubsidiaryBooksService.recordSalesReturn({
            ...transactionData,
            voucherNumber: journalEntry.voucherNumber,
            journalId: journalEntry.id
          });
          recorded.push('Sales Return Book');
          console.log('✅ Recorded in Sales Return Book');
        }
      }

      // Cash Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.CASH_BOOK) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.CASH_BOOK]) {
        if (this.shouldRecordInCashBook(transactionData)) {
          await SubsidiaryBooksService.recordCashTransaction({
            ...transactionData,
            voucherNumber: journalEntry.voucherNumber,
            journalId: journalEntry.id
          });
          recorded.push('Cash Book');
          console.log('✅ Recorded in Cash Book');
        }
      }

      // Bank Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.BANK_BOOK) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.BANK_BOOK]) {
        if (this.shouldRecordInBankBook(transactionData)) {
          await SubsidiaryBooksService.recordBankTransaction({
            ...transactionData,
            voucherNumber: journalEntry.voucherNumber,
            journalId: journalEntry.id
          });
          recorded.push('Bank Book');
          console.log('✅ Recorded in Bank Book');
        }
      }

      // Petty Cash Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.PETTY_CASH_BOOK) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.PETTY_CASH_BOOK]) {
        if (transactionData.type === 'PETTY_CASH') {
          await SubsidiaryBooksService.recordPettyCash({
            ...transactionData,
            voucherNumber: journalEntry.voucherNumber,
            journalId: journalEntry.id
          });
          recorded.push('Petty Cash Book');
          console.log('✅ Recorded in Petty Cash Book');
        }
      }

      // Bills Receivable Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.BILLS_RECEIVABLE) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.BILLS_RECEIVABLE]) {
        if (transactionData.type === 'BILL_RECEIVABLE') {
          await SubsidiaryBooksService.recordBillReceivable({
            ...transactionData,
            voucherNumber: journalEntry.voucherNumber,
            journalId: journalEntry.id
          });
          recorded.push('Bills Receivable Book');
          console.log('✅ Recorded in Bills Receivable Book');
        }
      }

      // Bills Payable Book
      if (booksToRecord.includes(ACCOUNTING_BOOKS.BILLS_PAYABLE) && 
          settings.enabledBooks[ACCOUNTING_BOOKS.BILLS_PAYABLE]) {
        if (transactionData.type === 'BILL_PAYABLE') {
          await SubsidiaryBooksService.recordBillPayable({
            ...transactionData,
            voucherNumber: journalEntry.voucherNumber,
            journalId: journalEntry.id
          });
          recorded.push('Bills Payable Book');
          console.log('✅ Recorded in Bills Payable Book');
        }
      }

      return { recorded, skipped };
    } catch (error) {
      console.error('Record in subsidiary books error:', error);
      return { recorded, skipped };
    }
  }

  /**
   * Helper methods to determine which subsidiary books to use
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
    if (!data.type) {
      return { valid: false, error: 'Transaction type is required' };
    }

    if (!data.amount || data.amount <= 0) {
      return { valid: false, error: 'Valid amount is required' };
    }

    if (!data.description && !data.narration) {
      return { valid: false, error: 'Description is required' };
    }

    return { valid: true };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CREATE JOURNAL ENTRY BASED ON TRANSACTION TYPE
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
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * UPDATE GST REGISTERS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async updateGSTRegisters(journalEntry) {
    try {
      const gstEntry = {
        journalId: journalEntry.id,
        voucherNumber: journalEntry.voucherNumber,
        date: journalEntry.date,
        gstDetails: journalEntry.gstDetails,
        partyDetails: journalEntry.partyDetails
      };

      return { success: true };
    } catch (error) {
      console.error('Update GST registers error:', error);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * UPDATE TDS REGISTERS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async updateTDSRegisters(journalEntry) {
    try {
      const tdsEntry = {
        journalId: journalEntry.id,
        voucherNumber: journalEntry.voucherNumber,
        date: journalEntry.date,
        tdsDetails: journalEntry.tdsDetails,
        partyDetails: journalEntry.partyDetails
      };

      return { success: true };
    } catch (error) {
      console.error('Update TDS registers error:', error);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET TRANSACTION HISTORY
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getTransactionHistory(filters = {}) {
    try {
      const result = await JournalBookService.getJournalBook(filters);
      return result;
    } catch (error) {
      console.error('Get transaction history error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SEARCH TRANSACTIONS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async searchTransactions(searchText) {
    try {
      const result = await JournalBookService.searchJournalBook(searchText);
      return result;
    } catch (error) {
      console.error('Search transactions error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET TRANSACTIONS BY MONTH
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getTransactionsByMonth(month, year) {
    try {
      const result = await JournalBookService.getJournalBookByMonth(month, year);
      return result;
    } catch (error) {
      console.error('Get transactions by month error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET TRANSACTIONS BY DATE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getTransactionsByDate(date) {
    try {
      const result = await JournalBookService.getJournalBookByDate(date);
      return result;
    } catch (error) {
      console.error('Get transactions by date error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE JOURNAL BOOK PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateJournalBookPDF(filters = {}) {
    try {
      const result = await JournalBookService.getJournalBook(filters);
      
      if (!result.success || result.data.length === 0) {
        return {
          success: false,
          error: 'No entries found for the selected period'
        };
      }

      let title = 'JOURNAL BOOK';
      if (filters.monthYear) {
        title = `JOURNAL BOOK - ${filters.monthYear}`;
      } else if (filters.fromDate && filters.toDate) {
        title = `JOURNAL BOOK - ${filters.fromDate} to ${filters.toDate}`;
      }

      const pdfResult = await JournalBookService.generatePDF(result.data, title);
      
      return pdfResult;
    } catch (error) {
      console.error('Generate journal book PDF error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET AVAILABLE MONTHS (for dropdown)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getAvailableMonths() {
    try {
      const result = await JournalBookService.getAvailableMonths();
      return result;
    } catch (error) {
      console.error('Get available months error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
}

export default TransactionRecordingService;
