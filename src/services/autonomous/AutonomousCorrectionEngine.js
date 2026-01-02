/**
 * AUTONOMOUS CORRECTION ENGINE
 * 
 * Self-healing accounting system
 * Silently fixes common errors
 * Only escalates when necessary
 * No other accounting app does this!
 */

import { getDatabase } from '../database/schema';

/**
 * AUTONOMOUS CORRECTION ENGINE
 * Automatically detects and fixes accounting errors
 */
export class AutonomousCorrectionEngine {

  /**
   * RUN AUTONOMOUS CORRECTIONS
   * Main entry point - runs all correction checks
   */
  static async runAutonomousCorrections() {
    const db = await getDatabase();
    const corrections = {
      duplicates: [],
      classifications: [],
      patterns: [],
      escalations: []
    };

    try {
      // 1. Fix duplicate entries
      corrections.duplicates = await this.fixDuplicateEntries(db);

      // 2. Fix minor classification errors
      corrections.classifications = await this.fixClassificationErrors(db);

      // 3. Fix repeated patterns
      corrections.patterns = await this.fixRepeatedPatterns(db);

      // 4. Identify escalations
      corrections.escalations = await this.identifyEscalations(db);

      // Log corrections
      await this.logCorrections(db, corrections);

      return corrections;
    } catch (error) {
      console.error('Autonomous correction failed:', error);
      throw error;
    }
  }

  /**
   * FIX DUPLICATE ENTRIES
   * Detects and removes duplicate transactions
   */
  static async fixDuplicateEntries(db) {
    const duplicates = [];

    // Find potential duplicates (same amount, date, party within 1 minute)
    const query = `
      SELECT 
        t1.id as id1,
        t2.id as id2,
        t1.date,
        t1.total_amount,
        t1.narration,
        t1.party_id
      FROM transactions t1
      INNER JOIN transactions t2 ON 
        t1.total_amount = t2.total_amount
        AND t1.party_id = t2.party_id
        AND DATE(t1.date) = DATE(t2.date)
        AND ABS(JULIANDAY(t1.created_at) - JULIANDAY(t2.created_at)) * 24 * 60 < 1
        AND t1.id < t2.id
      WHERE t1.status = 'POSTED'
      AND t2.status = 'POSTED'
      AND t1.voucher_type = t2.voucher_type
    `;

    const result = await db.executeSql(query);

    for (let i = 0; i < result[0].rows.length; i++) {
      const dup = result[0].rows.item(i);

      // Verify it's truly a duplicate
      if (await this.verifyDuplicate(db, dup.id1, dup.id2)) {
        // Mark second entry as duplicate
        await db.transaction(async (tx) => {
          await tx.executeSql(
            `UPDATE transactions 
             SET status = 'DUPLICATE', 
                 duplicate_of = ?,
                 corrected_at = ?,
                 correction_type = 'AUTO_DUPLICATE_REMOVAL'
             WHERE id = ?`,
            [dup.id1, new Date().toISOString(), dup.id2]
          );

          // Reverse ledger entries
          await tx.executeSql(
            `UPDATE ledger 
             SET status = 'REVERSED'
             WHERE transaction_id = ?`,
            [dup.id2]
          );
        });

        duplicates.push({
          type: 'DUPLICATE_REMOVED',
          transactionId: dup.id2,
          originalId: dup.id1,
          amount: dup.total_amount,
          date: dup.date,
          autoFixed: true
        });
      }
    }

    return duplicates;
  }

  /**
   * VERIFY DUPLICATE
   * Checks if two transactions are truly duplicates
   */
  static async verifyDuplicate(db, id1, id2) {
    // Compare ledger entries
    const query = `
      SELECT 
        l1.account_name,
        l1.debit,
        l1.credit
      FROM ledger l1
      WHERE l1.transaction_id = ?
      ORDER BY l1.account_name
    `;

    const result1 = await db.executeSql(query, [id1]);
    const result2 = await db.executeSql(query, [id2]);

    if (result1[0].rows.length !== result2[0].rows.length) {
      return false;
    }

    // Compare each ledger entry
    for (let i = 0; i < result1[0].rows.length; i++) {
      const entry1 = result1[0].rows.item(i);
      const entry2 = result2[0].rows.item(i);

      if (entry1.account_name !== entry2.account_name ||
          Math.abs(entry1.debit - entry2.debit) > 0.01 ||
          Math.abs(entry1.credit - entry2.credit) > 0.01) {
        return false;
      }
    }

    return true;
  }

  /**
   * FIX CLASSIFICATION ERRORS
   * Corrects minor expense/income classification mistakes
   */
  static async fixClassificationErrors(db) {
    const corrections = [];

    // Find misclassified expenses based on patterns
    const query = `
      SELECT 
        t.id,
        t.narration,
        l.account_name,
        t.total_amount,
        t.date
      FROM transactions t
      INNER JOIN ledger l ON t.id = l.transaction_id
      WHERE t.voucher_type = 'EXPENSE'
      AND l.debit > 0
      AND t.status = 'POSTED'
      AND t.corrected_at IS NULL
    `;

    const result = await db.executeSql(query);

    for (let i = 0; i < result[0].rows.length; i++) {
      const txn = result[0].rows.item(i);
      
      // Check if classification is wrong
      const correctCategory = await this.getCorrectCategory(txn.narration, txn.account_name);

      if (correctCategory && correctCategory !== txn.account_name) {
        // Check if impact is minor (< ₹1000 or < 5% of monthly expenses)
        const isMinor = await this.isMinorImpact(db, txn.total_amount);

        if (isMinor) {
          // Auto-fix
          await db.transaction(async (tx) => {
            await tx.executeSql(
              `UPDATE ledger 
               SET account_name = ?,
                   corrected_at = ?,
                   correction_type = 'AUTO_RECLASSIFICATION'
               WHERE transaction_id = ?
               AND account_name = ?`,
              [correctCategory, new Date().toISOString(), txn.id, txn.account_name]
            );

            await tx.executeSql(
              `UPDATE transactions
               SET corrected_at = ?,
                   correction_type = 'AUTO_RECLASSIFICATION'
               WHERE id = ?`,
              [new Date().toISOString(), txn.id]
            );
          });

          corrections.push({
            type: 'RECLASSIFICATION',
            transactionId: txn.id,
            from: txn.account_name,
            to: correctCategory,
            amount: txn.total_amount,
            reason: 'Pattern-based correction',
            autoFixed: true
          });
        } else {
          // Escalate for human review
          corrections.push({
            type: 'RECLASSIFICATION_NEEDED',
            transactionId: txn.id,
            from: txn.account_name,
            to: correctCategory,
            amount: txn.total_amount,
            reason: 'High impact - needs approval',
            autoFixed: false,
            escalated: true
          });
        }
      }
    }

    return corrections;
  }

  /**
   * GET CORRECT CATEGORY
   * Uses AI/pattern matching to determine correct expense category
   */
  static async getCorrectCategory(narration, currentCategory) {
    const patterns = {
      'Rent': ['rent', 'lease', 'rental'],
      'Utilities': ['electricity', 'water', 'internet', 'phone', 'mobile'],
      'Salaries': ['salary', 'wages', 'payroll', 'staff'],
      'Transportation': ['fuel', 'petrol', 'diesel', 'transport', 'taxi', 'uber'],
      'Office Supplies': ['stationery', 'paper', 'pen', 'office'],
      'Marketing': ['advertising', 'marketing', 'promotion', 'social media'],
      'Insurance': ['insurance', 'premium'],
      'Maintenance': ['repair', 'maintenance', 'service']
    };

    const narrationLower = narration.toLowerCase();

    for (const [category, keywords] of Object.entries(patterns)) {
      for (const keyword of keywords) {
        if (narrationLower.includes(keyword)) {
          if (category !== currentCategory) {
            return category;
          }
        }
      }
    }

    return null;
  }

  /**
   * IS MINOR IMPACT
   * Checks if correction has minor financial impact
   */
  static async isMinorImpact(db, amount) {
    // Minor if < ₹1000
    if (amount < 1000) return true;

    // Or < 5% of monthly expenses
    const query = `
      SELECT SUM(total_amount) as monthly_expenses
      FROM transactions
      WHERE voucher_type = 'EXPENSE'
      AND DATE(date) >= DATE('now', '-30 days')
    `;

    const result = await db.executeSql(query);
    const monthlyExpenses = result[0].rows.item(0).monthly_expenses || 0;

    return amount < (monthlyExpenses * 0.05);
  }

  /**
   * FIX REPEATED PATTERNS
   * Learns from user corrections and applies to similar transactions
   */
  static async fixRepeatedPatterns(db) {
    const corrections = [];

    // Find user corrections in last 30 days
    const userCorrectionsQuery = `
      SELECT 
        t.narration,
        l_old.account_name as old_category,
        l_new.account_name as new_category,
        COUNT(*) as correction_count
      FROM transactions t
      INNER JOIN ledger l_old ON t.id = l_old.transaction_id
      INNER JOIN ledger l_new ON t.id = l_new.transaction_id
      WHERE t.corrected_at IS NOT NULL
      AND t.correction_type = 'USER_CORRECTION'
      AND DATE(t.corrected_at) >= DATE('now', '-30 days')
      AND l_old.corrected_at IS NOT NULL
      AND l_new.corrected_at IS NULL
      GROUP BY t.narration, l_old.account_name, l_new.account_name
      HAVING correction_count >= 2
    `;

    const patterns = await db.executeSql(userCorrectionsQuery);

    for (let i = 0; i < patterns[0].rows.length; i++) {
      const pattern = patterns[0].rows.item(i);

      // Find similar uncorrected transactions
      const similarQuery = `
        SELECT t.id, t.narration, t.total_amount, l.account_name
        FROM transactions t
        INNER JOIN ledger l ON t.id = l.transaction_id
        WHERE t.narration LIKE ?
        AND l.account_name = ?
        AND t.corrected_at IS NULL
        AND t.status = 'POSTED'
      `;

      const similar = await db.executeSql(similarQuery, [
        `%${pattern.narration}%`,
        pattern.old_category
      ]);

      for (let j = 0; j < similar[0].rows.length; j++) {
        const txn = similar[0].rows.item(j);

        // Auto-apply pattern
        await db.transaction(async (tx) => {
          await tx.executeSql(
            `UPDATE ledger 
             SET account_name = ?,
                 corrected_at = ?,
                 correction_type = 'AUTO_PATTERN_LEARNING'
             WHERE transaction_id = ?
             AND account_name = ?`,
            [pattern.new_category, new Date().toISOString(), txn.id, pattern.old_category]
          );

          await tx.executeSql(
            `UPDATE transactions
             SET corrected_at = ?,
                 correction_type = 'AUTO_PATTERN_LEARNING'
             WHERE id = ?`,
            [new Date().toISOString(), txn.id]
          );
        });

        corrections.push({
          type: 'PATTERN_APPLIED',
          transactionId: txn.id,
          from: pattern.old_category,
          to: pattern.new_category,
          amount: txn.total_amount,
          reason: `Learned from ${pattern.correction_count} similar corrections`,
          autoFixed: true
        });
      }
    }

    return corrections;
  }

  /**
   * IDENTIFY ESCALATIONS
   * Finds issues that need human intervention
   */
  static async identifyEscalations(db) {
    const escalations = [];

    // 1. High-value mismatches
    const highValueQuery = `
      SELECT 
        t.id,
        t.date,
        t.total_amount,
        t.narration,
        t.voucher_type
      FROM transactions t
      WHERE t.total_amount > 50000
      AND t.reconciliation_status = 'PENDING'
      AND DATE(t.date) >= DATE('now', '-7 days')
    `;

    const highValue = await db.executeSql(highValueQuery);
    for (let i = 0; i < highValue[0].rows.length; i++) {
      escalations.push({
        type: 'HIGH_VALUE_UNRECONCILED',
        severity: 'HIGH',
        transaction: highValue[0].rows.item(i),
        reason: 'High-value transaction not reconciled',
        requiresApproval: true
      });
    }

    // 2. Tax discrepancies
    const taxQuery = `
      SELECT 
        t.id,
        t.date,
        t.total_amount,
        tt.tax_amount,
        tt.tax_rate
      FROM transactions t
      INNER JOIN tax_transactions tt ON t.id = tt.transaction_id
      WHERE ABS(tt.tax_amount - (tt.taxable_amount * tt.tax_rate / 100)) > 10
    `;

    const taxIssues = await db.executeSql(taxQuery);
    for (let i = 0; i < taxIssues[0].rows.length; i++) {
      escalations.push({
        type: 'TAX_DISCREPANCY',
        severity: 'CRITICAL',
        transaction: taxIssues[0].rows.item(i),
        reason: 'Tax calculation mismatch',
        requiresApproval: true
      });
    }

    // 3. Unusual patterns
    const unusualQuery = `
      SELECT 
        t.id,
        t.date,
        t.total_amount,
        t.narration,
        AVG(t2.total_amount) as avg_amount
      FROM transactions t
      INNER JOIN transactions t2 ON 
        t.voucher_type = t2.voucher_type
        AND DATE(t2.date) >= DATE('now', '-90 days')
      WHERE t.total_amount > (SELECT AVG(total_amount) * 3 FROM transactions WHERE voucher_type = t.voucher_type)
      AND DATE(t.date) >= DATE('now', '-7 days')
      GROUP BY t.id
    `;

    const unusual = await db.executeSql(unusualQuery);
    for (let i = 0; i < unusual[0].rows.length; i++) {
      const txn = unusual[0].rows.item(i);
      escalations.push({
        type: 'UNUSUAL_AMOUNT',
        severity: 'MEDIUM',
        transaction: txn,
        reason: `Amount is 3x higher than average (₹${txn.avg_amount.toFixed(2)})`,
        requiresApproval: false
      });
    }

    return escalations;
  }

  /**
   * LOG CORRECTIONS
   * Records all corrections for audit trail
   */
  static async logCorrections(db, corrections) {
    const timestamp = new Date().toISOString();

    await db.transaction(async (tx) => {
      for (const [type, items] of Object.entries(corrections)) {
        for (const item of items) {
          await tx.executeSql(
            `INSERT INTO correction_log (
              correction_type, transaction_id, details,
              auto_fixed, escalated, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              item.type,
              item.transactionId || null,
              JSON.stringify(item),
              item.autoFixed || false,
              item.escalated || false,
              timestamp
            ]
          );
        }
      }
    });
  }

  /**
   * GET CORRECTION SUMMARY
   * Returns summary of recent corrections
   */
  static async getCorrectionSummary(days = 30) {
    const db = await getDatabase();

    const query = `
      SELECT 
        correction_type,
        COUNT(*) as count,
        SUM(CASE WHEN auto_fixed = 1 THEN 1 ELSE 0 END) as auto_fixed_count,
        SUM(CASE WHEN escalated = 1 THEN 1 ELSE 0 END) as escalated_count
      FROM correction_log
      WHERE DATE(created_at) >= DATE('now', '-${days} days')
      GROUP BY correction_type
    `;

    const result = await db.executeSql(query);
    const summary = {
      totalCorrections: 0,
      autoFixed: 0,
      escalated: 0,
      byType: {}
    };

    for (let i = 0; i < result[0].rows.length; i++) {
      const row = result[0].rows.item(i);
      summary.totalCorrections += row.count;
      summary.autoFixed += row.auto_fixed_count;
      summary.escalated += row.escalated_count;
      summary.byType[row.correction_type] = {
        count: row.count,
        autoFixed: row.auto_fixed_count,
        escalated: row.escalated_count
      };
    }

    return summary;
  }

  /**
   * GET ESCALATIONS FOR REVIEW
   * Returns items that need human approval
   */
  static async getEscalationsForReview() {
    const db = await getDatabase();

    const query = `
      SELECT 
        cl.id,
        cl.correction_type,
        cl.transaction_id,
        cl.details,
        cl.created_at,
        t.date as transaction_date,
        t.total_amount,
        t.narration
      FROM correction_log cl
      LEFT JOIN transactions t ON cl.transaction_id = t.id
      WHERE cl.escalated = 1
      AND cl.reviewed = 0
      ORDER BY cl.created_at DESC
    `;

    const result = await db.executeSql(query);
    const escalations = [];

    for (let i = 0; i < result[0].rows.length; i++) {
      const row = result[0].rows.item(i);
      escalations.push({
        ...row,
        details: JSON.parse(row.details)
      });
    }

    return escalations;
  }

  /**
   * APPROVE CORRECTION
   * Marks escalation as reviewed and approved
   */
  static async approveCorrection(correctionId, userId) {
    const db = await getDatabase();

    await db.executeSql(
      `UPDATE correction_log
       SET reviewed = 1,
           approved = 1,
           reviewed_by = ?,
           reviewed_at = ?
       WHERE id = ?`,
      [userId, new Date().toISOString(), correctionId]
    );
  }

  /**
   * REJECT CORRECTION
   * Marks escalation as reviewed and rejected
   */
  static async rejectCorrection(correctionId, userId, reason) {
    const db = await getDatabase();

    await db.executeSql(
      `UPDATE correction_log
       SET reviewed = 1,
           approved = 0,
           reviewed_by = ?,
           reviewed_at = ?,
           rejection_reason = ?
       WHERE id = ?`,
      [userId, new Date().toISOString(), reason, correctionId]
    );
  }
}

export default AutonomousCorrectionEngine;
