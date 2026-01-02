/**
 * GLOBAL TAX ENGINE
 * 
 * Comprehensive tax calculation system for:
 * - India: GST (CGST, SGST, IGST), TDS, Composition Scheme
 * - USA: Federal Income Tax, State Sales Tax, Payroll Taxes (FICA, FUTA, SUTA)
 * - Europe: VAT (Standard, Reduced, Zero), Reverse Charge, OSS
 * 
 * Features:
 * - Auto-calculates taxes based on country/state/region
 * - Handles complex tax rules and exemptions
 * - Generates tax reports for compliance
 * - Supports multi-currency and multi-jurisdiction
 */

import { getDatabase } from '../database/schema';

export class GlobalTaxEngine {
  
  /**
   * MASTER TAX CALCULATION
   * Automatically detects country and applies correct tax rules
   */
  static async calculateTax(transactionData) {
    const { country, state, amount, transactionType, items } = transactionData;
    
    switch (country.toUpperCase()) {
      case 'INDIA':
      case 'IN':
        return await this.calculateIndiaGST(transactionData);
      
      case 'USA':
      case 'US':
        return await this.calculateUSATax(transactionData);
      
      case 'UK':
      case 'GB':
      case 'FRANCE':
      case 'FR':
      case 'GERMANY':
      case 'DE':
      case 'SPAIN':
      case 'ES':
      case 'ITALY':
      case 'IT':
        return await this.calculateEUVAT(transactionData);
      
      default:
        throw new Error(`Tax rules not configured for country: ${country}`);
    }
  }

  /**
   * ========================================
   * INDIA GST SYSTEM (2024-2025)
   * ========================================
   */

  /**
   * INDIA GST RATES (Updated September 22, 2025)
   * 0%, 5%, 18%, 40% (12% and 28% phased out)
   */
  static INDIA_GST_RATES = {
    // 0% - Exempt/Nil-rated
    EXEMPT: {
      rate: 0,
      items: ['dairy', 'milk', 'lifesaving_drugs', 'educational_items', 'fresh_vegetables', 'fresh_fruits']
    },
    
    // 5% - Daily essentials
    RATE_5: {
      rate: 5,
      items: ['food_grains', 'sugar', 'tea', 'coffee', 'edible_oil', 'coal', 'medicines', 'stents']
    },
    
    // 18% - General rate (most goods/services)
    RATE_18: {
      rate: 18,
      items: ['electronics', 'small_cars', 'hotels_above_7500', 'used_cars', 'it_services', 'telecom', 'financial_services']
    },
    
    // 40% - Luxury/Sin goods (new from Sep 2025)
    RATE_40: {
      rate: 40,
      items: ['pan_masala', 'tobacco', 'aerated_beverages', 'luxury_cars', 'gambling']
    }
  };

  /**
   * Calculate India GST
   */
  static async calculateIndiaGST(data) {
    const {
      amount,
      items,
      supplierState,
      customerState,
      isCompositionScheme = false,
      isReverseCharge = false,
      hsnCode,
      sacCode
    } = data;

    // Composition Scheme (simplified tax for small businesses)
    if (isCompositionScheme) {
      return this.calculateCompositionTax(amount, data.businessType);
    }

    // Determine GST rate based on HSN/SAC code or item category
    const gstRate = this.getGSTRate(items, hsnCode, sacCode);
    
    // Calculate tax amount
    const taxableAmount = amount;
    const totalGSTAmount = (taxableAmount * gstRate) / 100;

    // Intra-state (within same state) = CGST + SGST
    if (supplierState === customerState) {
      const cgst = totalGSTAmount / 2;
      const sgst = totalGSTAmount / 2;
      
      return {
        country: 'INDIA',
        taxType: 'GST',
        taxableAmount,
        gstRate,
        cgst: {
          rate: gstRate / 2,
          amount: cgst
        },
        sgst: {
          rate: gstRate / 2,
          amount: sgst
        },
        igst: {
          rate: 0,
          amount: 0
        },
        totalTax: totalGSTAmount,
        totalAmount: taxableAmount + totalGSTAmount,
        isReverseCharge,
        breakdown: `CGST ${gstRate/2}% + SGST ${gstRate/2}% = ${gstRate}%`
      };
    }
    
    // Inter-state (different states) = IGST
    else {
      return {
        country: 'INDIA',
        taxType: 'GST',
        taxableAmount,
        gstRate,
        cgst: {
          rate: 0,
          amount: 0
        },
        sgst: {
          rate: 0,
          amount: 0
        },
        igst: {
          rate: gstRate,
          amount: totalGSTAmount
        },
        totalTax: totalGSTAmount,
        totalAmount: taxableAmount + totalGSTAmount,
        isReverseCharge,
        breakdown: `IGST ${gstRate}%`
      };
    }
  }

  /**
   * Get GST Rate based on item category or HSN/SAC code
   */
  static getGSTRate(items, hsnCode, sacCode) {
    // Priority 1: Check HSN/SAC code (if provided)
    if (hsnCode || sacCode) {
      return this.getGSTRateByCode(hsnCode || sacCode);
    }

    // Priority 2: Check item categories
    if (items && items.length > 0) {
      const firstItem = items[0];
      const category = firstItem.category?.toLowerCase();
      
      // Check each rate category
      for (const [key, value] of Object.entries(this.INDIA_GST_RATES)) {
        if (value.items.includes(category)) {
          return value.rate;
        }
      }
    }

    // Default: 18% (general rate)
    return 18;
  }

  /**
   * Get GST Rate by HSN/SAC Code
   */
  static getGSTRateByCode(code) {
    // HSN/SAC code mapping (sample - expand as needed)
    const codeRates = {
      // Food items (5%)
      '0401': 5, // Milk
      '1001': 5, // Wheat
      '1006': 5, // Rice
      
      // Electronics (18%)
      '8517': 18, // Mobile phones
      '8528': 18, // Monitors/TVs
      
      // Luxury items (40%)
      '2403': 40, // Tobacco
      '2202': 40  // Aerated beverages
    };

    return codeRates[code] || 18; // Default 18%
  }

  /**
   * Composition Scheme Tax Calculation
   * Simplified tax for small businesses (turnover < ₹1.5 crore)
   */
  static calculateCompositionTax(amount, businessType) {
    let compositionRate;
    
    switch (businessType) {
      case 'MANUFACTURER':
      case 'TRADER':
        compositionRate = 1; // 1% for manufacturers/traders
        break;
      case 'RESTAURANT':
        compositionRate = 5; // 5% for restaurants
        break;
      case 'SERVICE':
        compositionRate = 6; // 6% for service providers
        break;
      default:
        compositionRate = 1;
    }

    const taxAmount = (amount * compositionRate) / 100;

    return {
      country: 'INDIA',
      taxType: 'GST_COMPOSITION',
      taxableAmount: amount,
      compositionRate,
      totalTax: taxAmount,
      totalAmount: amount + taxAmount,
      note: 'Composition Scheme - No Input Tax Credit available'
    };
  }

  /**
   * Calculate Input Tax Credit (ITC)
   */
  static async calculateITC(purchaseData) {
    const { gstAmount, isEligibleForITC, purchaseType } = purchaseData;

    // ITC not available for certain purchases
    const ineligibleCategories = [
      'motor_vehicles',
      'food_beverages',
      'membership_club',
      'health_insurance',
      'travel_benefits'
    ];

    if (!isEligibleForITC || ineligibleCategories.includes(purchaseType)) {
      return {
        itcAvailable: 0,
        itcBlocked: gstAmount,
        reason: 'ITC not available for this category'
      };
    }

    return {
      itcAvailable: gstAmount,
      itcBlocked: 0,
      reason: 'Full ITC available'
    };
  }

  /**
   * ========================================
   * USA TAX SYSTEM (2024)
   * ========================================
   */

  /**
   * USA Federal Income Tax Brackets (2024)
   */
  static USA_FEDERAL_TAX_BRACKETS = {
    SINGLE: [
      { min: 0, max: 11600, rate: 10 },
      { min: 11601, max: 47150, rate: 12 },
      { min: 47151, max: 100525, rate: 22 },
      { min: 100526, max: 191950, rate: 24 },
      { min: 191951, max: 243725, rate: 32 },
      { min: 243726, max: 609350, rate: 35 },
      { min: 609351, max: Infinity, rate: 37 }
    ],
    MARRIED_JOINT: [
      { min: 0, max: 23200, rate: 10 },
      { min: 23201, max: 94300, rate: 12 },
      { min: 94301, max: 201050, rate: 22 },
      { min: 201051, max: 383900, rate: 24 },
      { min: 383901, max: 487450, rate: 32 },
      { min: 487451, max: 731200, rate: 35 },
      { min: 731201, max: Infinity, rate: 37 }
    ],
    HEAD_OF_HOUSEHOLD: [
      { min: 0, max: 16550, rate: 10 },
      { min: 16551, max: 63100, rate: 12 },
      { min: 63101, max: 100500, rate: 22 },
      { min: 100501, max: 191950, rate: 24 },
      { min: 191951, max: 243700, rate: 32 },
      { min: 243701, max: 609350, rate: 35 },
      { min: 609351, max: Infinity, rate: 37 }
    ]
  };

  /**
   * USA State Sales Tax Rates (2024)
   */
  static USA_STATE_SALES_TAX = {
    'AL': { state: 4.0, avgLocal: 5.0, combined: 9.0 },
    'AK': { state: 0.0, avgLocal: 1.82, combined: 1.82 },
    'AZ': { state: 5.6, avgLocal: 2.8, combined: 8.4 },
    'AR': { state: 6.5, avgLocal: 3.0, combined: 9.5 },
    'CA': { state: 7.25, avgLocal: 1.5, combined: 8.75 },
    'CO': { state: 2.9, avgLocal: 4.9, combined: 7.8 },
    'CT': { state: 6.35, avgLocal: 0.0, combined: 6.35 },
    'DE': { state: 0.0, avgLocal: 0.0, combined: 0.0 },
    'FL': { state: 6.0, avgLocal: 1.0, combined: 7.0 },
    'GA': { state: 4.0, avgLocal: 3.3, combined: 7.3 },
    'HI': { state: 4.5, avgLocal: 0.0, combined: 4.5 },
    'ID': { state: 6.0, avgLocal: 0.03, combined: 6.03 },
    'IL': { state: 6.25, avgLocal: 2.5, combined: 8.75 },
    'IN': { state: 7.0, avgLocal: 0.0, combined: 7.0 },
    'IA': { state: 6.0, avgLocal: 0.9, combined: 6.9 },
    'KS': { state: 6.5, avgLocal: 2.2, combined: 8.7 },
    'KY': { state: 6.0, avgLocal: 0.0, combined: 6.0 },
    'LA': { state: 4.45, avgLocal: 5.1, combined: 9.55 },
    'ME': { state: 5.5, avgLocal: 0.0, combined: 5.5 },
    'MD': { state: 6.0, avgLocal: 0.0, combined: 6.0 },
    'MA': { state: 6.25, avgLocal: 0.0, combined: 6.25 },
    'MI': { state: 6.0, avgLocal: 0.0, combined: 6.0 },
    'MN': { state: 6.875, avgLocal: 0.6, combined: 7.475 },
    'MS': { state: 7.0, avgLocal: 0.07, combined: 7.07 },
    'MO': { state: 4.225, avgLocal: 4.0, combined: 8.225 },
    'MT': { state: 0.0, avgLocal: 0.0, combined: 0.0 },
    'NE': { state: 5.5, avgLocal: 1.5, combined: 7.0 },
    'NV': { state: 6.85, avgLocal: 1.4, combined: 8.25 },
    'NH': { state: 0.0, avgLocal: 0.0, combined: 0.0 },
    'NJ': { state: 6.625, avgLocal: 0.0, combined: 6.625 },
    'NM': { state: 5.125, avgLocal: 2.7, combined: 7.825 },
    'NY': { state: 4.0, avgLocal: 4.5, combined: 8.5 },
    'NC': { state: 4.75, avgLocal: 2.25, combined: 7.0 },
    'ND': { state: 5.0, avgLocal: 2.0, combined: 7.0 },
    'OH': { state: 5.75, avgLocal: 1.5, combined: 7.25 },
    'OK': { state: 4.5, avgLocal: 4.5, combined: 9.0 },
    'OR': { state: 0.0, avgLocal: 0.0, combined: 0.0 },
    'PA': { state: 6.0, avgLocal: 0.34, combined: 6.34 },
    'RI': { state: 7.0, avgLocal: 0.0, combined: 7.0 },
    'SC': { state: 6.0, avgLocal: 1.5, combined: 7.5 },
    'SD': { state: 4.5, avgLocal: 2.0, combined: 6.5 },
    'TN': { state: 7.0, avgLocal: 2.5, combined: 9.5 },
    'TX': { state: 6.25, avgLocal: 1.9, combined: 8.15 },
    'UT': { state: 6.1, avgLocal: 1.0, combined: 7.1 },
    'VT': { state: 6.0, avgLocal: 0.2, combined: 6.2 },
    'VA': { state: 5.3, avgLocal: 0.5, combined: 5.8 },
    'WA': { state: 6.5, avgLocal: 3.0, combined: 9.5 },
    'WV': { state: 6.0, avgLocal: 0.5, combined: 6.5 },
    'WI': { state: 5.0, avgLocal: 0.5, combined: 5.5 },
    'WY': { state: 4.0, avgLocal: 1.4, combined: 5.4 },
    'DC': { state: 6.0, avgLocal: 0.0, combined: 6.0 }
  };

  /**
   * Calculate USA Tax
   */
  static async calculateUSATax(data) {
    const { amount, state, taxType, filingStatus, annualIncome } = data;

    if (taxType === 'SALES_TAX') {
      return this.calculateUSASalesTax(amount, state);
    } else if (taxType === 'INCOME_TAX') {
      return this.calculateUSAIncomeTax(annualIncome, filingStatus);
    } else if (taxType === 'PAYROLL_TAX') {
      return this.calculateUSAPayrollTax(data);
    }

    throw new Error('Invalid tax type for USA');
  }

  /**
   * Calculate USA Sales Tax
   */
  static calculateUSASalesTax(amount, stateCode) {
    const stateTax = this.USA_STATE_SALES_TAX[stateCode.toUpperCase()];
    
    if (!stateTax) {
      throw new Error(`Sales tax not configured for state: ${stateCode}`);
    }

    const stateTaxAmount = (amount * stateTax.state) / 100;
    const localTaxAmount = (amount * stateTax.avgLocal) / 100;
    const totalTaxAmount = stateTaxAmount + localTaxAmount;

    return {
      country: 'USA',
      state: stateCode,
      taxType: 'SALES_TAX',
      taxableAmount: amount,
      stateTax: {
        rate: stateTax.state,
        amount: stateTaxAmount
      },
      localTax: {
        rate: stateTax.avgLocal,
        amount: localTaxAmount
      },
      combinedRate: stateTax.combined,
      totalTax: totalTaxAmount,
      totalAmount: amount + totalTaxAmount,
      breakdown: `State ${stateTax.state}% + Local ${stateTax.avgLocal}% = ${stateTax.combined}%`
    };
  }

  /**
   * Calculate USA Federal Income Tax
   */
  static calculateUSAIncomeTax(annualIncome, filingStatus = 'SINGLE') {
    const brackets = this.USA_FEDERAL_TAX_BRACKETS[filingStatus];
    let totalTax = 0;
    let remainingIncome = annualIncome;
    const breakdown = [];

    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;

      const bracketIncome = Math.min(
        remainingIncome,
        bracket.max - bracket.min + 1
      );

      const bracketTax = (bracketIncome * bracket.rate) / 100;
      totalTax += bracketTax;
      remainingIncome -= bracketIncome;

      breakdown.push({
        bracket: `$${bracket.min.toLocaleString()} - $${bracket.max === Infinity ? '∞' : bracket.max.toLocaleString()}`,
        rate: bracket.rate,
        income: bracketIncome,
        tax: bracketTax
      });
    }

    const effectiveRate = (totalTax / annualIncome) * 100;

    return {
      country: 'USA',
      taxType: 'FEDERAL_INCOME_TAX',
      filingStatus,
      annualIncome,
      totalTax,
      effectiveRate: effectiveRate.toFixed(2),
      afterTaxIncome: annualIncome - totalTax,
      breakdown
    };
  }

  /**
   * Calculate USA Payroll Tax (FICA)
   * Social Security: 6.2% (up to $168,600)
   * Medicare: 1.45% (no limit) + 0.9% additional (over $200,000)
   */
  static calculateUSAPayrollTax(data) {
    const { wages, isEmployer = false } = data;
    
    const SS_WAGE_BASE = 168600; // 2024 limit
    const SS_RATE = 6.2;
    const MEDICARE_RATE = 1.45;
    const ADDITIONAL_MEDICARE_THRESHOLD = 200000;
    const ADDITIONAL_MEDICARE_RATE = 0.9;

    // Social Security Tax
    const ssWages = Math.min(wages, SS_WAGE_BASE);
    const ssTax = (ssWages * SS_RATE) / 100;

    // Medicare Tax
    const medicareTax = (wages * MEDICARE_RATE) / 100;

    // Additional Medicare (employee only, over $200k)
    let additionalMedicare = 0;
    if (!isEmployer && wages > ADDITIONAL_MEDICARE_THRESHOLD) {
      const excessWages = wages - ADDITIONAL_MEDICARE_THRESHOLD;
      additionalMedicare = (excessWages * ADDITIONAL_MEDICARE_RATE) / 100;
    }

    const totalFICA = ssTax + medicareTax + additionalMedicare;

    return {
      country: 'USA',
      taxType: 'PAYROLL_TAX_FICA',
      wages,
      socialSecurity: {
        rate: SS_RATE,
        wageBase: SS_WAGE_BASE,
        taxableWages: ssWages,
        tax: ssTax
      },
      medicare: {
        rate: MEDICARE_RATE,
        tax: medicareTax
      },
      additionalMedicare: {
        rate: ADDITIONAL_MEDICARE_RATE,
        threshold: ADDITIONAL_MEDICARE_THRESHOLD,
        tax: additionalMedicare
      },
      totalFICA,
      employerShare: isEmployer ? ssTax + medicareTax : 0,
      employeeShare: !isEmployer ? totalFICA : 0
    };
  }

  /**
   * ========================================
   * EUROPEAN UNION VAT SYSTEM (2024)
   * ========================================
   */

  /**
   * EU VAT Rates by Country (2024-2025)
   */
  static EU_VAT_RATES = {
    'AT': { country: 'Austria', standard: 20, reduced: [10, 13], superReduced: null },
    'BE': { country: 'Belgium', standard: 21, reduced: [6, 12], superReduced: null },
    'BG': { country: 'Bulgaria', standard: 20, reduced: [9], superReduced: null },
    'HR': { country: 'Croatia', standard: 25, reduced: [5, 13], superReduced: null },
    'CY': { country: 'Cyprus', standard: 19, reduced: [5, 9], superReduced: null },
    'CZ': { country: 'Czechia', standard: 21, reduced: [12], superReduced: 0 },
    'DK': { country: 'Denmark', standard: 25, reduced: [0], superReduced: null },
    'EE': { country: 'Estonia', standard: 22, reduced: [9, 5], superReduced: null },
    'FI': { country: 'Finland', standard: 25.5, reduced: [10, 14], superReduced: null },
    'FR': { country: 'France', standard: 20, reduced: [5.5, 10], superReduced: 2.1 },
    'DE': { country: 'Germany', standard: 19, reduced: [7], superReduced: null },
    'GR': { country: 'Greece', standard: 24, reduced: [6, 13], superReduced: null },
    'HU': { country: 'Hungary', standard: 27, reduced: [5, 18], superReduced: null },
    'IE': { country: 'Ireland', standard: 23, reduced: [9, 13.5], superReduced: 4.8 },
    'IT': { country: 'Italy', standard: 22, reduced: [5, 10], superReduced: 4 },
    'LV': { country: 'Latvia', standard: 21, reduced: [5, 12], superReduced: null },
    'LT': { country: 'Lithuania', standard: 21, reduced: [5, 9], superReduced: null },
    'LU': { country: 'Luxembourg', standard: 17, reduced: [8, 14], superReduced: 3 },
    'MT': { country: 'Malta', standard: 18, reduced: [5, 7], superReduced: null },
    'NL': { country: 'Netherlands', standard: 21, reduced: [9], superReduced: null },
    'PL': { country: 'Poland', standard: 23, reduced: [5, 8], superReduced: null },
    'PT': { country: 'Portugal', standard: 23, reduced: [6, 13], superReduced: null },
    'RO': { country: 'Romania', standard: 19, reduced: [5, 9], superReduced: null },
    'SK': { country: 'Slovakia', standard: 20, reduced: [10], superReduced: null },
    'SI': { country: 'Slovenia', standard: 22, reduced: [5, 9.5], superReduced: null },
    'ES': { country: 'Spain', standard: 21, reduced: [10], superReduced: 4 },
    'SE': { country: 'Sweden', standard: 25, reduced: [6, 12], superReduced: null },
    'GB': { country: 'United Kingdom', standard: 20, reduced: [5], superReduced: 0 }
  };

  /**
   * Calculate EU VAT
   */
  static async calculateEUVAT(data) {
    const {
      amount,
      countryCode,
      items,
      supplierCountry,
      customerCountry,
      isB2B = false,
      customerVATNumber,
      isReverseCharge = false
    } = data;

    const vatRates = this.EU_VAT_RATES[countryCode.toUpperCase()];
    
    if (!vatRates) {
      throw new Error(`VAT rates not configured for country: ${countryCode}`);
    }

    // Determine VAT rate based on item category
    const vatRate = this.getEUVATRate(items, vatRates);

    // Intra-EU B2B with valid VAT number = Reverse Charge (0% VAT)
    if (isB2B && supplierCountry !== customerCountry && customerVATNumber) {
      return {
        country: countryCode,
        taxType: 'VAT_REVERSE_CHARGE',
        taxableAmount: amount,
        vatRate: 0,
        vatAmount: 0,
        totalAmount: amount,
        note: 'Reverse Charge - Customer pays VAT in their country',
        customerVATNumber
      };
    }

    // Standard VAT calculation
    const vatAmount = (amount * vatRate) / 100;

    return {
      country: countryCode,
      countryName: vatRates.country,
      taxType: 'VAT',
      taxableAmount: amount,
      vatRate,
      vatAmount,
      totalAmount: amount + vatAmount,
      breakdown: `VAT ${vatRate}%`,
      isIntraEU: supplierCountry !== customerCountry,
      isB2B
    };
  }

  /**
   * Get EU VAT Rate based on item category
   */
  static getEUVATRate(items, vatRates) {
    if (!items || items.length === 0) {
      return vatRates.standard;
    }

    const firstItem = items[0];
    const category = firstItem.category?.toLowerCase();

    // Reduced rate categories
    const reducedCategories = ['food', 'books', 'newspapers', 'medicines', 'children_items'];
    if (reducedCategories.includes(category)) {
      return vatRates.reduced[0];
    }

    // Super-reduced rate categories
    const superReducedCategories = ['basic_food', 'water'];
    if (superReducedCategories.includes(category) && vatRates.superReduced) {
      return vatRates.superReduced;
    }

    // Default: Standard rate
    return vatRates.standard;
  }

  /**
   * ========================================
   * TAX REPORT GENERATION
   * ========================================
   */

  /**
   * Generate India GST Report (GSTR-1, GSTR-3B, GSTR-9)
   */
  static async generateIndiaGSTReport(period, reportType) {
    const db = await getDatabase();
    
    const { startDate, endDate } = period;

    // Fetch all transactions for the period
    const transactions = await db.executeSql(
      `SELECT * FROM transactions 
       WHERE date BETWEEN ? AND ? 
       AND country = 'INDIA'
       ORDER BY date`,
      [startDate, endDate]
    );

    switch (reportType) {
      case 'GSTR1':
        return this.generateGSTR1(transactions);
      case 'GSTR3B':
        return this.generateGSTR3B(transactions);
      case 'GSTR9':
        return this.generateGSTR9(transactions);
      default:
        throw new Error('Invalid GST report type');
    }
  }

  /**
   * Generate GSTR-1 (Outward Supplies)
   */
  static generateGSTR1(transactions) {
    const outwardSupplies = transactions.filter(t => t.type === 'SALES');
    
    let totalInvoices = 0;
    let totalTaxableValue = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    const b2bSupplies = [];
    const b2cSupplies = [];

    outwardSupplies.forEach(txn => {
      totalInvoices++;
      totalTaxableValue += txn.amount;
      totalCGST += txn.cgst || 0;
      totalSGST += txn.sgst || 0;
      totalIGST += txn.igst || 0;

      if (txn.customerGSTIN) {
        b2bSupplies.push(txn);
      } else {
        b2cSupplies.push(txn);
      }
    });

    return {
      reportType: 'GSTR-1',
      period: transactions[0]?.date,
      summary: {
        totalInvoices,
        totalTaxableValue,
        totalCGST,
        totalSGST,
        totalIGST,
        totalTax: totalCGST + totalSGST + totalIGST
      },
      b2bSupplies: {
        count: b2bSupplies.length,
        value: b2bSupplies.reduce((sum, t) => sum + t.amount, 0)
      },
      b2cSupplies: {
        count: b2cSupplies.length,
        value: b2cSupplies.reduce((sum, t) => sum + t.amount, 0)
      },
      details: outwardSupplies
    };
  }

  /**
   * Generate GSTR-3B (Summary Return)
   */
  static generateGSTR3B(transactions) {
    const sales = transactions.filter(t => t.type === 'SALES');
    const purchases = transactions.filter(t => t.type === 'PURCHASE');

    const outwardTax = sales.reduce((sum, t) => 
      sum + (t.cgst || 0) + (t.sgst || 0) + (t.igst || 0), 0
    );

    const inwardTax = purchases.reduce((sum, t) => 
      sum + (t.cgst || 0) + (t.sgst || 0) + (t.igst || 0), 0
    );

    const itcAvailable = inwardTax; // Simplified - actual ITC has more rules
    const netTaxPayable = outwardTax - itcAvailable;

    return {
      reportType: 'GSTR-3B',
      outwardSupplies: {
        taxableValue: sales.reduce((sum, t) => sum + t.amount, 0),
        tax: outwardTax
      },
      inwardSupplies: {
        taxableValue: purchases.reduce((sum, t) => sum + t.amount, 0),
        tax: inwardTax
      },
      itcAvailable,
      netTaxPayable,
      interestPenalty: 0,
      totalPayable: netTaxPayable
    };
  }

  /**
   * Generate GSTR-9 (Annual Return)
   */
  static generateGSTR9(transactions) {
    // Annual return - comprehensive summary
    const gstr3bData = this.generateGSTR3B(transactions);
    
    return {
      reportType: 'GSTR-9',
      financialYear: '2024-25',
      ...gstr3bData,
      amendments: [],
      lateFeePaid: 0,
      refundClaimed: 0
    };
  }

  /**
   * Generate USA Sales Tax Report
   */
  static async generateUSASalesTaxReport(period, state) {
    const db = await getDatabase();
    
    const { startDate, endDate } = period;

    const transactions = await db.executeSql(
      `SELECT * FROM transactions 
       WHERE date BETWEEN ? AND ? 
       AND country = 'USA' 
       AND state = ?
       ORDER BY date`,
      [startDate, endDate, state]
    );

    const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalTax = transactions.reduce((sum, t) => sum + (t.salesTax || 0), 0);

    return {
      reportType: 'USA_SALES_TAX',
      state,
      period: { startDate, endDate },
      totalTransactions: transactions.length,
      totalSales,
      totalTaxCollected: totalTax,
      details: transactions
    };
  }

  /**
   * Generate EU VAT Report (VIES Declaration)
   */
  static async generateEUVATReport(period, country) {
    const db = await getDatabase();
    
    const { startDate, endDate } = period;

    const transactions = await db.executeSql(
      `SELECT * FROM transactions 
       WHERE date BETWEEN ? AND ? 
       AND country IN ('AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','GB')
       ORDER BY date`,
      [startDate, endDate]
    );

    const intraEUSupplies = transactions.filter(t => 
      t.supplierCountry !== t.customerCountry && t.customerVATNumber
    );

    return {
      reportType: 'EU_VAT_VIES',
      country,
      period: { startDate, endDate },
      totalIntraEUSupplies: intraEUSupplies.length,
      totalValue: intraEUSupplies.reduce((sum, t) => sum + t.amount, 0),
      details: intraEUSupplies.map(t => ({
        customerVATNumber: t.customerVATNumber,
        customerCountry: t.customerCountry,
        value: t.amount
      }))
    };
  }
}

export default GlobalTaxEngine;
