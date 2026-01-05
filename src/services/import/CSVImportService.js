/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CSV IMPORT SERVICE - SWISS BANKS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Supports all major Swiss banks:
 * - PostFinance
 * - UBS
 * - Credit Suisse
 * - Raiffeisen
 * - ZKB (Zürcher Kantonalbank)
 * - Generic CSV format
 * 
 * Features:
 * - Auto-detect bank format
 * - Parse transactions
 * - Smart categorization
 * - Duplicate detection
 * - Auto-reconciliation
 * - Create journal entries
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { JournalService } from '../accounting/journalService';
import { LedgerService } from '../accounting/ledgerService';

export class CSVImportService {
  static IMPORT_HISTORY_KEY = '@mindstack_csv_imports';
  static TRANSACTIONS_KEY = '@mindstack_transactions';

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * BANK FORMATS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static BANK_FORMATS = {
    POSTFINANCE: {
      name: 'PostFinance',
      delimiter: ';',
      encoding: 'UTF-8',
      dateFormat: 'DD.MM.YYYY',
      columns: {
        date: 'Buchungsdatum',
        description: 'Buchungstext',
        amount: 'Betrag',
        balance: 'Saldo',
        currency: 'Währung'
      },
      identifiers: ['PostFinance', 'Buchungsdatum', 'Buchungstext']
    },

    UBS: {
      name: 'UBS',
      delimiter: ',',
      encoding: 'UTF-8',
      dateFormat: 'DD/MM/YYYY',
      columns: {
        date: 'Value Date',
        description: 'Description',
        amount: 'Amount',
        balance: 'Balance',
        currency: 'Currency'
      },
      identifiers: ['UBS', 'Value Date', 'Description']
    },

    CREDIT_SUISSE: {
      name: 'Credit Suisse',
      delimiter: ';',
      encoding: 'UTF-8',
      dateFormat: 'DD.MM.YYYY',
      columns: {
        date: 'Valuta',
        description: 'Beschreibung',
        amount: 'Betrag',
        balance: 'Saldo',
        currency: 'Währung'
      },
      identifiers: ['Credit Suisse', 'Valuta', 'Beschreibung']
    },

    RAIFFEISEN: {
      name: 'Raiffeisen',
      delimiter: ';',
      encoding: 'UTF-8',
      dateFormat: 'DD.MM.YYYY',
      columns: {
        date: 'Datum',
        description: 'Text',
        amount: 'Betrag',
        balance: 'Saldo',
        currency: 'Währung'
      },
      identifiers: ['Raiffeisen', 'Datum', 'Text']
    },

    ZKB: {
      name: 'Zürcher Kantonalbank',
      delimiter: ';',
      encoding: 'UTF-8',
      dateFormat: 'DD.MM.YYYY',
      columns: {
        date: 'Buchungsdatum',
        description: 'Beschreibung',
        amount: 'Betrag',
        balance: 'Saldo',
        currency: 'Währung'
      },
      identifiers: ['ZKB', 'Zürcher Kantonalbank', 'Buchungsdatum']
    },

    GENERIC: {
      name: 'Generic',
      delimiter: ',',
      encoding: 'UTF-8',
      dateFormat: 'YYYY-MM-DD',
      columns: {
        date: 'Date',
        description: 'Description',
        amount: 'Amount',
        balance: 'Balance',
        currency: 'Currency'
      },
      identifiers: []
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * IMPORT CSV FILE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async importCSV(fileContent, fileName) {
    try {
      console.log('📥 Starting CSV import:', fileName);

      // 1. Detect bank format
      const bankFormat = this.detectBankFormat(fileContent);
      console.log('🏦 Detected bank:', bankFormat.name);

      // 2. Parse CSV
      const transactions = this.parseCSV(fileContent, bankFormat);
      console.log('📊 Parsed transactions:', transactions.length);

      // 3. Validate transactions
      const validTransactions = this.validateTransactions(transactions);
      console.log('✅ Valid transactions:', validTransactions.length);

      // 4. Check for duplicates
      const newTransactions = await this.filterDuplicates(validTransactions);
      console.log('🆕 New transactions:', newTransactions.length);

      // 5. Categorize transactions (AI-powered)
      const categorizedTransactions = await this.categorizeTransactions(newTransactions);
      console.log('🏷️ Categorized transactions:', categorizedTransactions.length);

      // 6. Save import record
      const importRecord = {
        id: `IMP-${Date.now()}`,
        fileName: fileName,
        bank: bankFormat.name,
        importDate: moment().toISOString(),
        totalTransactions: transactions.length,
        validTransactions: validTransactions.length,
        newTransactions: newTransactions.length,
        duplicates: validTransactions.length - newTransactions.length,
        status: 'COMPLETED'
      };

      await this.saveImportRecord(importRecord);

      return {
        success: true,
        data: {
          importRecord,
          transactions: categorizedTransactions,
          summary: {
            total: transactions.length,
            valid: validTransactions.length,
            new: newTransactions.length,
            duplicates: validTransactions.length - newTransactions.length
          }
        }
      };

    } catch (error) {
      console.error('CSV import error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * DETECT BANK FORMAT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static detectBankFormat(fileContent) {
    const firstLines = fileContent.split('\n').slice(0, 5).join('\n');

    // Check each bank format
    for (const [key, format] of Object.entries(this.BANK_FORMATS)) {
      if (key === 'GENERIC') continue;

      const matches = format.identifiers.filter(identifier => 
        firstLines.includes(identifier)
      );

      if (matches.length > 0) {
        return format;
      }
    }

    // Default to generic
    return this.BANK_FORMATS.GENERIC;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PARSE CSV
   * ═══════════════════════════════════════════════════════════════════════
   */
  static parseCSV(fileContent, bankFormat) {
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Find header row
    let headerIndex = 0;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      const hasDateColumn = Object.values(bankFormat.columns).some(col => 
        line.includes(col)
      );
      if (hasDateColumn) {
        headerIndex = i;
        break;
      }
    }

    const headerLine = lines[headerIndex];
    const headers = this.parseCSVLine(headerLine, bankFormat.delimiter);

    // Find column indices
    const columnIndices = {};
    for (const [key, columnName] of Object.entries(bankFormat.columns)) {
      const index = headers.findIndex(h => 
        h.toLowerCase().includes(columnName.toLowerCase()) ||
        columnName.toLowerCase().includes(h.toLowerCase())
      );
      if (index !== -1) {
        columnIndices[key] = index;
      }
    }

    // Parse data rows
    const transactions = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = this.parseCSVLine(line, bankFormat.delimiter);

      try {
        const transaction = {
          id: `TXN-${Date.now()}-${i}`,
          date: this.parseDate(values[columnIndices.date], bankFormat.dateFormat),
          description: values[columnIndices.description] || '',
          amount: this.parseAmount(values[columnIndices.amount]),
          balance: columnIndices.balance !== undefined 
            ? this.parseAmount(values[columnIndices.balance]) 
            : null,
          currency: values[columnIndices.currency] || 'CHF',
          bank: bankFormat.name,
          rawData: line,
          importedAt: moment().toISOString()
        };

        transactions.push(transaction);
      } catch (error) {
        console.warn('Failed to parse line:', line, error);
      }
    }

    return transactions;
  }

  /**
   * Parse CSV line (handles quoted values)
   */
  static parseCSVLine(line, delimiter) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Parse date
   */
  static parseDate(dateString, format) {
    const date = moment(dateString, format);
    if (!date.isValid()) {
      throw new Error(`Invalid date: ${dateString}`);
    }
    return date.toISOString();
  }

  /**
   * Parse amount
   */
  static parseAmount(amountString) {
    if (!amountString) return 0;

    // Remove currency symbols and spaces
    let cleaned = amountString.replace(/[^\d.,-]/g, '');

    // Handle Swiss format (1'234.56 or 1'234,56)
    cleaned = cleaned.replace(/'/g, '');

    // Determine decimal separator
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    if (lastComma > lastDot) {
      // Comma is decimal separator
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal separator
      cleaned = cleaned.replace(/,/g, '');
    }

    const amount = parseFloat(cleaned);
    if (isNaN(amount)) {
      throw new Error(`Invalid amount: ${amountString}`);
    }

    return amount;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * VALIDATE TRANSACTIONS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static validateTransactions(transactions) {
    return transactions.filter(txn => {
      // Must have date
      if (!txn.date) return false;

      // Must have description or amount
      if (!txn.description && txn.amount === 0) return false;

      // Date must be valid
      if (!moment(txn.date).isValid()) return false;

      return true;
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * FILTER DUPLICATES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async filterDuplicates(transactions) {
    try {
      const existingData = await AsyncStorage.getItem(this.TRANSACTIONS_KEY);
      const existingTransactions = existingData ? JSON.parse(existingData) : [];

      const newTransactions = [];

      for (const txn of transactions) {
        const isDuplicate = existingTransactions.some(existing => 
          moment(existing.date).isSame(txn.date, 'day') &&
          existing.amount === txn.amount &&
          existing.description === txn.description
        );

        if (!isDuplicate) {
          newTransactions.push(txn);
        }
      }

      return newTransactions;
    } catch (error) {
      console.error('Filter duplicates error:', error);
      return transactions;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CATEGORIZE TRANSACTIONS (AI-POWERED)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async categorizeTransactions(transactions) {
    const categorized = [];

    for (const txn of transactions) {
      const category = await this.suggestCategory(txn);
      
      categorized.push({
        ...txn,
        suggestedCategory: category.category,
        suggestedAccount: category.account,
        confidence: category.confidence,
        needsReview: category.confidence < 0.7
      });
    }

    return categorized;
  }

  /**
   * Suggest category based on description and amount
   */
  static async suggestCategory(transaction) {
    const description = transaction.description.toLowerCase();
    const amount = transaction.amount;
    const isIncome = amount > 0;

    // Category patterns
    const patterns = {
      // Income
      'SALES': {
        keywords: ['payment received', 'invoice', 'sale', 'customer', 'zahlung erhalten'],
        account: 'SALES-001',
        type: 'INCOME'
      },
      'INTEREST': {
        keywords: ['interest', 'zins', 'intérêt'],
        account: 'INT-001',
        type: 'INCOME'
      },

      // Expenses
      'RENT': {
        keywords: ['rent', 'miete', 'loyer', 'lease'],
        account: 'RENT-001',
        type: 'EXPENSE'
      },
      'UTILITIES': {
        keywords: ['electricity', 'water', 'gas', 'strom', 'wasser', 'électricité'],
        account: 'UTIL-001',
        type: 'EXPENSE'
      },
      'SALARY': {
        keywords: ['salary', 'wage', 'lohn', 'gehalt', 'salaire'],
        account: 'SAL-001',
        type: 'EXPENSE'
      },
      'OFFICE': {
        keywords: ['office', 'supplies', 'stationery', 'büro', 'fournitures'],
        account: 'OFF-001',
        type: 'EXPENSE'
      },
      'TRAVEL': {
        keywords: ['travel', 'hotel', 'flight', 'train', 'reise', 'voyage', 'sbb', 'swiss'],
        account: 'TRV-001',
        type: 'EXPENSE'
      },
      'FUEL': {
        keywords: ['fuel', 'gas', 'petrol', 'benzin', 'essence', 'esso', 'shell', 'bp'],
        account: 'FUEL-001',
        type: 'EXPENSE'
      },
      'INSURANCE': {
        keywords: ['insurance', 'versicherung', 'assurance'],
        account: 'INS-001',
        type: 'EXPENSE'
      },
      'BANK_FEES': {
        keywords: ['fee', 'charge', 'gebühr', 'frais', 'commission'],
        account: 'BANK-FEE-001',
        type: 'EXPENSE'
      },
      'TAX': {
        keywords: ['tax', 'vat', 'mwst', 'tva', 'steuer', 'taxe'],
        account: 'TAX-001',
        type: 'EXPENSE'
      },
      'TELEPHONE': {
        keywords: ['phone', 'mobile', 'telefon', 'téléphone', 'swisscom', 'sunrise', 'salt'],
        account: 'TEL-001',
        type: 'EXPENSE'
      },
      'INTERNET': {
        keywords: ['internet', 'broadband', 'wifi'],
        account: 'INT-001',
        type: 'EXPENSE'
      },
      'MARKETING': {
        keywords: ['advertising', 'marketing', 'werbung', 'publicité', 'google ads', 'facebook'],
        account: 'MKT-001',
        type: 'EXPENSE'
      },
      'MEALS': {
        keywords: ['restaurant', 'meal', 'lunch', 'dinner', 'essen', 'repas'],
        account: 'MEAL-001',
        type: 'EXPENSE'
      }
    };

    // Check patterns
    let bestMatch = null;
    let bestScore = 0;

    for (const [category, pattern] of Object.entries(patterns)) {
      // Skip if type doesn't match
      if ((isIncome && pattern.type !== 'INCOME') || 
          (!isIncome && pattern.type !== 'EXPENSE')) {
        continue;
      }

      // Calculate match score
      let score = 0;
      for (const keyword of pattern.keywords) {
        if (description.includes(keyword)) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          category: category,
          account: pattern.account,
          confidence: Math.min(score / pattern.keywords.length, 1.0)
        };
      }
    }

    // Default category if no match
    if (!bestMatch) {
      bestMatch = {
        category: isIncome ? 'OTHER_INCOME' : 'OTHER_EXPENSE',
        account: isIncome ? 'OTH-INC-001' : 'OTH-EXP-001',
        confidence: 0.3
      };
    }

    return bestMatch;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CONFIRM AND CREATE JOURNAL ENTRIES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async confirmAndCreateEntries(transactions) {
    try {
      const results = [];

      for (const txn of transactions) {
        // Create journal entry
        const journalEntry = {
          voucherType: txn.amount > 0 ? 'RECEIPT' : 'PAYMENT',
          voucherNumber: `CSV-${txn.id}`,
          date: txn.date,
          entries: [
            {
              accountCode: 'BANK-001',
              accountName: 'Bank A/c',
              debit: txn.amount > 0 ? Math.abs(txn.amount) : 0,
              credit: txn.amount < 0 ? Math.abs(txn.amount) : 0
            },
            {
              accountCode: txn.suggestedAccount,
              accountName: txn.suggestedCategory,
              debit: txn.amount < 0 ? Math.abs(txn.amount) : 0,
              credit: txn.amount > 0 ? Math.abs(txn.amount) : 0
            }
          ],
          totalDebit: Math.abs(txn.amount),
          totalCredit: Math.abs(txn.amount),
          narration: txn.description,
          reference: txn.id
        };

        const result = await JournalService.createJournalEntry(journalEntry);
        
        if (result.success) {
          await LedgerService.postToLedger(journalEntry);
        }

        results.push({
          transaction: txn,
          journalEntry: result
        });
      }

      // Save transactions
      await this.saveTransactions(transactions);

      return {
        success: true,
        data: results
      };

    } catch (error) {
      console.error('Confirm and create entries error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SAVE FUNCTIONS
   * ═══════════════════════════════════════════════════════════════════════
   */
  
  /**
   * Save import record
   */
  static async saveImportRecord(importRecord) {
    try {
      const historyData = await AsyncStorage.getItem(this.IMPORT_HISTORY_KEY);
      const history = historyData ? JSON.parse(historyData) : [];
      
      history.unshift(importRecord);
      
      await AsyncStorage.setItem(this.IMPORT_HISTORY_KEY, JSON.stringify(history));
      
      return { success: true };
    } catch (error) {
      console.error('Save import record error:', error);
      throw error;
    }
  }

  /**
   * Save transactions
   */
  static async saveTransactions(transactions) {
    try {
      const existingData = await AsyncStorage.getItem(this.TRANSACTIONS_KEY);
      const existing = existingData ? JSON.parse(existingData) : [];
      
      const updated = [...transactions, ...existing];
      
      await AsyncStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(updated));
      
      return { success: true };
    } catch (error) {
      console.error('Save transactions error:', error);
      throw error;
    }
  }

  /**
   * Get import history
   */
  static async getImportHistory() {
    try {
      const historyData = await AsyncStorage.getItem(this.IMPORT_HISTORY_KEY);
      const history = historyData ? JSON.parse(historyData) : [];
      
      return {
        success: true,
        data: history
      };
    } catch (error) {
      console.error('Get import history error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default CSVImportService;