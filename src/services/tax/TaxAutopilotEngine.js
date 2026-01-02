/**
 * TAX AUTOPILOT ENGINE
 * 
 * Country-aware tax calculation
 * Automatic tax posting per transaction
 * Continuous tax readiness tracking
 * No manual tax intervention required
 */

import { getDatabase } from '../database/schema';

/**
 * TAX CONFIGURATION BY COUNTRY
 * Stores tax rules for different countries
 */
const TAX_RULES = {
  IN: { // India
    type: 'GST',
    rates: {
      standard: 18,
      reduced: [5, 12],
      zero: 0,
      exempt: null
    },
    components: {
      intraState: ['CGST', 'SGST'], // Within same state
      interState: ['IGST'] // Between different states
    },
    thresholds: {
      registration: 4000000, // ₹40 lakhs
      composition: 15000000  // ₹1.5 crore
    },
    filingFrequency: 'MONTHLY',
    returnForms: ['GSTR-1', 'GSTR-3B', 'GSTR-9']
  },
  US: { // United States
    type: 'SALES_TAX',
    rates: {
      federal: 0,
      state: 'VARIES', // State-specific
      local: 'VARIES'  // City/county-specific
    },
    nexus: true, // Physical/economic presence required
    filingFrequency: 'VARIES',
    returnForms: ['STATE_SPECIFIC']
  },
  GB: { // United Kingdom
    type: 'VAT',
    rates: {
      standard: 20,
      reduced: 5,
      zero: 0,
      exempt: null
    },
    thresholds: {
      registration: 85000 // £85,000
    },
    filingFrequency: 'QUARTERLY',
    returnForms: ['VAT_RETURN']
  },
  AU: { // Australia
    type: 'GST',
    rates: {
      standard: 10,
      zero: 0,
      exempt: null
    },
    thresholds: {
      registration: 75000 // AUD 75,000
    },
    filingFrequency: 'QUARTERLY',
    returnForms: ['BAS']
  }
};

/**
 * TAX AUTOPILOT ENGINE
 * Automatically calculates and posts tax for every transaction
 */
export class TaxAutopilotEngine {

  /**
   * CALCULATE TAX FOR TRANSACTION
   * Country-aware tax calculation
   */
  static async calculateTaxForTransaction(transactionData) {
    const { country, amount, transactionType, customerState, businessState, productCategory } = transactionData;
    
    const taxRules = TAX_RULES[country] || TAX_RULES.IN; // Default to India
    
    let taxCalculation = {
      taxableAmount: amount,
      taxAmount: 0,
      taxRate: 0,
      taxType: taxRules.type,
      components: {},
      exemptionReason: null
    };

    // Check if exempt
    if (this.isExempt(productCategory, taxRules)) {
      taxCalculation.exemptionReason = 'EXEMPT_CATEGORY';
      return taxCalculation;
    }

    // Calculate based on country
    switch (taxRules.type) {
      case 'GST':
        taxCalculation = await this.calculateGST(transactionData, taxRules);
        break;
      case 'VAT':
        taxCalculation = await this.calculateVAT(transactionData, taxRules);
        break;
      case 'SALES_TAX':
        taxCalculation = await this.calculateSalesTax(transactionData, taxRules);
        break;
    }

    return taxCalculation;
  }

  /**
   * CALCULATE GST (India/Australia)
   */
  static async calculateGST(transactionData, taxRules) {
    const { amount, customerState, businessState, gstRate } = transactionData;
    
    const rate = gstRate || taxRules.rates.standard;
    const taxableAmount = amount;
    const taxAmount = (taxableAmount * rate) / 100;

    let components = {};

    if (taxRules.components.intraState && customerState === businessState) {
      // Intra-state: CGST + SGST
      components.CGST = taxAmount / 2;
      components.SGST = taxAmount / 2;
    } else {
      // Inter-state: IGST
      components.IGST = taxAmount;
    }

    return {
      taxableAmount,
      taxAmount,
      taxRate: rate,
      taxType: 'GST',
      components,
      isIntraState: customerState === businessState
    };
  }

  /**
   * CALCULATE VAT (UK/EU)
   */
  static async calculateVAT(transactionData, taxRules) {
    const { amount, vatRate } = transactionData;
    
    const rate = vatRate || taxRules.rates.standard;
    const taxableAmount = amount;
    const taxAmount = (taxableAmount * rate) / 100;

    return {
      taxableAmount,
      taxAmount,
      taxRate: rate,
      taxType: 'VAT',
      components: {
        VAT: taxAmount
      }
    };
  }

  /**
   * CALCULATE SALES TAX (US)
   */
  static async calculateSalesTax(transactionData, taxRules) {
    const { amount, state, city, salesTaxRate } = transactionData;
    
    // In US, sales tax varies by state/city
    // This would need to be looked up from a tax rate database
    const rate = salesTaxRate || 0; // Must be provided
    const taxableAmount = amount;
    const taxAmount = (taxableAmount * rate) / 100;

    return {
      taxableAmount,
      taxAmount,
      taxRate: rate,
      taxType: 'SALES_TAX',
      components: {
        SALES_TAX: taxAmount
      },
      jurisdiction: { state, city }
    };
  }

  /**
   * AUTO-POST TAX ENTRIES
   * Automatically creates tax ledger entries
   */
  static async autoPostTaxEntries(tx, transactionId, taxCalculation, transactionType) {
    const { taxAmount, components, taxType } = taxCalculation;

    if (taxAmount === 0) return;

    const date = new Date().toISOString();

    // Post tax components
    for (const [component, amount] of Object.entries(components)) {
      if (transactionType === 'SALES') {
        // Sales: Tax is liability (credit)
        await tx.executeSql(
          `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
           VALUES (?, ?, ?, ?, ?)`,
          [transactionId, `${component} Payable`, 0, amount, date]
        );
      } else if (transactionType === 'PURCHASE') {
        // Purchase: Tax is asset (debit) - Input Tax Credit
        await tx.executeSql(
          `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
           VALUES (?, ?, ?, ?, ?)`,
          [transactionId, `${component} Input`, amount, 0, date]
        );
      }
    }

    // Record in tax transactions table
    await tx.executeSql(
      `INSERT INTO tax_transactions (
        transaction_id, tax_type, tax_rate, taxable_amount,
        tax_amount, components, transaction_type, date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        taxType,
        taxCalculation.taxRate,
        taxCalculation.taxableAmount,
        taxAmount,
        JSON.stringify(components),
        transactionType,
        date
      ]
    );
  }

  /**
   * CHECK IF EXEMPT
   */
  static isExempt(productCategory, taxRules) {
    const exemptCategories = [
      'EDUCATION',
      'HEALTHCARE',
      'BASIC_FOOD',
      'BOOKS',
      'NEWSPAPERS'
    ];

    return exemptCategories.includes(productCategory);
  }

  /**
   * GET TAX READINESS SCORE
   * Continuously tracks tax compliance
   */
  static async getTaxReadinessScore(businessId, period) {
    const db = await getDatabase();
    
    const issues = {
      missingInvoices: [],
      wrongTax: [],
      unmatchedITC: [],
      lateFilings: [],
      thresholdViolations: []
    };

    let score = 100;

    // 1. Check for missing invoices
    const missingInvoices = await this.checkMissingInvoices(db, period);
    if (missingInvoices.length > 0) {
      issues.missingInvoices = missingInvoices;
      score -= missingInvoices.length * 2;
    }

    // 2. Check for wrong tax calculations
    const wrongTax = await this.checkWrongTax(db, period);
    if (wrongTax.length > 0) {
      issues.wrongTax = wrongTax;
      score -= wrongTax.length * 5;
    }

    // 3. Check for unmatched Input Tax Credit
    const unmatchedITC = await this.checkUnmatchedITC(db, period);
    if (unmatchedITC.length > 0) {
      issues.unmatchedITC = unmatchedITC;
      score -= unmatchedITC.length * 3;
    }

    // 4. Check filing status
    const lateFilings = await this.checkFilingStatus(db, period);
    if (lateFilings.length > 0) {
      issues.lateFilings = lateFilings;
      score -= lateFilings.length * 10;
    }

    // 5. Check threshold violations
    const thresholdViolations = await this.checkThresholds(db, businessId);
    if (thresholdViolations.length > 0) {
      issues.thresholdViolations = thresholdViolations;
      score -= thresholdViolations.length * 15;
    }

    score = Math.max(0, score); // Minimum 0

    return {
      score,
      grade: this.getGrade(score),
      issues,
      recommendations: this.getRecommendations(issues),
      filingReady: score >= 80
    };
  }

  /**
   * CHECK MISSING INVOICES
   */
  static async checkMissingInvoices(db, period) {
    const query = `
      SELECT t.id, t.date, t.total_amount, t.narration
      FROM transactions t
      LEFT JOIN invoices i ON t.id = i.transaction_id
      WHERE t.voucher_type = 'SALES'
      AND DATE(t.date) BETWEEN ? AND ?
      AND i.id IS NULL
    `;

    const result = await db.executeSql(query, [period.startDate, period.endDate]);
    const missing = [];

    for (let i = 0; i < result[0].rows.length; i++) {
      missing.push(result[0].rows.item(i));
    }

    return missing;
  }

  /**
   * CHECK WRONG TAX
   */
  static async checkWrongTax(db, period) {
    const query = `
      SELECT 
        t.id,
        t.date,
        t.total_amount,
        tt.tax_amount as recorded_tax,
        tt.tax_rate,
        tt.taxable_amount
      FROM transactions t
      INNER JOIN tax_transactions tt ON t.id = tt.transaction_id
      WHERE DATE(t.date) BETWEEN ? AND ?
    `;

    const result = await db.executeSql(query, [period.startDate, period.endDate]);
    const wrongTax = [];

    for (let i = 0; i < result[0].rows.length; i++) {
      const txn = result[0].rows.item(i);
      const expectedTax = (txn.taxable_amount * txn.tax_rate) / 100;
      const difference = Math.abs(txn.recorded_tax - expectedTax);

      if (difference > 1) { // More than ₹1 difference
        wrongTax.push({
          ...txn,
          expectedTax,
          difference
        });
      }
    }

    return wrongTax;
  }

  /**
   * CHECK UNMATCHED ITC (Input Tax Credit)
   */
  static async checkUnmatchedITC(db, period) {
    const query = `
      SELECT 
        t.id,
        t.date,
        t.reference_no,
        tt.tax_amount,
        v.gstin
      FROM transactions t
      INNER JOIN tax_transactions tt ON t.id = tt.transaction_id
      LEFT JOIN vendors v ON t.party_id = v.id
      WHERE t.voucher_type = 'PURCHASE'
      AND DATE(t.date) BETWEEN ? AND ?
      AND (v.gstin IS NULL OR v.gstin = '')
    `;

    const result = await db.executeSql(query, [period.startDate, period.endDate]);
    const unmatched = [];

    for (let i = 0; i < result[0].rows.length; i++) {
      unmatched.push(result[0].rows.item(i));
    }

    return unmatched;
  }

  /**
   * CHECK FILING STATUS
   */
  static async checkFilingStatus(db, period) {
    const query = `
      SELECT 
        filing_period,
        due_date,
        status
      FROM tax_filings
      WHERE filing_period BETWEEN ? AND ?
      AND status != 'FILED'
      AND DATE(due_date) < DATE('now')
    `;

    const result = await db.executeSql(query, [period.startDate, period.endDate]);
    const late = [];

    for (let i = 0; i < result[0].rows.length; i++) {
      late.push(result[0].rows.item(i));
    }

    return late;
  }

  /**
   * CHECK THRESHOLDS
   */
  static async checkThresholds(db, businessId) {
    const violations = [];

    // Get business country and turnover
    const businessQuery = `
      SELECT country, annual_turnover
      FROM businesses
      WHERE id = ?
    `;

    const businessResult = await db.executeSql(businessQuery, [businessId]);
    if (businessResult[0].rows.length === 0) return violations;

    const business = businessResult[0].rows.item(0);
    const taxRules = TAX_RULES[business.country] || TAX_RULES.IN;

    // Check registration threshold
    if (taxRules.thresholds && taxRules.thresholds.registration) {
      if (business.annual_turnover > taxRules.thresholds.registration) {
        // Check if registered
        const regQuery = `
          SELECT tax_registration_number
          FROM businesses
          WHERE id = ?
          AND (tax_registration_number IS NULL OR tax_registration_number = '')
        `;

        const regResult = await db.executeSql(regQuery, [businessId]);
        if (regResult[0].rows.length > 0) {
          violations.push({
            type: 'REGISTRATION_REQUIRED',
            threshold: taxRules.thresholds.registration,
            currentTurnover: business.annual_turnover,
            message: `Turnover exceeds registration threshold. ${taxRules.type} registration required.`
          });
        }
      }
    }

    return violations;
  }

  /**
   * GET GRADE
   */
  static getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * GET RECOMMENDATIONS
   */
  static getRecommendations(issues) {
    const recommendations = [];

    if (issues.missingInvoices.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Missing Invoices',
        action: `Generate invoices for ${issues.missingInvoices.length} transactions`,
        impact: 'Cannot claim tax credit without proper invoices'
      });
    }

    if (issues.wrongTax.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        issue: 'Wrong Tax Calculations',
        action: `Review and correct ${issues.wrongTax.length} tax entries`,
        impact: 'May lead to penalties and interest'
      });
    }

    if (issues.unmatchedITC.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Unmatched Input Tax Credit',
        action: `Add vendor GSTIN for ${issues.unmatchedITC.length} purchases`,
        impact: 'Cannot claim input tax credit'
      });
    }

    if (issues.lateFilings.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        issue: 'Late Filings',
        action: `File ${issues.lateFilings.length} pending returns immediately`,
        impact: 'Late fees and penalties applicable'
      });
    }

    if (issues.thresholdViolations.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        issue: 'Threshold Violations',
        action: 'Register for tax immediately',
        impact: 'Operating without registration is illegal'
      });
    }

    return recommendations;
  }

  /**
   * GENERATE TAX SUMMARY
   */
  static async generateTaxSummary(period) {
    const db = await getDatabase();

    const query = `
      SELECT 
        tax_type,
        transaction_type,
        SUM(taxable_amount) as total_taxable,
        SUM(tax_amount) as total_tax,
        COUNT(*) as transaction_count
      FROM tax_transactions
      WHERE DATE(date) BETWEEN ? AND ?
      GROUP BY tax_type, transaction_type
    `;

    const result = await db.executeSql(query, [period.startDate, period.endDate]);
    const summary = {
      sales: {},
      purchases: {},
      netTax: 0
    };

    for (let i = 0; i < result[0].rows.length; i++) {
      const row = result[0].rows.item(i);
      
      if (row.transaction_type === 'SALES') {
        summary.sales[row.tax_type] = {
          taxableAmount: row.total_taxable,
          taxAmount: row.total_tax,
          transactionCount: row.transaction_count
        };
        summary.netTax += row.total_tax;
      } else if (row.transaction_type === 'PURCHASE') {
        summary.purchases[row.tax_type] = {
          taxableAmount: row.total_taxable,
          taxAmount: row.total_tax,
          transactionCount: row.transaction_count
        };
        summary.netTax -= row.total_tax; // Input tax credit
      }
    }

    return summary;
  }

  /**
   * GET TAX LIABILITY
   */
  static async getTaxLiability(period) {
    const summary = await this.generateTaxSummary(period);
    
    return {
      outputTax: Object.values(summary.sales).reduce((sum, s) => sum + s.taxAmount, 0),
      inputTax: Object.values(summary.purchases).reduce((sum, p) => sum + p.taxAmount, 0),
      netTaxPayable: summary.netTax,
      dueDate: this.calculateDueDate(period),
      status: summary.netTax > 0 ? 'PAYABLE' : 'REFUNDABLE'
    };
  }

  /**
   * CALCULATE DUE DATE
   */
  static calculateDueDate(period) {
    // For India GST: 20th of next month
    const endDate = new Date(period.endDate);
    const dueDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 20);
    return dueDate.toISOString().split('T')[0];
  }
}

export default TaxAutopilotEngine;
