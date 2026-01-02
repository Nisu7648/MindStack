/**
 * INTELLIGENT BANK RECONCILIATION SERVICE
 * 
 * Features:
 * - AI-powered transaction matching
 * - Auto-reconciliation with learning
 * - Anomaly detection
 * - Missing entry detection
 * - One-click reconciliation
 * - Reconciliation rules engine
 */

import { DatabaseService } from '../database/databaseService';
import BankFeedService from './bankFeedService';

export class BankReconciliationService {
  static MATCH_CONFIDENCE = {
    EXACT: 1.0,
    HIGH: 0.9,
    MEDIUM: 0.7,
    LOW: 0.5
  };

  /**
   * Auto-match bank transactions with accounting entries
   */
  static async autoMatchTransactions(connectionId) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Get unreconciled bank transactions
      const bankTxns = await BankFeedService.getUnreconciledTransactions(connectionId);
      
      if (!bankTxns.success) {
        throw new Error('Failed to fetch bank transactions');
      }

      let matchedCount = 0;
      const matches = [];

      for (const bankTxn of bankTxns.transactions) {
        const match = await this.findBestMatch(bankTxn);
        
        if (match && match.confidence >= this.MATCH_CONFIDENCE.MEDIUM) {
          matches.push({
            bankTransactionId: bankTxn.id,
            accountingEntryId: match.entryId,
            confidence: match.confidence,
            matchType: match.matchType
          });
          matchedCount++;
        }
      }

      return {
        success: true,
        matchedCount,
        matches,
        message: `Auto-matched ${matchedCount} transactions`
      };
    } catch (error) {
      console.error('Auto-match error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Find best matching accounting entry for bank transaction
   */
  static async findBestMatch(bankTxn) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Search for potential matches
      const [result] = await db.executeSql(
        `SELECT 
          je.id, je.voucher_number, je.transaction_date, je.amount,
          je.description, je.reference_number
        FROM journal_entries je
        WHERE je.is_reconciled = 0
          AND ABS(je.amount - ?) < 0.01
          AND DATE(je.transaction_date) BETWEEN DATE(?, '-7 days') AND DATE(?, '+7 days')
        ORDER BY ABS(je.amount - ?) ASC, ABS(JULIANDAY(je.transaction_date) - JULIANDAY(?)) ASC
        LIMIT 10`,
        [
          bankTxn.amount,
          bankTxn.transaction_date,
          bankTxn.transaction_date,
          bankTxn.amount,
          bankTxn.transaction_date
        ]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Calculate match confidence for each candidate
      let bestMatch = null;
      let highestConfidence = 0;

      for (let i = 0; i < result.rows.length; i++) {
        const entry = result.rows.item(i);
        const confidence = this.calculateMatchConfidence(bankTxn, entry);
        
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = {
            entryId: entry.id,
            confidence,
            matchType: this.getMatchType(confidence)
          };
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('Find best match error:', error);
      return null;
    }
  }

  /**
   * Calculate match confidence score
   */
  static calculateMatchConfidence(bankTxn, accountingEntry) {
    let score = 0;
    let factors = 0;

    // Amount match (40% weight)
    const amountDiff = Math.abs(bankTxn.amount - accountingEntry.amount);
    if (amountDiff < 0.01) {
      score += 0.4;
    } else if (amountDiff < 1) {
      score += 0.3;
    } else if (amountDiff < 10) {
      score += 0.2;
    }
    factors++;

    // Date match (30% weight)
    const dateDiff = Math.abs(
      new Date(bankTxn.transaction_date) - new Date(accountingEntry.transaction_date)
    ) / (1000 * 60 * 60 * 24); // days
    
    if (dateDiff === 0) {
      score += 0.3;
    } else if (dateDiff <= 1) {
      score += 0.25;
    } else if (dateDiff <= 3) {
      score += 0.2;
    } else if (dateDiff <= 7) {
      score += 0.1;
    }
    factors++;

    // Description/Reference match (30% weight)
    const descSimilarity = this.calculateStringSimilarity(
      bankTxn.description,
      accountingEntry.description
    );
    score += descSimilarity * 0.3;
    factors++;

    // Reference number match (bonus)
    if (bankTxn.reference && accountingEntry.reference_number) {
      if (bankTxn.reference === accountingEntry.reference_number) {
        score += 0.2; // Bonus for exact reference match
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate string similarity (Levenshtein distance)
   */
  static calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();

    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return 1 - (distance / maxLen);
  }

  /**
   * Get match type based on confidence
   */
  static getMatchType(confidence) {
    if (confidence >= this.MATCH_CONFIDENCE.EXACT) return 'EXACT';
    if (confidence >= this.MATCH_CONFIDENCE.HIGH) return 'HIGH';
    if (confidence >= this.MATCH_CONFIDENCE.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Reconcile transaction (manual or auto)
   */
  static async reconcileTransaction(bankTransactionId, accountingEntryId, notes = null) {
    try {
      const db = await DatabaseService.getDatabase();
      
      await db.executeSql('BEGIN TRANSACTION');

      // Mark bank transaction as reconciled
      await db.executeSql(
        `UPDATE bank_feed_transactions 
        SET is_reconciled = 1, reconciled_with_entry_id = ?, reconciled_at = CURRENT_TIMESTAMP, reconciliation_notes = ?
        WHERE id = ?`,
        [accountingEntryId, notes, bankTransactionId]
      );

      // Mark accounting entry as reconciled
      await db.executeSql(
        `UPDATE journal_entries 
        SET is_reconciled = 1, reconciled_with_bank_txn_id = ?, reconciled_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [bankTransactionId, accountingEntryId]
      );

      await db.executeSql('COMMIT');

      return {
        success: true,
        message: 'Transaction reconciled successfully'
      };
    } catch (error) {
      await db.executeSql('ROLLBACK');
      console.error('Reconcile transaction error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * One-click reconciliation for high-confidence matches
   */
  static async oneClickReconciliation(connectionId) {
    try {
      const matchResult = await this.autoMatchTransactions(connectionId);
      
      if (!matchResult.success) {
        throw new Error('Auto-matching failed');
      }

      let reconciledCount = 0;
      const errors = [];

      for (const match of matchResult.matches) {
        if (match.confidence >= this.MATCH_CONFIDENCE.HIGH) {
          const result = await this.reconcileTransaction(
            match.bankTransactionId,
            match.accountingEntryId,
            `Auto-reconciled with ${match.confidence.toFixed(2)} confidence`
          );

          if (result.success) {
            reconciledCount++;
          } else {
            errors.push({ match, error: result.error });
          }
        }
      }

      return {
        success: true,
        reconciledCount,
        totalMatches: matchResult.matches.length,
        errors,
        message: `Reconciled ${reconciledCount} transactions automatically`
      };
    } catch (error) {
      console.error('One-click reconciliation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect anomalies in bank transactions
   */
  static async detectAnomalies(connectionId) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const anomalies = [];

      // Detect duplicate transactions
      const [duplicates] = await db.executeSql(
        `SELECT transaction_id, COUNT(*) as count
        FROM bank_feed_transactions
        WHERE connection_id = ?
        GROUP BY transaction_id
        HAVING count > 1`,
        [connectionId]
      );

      for (let i = 0; i < duplicates.rows.length; i++) {
        anomalies.push({
          type: 'DUPLICATE',
          severity: 'HIGH',
          description: `Duplicate transaction: ${duplicates.rows.item(i).transaction_id}`
        });
      }

      // Detect unusual amounts
      const [avgAmount] = await db.executeSql(
        `SELECT AVG(amount) as avg_amount, MAX(amount) as max_amount
        FROM bank_feed_transactions
        WHERE connection_id = ?`,
        [connectionId]
      );

      const avg = avgAmount.rows.item(0).avg_amount;
      const threshold = avg * 5; // 5x average

      const [unusualAmounts] = await db.executeSql(
        `SELECT id, amount, description
        FROM bank_feed_transactions
        WHERE connection_id = ? AND amount > ?`,
        [connectionId, threshold]
      );

      for (let i = 0; i < unusualAmounts.rows.length; i++) {
        const txn = unusualAmounts.rows.item(i);
        anomalies.push({
          type: 'UNUSUAL_AMOUNT',
          severity: 'MEDIUM',
          description: `Unusually large transaction: ₹${txn.amount.toLocaleString('en-IN')} - ${txn.description}`
        });
      }

      // Detect missing entries (bank txn without accounting entry)
      const [unmatched] = await db.executeSql(
        `SELECT COUNT(*) as count
        FROM bank_feed_transactions
        WHERE connection_id = ? AND is_reconciled = 0
          AND transaction_date < DATE('now', '-7 days')`,
        [connectionId]
      );

      if (unmatched.rows.item(0).count > 0) {
        anomalies.push({
          type: 'MISSING_ENTRIES',
          severity: 'HIGH',
          description: `${unmatched.rows.item(0).count} bank transactions older than 7 days are not reconciled`
        });
      }

      return {
        success: true,
        anomalies,
        count: anomalies.length
      };
    } catch (error) {
      console.error('Detect anomalies error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reconciliation dashboard data
   */
  static async getReconciliationDashboard(connectionId) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Get statistics
      const [stats] = await db.executeSql(
        `SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN is_reconciled = 1 THEN 1 ELSE 0 END) as reconciled,
          SUM(CASE WHEN is_reconciled = 0 THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN is_reconciled = 0 AND transaction_date < DATE('now', '-7 days') THEN 1 ELSE 0 END) as overdue
        FROM bank_feed_transactions
        WHERE connection_id = ?`,
        [connectionId]
      );

      const statsData = stats.rows.item(0);

      // Get recent reconciliations
      const [recent] = await db.executeSql(
        `SELECT bft.*, je.voucher_number
        FROM bank_feed_transactions bft
        LEFT JOIN journal_entries je ON bft.reconciled_with_entry_id = je.id
        WHERE bft.connection_id = ? AND bft.is_reconciled = 1
        ORDER BY bft.reconciled_at DESC
        LIMIT 10`,
        [connectionId]
      );

      const recentReconciliations = [];
      for (let i = 0; i < recent.rows.length; i++) {
        recentReconciliations.push(recent.rows.item(i));
      }

      // Detect anomalies
      const anomaliesResult = await this.detectAnomalies(connectionId);

      return {
        success: true,
        dashboard: {
          statistics: {
            total: statsData.total_transactions,
            reconciled: statsData.reconciled,
            pending: statsData.pending,
            overdue: statsData.overdue,
            reconciliationRate: statsData.total_transactions > 0 
              ? ((statsData.reconciled / statsData.total_transactions) * 100).toFixed(1)
              : 0
          },
          recentReconciliations,
          anomalies: anomaliesResult.anomalies || []
        }
      };
    } catch (error) {
      console.error('Get reconciliation dashboard error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create reconciliation rule
   */
  static async createReconciliationRule(ruleData) {
    try {
      const db = await DatabaseService.getDatabase();
      
      await db.executeSql(
        `INSERT INTO reconciliation_rules (
          rule_name, condition_type, condition_value, action_type,
          action_value, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          ruleData.ruleName,
          ruleData.conditionType,
          ruleData.conditionValue,
          ruleData.actionType,
          ruleData.actionValue,
          1
        ]
      );

      return {
        success: true,
        message: 'Reconciliation rule created successfully'
      };
    } catch (error) {
      console.error('Create reconciliation rule error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply reconciliation rules
   */
  static async applyReconciliationRules(connectionId) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Get active rules
      const [rules] = await db.executeSql(
        'SELECT * FROM reconciliation_rules WHERE is_active = 1'
      );

      let appliedCount = 0;

      for (let i = 0; i < rules.rows.length; i++) {
        const rule = rules.rows.item(i);
        const result = await this.applyRule(connectionId, rule);
        if (result.success) {
          appliedCount += result.count;
        }
      }

      return {
        success: true,
        appliedCount,
        message: `Applied ${appliedCount} reconciliation rules`
      };
    } catch (error) {
      console.error('Apply reconciliation rules error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply single rule
   */
  static async applyRule(connectionId, rule) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Build query based on rule condition
      let query = `
        SELECT id FROM bank_feed_transactions
        WHERE connection_id = ? AND is_reconciled = 0
      `;
      const params = [connectionId];

      if (rule.condition_type === 'DESCRIPTION_CONTAINS') {
        query += ' AND description LIKE ?';
        params.push(`%${rule.condition_value}%`);
      } else if (rule.condition_type === 'AMOUNT_EQUALS') {
        query += ' AND amount = ?';
        params.push(parseFloat(rule.condition_value));
      } else if (rule.condition_type === 'CATEGORY_EQUALS') {
        query += ' AND category = ?';
        params.push(rule.condition_value);
      }

      const [result] = await db.executeSql(query, params);
      
      let count = 0;
      for (let i = 0; i < result.rows.length; i++) {
        const txnId = result.rows.item(i).id;
        
        if (rule.action_type === 'AUTO_CATEGORIZE') {
          await db.executeSql(
            'UPDATE bank_feed_transactions SET category = ? WHERE id = ?',
            [rule.action_value, txnId]
          );
          count++;
        }
      }

      return { success: true, count };
    } catch (error) {
      console.error('Apply rule error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default BankReconciliationService;
