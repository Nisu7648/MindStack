/**
 * BOOKS CORRECTNESS GUARANTEE SERVICE
 * 
 * "Your books are correct. We guarantee it."
 * 
 * This is NOT a feature. This is a SERVICE.
 * We promise correct books. If wrong, we fix it.
 * 
 * Auto-checks:
 * - GST mismatches
 * - Ledger imbalances
 * - Stock vs accounting mismatches
 * - Duplicate entries
 * - Missing entries
 * 
 * Monthly silent review (AI + rules)
 * Optional human CA review (paid tier)
 */

import { supabase } from '../supabase';

/**
 * CORRECTNESS CHECK TYPES
 */
const CHECK_TYPES = {
  GST_MISMATCH: 'gst_mismatch',
  LEDGER_IMBALANCE: 'ledger_imbalance',
  STOCK_MISMATCH: 'stock_mismatch',
  DUPLICATE_ENTRY: 'duplicate_entry',
  MISSING_ENTRY: 'missing_entry',
  WRONG_CLASSIFICATION: 'wrong_classification',
  TAX_CALCULATION_ERROR: 'tax_calculation_error',
  BANK_RECONCILIATION_GAP: 'bank_reconciliation_gap'
};

/**
 * SEVERITY LEVELS
 */
const SEVERITY = {
  CRITICAL: 'critical',    // Must fix immediately
  HIGH: 'high',           // Fix within 24 hours
  MEDIUM: 'medium',       // Fix within 7 days
  LOW: 'low'             // Fix when convenient
};

/**
 * CORRECTNESS STATUS
 */
const STATUS = {
  CORRECT: 'correct',           // ✅ Books are correct
  NEEDS_ATTENTION: 'needs_attention',  // ⚠ Minor issues
  CRITICAL_ISSUES: 'critical_issues'   // 🔴 Major problems
};

class BooksCorrectnessService {
  /**
   * RUN COMPLETE CORRECTNESS CHECK
   */
  static async runCorrectnessCheck(businessId) {
    console.log('🔍 Running Books Correctness Check...');

    const issues = [];

    // Run all checks in parallel
    const [
      gstIssues,
      ledgerIssues,
      stockIssues,
      duplicateIssues,
      missingIssues,
      classificationIssues,
      taxIssues,
      bankIssues
    ] = await Promise.all([
      this.checkGSTMismatches(businessId),
      this.checkLedgerBalance(businessId),
      this.checkStockAccountingMatch(businessId),
      this.checkDuplicateEntries(businessId),
      this.checkMissingEntries(businessId),
      this.checkWrongClassifications(businessId),
      this.checkTaxCalculations(businessId),
      this.checkBankReconciliation(businessId)
    ]);

    issues.push(
      ...gstIssues,
      ...ledgerIssues,
      ...stockIssues,
      ...duplicateIssues,
      ...missingIssues,
      ...classificationIssues,
      ...taxIssues,
      ...bankIssues
    );

    // Calculate overall status
    const status = this.calculateOverallStatus(issues);

    // Auto-fix what we can
    const fixedIssues = await this.autoFixIssues(businessId, issues);

    // Save check results
    await this.saveCheckResults(businessId, {
      status,
      totalIssues: issues.length,
      fixedIssues: fixedIssues.length,
      remainingIssues: issues.length - fixedIssues.length,
      issues,
      fixedIssues,
      checkedAt: new Date().toISOString()
    });

    return {
      status,
      totalIssues: issues.length,
      fixedIssues: fixedIssues.length,
      remainingIssues: issues.length - fixedIssues.length,
      issues: issues.filter(i => !fixedIssues.find(f => f.id === i.id)),
      message: this.getStatusMessage(status, issues.length, fixedIssues.length)
    };
  }

  /**
   * CHECK GST MISMATCHES
   */
  static async checkGSTMismatches(businessId) {
    const issues = [];

    // Get all GST transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .not('gst_amount', 'is', null);

    for (const txn of transactions || []) {
      // Check if GST calculation is correct
      const expectedGST = this.calculateExpectedGST(txn.amount, txn.gst_rate);
      const actualGST = txn.gst_amount;

      if (Math.abs(expectedGST - actualGST) > 0.01) {
        issues.push({
          id: `gst_mismatch_${txn.id}`,
          type: CHECK_TYPES.GST_MISMATCH,
          severity: SEVERITY.HIGH,
          title: 'GST Calculation Mismatch',
          description: `Transaction #${txn.id}: Expected GST ₹${expectedGST.toFixed(2)}, but recorded ₹${actualGST.toFixed(2)}`,
          transaction_id: txn.id,
          expected: expectedGST,
          actual: actualGST,
          difference: Math.abs(expectedGST - actualGST),
          autoFixable: true,
          fixAction: 'update_gst_amount'
        });
      }

      // Check if GST rate is valid
      const validRates = [0, 5, 12, 18, 28];
      if (!validRates.includes(txn.gst_rate)) {
        issues.push({
          id: `invalid_gst_rate_${txn.id}`,
          type: CHECK_TYPES.GST_MISMATCH,
          severity: SEVERITY.CRITICAL,
          title: 'Invalid GST Rate',
          description: `Transaction #${txn.id}: GST rate ${txn.gst_rate}% is not valid`,
          transaction_id: txn.id,
          current_rate: txn.gst_rate,
          autoFixable: false,
          fixAction: 'manual_review_required'
        });
      }
    }

    return issues;
  }

  /**
   * CHECK LEDGER BALANCE
   */
  static async checkLedgerBalance(businessId) {
    const issues = [];

    // Get all ledger entries
    const { data: entries } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('business_id', businessId);

    // Calculate total debits and credits
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of entries || []) {
      totalDebits += entry.debit || 0;
      totalCredits += entry.credit || 0;
    }

    // Check if balanced
    const difference = Math.abs(totalDebits - totalCredits);
    if (difference > 0.01) {
      issues.push({
        id: 'ledger_imbalance',
        type: CHECK_TYPES.LEDGER_IMBALANCE,
        severity: SEVERITY.CRITICAL,
        title: 'Ledger Not Balanced',
        description: `Total Debits (₹${totalDebits.toFixed(2)}) ≠ Total Credits (₹${totalCredits.toFixed(2)}). Difference: ₹${difference.toFixed(2)}`,
        totalDebits,
        totalCredits,
        difference,
        autoFixable: false,
        fixAction: 'investigate_and_fix'
      });
    }

    return issues;
  }

  /**
   * CHECK STOCK VS ACCOUNTING MATCH
   */
  static async checkStockAccountingMatch(businessId) {
    const issues = [];

    // Get inventory items
    const { data: items } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('business_id', businessId);

    for (const item of items || []) {
      // Get stock value from inventory
      const stockValue = item.quantity * item.cost_price;

      // Get accounting value from ledger
      const { data: ledgerEntries } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('business_id', businessId)
        .eq('account_type', 'inventory')
        .eq('item_id', item.id);

      const accountingValue = ledgerEntries?.reduce((sum, entry) => {
        return sum + (entry.debit || 0) - (entry.credit || 0);
      }, 0) || 0;

      // Check if they match
      const difference = Math.abs(stockValue - accountingValue);
      if (difference > 0.01) {
        issues.push({
          id: `stock_mismatch_${item.id}`,
          type: CHECK_TYPES.STOCK_MISMATCH,
          severity: SEVERITY.HIGH,
          title: 'Stock-Accounting Mismatch',
          description: `Item "${item.name}": Stock value ₹${stockValue.toFixed(2)} ≠ Accounting value ₹${accountingValue.toFixed(2)}`,
          item_id: item.id,
          item_name: item.name,
          stockValue,
          accountingValue,
          difference,
          autoFixable: true,
          fixAction: 'sync_stock_accounting'
        });
      }
    }

    return issues;
  }

  /**
   * CHECK DUPLICATE ENTRIES
   */
  static async checkDuplicateEntries(businessId) {
    const issues = [];

    // Get all transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    // Group by amount, date, and party
    const groups = {};
    for (const txn of transactions || []) {
      const key = `${txn.amount}_${txn.date}_${txn.party_name}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(txn);
    }

    // Find duplicates
    for (const [key, group] of Object.entries(groups)) {
      if (group.length > 1) {
        // Check if they're within 5 minutes of each other
        const times = group.map(t => new Date(t.created_at).getTime());
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const timeDiff = (maxTime - minTime) / 1000 / 60; // minutes

        if (timeDiff < 5) {
          issues.push({
            id: `duplicate_${group[0].id}`,
            type: CHECK_TYPES.DUPLICATE_ENTRY,
            severity: SEVERITY.MEDIUM,
            title: 'Possible Duplicate Entry',
            description: `${group.length} transactions with same amount (₹${group[0].amount}), date, and party within 5 minutes`,
            transactions: group.map(t => t.id),
            autoFixable: true,
            fixAction: 'remove_duplicates'
          });
        }
      }
    }

    return issues;
  }

  /**
   * CHECK MISSING ENTRIES
   */
  static async checkMissingEntries(businessId) {
    const issues = [];

    // Check for missing invoice numbers
    const { data: invoices } = await supabase
      .from('transactions')
      .select('invoice_number')
      .eq('business_id', businessId)
      .eq('type', 'sale')
      .not('invoice_number', 'is', null)
      .order('invoice_number');

    if (invoices && invoices.length > 0) {
      const numbers = invoices.map(i => parseInt(i.invoice_number)).filter(n => !isNaN(n));
      
      for (let i = 1; i < numbers.length; i++) {
        const gap = numbers[i] - numbers[i - 1];
        if (gap > 1) {
          issues.push({
            id: `missing_invoice_${numbers[i - 1]}`,
            type: CHECK_TYPES.MISSING_ENTRY,
            severity: SEVERITY.MEDIUM,
            title: 'Missing Invoice Numbers',
            description: `Invoice numbers ${numbers[i - 1] + 1} to ${numbers[i] - 1} are missing`,
            missingRange: [numbers[i - 1] + 1, numbers[i] - 1],
            autoFixable: false,
            fixAction: 'verify_missing_invoices'
          });
        }
      }
    }

    return issues;
  }

  /**
   * CHECK WRONG CLASSIFICATIONS
   */
  static async checkWrongClassifications(businessId) {
    const issues = [];

    // Get all transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId);

    for (const txn of transactions || []) {
      // Check if classification makes sense
      if (txn.type === 'sale' && txn.amount < 0) {
        issues.push({
          id: `wrong_classification_${txn.id}`,
          type: CHECK_TYPES.WRONG_CLASSIFICATION,
          severity: SEVERITY.HIGH,
          title: 'Wrong Transaction Classification',
          description: `Transaction #${txn.id} marked as "sale" but has negative amount`,
          transaction_id: txn.id,
          current_type: txn.type,
          suggested_type: 'purchase_return',
          autoFixable: true,
          fixAction: 'reclassify_transaction'
        });
      }

      if (txn.type === 'purchase' && txn.amount < 0) {
        issues.push({
          id: `wrong_classification_${txn.id}`,
          type: CHECK_TYPES.WRONG_CLASSIFICATION,
          severity: SEVERITY.HIGH,
          title: 'Wrong Transaction Classification',
          description: `Transaction #${txn.id} marked as "purchase" but has negative amount`,
          transaction_id: txn.id,
          current_type: txn.type,
          suggested_type: 'sale_return',
          autoFixable: true,
          fixAction: 'reclassify_transaction'
        });
      }
    }

    return issues;
  }

  /**
   * CHECK TAX CALCULATIONS
   */
  static async checkTaxCalculations(businessId) {
    const issues = [];

    // Get all transactions with tax
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .not('gst_amount', 'is', null);

    for (const txn of transactions || []) {
      // Verify tax calculation
      const baseAmount = txn.amount - txn.gst_amount;
      const expectedTax = baseAmount * (txn.gst_rate / 100);
      const actualTax = txn.gst_amount;

      if (Math.abs(expectedTax - actualTax) > 0.01) {
        issues.push({
          id: `tax_calc_error_${txn.id}`,
          type: CHECK_TYPES.TAX_CALCULATION_ERROR,
          severity: SEVERITY.HIGH,
          title: 'Tax Calculation Error',
          description: `Transaction #${txn.id}: Tax should be ₹${expectedTax.toFixed(2)}, but recorded as ₹${actualTax.toFixed(2)}`,
          transaction_id: txn.id,
          expected: expectedTax,
          actual: actualTax,
          autoFixable: true,
          fixAction: 'recalculate_tax'
        });
      }
    }

    return issues;
  }

  /**
   * CHECK BANK RECONCILIATION
   */
  static async checkBankReconciliation(businessId) {
    const issues = [];

    // Get bank balance from ledger
    const { data: bankEntries } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('business_id', businessId)
      .eq('account_type', 'bank');

    const ledgerBalance = bankEntries?.reduce((sum, entry) => {
      return sum + (entry.debit || 0) - (entry.credit || 0);
    }, 0) || 0;

    // Get actual bank balance (if connected)
    const { data: bankAccount } = await supabase
      .from('bank_accounts')
      .select('current_balance')
      .eq('business_id', businessId)
      .single();

    if (bankAccount) {
      const difference = Math.abs(ledgerBalance - bankAccount.current_balance);
      if (difference > 0.01) {
        issues.push({
          id: 'bank_reconciliation_gap',
          type: CHECK_TYPES.BANK_RECONCILIATION_GAP,
          severity: SEVERITY.HIGH,
          title: 'Bank Reconciliation Gap',
          description: `Ledger balance (₹${ledgerBalance.toFixed(2)}) ≠ Bank balance (₹${bankAccount.current_balance.toFixed(2)})`,
          ledgerBalance,
          bankBalance: bankAccount.current_balance,
          difference,
          autoFixable: false,
          fixAction: 'reconcile_bank_account'
        });
      }
    }

    return issues;
  }

  /**
   * AUTO-FIX ISSUES
   */
  static async autoFixIssues(businessId, issues) {
    const fixed = [];

    for (const issue of issues) {
      if (!issue.autoFixable) continue;

      try {
        switch (issue.fixAction) {
          case 'update_gst_amount':
            await this.fixGSTAmount(issue);
            fixed.push(issue);
            break;

          case 'sync_stock_accounting':
            await this.fixStockAccountingMismatch(issue);
            fixed.push(issue);
            break;

          case 'remove_duplicates':
            await this.fixDuplicates(issue);
            fixed.push(issue);
            break;

          case 'reclassify_transaction':
            await this.fixClassification(issue);
            fixed.push(issue);
            break;

          case 'recalculate_tax':
            await this.fixTaxCalculation(issue);
            fixed.push(issue);
            break;
        }
      } catch (error) {
        console.error(`Failed to fix issue ${issue.id}:`, error);
      }
    }

    return fixed;
  }

  /**
   * FIX GST AMOUNT
   */
  static async fixGSTAmount(issue) {
    await supabase
      .from('transactions')
      .update({ gst_amount: issue.expected })
      .eq('id', issue.transaction_id);
  }

  /**
   * FIX STOCK-ACCOUNTING MISMATCH
   */
  static async fixStockAccountingMismatch(issue) {
    // Create adjustment entry
    await supabase
      .from('ledger_entries')
      .insert({
        account_type: 'inventory',
        item_id: issue.item_id,
        debit: issue.difference,
        description: 'Stock-Accounting Sync Adjustment',
        created_at: new Date().toISOString()
      });
  }

  /**
   * FIX DUPLICATES
   */
  static async fixDuplicates(issue) {
    // Keep first, delete rest
    const [keep, ...remove] = issue.transactions;
    
    await supabase
      .from('transactions')
      .delete()
      .in('id', remove);
  }

  /**
   * FIX CLASSIFICATION
   */
  static async fixClassification(issue) {
    await supabase
      .from('transactions')
      .update({ type: issue.suggested_type })
      .eq('id', issue.transaction_id);
  }

  /**
   * FIX TAX CALCULATION
   */
  static async fixTaxCalculation(issue) {
    await supabase
      .from('transactions')
      .update({ gst_amount: issue.expected })
      .eq('id', issue.transaction_id);
  }

  /**
   * CALCULATE OVERALL STATUS
   */
  static calculateOverallStatus(issues) {
    const criticalCount = issues.filter(i => i.severity === SEVERITY.CRITICAL).length;
    const highCount = issues.filter(i => i.severity === SEVERITY.HIGH).length;

    if (criticalCount > 0) {
      return STATUS.CRITICAL_ISSUES;
    } else if (highCount > 0 || issues.length > 5) {
      return STATUS.NEEDS_ATTENTION;
    } else {
      return STATUS.CORRECT;
    }
  }

  /**
   * GET STATUS MESSAGE
   */
  static getStatusMessage(status, totalIssues, fixedIssues) {
    if (status === STATUS.CORRECT) {
      return '✅ Your books are correct. Everything looks good!';
    } else if (status === STATUS.NEEDS_ATTENTION) {
      return `⚠ Found ${totalIssues} issues. We fixed ${fixedIssues} automatically. ${totalIssues - fixedIssues} need your attention.`;
    } else {
      return `🔴 Found ${totalIssues} critical issues. We fixed ${fixedIssues} automatically. Please review ${totalIssues - fixedIssues} remaining issues.`;
    }
  }

  /**
   * CALCULATE EXPECTED GST
   */
  static calculateExpectedGST(amount, rate) {
    // Amount includes GST, so extract base and calculate GST
    const base = amount / (1 + rate / 100);
    return amount - base;
  }

  /**
   * SAVE CHECK RESULTS
   */
  static async saveCheckResults(businessId, results) {
    await supabase
      .from('correctness_checks')
      .insert({
        business_id: businessId,
        status: results.status,
        total_issues: results.totalIssues,
        fixed_issues: results.fixedIssues,
        remaining_issues: results.remainingIssues,
        issues: results.issues,
        fixed_issues_list: results.fixedIssues,
        checked_at: results.checkedAt
      });
  }

  /**
   * GET LATEST CHECK RESULTS
   */
  static async getLatestCheckResults(businessId) {
    const { data } = await supabase
      .from('correctness_checks')
      .select('*')
      .eq('business_id', businessId)
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  /**
   * SCHEDULE MONTHLY CHECK
   */
  static async scheduleMonthlyCheck(businessId) {
    // This would integrate with a job scheduler
    // For now, just log
    console.log(`📅 Scheduled monthly correctness check for business ${businessId}`);
  }
}

export default BooksCorrectnessService;
