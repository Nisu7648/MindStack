/**
 * MindSlate Accounting Correction Intelligence
 * 
 * Safely corrects, reverses, or updates accounting transactions
 * without breaking accounting integrity or audit trail.
 * 
 * Operates under Indian accounting standards and GST law.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export class CorrectionService {
  static CORRECTIONS_KEY = '@mindstack_corrections';
  static AUDIT_TRAIL_KEY = '@mindstack_audit_trail';

  /**
   * Main correction handler
   * Determines correction type and executes appropriate action
   */
  static async handleCorrection(originalTransaction, correctionRequest) {
    try {
      const correctionType = this.determineCorrectionType(correctionRequest);
      
      let result;
      switch (correctionType) {
        case 'EDIT':
          result = await this.handleSimpleEdit(originalTransaction, correctionRequest);
          break;
        case 'REVERSE':
          result = await this.handleReversal(originalTransaction, correctionRequest);
          break;
        case 'CLARIFY':
          result = await this.handleClarification(originalTransaction, correctionRequest);
          break;
        case 'SPLIT':
          result = await this.handleSplit(originalTransaction, correctionRequest);
          break;
        default:
          return {
            success: false,
            error: 'Unknown correction type',
            confidence: 'LOW'
          };
      }

      // Record in audit trail
      await this.recordAuditTrail(result);

      return result;
    } catch (error) {
      console.error('Correction error:', error);
      return {
        success: false,
        error: error.message,
        confidence: 'LOW'
      };
    }
  }

  /**
   * Determine what type of correction is needed
   */
  static determineCorrectionType(request) {
    const lowerRequest = request.toLowerCase();

    if (lowerRequest.includes('cancel') || 
        lowerRequest.includes('undo') || 
        lowerRequest.includes('delete') ||
        lowerRequest.includes('remove')) {
      return 'REVERSE';
    }

    if (lowerRequest.includes('split') || 
        lowerRequest.includes('divide') ||
        lowerRequest.includes('separate')) {
      return 'SPLIT';
    }

    if (lowerRequest.includes('wrong') || 
        lowerRequest.includes('mistake') || 
        lowerRequest.includes('galat') ||
        lowerRequest.includes('change') ||
        lowerRequest.includes('edit')) {
      return 'EDIT';
    }

    return 'CLARIFY';
  }

  /**
   * SIMPLE EDIT: Wrong amount, party, or payment mode
   * - Reverse original journal fully
   * - Create new corrected journal
   * - Link both entries
   */
  static async handleSimpleEdit(originalTransaction, correctionRequest) {
    const correctionId = Date.now().toString();
    const reversalId = `REV_${correctionId}`;
    const newEntryId = `NEW_${correctionId}`;

    // Create reversal entry (opposite of original)
    const reversalEntry = {
      id: reversalId,
      type: 'reversal',
      originalId: originalTransaction.id,
      timestamp: new Date().toISOString(),
      description: `Reversal of: ${originalTransaction.description}`,
      amount: originalTransaction.amount,
      journalEntries: this.createReversalJournal(originalTransaction),
      status: 'reversed',
      correctionReason: correctionRequest,
    };

    // Parse correction request to extract new values
    const newValues = await this.parseCorrection(correctionRequest, originalTransaction);

    // Create new corrected entry
    const newEntry = {
      id: newEntryId,
      type: originalTransaction.type,
      timestamp: new Date().toISOString(),
      description: newValues.description || originalTransaction.description,
      amount: newValues.amount || originalTransaction.amount,
      party: newValues.party || originalTransaction.party,
      paymentMode: newValues.paymentMode || originalTransaction.paymentMode,
      journalEntries: this.createJournalEntries(newValues, originalTransaction),
      status: 'success',
      correctionOf: originalTransaction.id,
      correctionReason: correctionRequest,
    };

    // Mark original as corrected
    const updatedOriginal = {
      ...originalTransaction,
      status: 'corrected',
      correctedBy: newEntryId,
      correctionTimestamp: new Date().toISOString(),
    };

    // Save all entries
    await this.saveCorrection({
      correctionId,
      action: 'EDIT',
      originalTransaction: updatedOriginal,
      reversalEntry,
      newEntry,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      action: 'EDIT',
      original_transaction_id: originalTransaction.id,
      correction_reason: correctionRequest,
      journal_entries: [reversalEntry, newEntry],
      books_updated: this.getAffectedBooks(originalTransaction, newEntry),
      audit_linked: true,
      confidence: 'HIGH',
      message: 'Entry corrected successfully',
      data: {
        reversalEntry,
        newEntry,
      }
    };
  }

  /**
   * REVERSAL: Cancel/undo transaction
   * - Create exact opposite journal (Dr ↔ Cr)
   * - Mark original as reversed
   * - Do not erase original
   */
  static async handleReversal(originalTransaction, correctionRequest) {
    const reversalId = `REV_${Date.now()}`;

    // Create reversal entry (exact opposite)
    const reversalEntry = {
      id: reversalId,
      type: 'reversal',
      originalId: originalTransaction.id,
      timestamp: new Date().toISOString(),
      description: `Cancelled: ${originalTransaction.description}`,
      amount: originalTransaction.amount,
      journalEntries: this.createReversalJournal(originalTransaction),
      status: 'reversed',
      correctionReason: correctionRequest,
    };

    // Mark original as reversed
    const updatedOriginal = {
      ...originalTransaction,
      status: 'reversed',
      reversedBy: reversalId,
      reversalTimestamp: new Date().toISOString(),
    };

    // Save reversal
    await this.saveCorrection({
      correctionId: reversalId,
      action: 'REVERSE',
      originalTransaction: updatedOriginal,
      reversalEntry,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      action: 'REVERSE',
      original_transaction_id: originalTransaction.id,
      correction_reason: correctionRequest,
      journal_entries: [reversalEntry],
      books_updated: this.getAffectedBooks(originalTransaction),
      audit_linked: true,
      confidence: 'HIGH',
      message: 'Entry cancelled successfully',
      data: {
        reversalEntry,
      }
    };
  }

  /**
   * CLARIFICATION: Missing information
   * - Ask one clear question
   * - Wait for answer
   * - Post corrected entry after clarity
   */
  static async handleClarification(originalTransaction, correctionRequest) {
    const clarificationNeeded = this.identifyMissingInfo(originalTransaction);

    if (!clarificationNeeded) {
      // No clarification needed, treat as edit
      return await this.handleSimpleEdit(originalTransaction, correctionRequest);
    }

    return {
      success: false,
      action: 'CLARIFY',
      original_transaction_id: originalTransaction.id,
      correction_reason: correctionRequest,
      journal_entries: [],
      books_updated: [],
      audit_linked: false,
      confidence: 'LOW',
      message: 'I need one detail to fix this',
      clarificationQuestion: clarificationNeeded.question,
      clarificationField: clarificationNeeded.field,
    };
  }

  /**
   * SPLIT: One transaction should be multiple
   * - Reverse original
   * - Create multiple new journals
   * - Maintain linkage
   */
  static async handleSplit(originalTransaction, correctionRequest) {
    const correctionId = Date.now().toString();
    const reversalId = `REV_${correctionId}`;

    // Create reversal entry
    const reversalEntry = {
      id: reversalId,
      type: 'reversal',
      originalId: originalTransaction.id,
      timestamp: new Date().toISOString(),
      description: `Split reversal: ${originalTransaction.description}`,
      amount: originalTransaction.amount,
      journalEntries: this.createReversalJournal(originalTransaction),
      status: 'reversed',
      correctionReason: correctionRequest,
    };

    // Parse split details from request
    const splitTransactions = await this.parseSplitRequest(correctionRequest, originalTransaction);

    // Create new split entries
    const newEntries = splitTransactions.map((split, index) => ({
      id: `SPLIT_${correctionId}_${index}`,
      type: split.type,
      timestamp: new Date().toISOString(),
      description: split.description,
      amount: split.amount,
      party: split.party,
      paymentMode: split.paymentMode,
      journalEntries: this.createJournalEntries(split, originalTransaction),
      status: 'success',
      splitFrom: originalTransaction.id,
      splitIndex: index,
      correctionReason: correctionRequest,
    }));

    // Mark original as split
    const updatedOriginal = {
      ...originalTransaction,
      status: 'split',
      splitInto: newEntries.map(e => e.id),
      splitTimestamp: new Date().toISOString(),
    };

    // Save split correction
    await this.saveCorrection({
      correctionId,
      action: 'SPLIT',
      originalTransaction: updatedOriginal,
      reversalEntry,
      newEntries,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      action: 'SPLIT',
      original_transaction_id: originalTransaction.id,
      correction_reason: correctionRequest,
      journal_entries: [reversalEntry, ...newEntries],
      books_updated: this.getAffectedBooks(originalTransaction, ...newEntries),
      audit_linked: true,
      confidence: 'MEDIUM',
      message: 'Entry split successfully',
      data: {
        reversalEntry,
        newEntries,
      }
    };
  }

  /**
   * Create reversal journal entries (Dr ↔ Cr)
   */
  static createReversalJournal(transaction) {
    // This reverses the accounting entries
    // If original was: Dr Cash, Cr Sales
    // Reversal will be: Dr Sales, Cr Cash
    return transaction.journalEntries?.map(entry => ({
      ...entry,
      debit: entry.credit,
      credit: entry.debit,
    })) || [];
  }

  /**
   * Create journal entries for new transaction
   */
  static createJournalEntries(newValues, originalTransaction) {
    // Simplified journal creation
    // In production, this would use full accounting logic
    const entries = [];

    if (newValues.type === 'income' || newValues.type === 'sale') {
      entries.push({
        account: newValues.paymentMode === 'cash' ? 'Cash' : 'Bank',
        debit: newValues.amount,
        credit: 0,
      });
      entries.push({
        account: 'Sales',
        debit: 0,
        credit: newValues.amount,
      });
    } else if (newValues.type === 'expense' || newValues.type === 'purchase') {
      entries.push({
        account: newValues.party || 'Expense',
        debit: newValues.amount,
        credit: 0,
      });
      entries.push({
        account: newValues.paymentMode === 'cash' ? 'Cash' : 'Bank',
        debit: 0,
        credit: newValues.amount,
      });
    }

    return entries;
  }

  /**
   * Parse correction request to extract new values
   */
  static async parseCorrection(request, originalTransaction) {
    const lowerRequest = request.toLowerCase();
    const newValues = { ...originalTransaction };

    // Extract amount
    const amountMatch = request.match(/₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)/);
    if (amountMatch) {
      newValues.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    // Extract payment mode
    if (lowerRequest.includes('cash')) {
      newValues.paymentMode = 'cash';
    } else if (lowerRequest.includes('bank') || lowerRequest.includes('upi')) {
      newValues.paymentMode = 'bank';
    }

    // Extract party name
    const fromMatch = request.match(/from\s+([a-zA-Z\s]+?)(?:\s+₹|\s+\d|$)/i);
    const toMatch = request.match(/to\s+([a-zA-Z\s]+?)(?:\s+₹|\s+\d|$)/i);
    if (fromMatch) newValues.party = fromMatch[1].trim();
    if (toMatch) newValues.party = toMatch[1].trim();

    return newValues;
  }

  /**
   * Parse split request into multiple transactions
   */
  static async parseSplitRequest(request, originalTransaction) {
    // Simplified split parsing
    // In production, this would use NLP to understand split details
    return [
      {
        ...originalTransaction,
        amount: originalTransaction.amount / 2,
        description: `Split 1: ${originalTransaction.description}`,
      },
      {
        ...originalTransaction,
        amount: originalTransaction.amount / 2,
        description: `Split 2: ${originalTransaction.description}`,
      },
    ];
  }

  /**
   * Identify missing information
   */
  static identifyMissingInfo(transaction) {
    if (!transaction.paymentMode) {
      return {
        field: 'paymentMode',
        question: 'Was this payment made in cash or bank?',
      };
    }

    if (!transaction.amount) {
      return {
        field: 'amount',
        question: 'What was the amount?',
      };
    }

    return null;
  }

  /**
   * Get list of affected accounting books
   */
  static getAffectedBooks(...transactions) {
    const books = new Set();

    transactions.forEach(transaction => {
      if (transaction.paymentMode === 'cash') {
        books.add('Cash Book');
      } else if (transaction.paymentMode === 'bank') {
        books.add('Bank Book');
      }

      if (transaction.party) {
        books.add('Ledger');
      }

      books.add('Trial Balance');

      if (transaction.type === 'income' || transaction.type === 'sale') {
        books.add('Profit & Loss');
      } else if (transaction.type === 'expense' || transaction.type === 'purchase') {
        books.add('Profit & Loss');
      }
    });

    return Array.from(books);
  }

  /**
   * Save correction to storage
   */
  static async saveCorrection(correction) {
    try {
      const existingData = await AsyncStorage.getItem(this.CORRECTIONS_KEY);
      const corrections = existingData ? JSON.parse(existingData) : [];

      corrections.unshift(correction);

      await AsyncStorage.setItem(this.CORRECTIONS_KEY, JSON.stringify(corrections));

      return { success: true };
    } catch (error) {
      console.error('Save correction error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record in audit trail
   */
  static async recordAuditTrail(correctionResult) {
    try {
      const auditEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        action: correctionResult.action,
        originalTransactionId: correctionResult.original_transaction_id,
        correctionReason: correctionResult.correction_reason,
        confidence: correctionResult.confidence,
        booksUpdated: correctionResult.books_updated,
        success: correctionResult.success,
      };

      const existingData = await AsyncStorage.getItem(this.AUDIT_TRAIL_KEY);
      const auditTrail = existingData ? JSON.parse(existingData) : [];

      auditTrail.unshift(auditEntry);

      await AsyncStorage.setItem(this.AUDIT_TRAIL_KEY, JSON.stringify(auditTrail));

      return { success: true };
    } catch (error) {
      console.error('Audit trail error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get correction history
   */
  static async getCorrectionHistory() {
    try {
      const data = await AsyncStorage.getItem(this.CORRECTIONS_KEY);
      return {
        success: true,
        data: data ? JSON.parse(data) : [],
      };
    } catch (error) {
      console.error('Get correction history error:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get audit trail
   */
  static async getAuditTrail() {
    try {
      const data = await AsyncStorage.getItem(this.AUDIT_TRAIL_KEY);
      return {
        success: true,
        data: data ? JSON.parse(data) : [],
      };
    } catch (error) {
      console.error('Get audit trail error:', error);
      return { success: false, error: error.message, data: [] };
    }
  }
}
