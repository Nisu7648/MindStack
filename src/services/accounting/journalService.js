/**
 * JOURNAL SYSTEM - FOUNDATION OF MINDSTACK ACCOUNTING
 * 
 * Philosophy: Journal = Atomic truth of business activity
 * Everything else (ledger, GST, P&L, balance sheet) is DERIVED, never entered manually
 * 
 * Rules:
 * ❗ No ledger without journal
 * ❗ No GST without journal
 * ❗ No report without journal
 */

import { getDatabase } from '../database/schema';

/**
 * GOLDEN RULES OF ACCOUNTING (Indian System)
 * 
 * 1. PERSONAL ACCOUNTS (People, Companies, Banks)
 *    - Debit the Receiver
 *    - Credit the Giver
 * 
 * 2. REAL ACCOUNTS (Assets - Cash, Furniture, Stock)
 *    - Debit what comes in
 *    - Credit what goes out
 * 
 * 3. NOMINAL ACCOUNTS (Expenses, Income, Losses, Gains)
 *    - Debit all Expenses and Losses
 *    - Credit all Incomes and Gains
 */

/**
 * VOUCHER TYPES (As per Indian Accounting Standards)
 */
export const VOUCHER_TYPES = {
  PAYMENT: 'PAYMENT',           // Cash/Bank payment (F5 in Tally)
  RECEIPT: 'RECEIPT',           // Cash/Bank receipt (F6 in Tally)
  JOURNAL: 'JOURNAL',           // Non-cash adjustments (F7 in Tally)
  CONTRA: 'CONTRA',             // Cash-Bank transfer (F4 in Tally)
  SALES: 'SALES',               // Sales invoice (F8 in Tally)
  PURCHASE: 'PURCHASE',         // Purchase invoice (F9 in Tally)
  DEBIT_NOTE: 'DEBIT_NOTE',     // Purchase returns (Ctrl+F9)
  CREDIT_NOTE: 'CREDIT_NOTE',   // Sales returns (Ctrl+F8)
  MEMO: 'MEMO'                  // Memorandum (F10 in Tally)
};

/**
 * ACCOUNT TYPES (For Golden Rules Application)
 */
export const ACCOUNT_TYPES = {
  PERSONAL: 'PERSONAL',   // Debtors, Creditors, Banks, People
  REAL: 'REAL',           // Assets - Cash, Stock, Furniture
  NOMINAL: 'NOMINAL'      // Income, Expenses, Losses, Gains
};

/**
 * PAYMENT MODES
 */
export const PAYMENT_MODES = {
  CASH: 'CASH',
  BANK: 'BANK',
  CREDIT: 'CREDIT',
  UPI: 'UPI',
  CARD: 'CARD',
  CHEQUE: 'CHEQUE',
  NEFT: 'NEFT',
  RTGS: 'RTGS',
  IMPS: 'IMPS'
};

/**
 * JOURNAL ENTRY STATUS
 */
export const JOURNAL_STATUS = {
  DRAFT: 'DRAFT',           // Not yet confirmed
  PENDING: 'PENDING',       // Awaiting user confirmation
  POSTED: 'POSTED',         // Confirmed and posted to ledger
  VOID: 'VOID',             // Cancelled
  LOCKED: 'LOCKED'          // Financial year closed
};

/**
 * LANGUAGE SUPPORT
 */
export const SUPPORTED_LANGUAGES = {
  EN: 'English',
  HI: 'Hindi',
  GU: 'Gujarati',
  MR: 'Marathi',
  TA: 'Tamil',
  TE: 'Telugu',
  KN: 'Kannada',
  ML: 'Malayalam',
  BN: 'Bengali',
  PA: 'Punjabi'
};

/**
 * JOURNAL DATA MODEL
 */
class JournalEntry {
  constructor() {
    this.id = null;
    this.voucherNo = null;
    this.voucherType = null;
    this.date = new Date();
    this.financialYear = this.getFinancialYear();
    this.narration = '';
    this.originalText = '';
    this.language = 'EN';
    this.confidenceScore = 0;
    this.entrySource = 'TYPED'; // TYPED, VOICE, IMPORT
    this.paymentMode = null;
    this.party = null;
    this.gstApplicable = false;
    this.status = JOURNAL_STATUS.DRAFT;
    this.lines = []; // Array of JournalLine
    this.metadata = {};
    this.createdBy = null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  getFinancialYear() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }

  addLine(accountName, accountType, debit = 0, credit = 0, metadata = {}) {
    this.lines.push({
      accountName,
      accountType,
      debit: parseFloat(debit) || 0,
      credit: parseFloat(credit) || 0,
      metadata
    });
  }

  validate() {
    // Rule 1: Minimum 2 lines
    if (this.lines.length < 2) {
      return { valid: false, error: 'Journal entry must have at least 2 lines' };
    }

    // Rule 2: Total Debit = Total Credit
    const totalDebit = this.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = this.lines.reduce((sum, line) => sum + line.credit, 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return { 
        valid: false, 
        error: `Journal not balanced. Debit: ₹${totalDebit.toFixed(2)}, Credit: ₹${totalCredit.toFixed(2)}` 
      };
    }

    // Rule 3: Each line must have either debit or credit (not both)
    for (const line of this.lines) {
      if (line.debit > 0 && line.credit > 0) {
        return { 
          valid: false, 
          error: `Account "${line.accountName}" cannot have both debit and credit` 
        };
      }
      if (line.debit === 0 && line.credit === 0) {
        return { 
          valid: false, 
          error: `Account "${line.accountName}" must have either debit or credit amount` 
        };
      }
    }

    return { valid: true };
  }

  getTotalAmount() {
    return this.lines.reduce((sum, line) => sum + line.debit, 0);
  }
}

/**
 * NATURAL LANGUAGE PARSER
 * Converts user input to journal entries
 */
class JournalParser {
  constructor() {
    // Keywords for different languages
    this.keywords = {
      // Actions
      paid: ['paid', 'pay', 'given', 'આપ્યું', 'दिया', 'दिले', 'கொடுத்தேன்', 'ఇచ్చాను', 'ಕೊಟ್ಟೆ', 'നൽകി', 'দিয়েছি', 'ਦਿੱਤਾ'],
      received: ['received', 'got', 'collect', 'મળ્યું', 'मिला', 'मिळाले', 'பெற்றேன்', 'అందుకున్నాను', 'ಪಡೆದುಕೊಂಡೆ', 'കിട്ടി', 'পেয়েছি', 'ਮਿਲਿਆ'],
      sold: ['sold', 'sale', 'વેચ્યું', 'बेचा', 'विकले', 'விற்றேன்', 'అమ్మాను', 'ಮಾರಾಟ', 'വിറ്റു', 'বিক্রি', 'ਵੇਚਿਆ'],
      bought: ['bought', 'purchase', 'ખરીદ્યું', 'खरीदा', 'खरेदी', 'வாங்கினேன்', 'కొన్నాను', 'ಖರೀದಿಸಿದೆ', 'വാങ്ങി', 'কিনেছি', 'ਖਰੀਦਿਆ'],
      
      // Expenses
      rent: ['rent', 'ભાડું', 'किराया', 'भाडे', 'வாடகை', 'అద్దె', 'ಬಾಡಿಗೆ', 'വാടക', 'ভাড়া', 'ਕਿਰਾਇਆ'],
      salary: ['salary', 'wages', 'પગાર', 'वेतन', 'पगार', 'சம்பளம்', 'జీతం', 'ಸಂಬಳ', 'ശമ്പളം', 'বেতন', 'ਤਨਖਾਹ'],
      electricity: ['electricity', 'power', 'વીજળી', 'बिजली', 'वीज', 'மின்சாரம்', 'విద్యుత్', 'ವಿದ್ಯುತ್', 'വൈദ്യുതി', 'বিদ্যুৎ', 'ਬਿਜਲੀ'],
      transport: ['transport', 'travel', 'ટ્રાન્સપોર્ટ', 'परिवहन', 'वाहतूक', 'போக்குவரத்து', 'రవాణా', 'ಸಾರಿಗೆ', 'ഗതാഗതം', 'পরিবহন', 'ਆਵਾਜਾਈ'],
      
      // Payment modes
      cash: ['cash', 'રોકડ', 'नकद', 'रोख', 'பணம்', 'నగదు', 'ನಗದು', 'പണം', 'নগদ', 'ਨਕਦ'],
      bank: ['bank', 'બેંક', 'बैंक', 'बँक', 'வங்கி', 'బ్యాంకు', 'ಬ್ಯಾಂಕ್', 'ബാങ്ക്', 'ব্যাংক', 'ਬੈਂਕ'],
      credit: ['credit', 'ઉધાર', 'उधार', 'उसने', 'கடன்', 'అప్పు', 'ಸಾಲ', 'കടം', 'ঋণ', 'ਉਧਾਰ']
    };
  }

  /**
   * Parse natural language input to journal entry
   */
  parse(input, language = 'EN') {
    const journal = new JournalEntry();
    journal.originalText = input;
    journal.language = language;
    
    const normalized = input.toLowerCase();
    
    // Detect action type
    const action = this.detectAction(normalized);
    
    // Extract amount
    const amount = this.extractAmount(normalized);
    
    // Extract account/expense type
    const accountInfo = this.detectAccount(normalized);
    
    // Extract payment mode
    const paymentMode = this.detectPaymentMode(normalized);
    
    // Extract party name (if any)
    const party = this.extractParty(normalized);
    
    // Build journal entry based on action
    switch (action) {
      case 'PAID':
        this.buildPaymentEntry(journal, accountInfo, amount, paymentMode, party);
        break;
      case 'RECEIVED':
        this.buildReceiptEntry(journal, accountInfo, amount, paymentMode, party);
        break;
      case 'SOLD':
        this.buildSalesEntry(journal, accountInfo, amount, paymentMode, party);
        break;
      case 'BOUGHT':
        this.buildPurchaseEntry(journal, accountInfo, amount, paymentMode, party);
        break;
      default:
        journal.confidenceScore = 0.3;
        journal.metadata.needsClarification = true;
        journal.metadata.question = 'What type of transaction is this?';
    }
    
    return journal;
  }

  detectAction(text) {
    if (this.matchKeywords(text, this.keywords.paid)) return 'PAID';
    if (this.matchKeywords(text, this.keywords.received)) return 'RECEIVED';
    if (this.matchKeywords(text, this.keywords.sold)) return 'SOLD';
    if (this.matchKeywords(text, this.keywords.bought)) return 'BOUGHT';
    return 'UNKNOWN';
  }

  extractAmount(text) {
    // Match patterns like: 10000, 10,000, 10k, 10 thousand, ₹10000
    const patterns = [
      /₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:k|thousand|lakh|crore)?/i,
      /(\d+(?:,\d+)*(?:\.\d+)?)/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let amount = match[1].replace(/,/g, '');
        
        // Handle k, thousand, lakh, crore
        if (text.includes('k')) amount = parseFloat(amount) * 1000;
        else if (text.includes('thousand')) amount = parseFloat(amount) * 1000;
        else if (text.includes('lakh')) amount = parseFloat(amount) * 100000;
        else if (text.includes('crore')) amount = parseFloat(amount) * 10000000;
        
        return parseFloat(amount);
      }
    }
    return 0;
  }

  detectAccount(text) {
    // Check for expense types
    if (this.matchKeywords(text, this.keywords.rent)) {
      return { name: 'Rent Expense', type: ACCOUNT_TYPES.NOMINAL, category: 'EXPENSE' };
    }
    if (this.matchKeywords(text, this.keywords.salary)) {
      return { name: 'Salary Expense', type: ACCOUNT_TYPES.NOMINAL, category: 'EXPENSE' };
    }
    if (this.matchKeywords(text, this.keywords.electricity)) {
      return { name: 'Electricity Expense', type: ACCOUNT_TYPES.NOMINAL, category: 'EXPENSE' };
    }
    if (this.matchKeywords(text, this.keywords.transport)) {
      return { name: 'Transport Expense', type: ACCOUNT_TYPES.NOMINAL, category: 'EXPENSE' };
    }
    
    // Default
    return { name: 'General Expense', type: ACCOUNT_TYPES.NOMINAL, category: 'EXPENSE' };
  }

  detectPaymentMode(text) {
    if (this.matchKeywords(text, this.keywords.cash)) return PAYMENT_MODES.CASH;
    if (this.matchKeywords(text, this.keywords.bank)) return PAYMENT_MODES.BANK;
    if (this.matchKeywords(text, this.keywords.credit)) return PAYMENT_MODES.CREDIT;
    if (text.includes('upi')) return PAYMENT_MODES.UPI;
    if (text.includes('card')) return PAYMENT_MODES.CARD;
    if (text.includes('cheque') || text.includes('check')) return PAYMENT_MODES.CHEQUE;
    return null;
  }

  extractParty(text) {
    // Simple party extraction - can be enhanced with NER
    const toPattern = /(?:to|from)\s+([A-Za-z\s]+?)(?:\s|$|,)/i;
    const match = text.match(toPattern);
    return match ? match[1].trim() : null;
  }

  matchKeywords(text, keywords) {
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  /**
   * Build payment entry (Expense payment)
   * Golden Rule: Debit Expense (Nominal), Credit Cash/Bank (Real)
   */
  buildPaymentEntry(journal, accountInfo, amount, paymentMode, party) {
    journal.voucherType = VOUCHER_TYPES.PAYMENT;
    journal.paymentMode = paymentMode;
    journal.party = party;
    
    // Debit: Expense account
    journal.addLine(accountInfo.name, accountInfo.type, amount, 0);
    
    // Credit: Cash or Bank
    if (paymentMode === PAYMENT_MODES.CASH) {
      journal.addLine('Cash', ACCOUNT_TYPES.REAL, 0, amount);
      journal.narration = `${accountInfo.name} paid in cash`;
    } else if (paymentMode === PAYMENT_MODES.BANK) {
      journal.addLine('Bank', ACCOUNT_TYPES.REAL, 0, amount);
      journal.narration = `${accountInfo.name} paid by bank`;
    } else if (paymentMode === PAYMENT_MODES.CREDIT) {
      journal.addLine(party || 'Creditors', ACCOUNT_TYPES.PERSONAL, 0, amount);
      journal.narration = `${accountInfo.name} on credit${party ? ' to ' + party : ''}`;
    } else {
      // Payment mode unclear - need to ask
      journal.metadata.needsClarification = true;
      journal.metadata.question = 'Was this paid in cash or bank?';
      journal.confidenceScore = 0.7;
      return;
    }
    
    journal.confidenceScore = 0.95;
    journal.status = JOURNAL_STATUS.PENDING;
  }

  /**
   * Build receipt entry (Income received)
   * Golden Rule: Debit Cash/Bank (Real), Credit Income (Nominal)
   */
  buildReceiptEntry(journal, accountInfo, amount, paymentMode, party) {
    journal.voucherType = VOUCHER_TYPES.RECEIPT;
    journal.paymentMode = paymentMode;
    journal.party = party;
    
    // Debit: Cash or Bank
    if (paymentMode === PAYMENT_MODES.CASH) {
      journal.addLine('Cash', ACCOUNT_TYPES.REAL, amount, 0);
    } else if (paymentMode === PAYMENT_MODES.BANK) {
      journal.addLine('Bank', ACCOUNT_TYPES.REAL, amount, 0);
    } else {
      journal.metadata.needsClarification = true;
      journal.metadata.question = 'Was this received in cash or bank?';
      journal.confidenceScore = 0.7;
      return;
    }
    
    // Credit: Income account
    journal.addLine('Other Income', ACCOUNT_TYPES.NOMINAL, 0, amount);
    journal.narration = `Income received${party ? ' from ' + party : ''}`;
    
    journal.confidenceScore = 0.9;
    journal.status = JOURNAL_STATUS.PENDING;
  }

  /**
   * Build sales entry
   * Golden Rule: Debit Cash/Debtor (Real/Personal), Credit Sales (Nominal)
   */
  buildSalesEntry(journal, accountInfo, amount, paymentMode, party) {
    journal.voucherType = VOUCHER_TYPES.SALES;
    journal.paymentMode = paymentMode;
    journal.party = party;
    
    // Debit: Cash, Bank, or Debtor
    if (paymentMode === PAYMENT_MODES.CASH) {
      journal.addLine('Cash', ACCOUNT_TYPES.REAL, amount, 0);
      journal.narration = `Cash sales`;
    } else if (paymentMode === PAYMENT_MODES.BANK) {
      journal.addLine('Bank', ACCOUNT_TYPES.REAL, amount, 0);
      journal.narration = `Bank sales`;
    } else if (paymentMode === PAYMENT_MODES.CREDIT) {
      if (!party) {
        journal.metadata.needsClarification = true;
        journal.metadata.question = 'Who is the customer for this credit sale?';
        journal.confidenceScore = 0.6;
        return;
      }
      journal.addLine(party, ACCOUNT_TYPES.PERSONAL, amount, 0);
      journal.narration = `Credit sales to ${party}`;
    } else {
      journal.metadata.needsClarification = true;
      journal.metadata.question = 'Was this a cash sale or credit sale?';
      journal.confidenceScore = 0.7;
      return;
    }
    
    // Credit: Sales
    journal.addLine('Sales', ACCOUNT_TYPES.NOMINAL, 0, amount);
    
    // Check if GST applicable
    journal.metadata.needsGSTClarification = true;
    journal.metadata.gstQuestion = 'Is GST applicable on this sale?';
    
    journal.confidenceScore = 0.85;
    journal.status = JOURNAL_STATUS.PENDING;
  }

  /**
   * Build purchase entry
   * Golden Rule: Debit Purchase (Nominal), Credit Cash/Creditor (Real/Personal)
   */
  buildPurchaseEntry(journal, accountInfo, amount, paymentMode, party) {
    journal.voucherType = VOUCHER_TYPES.PURCHASE;
    journal.paymentMode = paymentMode;
    journal.party = party;
    
    // Debit: Purchase
    journal.addLine('Purchase', ACCOUNT_TYPES.NOMINAL, amount, 0);
    
    // Credit: Cash, Bank, or Creditor
    if (paymentMode === PAYMENT_MODES.CASH) {
      journal.addLine('Cash', ACCOUNT_TYPES.REAL, 0, amount);
      journal.narration = `Cash purchase`;
    } else if (paymentMode === PAYMENT_MODES.BANK) {
      journal.addLine('Bank', ACCOUNT_TYPES.REAL, 0, amount);
      journal.narration = `Bank purchase`;
    } else if (paymentMode === PAYMENT_MODES.CREDIT) {
      if (!party) {
        journal.metadata.needsClarification = true;
        journal.metadata.question = 'Who is the supplier for this credit purchase?';
        journal.confidenceScore = 0.6;
        return;
      }
      journal.addLine(party, ACCOUNT_TYPES.PERSONAL, 0, amount);
      journal.narration = `Credit purchase from ${party}`;
    } else {
      journal.metadata.needsClarification = true;
      journal.metadata.question = 'Was this paid in cash or bank, or on credit?';
      journal.confidenceScore = 0.7;
      return;
    }
    
    // Check if GST applicable
    journal.metadata.needsGSTClarification = true;
    journal.metadata.gstQuestion = 'Is GST applicable on this purchase?';
    
    journal.confidenceScore = 0.85;
    journal.status = JOURNAL_STATUS.PENDING;
  }
}

/**
 * JOURNAL SERVICE
 * Main service for journal operations
 */
class JournalService {
  constructor() {
    this.parser = new JournalParser();
  }

  /**
   * Create journal from natural language
   */
  async createFromNaturalLanguage(input, language = 'EN', source = 'TYPED') {
    try {
      // Parse input
      const journal = this.parser.parse(input, language);
      journal.entrySource = source;
      
      // Validate
      const validation = journal.validate();
      if (!validation.valid && !journal.metadata.needsClarification) {
        throw new Error(validation.error);
      }
      
      return {
        success: true,
        journal,
        needsClarification: journal.metadata.needsClarification || false,
        question: journal.metadata.question || null,
        needsGSTClarification: journal.metadata.needsGSTClarification || false,
        gstQuestion: journal.metadata.gstQuestion || null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save journal to database
   */
  async saveJournal(journal) {
    const db = await getDatabase();
    
    try {
      await db.transaction(async (tx) => {
        // Generate voucher number
        const voucherNo = await this.generateVoucherNumber(tx, journal.voucherType, journal.financialYear);
        journal.voucherNo = voucherNo;
        
        // Insert transaction header
        const txnResult = await tx.executeSql(
          `INSERT INTO transactions (txn_date, txn_type, reference, description, total_amount, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            journal.date.toISOString().split('T')[0],
            journal.voucherType,
            journal.voucherNo,
            journal.narration,
            journal.getTotalAmount(),
            journal.status,
            new Date().toISOString()
          ]
        );
        
        const transactionId = txnResult.insertId;
        journal.id = transactionId;
        
        // Insert journal lines
        for (const line of journal.lines) {
          // Get or create account
          const accountId = await this.getOrCreateAccount(tx, line.accountName, line.accountType);
          
          // Insert ledger entry
          await tx.executeSql(
            `INSERT INTO ledger (transaction_id, date, account_id, description, debit, credit, reference_type, reference_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              transactionId,
              journal.date.toISOString().split('T')[0],
              accountId,
              journal.narration,
              line.debit,
              line.credit,
              journal.voucherType,
              transactionId
            ]
          );
          
          // Update account balance
          await this.updateAccountBalance(tx, accountId, line.debit, line.credit);
        }
        
        // Store original text and metadata
        await tx.executeSql(
          `INSERT INTO journal_metadata (transaction_id, original_text, language, confidence_score, entry_source, payment_mode, party, gst_applicable, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transactionId,
            journal.originalText,
            journal.language,
            journal.confidenceScore,
            journal.entrySource,
            journal.paymentMode,
            journal.party,
            journal.gstApplicable ? 1 : 0,
            JSON.stringify(journal.metadata)
          ]
        );
      });
      
      return {
        success: true,
        journalId: journal.id,
        voucherNo: journal.voucherNo,
        message: 'Journal entry saved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate voucher number
   */
  async generateVoucherNumber(tx, voucherType, financialYear) {
    const prefix = this.getVoucherPrefix(voucherType);
    
    // Get last voucher number for this type and FY
    const result = await tx.executeSql(
      `SELECT MAX(CAST(SUBSTR(reference, LENGTH(?) + 1) AS INTEGER)) as last_no
       FROM transactions
       WHERE txn_type = ? AND reference LIKE ?`,
      [prefix, voucherType, `${prefix}%`]
    );
    
    const lastNo = result.rows.item(0).last_no || 0;
    const newNo = lastNo + 1;
    
    return `${prefix}${String(newNo).padStart(6, '0')}`;
  }

  getVoucherPrefix(voucherType) {
    const prefixes = {
      [VOUCHER_TYPES.PAYMENT]: 'PAY/',
      [VOUCHER_TYPES.RECEIPT]: 'REC/',
      [VOUCHER_TYPES.JOURNAL]: 'JV/',
      [VOUCHER_TYPES.CONTRA]: 'CON/',
      [VOUCHER_TYPES.SALES]: 'SAL/',
      [VOUCHER_TYPES.PURCHASE]: 'PUR/',
      [VOUCHER_TYPES.DEBIT_NOTE]: 'DN/',
      [VOUCHER_TYPES.CREDIT_NOTE]: 'CN/',
      [VOUCHER_TYPES.MEMO]: 'MEM/'
    };
    return prefixes[voucherType] || 'JV/';
  }

  /**
   * Get or create account
   */
  async getOrCreateAccount(tx, accountName, accountType) {
    // Check if account exists
    const result = await tx.executeSql(
      'SELECT id FROM accounts WHERE name = ?',
      [accountName]
    );
    
    if (result.rows.length > 0) {
      return result.rows.item(0).id;
    }
    
    // Create new account
    const code = await this.generateAccountCode(tx, accountType);
    const insertResult = await tx.executeSql(
      `INSERT INTO accounts (code, name, type, is_active) VALUES (?, ?, ?, 1)`,
      [code, accountName, this.mapAccountTypeToDBType(accountType)]
    );
    
    return insertResult.insertId;
  }

  mapAccountTypeToDBType(accountType) {
    // Map golden rule types to database types
    const mapping = {
      [ACCOUNT_TYPES.PERSONAL]: 'liability', // Creditors/Debtors
      [ACCOUNT_TYPES.REAL]: 'asset',         // Cash, Bank, Stock
      [ACCOUNT_TYPES.NOMINAL]: 'expense'     // Income/Expense
    };
    return mapping[accountType] || 'expense';
  }

  async generateAccountCode(tx, accountType) {
    const prefix = accountType === ACCOUNT_TYPES.REAL ? '1' : 
                   accountType === ACCOUNT_TYPES.PERSONAL ? '2' : '5';
    
    const result = await tx.executeSql(
      `SELECT MAX(CAST(code AS INTEGER)) as last_code FROM accounts WHERE code LIKE ?`,
      [`${prefix}%`]
    );
    
    const lastCode = result.rows.item(0).last_code || parseInt(prefix + '000');
    return String(lastCode + 1);
  }

  /**
   * Update account balance
   */
  async updateAccountBalance(tx, accountId, debit, credit) {
    await tx.executeSql(
      `UPDATE accounts SET balance = balance + ? - ? WHERE id = ?`,
      [debit, credit, accountId]
    );
  }

  /**
   * Get journal by ID
   */
  async getJournal(journalId) {
    const db = await getDatabase();
    
    // Get transaction
    const txnResult = await db.executeSql(
      'SELECT * FROM transactions WHERE id = ?',
      [journalId]
    );
    
    if (txnResult.rows.length === 0) {
      return { success: false, error: 'Journal not found' };
    }
    
    const txn = txnResult.rows.item(0);
    
    // Get ledger entries
    const ledgerResult = await db.executeSql(
      `SELECT l.*, a.name as account_name, a.type as account_type
       FROM ledger l
       JOIN accounts a ON l.account_id = a.id
       WHERE l.transaction_id = ?`,
      [journalId]
    );
    
    const lines = [];
    for (let i = 0; i < ledgerResult.rows.length; i++) {
      lines.push(ledgerResult.rows.item(i));
    }
    
    return {
      success: true,
      journal: {
        ...txn,
        lines
      }
    };
  }

  /**
   * List journals with filters
   */
  async listJournals(filters = {}) {
    const db = await getDatabase();
    
    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params = [];
    
    if (filters.voucherType) {
      query += ' AND txn_type = ?';
      params.push(filters.voucherType);
    }
    
    if (filters.fromDate) {
      query += ' AND txn_date >= ?';
      params.push(filters.fromDate);
    }
    
    if (filters.toDate) {
      query += ' AND txn_date <= ?';
      params.push(filters.toDate);
    }
    
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    
    query += ' ORDER BY txn_date DESC, id DESC LIMIT ? OFFSET ?';
    params.push(filters.limit || 50, filters.offset || 0);
    
    const result = await db.executeSql(query, params);
    
    const journals = [];
    for (let i = 0; i < result.rows.length; i++) {
      journals.push(result.rows.item(i));
    }
    
    return {
      success: true,
      journals,
      count: journals.length
    };
  }

  /**
   * Void/Cancel journal
   */
  async voidJournal(journalId, reason) {
    const db = await getDatabase();
    
    try {
      await db.transaction(async (tx) => {
        // Update transaction status
        await tx.executeSql(
          'UPDATE transactions SET status = ?, description = description || ? WHERE id = ?',
          [JOURNAL_STATUS.VOID, ` [VOIDED: ${reason}]`, journalId]
        );
        
        // Reverse ledger entries
        const ledgerResult = await tx.executeSql(
          'SELECT * FROM ledger WHERE transaction_id = ?',
          [journalId]
        );
        
        for (let i = 0; i < ledgerResult.rows.length; i++) {
          const entry = ledgerResult.rows.item(i);
          
          // Reverse the balance
          await tx.executeSql(
            'UPDATE accounts SET balance = balance - ? + ? WHERE id = ?',
            [entry.debit, entry.credit, entry.account_id]
          );
        }
      });
      
      return {
        success: true,
        message: 'Journal voided successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create metadata table for journal
export const createJournalMetadataTable = async (db) => {
  const query = `
    CREATE TABLE IF NOT EXISTS journal_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      original_text TEXT,
      language TEXT,
      confidence_score DECIMAL(3,2),
      entry_source TEXT,
      payment_mode TEXT,
      party TEXT,
      gst_applicable BOOLEAN DEFAULT 0,
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );
  `;
  await db.executeSql(query);
};

export {
  JournalEntry,
  JournalParser,
  JournalService
};

export default JournalService;
