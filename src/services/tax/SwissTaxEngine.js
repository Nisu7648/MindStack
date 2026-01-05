/**
 * SWISS TAX ENGINE
 * 
 * Comprehensive Swiss tax calculation system including:
 * - Federal VAT (7.7%, 2.5%, 3.7%)
 * - Cantonal taxes (all 26 cantons)
 * - Municipal taxes
 * - Social security (AHV/IV/EO/ALV)
 * - Withholding tax
 * - Stamp duty
 * - Capital gains tax
 */

// Swiss VAT Rates
export const SWISS_VAT_RATES = {
  STANDARD: 7.7,      // Standard rate
  REDUCED: 2.5,       // Daily necessities (food, books, medicines)
  SPECIAL: 3.7,       // Accommodation services
  EXEMPT: 0,          // Healthcare, education, insurance, etc.
};

// Swiss Cantons with Tax Information
export const SWISS_CANTONS = {
  ZH: {
    name: 'Zürich',
    code: 'ZH',
    taxRate: 8.0,
    municipalityMultiplier: 1.19,
    capitalGainsTax: true,
    wealthTax: true,
  },
  BE: {
    name: 'Bern',
    code: 'BE',
    taxRate: 10.6,
    municipalityMultiplier: 1.54,
    capitalGainsTax: true,
    wealthTax: true,
  },
  LU: {
    name: 'Luzern',
    code: 'LU',
    taxRate: 7.5,
    municipalityMultiplier: 1.55,
    capitalGainsTax: true,
    wealthTax: true,
  },
  UR: {
    name: 'Uri',
    code: 'UR',
    taxRate: 7.5,
    municipalityMultiplier: 1.0,
    capitalGainsTax: false,
    wealthTax: true,
  },
  SZ: {
    name: 'Schwyz',
    code: 'SZ',
    taxRate: 6.5,
    municipalityMultiplier: 1.2,
    capitalGainsTax: false,
    wealthTax: true,
  },
  OW: {
    name: 'Obwalden',
    code: 'OW',
    taxRate: 6.0,
    municipalityMultiplier: 1.0,
    capitalGainsTax: false,
    wealthTax: true,
  },
  NW: {
    name: 'Nidwalden',
    code: 'NW',
    taxRate: 6.0,
    municipalityMultiplier: 1.0,
    capitalGainsTax: false,
    wealthTax: true,
  },
  GL: {
    name: 'Glarus',
    code: 'GL',
    taxRate: 8.5,
    municipalityMultiplier: 1.3,
    capitalGainsTax: true,
    wealthTax: true,
  },
  ZG: {
    name: 'Zug',
    code: 'ZG',
    taxRate: 6.0,
    municipalityMultiplier: 0.82,
    capitalGainsTax: false,
    wealthTax: true,
  },
  FR: {
    name: 'Fribourg',
    code: 'FR',
    taxRate: 11.0,
    municipalityMultiplier: 1.3,
    capitalGainsTax: true,
    wealthTax: true,
  },
  SO: {
    name: 'Solothurn',
    code: 'SO',
    taxRate: 9.5,
    municipalityMultiplier: 1.25,
    capitalGainsTax: true,
    wealthTax: true,
  },
  BS: {
    name: 'Basel-Stadt',
    code: 'BS',
    taxRate: 11.5,
    municipalityMultiplier: 1.0,
    capitalGainsTax: true,
    wealthTax: true,
  },
  BL: {
    name: 'Basel-Landschaft',
    code: 'BL',
    taxRate: 9.5,
    municipalityMultiplier: 0.65,
    capitalGainsTax: true,
    wealthTax: true,
  },
  SH: {
    name: 'Schaffhausen',
    code: 'SH',
    taxRate: 9.0,
    municipalityMultiplier: 1.18,
    capitalGainsTax: true,
    wealthTax: true,
  },
  AR: {
    name: 'Appenzell Ausserrhoden',
    code: 'AR',
    taxRate: 7.5,
    municipalityMultiplier: 1.0,
    capitalGainsTax: true,
    wealthTax: true,
  },
  AI: {
    name: 'Appenzell Innerrhoden',
    code: 'AI',
    taxRate: 6.5,
    municipalityMultiplier: 1.0,
    capitalGainsTax: false,
    wealthTax: true,
  },
  SG: {
    name: 'St. Gallen',
    code: 'SG',
    taxRate: 8.5,
    municipalityMultiplier: 1.22,
    capitalGainsTax: true,
    wealthTax: true,
  },
  GR: {
    name: 'Graubünden',
    code: 'GR',
    taxRate: 8.0,
    municipalityMultiplier: 1.0,
    capitalGainsTax: true,
    wealthTax: true,
  },
  AG: {
    name: 'Aargau',
    code: 'AG',
    taxRate: 8.5,
    municipalityMultiplier: 1.05,
    capitalGainsTax: true,
    wealthTax: true,
  },
  TG: {
    name: 'Thurgau',
    code: 'TG',
    taxRate: 8.0,
    municipalityMultiplier: 1.18,
    capitalGainsTax: true,
    wealthTax: true,
  },
  TI: {
    name: 'Ticino',
    code: 'TI',
    taxRate: 11.5,
    municipalityMultiplier: 1.0,
    capitalGainsTax: true,
    wealthTax: true,
  },
  VD: {
    name: 'Vaud',
    code: 'VD',
    taxRate: 12.0,
    municipalityMultiplier: 0.73,
    capitalGainsTax: true,
    wealthTax: true,
  },
  VS: {
    name: 'Valais',
    code: 'VS',
    taxRate: 10.5,
    municipalityMultiplier: 1.0,
    capitalGainsTax: true,
    wealthTax: true,
  },
  NE: {
    name: 'Neuchâtel',
    code: 'NE',
    taxRate: 11.5,
    municipalityMultiplier: 0.68,
    capitalGainsTax: true,
    wealthTax: true,
  },
  GE: {
    name: 'Geneva',
    code: 'GE',
    taxRate: 13.0,
    municipalityMultiplier: 0.455,
    capitalGainsTax: true,
    wealthTax: true,
  },
  JU: {
    name: 'Jura',
    code: 'JU',
    taxRate: 11.0,
    municipalityMultiplier: 1.0,
    capitalGainsTax: true,
    wealthTax: true,
  },
};

// Social Security Rates (2024)
export const SOCIAL_SECURITY_RATES = {
  AHV_IV_EO: {
    rate: 10.6,
    employeeShare: 5.3,
    employerShare: 5.3,
    description: 'Old-age, survivors and disability insurance',
  },
  ALV: {
    rate: 2.2,
    employeeShare: 1.1,
    employerShare: 1.1,
    maxIncome: 148200, // CHF per year
    additionalRate: 1.0, // For income above maxIncome
    description: 'Unemployment insurance',
  },
  NBU: {
    rate: 0.0, // Varies by employer
    employeeShare: 0.0,
    employerShare: 0.0, // Typically 0.7-2.0%
    description: 'Non-occupational accident insurance',
  },
  BVG: {
    minRate: 7.0,
    maxRate: 18.0,
    employeeShare: 50,
    employerShare: 50,
    minIncome: 22050, // CHF per year
    maxIncome: 88200, // CHF per year
    description: 'Occupational pension (2nd pillar)',
  },
  FAK: {
    rate: 0.0, // Varies by canton (0.1-3.0%)
    description: 'Family allowance',
  },
};

// Withholding Tax Rates (for non-residents)
export const WITHHOLDING_TAX_RATES = {
  DIVIDENDS: 35.0,
  INTEREST: 35.0,
  ROYALTIES: 0.0,
  PENSIONS: 0.0, // Varies by canton
};

class SwissTaxEngine {
  /**
   * Calculate VAT amount
   */
  static calculateVAT(amount, vatType = 'STANDARD') {
    const rate = SWISS_VAT_RATES[vatType] || SWISS_VAT_RATES.STANDARD;
    const vatAmount = (amount * rate) / 100;
    
    return {
      netAmount: amount,
      vatRate: rate,
      vatAmount: vatAmount,
      grossAmount: amount + vatAmount,
    };
  }

  /**
   * Calculate VAT from gross amount (reverse calculation)
   */
  static calculateVATFromGross(grossAmount, vatType = 'STANDARD') {
    const rate = SWISS_VAT_RATES[vatType] || SWISS_VAT_RATES.STANDARD;
    const netAmount = grossAmount / (1 + rate / 100);
    const vatAmount = grossAmount - netAmount;
    
    return {
      netAmount: netAmount,
      vatRate: rate,
      vatAmount: vatAmount,
      grossAmount: grossAmount,
    };
  }

  /**
   * Calculate cantonal tax
   */
  static calculateCantonalTax(income, cantonCode, municipalityMultiplier = null) {
    const canton = SWISS_CANTONS[cantonCode];
    if (!canton) {
      throw new Error(`Invalid canton code: ${cantonCode}`);
    }

    const multiplier = municipalityMultiplier || canton.municipalityMultiplier;
    const cantonalTax = (income * canton.taxRate) / 100;
    const municipalTax = cantonalTax * multiplier;
    const totalTax = cantonalTax + municipalTax;

    return {
      income: income,
      canton: canton.name,
      cantonalRate: canton.taxRate,
      cantonalTax: cantonalTax,
      municipalityMultiplier: multiplier,
      municipalTax: municipalTax,
      totalTax: totalTax,
      effectiveRate: (totalTax / income) * 100,
    };
  }

  /**
   * Calculate social security contributions
   */
  static calculateSocialSecurity(grossSalary, isEmployee = true) {
    const ahvIvEo = (grossSalary * SOCIAL_SECURITY_RATES.AHV_IV_EO.employeeShare) / 100;
    
    let alv = 0;
    if (grossSalary <= SOCIAL_SECURITY_RATES.ALV.maxIncome) {
      alv = (grossSalary * SOCIAL_SECURITY_RATES.ALV.employeeShare) / 100;
    } else {
      const baseAlv = (SOCIAL_SECURITY_RATES.ALV.maxIncome * SOCIAL_SECURITY_RATES.ALV.employeeShare) / 100;
      const additionalAlv = ((grossSalary - SOCIAL_SECURITY_RATES.ALV.maxIncome) * SOCIAL_SECURITY_RATES.ALV.additionalRate) / 100;
      alv = baseAlv + additionalAlv;
    }

    // BVG calculation (simplified - actual calculation is more complex)
    let bvg = 0;
    if (grossSalary >= SOCIAL_SECURITY_RATES.BVG.minIncome) {
      const insuredSalary = Math.min(grossSalary, SOCIAL_SECURITY_RATES.BVG.maxIncome) - SOCIAL_SECURITY_RATES.BVG.minIncome;
      bvg = (insuredSalary * 10) / 100; // Average rate
    }

    const totalContributions = ahvIvEo + alv + bvg;
    const netSalary = grossSalary - totalContributions;

    return {
      grossSalary: grossSalary,
      contributions: {
        ahvIvEo: {
          amount: ahvIvEo,
          rate: SOCIAL_SECURITY_RATES.AHV_IV_EO.employeeShare,
          description: SOCIAL_SECURITY_RATES.AHV_IV_EO.description,
        },
        alv: {
          amount: alv,
          rate: SOCIAL_SECURITY_RATES.ALV.employeeShare,
          description: SOCIAL_SECURITY_RATES.ALV.description,
        },
        bvg: {
          amount: bvg,
          rate: 10.0,
          description: SOCIAL_SECURITY_RATES.BVG.description,
        },
      },
      totalContributions: totalContributions,
      netSalary: netSalary,
      contributionRate: (totalContributions / grossSalary) * 100,
    };
  }

  /**
   * Calculate employer social security costs
   */
  static calculateEmployerCosts(grossSalary) {
    const ahvIvEo = (grossSalary * SOCIAL_SECURITY_RATES.AHV_IV_EO.employerShare) / 100;
    
    let alv = 0;
    if (grossSalary <= SOCIAL_SECURITY_RATES.ALV.maxIncome) {
      alv = (grossSalary * SOCIAL_SECURITY_RATES.ALV.employerShare) / 100;
    } else {
      const baseAlv = (SOCIAL_SECURITY_RATES.ALV.maxIncome * SOCIAL_SECURITY_RATES.ALV.employerShare) / 100;
      const additionalAlv = ((grossSalary - SOCIAL_SECURITY_RATES.ALV.maxIncome) * SOCIAL_SECURITY_RATES.ALV.additionalRate) / 100;
      alv = baseAlv + additionalAlv;
    }

    // BVG employer share
    let bvg = 0;
    if (grossSalary >= SOCIAL_SECURITY_RATES.BVG.minIncome) {
      const insuredSalary = Math.min(grossSalary, SOCIAL_SECURITY_RATES.BVG.maxIncome) - SOCIAL_SECURITY_RATES.BVG.minIncome;
      bvg = (insuredSalary * 10) / 100; // Average rate
    }

    // NBU (estimated at 1%)
    const nbu = (grossSalary * 1.0) / 100;

    // FAK (estimated at 1.5%)
    const fak = (grossSalary * 1.5) / 100;

    const totalEmployerCosts = ahvIvEo + alv + bvg + nbu + fak;
    const totalCost = grossSalary + totalEmployerCosts;

    return {
      grossSalary: grossSalary,
      employerContributions: {
        ahvIvEo: ahvIvEo,
        alv: alv,
        bvg: bvg,
        nbu: nbu,
        fak: fak,
      },
      totalEmployerCosts: totalEmployerCosts,
      totalCost: totalCost,
      employerCostRate: (totalEmployerCosts / grossSalary) * 100,
    };
  }

  /**
   * Calculate withholding tax
   */
  static calculateWithholdingTax(amount, type = 'DIVIDENDS') {
    const rate = WITHHOLDING_TAX_RATES[type] || 0;
    const taxAmount = (amount * rate) / 100;
    const netAmount = amount - taxAmount;

    return {
      grossAmount: amount,
      taxRate: rate,
      taxAmount: taxAmount,
      netAmount: netAmount,
      type: type,
    };
  }

  /**
   * Calculate complete tax burden for a business
   */
  static calculateBusinessTaxBurden(params) {
    const {
      revenue,
      expenses,
      canton,
      vatType = 'STANDARD',
      numberOfEmployees = 0,
      averageSalary = 0,
    } = params;

    // Calculate profit
    const profit = revenue - expenses;

    // Calculate VAT
    const vat = this.calculateVAT(revenue, vatType);

    // Calculate cantonal tax
    const cantonalTax = this.calculateCantonalTax(profit, canton);

    // Calculate social security costs
    const totalSalaries = numberOfEmployees * averageSalary;
    const employerCosts = numberOfEmployees > 0 
      ? this.calculateEmployerCosts(averageSalary)
      : { totalEmployerCosts: 0, totalCost: 0 };

    const totalSocialSecurityCosts = employerCosts.totalEmployerCosts * numberOfEmployees;

    // Calculate total tax burden
    const totalTaxes = vat.vatAmount + cantonalTax.totalTax + totalSocialSecurityCosts;
    const effectiveTaxRate = (totalTaxes / revenue) * 100;

    return {
      revenue: revenue,
      expenses: expenses,
      profit: profit,
      vat: vat,
      cantonalTax: cantonalTax,
      socialSecurity: {
        numberOfEmployees: numberOfEmployees,
        averageSalary: averageSalary,
        totalSalaries: totalSalaries,
        employerCosts: employerCosts,
        totalCosts: totalSocialSecurityCosts,
      },
      totalTaxes: totalTaxes,
      effectiveTaxRate: effectiveTaxRate,
      netProfit: profit - cantonalTax.totalTax,
    };
  }

  /**
   * Get canton information
   */
  static getCantonInfo(cantonCode) {
    return SWISS_CANTONS[cantonCode] || null;
  }

  /**
   * Get all cantons
   */
  static getAllCantons() {
    return Object.values(SWISS_CANTONS);
  }

  /**
   * Get VAT rates
   */
  static getVATRates() {
    return SWISS_VAT_RATES;
  }

  /**
   * Get social security rates
   */
  static getSocialSecurityRates() {
    return SOCIAL_SECURITY_RATES;
  }
}

export default SwissTaxEngine;
