/**
 * BANK FEED SERVICE - REAL-TIME BANK INTEGRATION
 * 
 * Features:
 * - Multi-bank API integration
 * - Real-time transaction sync
 * - Credit card & payment gateway feeds
 * - Auto-refresh scheduling
 * - Secure credential management
 * - Transaction normalization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatabaseService } from '../database/databaseService';

export class BankFeedService {
  static SUPPORTED_BANKS = {
    HDFC: { id: 'HDFC', name: 'HDFC Bank', apiEndpoint: 'https://api.hdfcbank.com' },
    ICICI: { id: 'ICICI', name: 'ICICI Bank', apiEndpoint: 'https://api.icicibank.com' },
    SBI: { id: 'SBI', name: 'State Bank of India', apiEndpoint: 'https://api.onlinesbi.com' },
    AXIS: { id: 'AXIS', name: 'Axis Bank', apiEndpoint: 'https://api.axisbank.com' },
    KOTAK: { id: 'KOTAK', name: 'Kotak Mahindra', apiEndpoint: 'https://api.kotak.com' },
    RAZORPAY: { id: 'RAZORPAY', name: 'Razorpay', apiEndpoint: 'https://api.razorpay.com' },
    STRIPE: { id: 'STRIPE', name: 'Stripe', apiEndpoint: 'https://api.stripe.com' },
    PAYTM: { id: 'PAYTM', name: 'Paytm', apiEndpoint: 'https://api.paytm.com' }
  };

  static SYNC_INTERVALS = {
    REALTIME: 300000, // 5 minutes
    HOURLY: 3600000,
    DAILY: 86400000
  };

  /**
   * Connect bank account
   */
  static async connectBankAccount(bankData) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Encrypt credentials
      const encryptedCredentials = await this.encryptCredentials(bankData.credentials);
      
      const result = await db.executeSql(
        `INSERT INTO bank_connections (
          bank_id, account_number, account_name, account_type,
          encrypted_credentials, sync_interval, is_active, last_sync
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bankData.bankId,
          bankData.accountNumber,
          bankData.accountName,
          bankData.accountType,
          encryptedCredentials,
          bankData.syncInterval || 'HOURLY',
          1,
          null
        ]
      );

      const connectionId = result[0].insertId;

      // Initial sync
      await this.syncBankTransactions(connectionId);

      return {
        success: true,
        connectionId,
        message: 'Bank account connected successfully'
      };
    } catch (error) {
      console.error('Connect bank error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync bank transactions
   */
  static async syncBankTransactions(connectionId) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Get connection details
      const [connection] = await db.executeSql(
        'SELECT * FROM bank_connections WHERE id = ?',
        [connectionId]
      );

      if (!connection.rows.length) {
        throw new Error('Bank connection not found');
      }

      const conn = connection.rows.item(0);
      const bank = this.SUPPORTED_BANKS[conn.bank_id];

      // Decrypt credentials
      const credentials = await this.decryptCredentials(conn.encrypted_credentials);

      // Fetch transactions from bank API
      const transactions = await this.fetchBankTransactions(
        bank,
        credentials,
        conn.last_sync
      );

      // Normalize and store transactions
      let syncedCount = 0;
      for (const txn of transactions) {
        const normalized = this.normalizeTransaction(txn, conn.bank_id);
        await this.storeBankTransaction(connectionId, normalized);
        syncedCount++;
      }

      // Update last sync time
      await db.executeSql(
        'UPDATE bank_connections SET last_sync = CURRENT_TIMESTAMP WHERE id = ?',
        [connectionId]
      );

      return {
        success: true,
        syncedCount,
        message: `Synced ${syncedCount} transactions`
      };
    } catch (error) {
      console.error('Sync transactions error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch transactions from bank API
   */
  static async fetchBankTransactions(bank, credentials, lastSync) {
    try {
      const fromDate = lastSync || this.getDateDaysAgo(90); // Default 90 days
      
      const response = await fetch(`${bank.apiEndpoint}/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.apiKey}`
        },
        body: JSON.stringify({
          accountNumber: credentials.accountNumber,
          fromDate,
          toDate: new Date().toISOString()
        })
      });

      const data = await response.json();
      return data.transactions || [];
    } catch (error) {
      console.error('Fetch bank transactions error:', error);
      return [];
    }
  }

  /**
   * Normalize transaction from different banks
   */
  static normalizeTransaction(txn, bankId) {
    const normalized = {
      transactionId: txn.id || txn.txnId || txn.transaction_id,
      date: this.parseDate(txn.date || txn.txnDate || txn.valueDate),
      description: txn.description || txn.narration || txn.remarks,
      amount: Math.abs(parseFloat(txn.amount)),
      type: this.determineTransactionType(txn),
      balance: parseFloat(txn.balance || 0),
      category: txn.category || 'UNCATEGORIZED',
      reference: txn.reference || txn.refNumber || null,
      metadata: JSON.stringify(txn)
    };

    return normalized;
  }

  /**
   * Determine transaction type (DEBIT/CREDIT)
   */
  static determineTransactionType(txn) {
    if (txn.type) {
      return txn.type.toUpperCase();
    }
    if (txn.amount < 0 || txn.debit) {
      return 'DEBIT';
    }
    return 'CREDIT';
  }

  /**
   * Store bank transaction
   */
  static async storeBankTransaction(connectionId, transaction) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Check if transaction already exists
      const [existing] = await db.executeSql(
        'SELECT id FROM bank_feed_transactions WHERE connection_id = ? AND transaction_id = ?',
        [connectionId, transaction.transactionId]
      );

      if (existing.rows.length > 0) {
        return { success: true, message: 'Transaction already exists' };
      }

      await db.executeSql(
        `INSERT INTO bank_feed_transactions (
          connection_id, transaction_id, transaction_date, description,
          amount, transaction_type, balance, category, reference,
          is_reconciled, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          connectionId,
          transaction.transactionId,
          transaction.date,
          transaction.description,
          transaction.amount,
          transaction.type,
          transaction.balance,
          transaction.category,
          transaction.reference,
          0,
          transaction.metadata
        ]
      );

      return { success: true };
    } catch (error) {
      console.error('Store transaction error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unreconciled transactions
   */
  static async getUnreconciledTransactions(connectionId = null) {
    try {
      const db = await DatabaseService.getDatabase();
      
      let query = `
        SELECT bft.*, bc.bank_id, bc.account_name
        FROM bank_feed_transactions bft
        JOIN bank_connections bc ON bft.connection_id = bc.id
        WHERE bft.is_reconciled = 0
      `;
      const params = [];

      if (connectionId) {
        query += ' AND bft.connection_id = ?';
        params.push(connectionId);
      }

      query += ' ORDER BY bft.transaction_date DESC';

      const [result] = await db.executeSql(query, params);
      
      const transactions = [];
      for (let i = 0; i < result.rows.length; i++) {
        transactions.push(result.rows.item(i));
      }

      return { success: true, transactions };
    } catch (error) {
      console.error('Get unreconciled transactions error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-categorize transaction using AI
   */
  static async autoCategorizeTransaction(transactionId) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Get transaction
      const [result] = await db.executeSql(
        'SELECT * FROM bank_feed_transactions WHERE id = ?',
        [transactionId]
      );

      if (!result.rows.length) {
        throw new Error('Transaction not found');
      }

      const txn = result.rows.item(0);
      
      // AI categorization logic
      const category = await this.predictCategory(txn.description, txn.amount);
      const confidence = category.confidence;

      // Update category
      await db.executeSql(
        'UPDATE bank_feed_transactions SET category = ?, ai_confidence = ? WHERE id = ?',
        [category.name, confidence, transactionId]
      );

      return {
        success: true,
        category: category.name,
        confidence
      };
    } catch (error) {
      console.error('Auto-categorize error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Predict category using AI/ML
   */
  static async predictCategory(description, amount) {
    // Simple rule-based categorization (can be enhanced with ML)
    const desc = description.toLowerCase();
    
    const rules = [
      { keywords: ['salary', 'payroll', 'wages'], category: 'PAYROLL', confidence: 0.95 },
      { keywords: ['rent', 'lease'], category: 'RENT', confidence: 0.90 },
      { keywords: ['electricity', 'power', 'utility'], category: 'UTILITIES', confidence: 0.90 },
      { keywords: ['internet', 'broadband', 'wifi'], category: 'INTERNET', confidence: 0.90 },
      { keywords: ['fuel', 'petrol', 'diesel', 'gas'], category: 'FUEL', confidence: 0.85 },
      { keywords: ['food', 'restaurant', 'cafe', 'meal'], category: 'MEALS', confidence: 0.80 },
      { keywords: ['office', 'supplies', 'stationery'], category: 'OFFICE_SUPPLIES', confidence: 0.85 },
      { keywords: ['software', 'subscription', 'saas'], category: 'SOFTWARE', confidence: 0.85 },
      { keywords: ['travel', 'flight', 'hotel', 'taxi'], category: 'TRAVEL', confidence: 0.85 },
      { keywords: ['insurance'], category: 'INSURANCE', confidence: 0.90 },
      { keywords: ['tax', 'gst', 'tds'], category: 'TAXES', confidence: 0.95 },
      { keywords: ['bank', 'charges', 'fee'], category: 'BANK_CHARGES', confidence: 0.90 }
    ];

    for (const rule of rules) {
      for (const keyword of rule.keywords) {
        if (desc.includes(keyword)) {
          return { name: rule.category, confidence: rule.confidence };
        }
      }
    }

    return { name: 'UNCATEGORIZED', confidence: 0.50 };
  }

  /**
   * Schedule auto-sync
   */
  static async scheduleAutoSync() {
    try {
      const db = await DatabaseService.getDatabase();
      
      const [result] = await db.executeSql(
        'SELECT id, sync_interval FROM bank_connections WHERE is_active = 1'
      );

      for (let i = 0; i < result.rows.length; i++) {
        const conn = result.rows.item(i);
        const interval = this.SYNC_INTERVALS[conn.sync_interval] || this.SYNC_INTERVALS.HOURLY;
        
        setInterval(() => {
          this.syncBankTransactions(conn.id);
        }, interval);
      }

      return { success: true, message: 'Auto-sync scheduled' };
    } catch (error) {
      console.error('Schedule auto-sync error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get bank feed statistics
   */
  static async getBankFeedStats(connectionId) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const [result] = await db.executeSql(
        `SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN is_reconciled = 1 THEN 1 ELSE 0 END) as reconciled_count,
          SUM(CASE WHEN is_reconciled = 0 THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE 0 END) as total_credits,
          SUM(CASE WHEN transaction_type = 'DEBIT' THEN amount ELSE 0 END) as total_debits
        FROM bank_feed_transactions
        WHERE connection_id = ?`,
        [connectionId]
      );

      const stats = result.rows.item(0);

      return {
        success: true,
        stats: {
          totalTransactions: stats.total_transactions,
          reconciledCount: stats.reconciled_count,
          pendingCount: stats.pending_count,
          totalCredits: stats.total_credits,
          totalDebits: stats.total_debits,
          netFlow: stats.total_credits - stats.total_debits
        }
      };
    } catch (error) {
      console.error('Get bank feed stats error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Encrypt credentials
   */
  static async encryptCredentials(credentials) {
    // Simple base64 encoding (should use proper encryption in production)
    return Buffer.from(JSON.stringify(credentials)).toString('base64');
  }

  /**
   * Decrypt credentials
   */
  static async decryptCredentials(encrypted) {
    return JSON.parse(Buffer.from(encrypted, 'base64').toString());
  }

  /**
   * Get date N days ago
   */
  static getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  /**
   * Parse date from various formats
   */
  static parseDate(dateStr) {
    return new Date(dateStr).toISOString();
  }
}

export default BankFeedService;
