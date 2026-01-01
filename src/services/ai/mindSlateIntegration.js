/**
 * MINDSLATE TO MINDSTACK INTEGRATION
 * 
 * Connects MindSlate conversational engine to MindStack accounting engine
 * Converts structured transaction objects to journal entries
 */

import mindSlateEngine, { INTENT_TYPES, PAYMENT_MODES } from './mindSlateEngine';
import JournalService from '../accounting/journalService';
import { calculateGSTBreakdown } from '../tax/gstCalculator';
import offlineSyncService from '../offline/syncService';

/**
 * MindSlate Integration Service
 */
class MindSlateIntegrationService {
  constructor() {
    this.journalService = new JournalService();
    this.conversationHistory = [];
  }

  /**
   * Process user input and create journal entry
   */
  async processInput(userInput, userId = null) {
    try {
      // Step 1: Parse input with MindSlate
      const parsed = await mindSlateEngine.process(userInput);
      
      // Store in conversation history
      this.conversationHistory.push({
        input: userInput,
        parsed: parsed,
        timestamp: new Date().toISOString()
      });
      
      // Step 2: Check if clarification needed
      if (parsed.status === 'CLARIFICATION_REQUIRED') {
        return {
          success: true,
          needsClarification: true,
          question: parsed.question,
          missingField: parsed.missing_field,
          partialData: parsed.partial_data,
          conversationId: this.conversationHistory.length - 1
        };
      }
      
      // Step 3: Validate parsed data
      const validation = this.validateParsedData(parsed);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          parsed: parsed
        };
      }
      
      // Step 4: Convert to journal entry
      const journalEntry = await this.convertToJournalEntry(parsed);
      
      // Step 5: Save journal entry
      const saveResult = await this.journalService.saveJournal(journalEntry);
      
      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error,
          parsed: parsed
        };
      }
      
      // Step 6: Add to sync queue if offline
      await offlineSyncService.addToQueue({
        operationType: 'CREATE',
        entityType: 'journal',
        entityId: saveResult.journalId,
        data: journalEntry
      });
      
      // Step 7: Return success response
      return {
        success: true,
        journalId: saveResult.journalId,
        voucherNo: saveResult.voucherNo,
        parsed: parsed,
        journal: journalEntry,
        message: this.generateSuccessMessage(parsed)
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        userInput: userInput
      };
    }
  }

  /**
   * Process clarification response
   */
  async processClarification(conversationId, clarificationResponse) {
    if (conversationId >= this.conversationHistory.length) {
      throw new Error('Invalid conversation ID');
    }
    
    const conversation = this.conversationHistory[conversationId];
    const originalInput = conversation.input;
    const missingField = conversation.parsed.missing_field;
    
    // Combine original input with clarification
    const combinedInput = `${originalInput} ${clarificationResponse}`;
    
    // Re-process
    return this.processInput(combinedInput);
  }

  /**
   * Validate parsed data
   */
  validateParsedData(parsed) {
    if (parsed.status === 'ERROR') {
      return { valid: false, error: parsed.error };
    }
    
    if (!parsed.intent_type) {
      return { valid: false, error: 'Could not determine transaction type' };
    }
    
    if (!parsed.amount || parsed.amount <= 0) {
      return { valid: false, error: 'Invalid amount' };
    }
    
    if (!parsed.transaction_date) {
      return { valid: false, error: 'Invalid date' };
    }
    
    return { valid: true };
  }

  /**
   * Convert parsed data to journal entry
   */
  async convertToJournalEntry(parsed) {
    const journal = {
      voucherType: this.getVoucherType(parsed.intent_type),
      date: new Date(parsed.transaction_date),
      narration: this.generateNarration(parsed),
      originalText: parsed.original_text,
      language: parsed.detected_language,
      paymentMode: parsed.payment_mode,
      party: parsed.party_name,
      gstApplicable: parsed.gst_applicable,
      lines: []
    };
    
    // Build journal lines based on intent
    switch (parsed.intent_type) {
      case INTENT_TYPES.EXPENSE_PAYMENT:
        this.buildExpensePaymentLines(journal, parsed);
        break;
        
      case INTENT_TYPES.CASH_SALE:
      case INTENT_TYPES.CREDIT_SALE:
        this.buildSalesLines(journal, parsed);
        break;
        
      case INTENT_TYPES.CASH_PURCHASE:
      case INTENT_TYPES.CREDIT_PURCHASE:
        this.buildPurchaseLines(journal, parsed);
        break;
        
      case INTENT_TYPES.BANK_TRANSFER:
        this.buildBankTransferLines(journal, parsed);
        break;
        
      default:
        throw new Error(`Unsupported intent type: ${parsed.intent_type}`);
    }
    
    return journal;
  }

  /**
   * Build expense payment journal lines
   */
  buildExpensePaymentLines(journal, parsed) {
    const amount = parsed.amount;
    
    // Debit: Expense account
    journal.lines.push({
      accountName: this.getExpenseAccountName(parsed.category),
      accountType: 'NOMINAL',
      debit: amount,
      credit: 0
    });
    
    // Credit: Cash or Bank
    if (parsed.payment_mode === PAYMENT_MODES.CASH) {
      journal.lines.push({
        accountName: 'Cash',
        accountType: 'REAL',
        debit: 0,
        credit: amount
      });
    } else if (parsed.payment_mode === PAYMENT_MODES.BANK || 
               parsed.payment_mode === PAYMENT_MODES.UPI ||
               parsed.payment_mode === PAYMENT_MODES.ONLINE) {
      journal.lines.push({
        accountName: 'Bank',
        accountType: 'REAL',
        debit: 0,
        credit: amount
      });
    }
  }

  /**
   * Build sales journal lines
   */
  buildSalesLines(journal, parsed) {
    let amount = parsed.amount;
    let taxableValue = amount;
    let gstAmount = 0;
    
    // Calculate GST if applicable
    if (parsed.gst_applicable && parsed.gst_rate) {
      // Amount includes GST, extract taxable value
      taxableValue = amount / (1 + parsed.gst_rate / 100);
      gstAmount = amount - taxableValue;
      
      // Get GST breakdown (CGST+SGST or IGST)
      const gstBreakdown = calculateGSTBreakdown(
        taxableValue,
        parsed.gst_rate,
        'INTRA_STATE' // Default, should be determined from party state
      );
      
      // Debit: Cash/Bank/Debtor (full amount including GST)
      if (parsed.intent_type === INTENT_TYPES.CASH_SALE) {
        journal.lines.push({
          accountName: parsed.payment_mode === PAYMENT_MODES.CASH ? 'Cash' : 'Bank',
          accountType: 'REAL',
          debit: amount,
          credit: 0
        });
      } else {
        journal.lines.push({
          accountName: parsed.party_name || 'Sundry Debtors',
          accountType: 'PERSONAL',
          debit: amount,
          credit: 0
        });
      }
      
      // Credit: Sales (taxable value)
      journal.lines.push({
        accountName: 'Sales',
        accountType: 'NOMINAL',
        debit: 0,
        credit: taxableValue
      });
      
      // Credit: GST Output
      if (gstBreakdown.cgst > 0) {
        journal.lines.push({
          accountName: 'CGST Output',
          accountType: 'NOMINAL',
          debit: 0,
          credit: gstBreakdown.cgst
        });
        journal.lines.push({
          accountName: 'SGST Output',
          accountType: 'NOMINAL',
          debit: 0,
          credit: gstBreakdown.sgst
        });
      } else {
        journal.lines.push({
          accountName: 'IGST Output',
          accountType: 'NOMINAL',
          debit: 0,
          credit: gstBreakdown.igst
        });
      }
      
    } else {
      // No GST
      // Debit: Cash/Bank/Debtor
      if (parsed.intent_type === INTENT_TYPES.CASH_SALE) {
        journal.lines.push({
          accountName: parsed.payment_mode === PAYMENT_MODES.CASH ? 'Cash' : 'Bank',
          accountType: 'REAL',
          debit: amount,
          credit: 0
        });
      } else {
        journal.lines.push({
          accountName: parsed.party_name || 'Sundry Debtors',
          accountType: 'PERSONAL',
          debit: amount,
          credit: 0
        });
      }
      
      // Credit: Sales
      journal.lines.push({
        accountName: 'Sales',
        accountType: 'NOMINAL',
        debit: 0,
        credit: amount
      });
    }
  }

  /**
   * Build purchase journal lines
   */
  buildPurchaseLines(journal, parsed) {
    let amount = parsed.amount;
    let taxableValue = amount;
    let gstAmount = 0;
    
    // Calculate GST if applicable
    if (parsed.gst_applicable && parsed.gst_rate) {
      taxableValue = amount / (1 + parsed.gst_rate / 100);
      gstAmount = amount - taxableValue;
      
      const gstBreakdown = calculateGSTBreakdown(
        taxableValue,
        parsed.gst_rate,
        'INTRA_STATE'
      );
      
      // Debit: Purchase (taxable value)
      journal.lines.push({
        accountName: 'Purchase',
        accountType: 'NOMINAL',
        debit: taxableValue,
        credit: 0
      });
      
      // Debit: GST Input
      if (gstBreakdown.cgst > 0) {
        journal.lines.push({
          accountName: 'CGST Input',
          accountType: 'NOMINAL',
          debit: gstBreakdown.cgst,
          credit: 0
        });
        journal.lines.push({
          accountName: 'SGST Input',
          accountType: 'NOMINAL',
          debit: gstBreakdown.sgst,
          credit: 0
        });
      } else {
        journal.lines.push({
          accountName: 'IGST Input',
          accountType: 'NOMINAL',
          debit: gstBreakdown.igst,
          credit: 0
        });
      }
      
      // Credit: Cash/Bank/Creditor (full amount)
      if (parsed.intent_type === INTENT_TYPES.CASH_PURCHASE) {
        journal.lines.push({
          accountName: parsed.payment_mode === PAYMENT_MODES.CASH ? 'Cash' : 'Bank',
          accountType: 'REAL',
          debit: 0,
          credit: amount
        });
      } else {
        journal.lines.push({
          accountName: parsed.party_name || 'Sundry Creditors',
          accountType: 'PERSONAL',
          debit: 0,
          credit: amount
        });
      }
      
    } else {
      // No GST
      // Debit: Purchase
      journal.lines.push({
        accountName: 'Purchase',
        accountType: 'NOMINAL',
        debit: amount,
        credit: 0
      });
      
      // Credit: Cash/Bank/Creditor
      if (parsed.intent_type === INTENT_TYPES.CASH_PURCHASE) {
        journal.lines.push({
          accountName: parsed.payment_mode === PAYMENT_MODES.CASH ? 'Cash' : 'Bank',
          accountType: 'REAL',
          debit: 0,
          credit: amount
        });
      } else {
        journal.lines.push({
          accountName: parsed.party_name || 'Sundry Creditors',
          accountType: 'PERSONAL',
          debit: 0,
          credit: amount
        });
      }
    }
  }

  /**
   * Build bank transfer journal lines
   */
  buildBankTransferLines(journal, parsed) {
    const amount = parsed.amount;
    
    // Debit: Bank
    journal.lines.push({
      accountName: 'Bank',
      accountType: 'REAL',
      debit: amount,
      credit: 0
    });
    
    // Credit: Cash
    journal.lines.push({
      accountName: 'Cash',
      accountType: 'REAL',
      debit: 0,
      credit: amount
    });
  }

  /**
   * Get voucher type from intent
   */
  getVoucherType(intentType) {
    const mapping = {
      [INTENT_TYPES.EXPENSE_PAYMENT]: 'PAYMENT',
      [INTENT_TYPES.CASH_SALE]: 'SALES',
      [INTENT_TYPES.CREDIT_SALE]: 'SALES',
      [INTENT_TYPES.CASH_PURCHASE]: 'PURCHASE',
      [INTENT_TYPES.CREDIT_PURCHASE]: 'PURCHASE',
      [INTENT_TYPES.BANK_TRANSFER]: 'CONTRA',
      [INTENT_TYPES.GST_PAYMENT]: 'PAYMENT'
    };
    
    return mapping[intentType] || 'JOURNAL';
  }

  /**
   * Get expense account name from category
   */
  getExpenseAccountName(category) {
    const mapping = {
      'RENT': 'Rent Expense',
      'SALARY': 'Salary Expense',
      'ELECTRICITY': 'Electricity Expense',
      'TRANSPORT': 'Transport Expense',
      'TELEPHONE': 'Telephone Expense',
      'INTERNET': 'Internet Expense',
      'OFFICE_SUPPLIES': 'Office Supplies Expense',
      'MAINTENANCE': 'Maintenance Expense',
      'INSURANCE': 'Insurance Expense',
      'PROFESSIONAL_FEES': 'Professional Fees',
      'ADVERTISING': 'Advertising Expense',
      'MISCELLANEOUS': 'Miscellaneous Expense'
    };
    
    return mapping[category] || 'General Expense';
  }

  /**
   * Generate narration from parsed data
   */
  generateNarration(parsed) {
    const parts = [];
    
    if (parsed.category) {
      parts.push(this.getExpenseAccountName(parsed.category));
    }
    
    if (parsed.party_name) {
      parts.push(`to/from ${parsed.party_name}`);
    }
    
    if (parsed.payment_mode) {
      parts.push(`by ${parsed.payment_mode.toLowerCase()}`);
    }
    
    if (parsed.gst_applicable && parsed.gst_rate) {
      parts.push(`with ${parsed.gst_rate}% GST`);
    }
    
    return parts.join(' ') || 'Transaction recorded';
  }

  /**
   * Generate success message
   */
  generateSuccessMessage(parsed) {
    const amount = `₹${parsed.amount.toLocaleString('en-IN')}`;
    const category = parsed.category ? this.getExpenseAccountName(parsed.category) : 'Transaction';
    const mode = parsed.payment_mode ? `by ${parsed.payment_mode.toLowerCase()}` : '';
    
    return `${category} of ${amount} ${mode} recorded successfully`;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(limit = 10) {
    return this.conversationHistory.slice(-limit);
  }

  /**
   * Clear conversation history
   */
  clearConversationHistory() {
    this.conversationHistory = [];
  }
}

// Create singleton instance
const mindSlateIntegration = new MindSlateIntegrationService();

export default mindSlateIntegration;
export { MindSlateIntegrationService };
