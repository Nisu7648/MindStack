/**
 * BANK & CASH INTELLIGENCE ENGINE
 * 
 * Automated bank reconciliation and cash management
 * Auto-matches transactions, flags discrepancies
 * Enforces cash discipline
 */

import { getDatabase } from '../database/schema';

/**
 * BANK INTELLIGENCE ENGINE
 * Automatically processes and reconciles bank transactions
 */
export class BankIntelligenceEngine {

  /**
   * AUTO-RECONCILE BANK STATEMENT
   * Processes entire bank statement and auto-matches transactions
   */
  static async autoReconcileBankStatement(bankStatementData) {
    const db = await getDatabase();
    const results = {
      totalTransactions: bankStatementData.length,
      autoMatched: 0,
      needsReview: 0,
      discrepancies: []
    };

    try {
      for (const bankTxn of bankStatementData) {
        const reconciliationResult = await this.reconcileSingleTransaction(db, bankTxn);
        
        if (reconciliationResult.matched) {
          results.autoMatched++;
        } else {
          results.needsReview++;
          results.discrepancies.push({
            bankTxn,
            reason: reconciliationResult.reason
          });
        }
      }

      // Update reconciliation summary
      await this.updateReconciliationSummary(db, results);

      console.log(`✅ Bank reconciliation complete: ${results.autoMatched}/${results.totalTransactions} matched`);
      return results;

    } catch (error) {
      console.error('Bank reconciliation failed:', error);
      throw error;
    }
  }

  /**
   * RECONCILE SINGLE TRANSACTION
   * Attempts to match a single bank transaction with book entries
   */
  static async reconcileSingleTransaction(db, bankTxn) {
    try {
      // 1. Try exact amount match
      const exactMatch = await this.findExactMatch(db, bankTxn);
      if (exactMatch) {
        await this.markAsReconciled(db, bankTxn, exactMatch);
        return { matched: true, matchType: 'EXACT', match: exactMatch };
      }

      // 2. Try fuzzy amount match (within ±1%)
      const fuzzyMatch = await this.findFuzzyMatch(db, bankTxn);
      if (fuzzyMatch && fuzzyMatch.confidence > 0.85) {
        await this.markAsReconciled(db, bankTxn, fuzzyMatch);
        return { matched: true, matchType: 'FUZZY', match: fuzzyMatch };
      }

      // 3. Try reference number match
      if (bankTxn.referenceNumber) {
        const refMatch = await this.findReferenceMatch(db, bankTxn);
        if (refMatch) {
          await this.markAsReconciled(db, bankTxn, refMatch);
          return { matched: true, matchType: 'REFERENCE', match: refMatch };
        }
      }

      // 4. Try pattern-based matching
      const patternMatch = await this.findPatternMatch(db, bankTxn);
      if (patternMatch && patternMatch.confidence > 0.80) {
        await this.markAsReconciled(db, bankTxn, patternMatch);
        return { matched: true, matchType: 'PATTERN', match: patternMatch };
      }

      // 5. No match found - flag for review
      await this.flagForManualReview(db, bankTxn);
      return { 
        matched: false, 
        reason: 'No matching transaction found in books' 
      };

    } catch (error) {
      console.error('Transaction reconciliation failed:', error);
      return { matched: false, reason: error.message };
    }
  }

  /**
   * FIND EXACT MATCH
   * Looks for exact amount and date match
   */
  static async findExactMatch(db, bankTxn) {
    const query = `
      SELECT t.*, l.account_name, l.debit, l.credit
      FROM transactions t
      INNER JOIN ledger l ON t.id = l.transaction_id
      WHERE ABS(l.debit - ?) < 0.01
      AND DATE(t.date) = DATE(?)
      AND t.reconciliation_status = 'PENDING'
      LIMIT 1
    `;

    const result = await db.executeSql(query, [
      bankTxn.amount,
      bankTxn.date
    ]);

    if (result[0].rows.length > 0) {
      return {
        transaction: result[0].rows.item(0),
        confidence: 1.0
      };
    }

    return null;
  }

  /**
   * FIND FUZZY MATCH
   * Looks for close amount match within date range
   */
  static async findFuzzyMatch(db, bankTxn) {
    const tolerance = bankTxn.amount * 0.01; // 1% tolerance
    const query = `
      SELECT t.*, l.account_name, l.debit, l.credit,
             ABS(l.debit - ?) as amount_diff,
             ABS(JULIANDAY(t.date) - JULIANDAY(?)) as date_diff
      FROM transactions t
      INNER JOIN ledger l ON t.id = l.transaction_id
      WHERE l.debit BETWEEN ? AND ?
      AND DATE(t.date) BETWEEN DATE(?, '-3 days') AND DATE(?, '+3 days')
      AND t.reconciliation_status = 'PENDING'
      ORDER BY amount_diff ASC, date_diff ASC
      LIMIT 1
    `;

    const result = await db.executeSql(query, [
      bankTxn.amount,
      bankTxn.date,
      bankTxn.amount - tolerance,
      bankTxn.amount + tolerance,
      bankTxn.date,
      bankTxn.date
    ]);

    if (result[0].rows.length > 0) {
      const match = result[0].rows.item(0);
      const amountDiff = Math.abs(match.debit - bankTxn.amount);
      const confidence = 1 - (amountDiff / bankTxn.amount);

      return {
        transaction: match,
        confidence: confidence,
        amountDifference: amountDiff
      };
    }

    return null;
  }

  /**
   * FIND REFERENCE MATCH
   * Matches using reference/cheque number
   */
  static async findReferenceMatch(db, bankTxn) {
    const query = `
      SELECT t.*, l.account_name, l.debit, l.credit
      FROM transactions t
      INNER JOIN ledger l ON t.id = l.transaction_id
      WHERE t.reference_no = ?
      AND t.reconciliation_status = 'PENDING'
      LIMIT 1
    `;

    const result = await db.executeSql(query, [bankTxn.referenceNumber]);

    if (result[0].rows.length > 0) {
      return {
        transaction: result[0].rows.item(0),
        confidence: 0.95
      };
    }

    return null;
  }

  /**
   * FIND PATTERN MATCH
   * Uses AI/ML to match based on description patterns
   */
  static async findPatternMatch(db, bankTxn) {
    // Extract keywords from bank transaction description
    const keywords = this.extractKeywords(bankTxn.description);

    if (keywords.length === 0) return null;

    const query = `
      SELECT t.*, l.account_name, l.debit, l.credit,
             t.narration
      FROM transactions t
      INNER JOIN ledger l ON t.id = l.transaction_id
      WHERE t.reconciliation_status = 'PENDING'
      AND DATE(t.date) BETWEEN DATE(?, '-7 days') AND DATE(?, '+7 days')
    `;

    const result = await db.executeSql(query, [bankTxn.date, bankTxn.date]);

    let bestMatch = null;
    let highestScore = 0;

    for (let i = 0; i < result[0].rows.length; i++) {
      const txn = result[0].rows.item(i);
      const score = this.calculateSimilarityScore(
        keywords,
        txn.narration,
        bankTxn.amount,
        txn.debit
      );

      if (score > highestScore) {
        highestScore = score;
        bestMatch = txn;
      }
    }

    if (bestMatch && highestScore > 0.80) {
      return {
        transaction: bestMatch,
        confidence: highestScore
      };
    }

    return null;
  }

  /**
   * MARK AS RECONCILED
   * Updates transaction status and creates reconciliation record
   */
  static async markAsReconciled(db, bankTxn, match) {
    await db.transaction(async (tx) => {
      // Update transaction status
      await tx.executeSql(
        `UPDATE transactions 
         SET reconciliation_status = 'RECONCILED',
             reconciliation_date = ?,
             bank_reference = ?
         WHERE id = ?`,
        [new Date().toISOString(), bankTxn.referenceNumber, match.transaction.id]
      );

      // Create reconciliation record
      await tx.executeSql(
        `INSERT INTO bank_reconciliation (
          transaction_id, bank_transaction_id, bank_date,
          bank_amount, book_amount, difference, status,
          match_type, confidence, reconciled_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          match.transaction.id,
          bankTxn.id,
          bankTxn.date,
          bankTxn.amount,
          match.transaction.debit,
          Math.abs(bankTxn.amount - match.transaction.debit),
          'MATCHED',
          match.matchType || 'AUTO',
          match.confidence,
          new Date().toISOString()
        ]
      );
    });
  }

  /**
   * FLAG FOR MANUAL REVIEW
   * Marks transaction for human review
   */
  static async flagForManualReview(db, bankTxn) {
    await db.executeSql(
      `INSERT INTO reconciliation_queue (
        bank_transaction_id, bank_date, bank_amount,
        description, status, flagged_date
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        bankTxn.id,
        bankTxn.date,
        bankTxn.amount,
        bankTxn.description,
        'NEEDS_REVIEW',
        new Date().toISOString()
      ]
    );
  }

  /**
   * EXTRACT KEYWORDS
   * Extracts meaningful keywords from transaction description
   */
  static extractKeywords(description) {
    const stopWords = ['the', 'a', 'an', 'to', 'from', 'for', 'of', 'in', 'on'];
    const words = description.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * CALCULATE SIMILARITY SCORE
   * Calculates how similar two transactions are
   */
  static calculateSimilarityScore(keywords, narration, bankAmount, bookAmount) {
    let score = 0;

    // Text similarity (60% weight)
    const narrationLower = narration.toLowerCase();
    const matchedKeywords = keywords.filter(kw => narrationLower.includes(kw));
    const textScore = matchedKeywords.length / keywords.length;
    score += textScore * 0.6;

    // Amount similarity (40% weight)
    const amountDiff = Math.abs(bankAmount - bookAmount);
    const amountScore = 1 - (amountDiff / bankAmount);
    score += Math.max(0, amountScore) * 0.4;

    return score;
  }

  /**
   * UPDATE RECONCILIATION SUMMARY
   * Updates overall reconciliation statistics
   */
  static async updateReconciliationSummary(db, results) {
    await db.executeSql(
      `INSERT INTO reconciliation_summary (
        date, total_transactions, auto_matched,
        needs_review, match_rate, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        new Date().toISOString().split('T')[0],
        results.totalTransactions,
        results.autoMatched,
        results.needsReview,
        (results.autoMatched / results.totalTransactions) * 100,
        new Date().toISOString()
      ]
    );
  }

  /**
   * GET UNRECONCILED TRANSACTIONS
   * Returns list of transactions that need reconciliation
   */
  static async getUnreconciledTransactions(startDate, endDate) {
    const db = await getDatabase();
    
    const query = `
      SELECT t.*, l.account_name, l.debit, l.credit
      FROM transactions t
      INNER JOIN ledger l ON t.id = l.transaction_id
      WHERE t.reconciliation_status = 'PENDING'
      AND t.date BETWEEN ? AND ?
      AND l.account_name IN ('Bank', 'Cash')
      ORDER BY t.date DESC
    `;

    const result = await db.executeSql(query, [startDate, endDate]);
    const transactions = [];

    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(result[0].rows.item(i));
    }

    return transactions;
  }

  /**
   * GET RECONCILIATION REPORT
   * Generates reconciliation status report
   */
  static async getReconciliationReport(month, year) {
    const db = await getDatabase();
    
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN reconciliation_status = 'RECONCILED' THEN 1 ELSE 0 END) as reconciled,
        SUM(CASE WHEN reconciliation_status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN reconciliation_status = 'DISCREPANCY' THEN 1 ELSE 0 END) as discrepancies,
        SUM(l.debit) as total_amount
      FROM transactions t
      INNER JOIN ledger l ON t.id = l.transaction_id
      WHERE strftime('%Y', t.date) = ?
      AND strftime('%m', t.date) = ?
      AND l.account_name IN ('Bank', 'Cash')
    `;

    const result = await db.executeSql(query, [
      year.toString(),
      month.toString().padStart(2, '0')
    ]);

    return result[0].rows.item(0);
  }
}

/**
 * CASH DISCIPLINE ENGINE
 * Enforces cash management discipline
 */
export class CashDisciplineEngine {

  /**
   * TRACK EXPECTED CASH
   * Calculates what cash balance should be
   */
  static async calculateExpectedCash() {
    const db = await getDatabase();
    
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN debit > 0 THEN debit ELSE -credit END), 0) as expected_cash
      FROM ledger
      WHERE account_name = 'Cash'
      AND date <= ?
    `;

    const result = await db.executeSql(query, [new Date().toISOString()]);
    return result[0].rows.item(0).expected_cash;
  }

  /**
   * REQUIRE DAILY CASH CONFIRMATION
   * Prompts user to confirm actual cash on hand
   */
  static async requireDailyCashConfirmation(userId) {
    const db = await getDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Check if already confirmed today
    const checkQuery = `
      SELECT * FROM cash_confirmations
      WHERE user_id = ? AND DATE(confirmation_date) = DATE(?)
    `;

    const existing = await db.executeSql(checkQuery, [userId, today]);

    if (existing[0].rows.length > 0) {
      return { required: false, message: 'Already confirmed today' };
    }

    const expectedCash = await this.calculateExpectedCash();

    return {
      required: true,
      expectedCash,
      message: 'Please confirm actual cash on hand'
    };
  }

  /**
   * RECORD CASH CONFIRMATION
   * Records actual cash count and identifies discrepancies
   */
  static async recordCashConfirmation(userId, actualCash, notes = '') {
    const db = await getDatabase();
    const expectedCash = await this.calculateExpectedCash();
    const difference = actualCash - expectedCash;

    await db.transaction(async (tx) => {
      // Record confirmation
      await tx.executeSql(
        `INSERT INTO cash_confirmations (
          user_id, confirmation_date, expected_cash,
          actual_cash, difference, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          new Date().toISOString(),
          expectedCash,
          actualCash,
          difference,
          notes,
          new Date().toISOString()
        ]
      );

      // If there's a significant difference, create adjustment entry
      if (Math.abs(difference) > 10) {
        await this.createCashAdjustmentEntry(tx, difference, notes);
      }
    });

    return {
      expectedCash,
      actualCash,
      difference,
      status: Math.abs(difference) < 10 ? 'OK' : 'DISCREPANCY'
    };
  }

  /**
   * CREATE CASH ADJUSTMENT ENTRY
   * Creates accounting entry for cash discrepancy
   */
  static async createCashAdjustmentEntry(tx, difference, notes) {
    // Create transaction
    const txnResult = await tx.executeSql(
      `INSERT INTO transactions (
        voucher_type, date, narration, total_amount,
        status, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'JOURNAL',
        new Date().toISOString(),
        `Cash adjustment: ${notes}`,
        Math.abs(difference),
        'POSTED',
        'CASH_DISCIPLINE',
        new Date().toISOString()
      ]
    );

    const transactionId = txnResult[0].insertId;

    if (difference > 0) {
      // Cash surplus
      await tx.executeSql(
        `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, 'Cash', difference, 0, new Date().toISOString()]
      );
      await tx.executeSql(
        `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, 'Cash Over/Short', 0, difference, new Date().toISOString()]
      );
    } else {
      // Cash shortage
      await tx.executeSql(
        `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, 'Cash Over/Short', Math.abs(difference), 0, new Date().toISOString()]
      );
      await tx.executeSql(
        `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, 'Cash', 0, Math.abs(difference), new Date().toISOString()]
      );
    }
  }

  /**
   * HIGHLIGHT CASH SHORTAGES
   * Identifies and reports cash shortage patterns
   */
  static async highlightCashShortages(days = 30) {
    const db = await getDatabase();
    
    const query = `
      SELECT 
        DATE(confirmation_date) as date,
        expected_cash,
        actual_cash,
        difference,
        notes
      FROM cash_confirmations
      WHERE DATE(confirmation_date) >= DATE('now', '-${days} days')
      AND ABS(difference) > 10
      ORDER BY confirmation_date DESC
    `;

    const result = await db.executeSql(query);
    const shortages = [];

    for (let i = 0; i < result[0].rows.length; i++) {
      shortages.push(result[0].rows.item(i));
    }

    // Calculate statistics
    const totalShortages = shortages.filter(s => s.difference < 0).length;
    const totalSurplus = shortages.filter(s => s.difference > 0).length;
    const avgShortage = shortages
      .filter(s => s.difference < 0)
      .reduce((sum, s) => sum + Math.abs(s.difference), 0) / (totalShortages || 1);

    return {
      shortages,
      statistics: {
        totalShortages,
        totalSurplus,
        avgShortage,
        totalDays: days
      }
    };
  }

  /**
   * GET CASH FLOW FORECAST
   * Predicts cash position for next N days
   */
  static async getCashFlowForecast(days = 7) {
    const db = await getDatabase();
    const currentCash = await this.calculateExpectedCash();

    // Get scheduled payments and receipts
    const query = `
      SELECT 
        DATE(due_date) as date,
        SUM(CASE WHEN type = 'RECEIVABLE' THEN amount ELSE 0 END) as expected_receipts,
        SUM(CASE WHEN type = 'PAYABLE' THEN amount ELSE 0 END) as expected_payments
      FROM (
        SELECT due_date, total_amount as amount, 'RECEIVABLE' as type
        FROM invoices
        WHERE payment_status = 'PENDING'
        AND DATE(due_date) BETWEEN DATE('now') AND DATE('now', '+${days} days')
        
        UNION ALL
        
        SELECT due_date, amount, 'PAYABLE' as type
        FROM expenses
        WHERE payment_status = 'PENDING'
        AND DATE(due_date) BETWEEN DATE('now') AND DATE('now', '+${days} days')
      )
      GROUP BY DATE(due_date)
      ORDER BY date
    `;

    const result = await db.executeSql(query);
    const forecast = [];
    let runningBalance = currentCash;

    for (let i = 0; i < result[0].rows.length; i++) {
      const day = result[0].rows.item(i);
      runningBalance += day.expected_receipts - day.expected_payments;
      
      forecast.push({
        date: day.date,
        expectedReceipts: day.expected_receipts,
        expectedPayments: day.expected_payments,
        netChange: day.expected_receipts - day.expected_payments,
        projectedBalance: runningBalance
      });
    }

    return {
      currentCash,
      forecast,
      lowestProjectedBalance: Math.min(...forecast.map(f => f.projectedBalance)),
      highestProjectedBalance: Math.max(...forecast.map(f => f.projectedBalance))
    };
  }
}

export default {
  BankIntelligenceEngine,
  CashDisciplineEngine
};
