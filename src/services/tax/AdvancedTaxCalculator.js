/**
 * ADVANCED TAX CALCULATOR SERVICE
 * 
 * Enhanced tax calculation with:
 * - Tax optimization suggestions
 * - Deduction recommendations
 * - Tax liability forecasting
 * - Comparative analysis (different scenarios)
 * - Tax-saving strategies
 */

import GlobalTaxEngine from './GlobalTaxEngine';
import { getDatabase } from '../../database/schema';

export class AdvancedTaxCalculator {

  /**
   * ========================================
   * TAX OPTIMIZATION ENGINE
   * ========================================
   */

  /**
   * Analyze and suggest tax optimization strategies
   */
  static async analyzeTaxOptimization(businessData) {
    const { country, annualRevenue, expenses, businessType } = businessData;

    const suggestions = [];
    let potentialSavings = 0;

    switch (country) {
      case 'INDIA':
        return await this.optimizeIndiaGST(businessData);
      case 'USA':
        return await this.optimizeUSATax(businessData);
      default:
        return { suggestions: [], potentialSavings: 0 };
    }
  }

  /**
   * India GST Optimization
   */
  static async optimizeIndiaGST(data) {
    const { annualRevenue, expenses, businessType } = data;
    const suggestions = [];
    let potentialSavings = 0;

    // 1. Composition Scheme Analysis
    if (annualRevenue < 1500000 && businessType !== 'SERVICE') {
      const regularTax = annualRevenue * 0.18; // Assuming 18% GST
      const compositionTax = annualRevenue * 0.01; // 1% composition
      const savings = regularTax - compositionTax;

      if (savings > 0) {
        suggestions.push({
          type: 'COMPOSITION_SCHEME',
          title: 'Switch to Composition Scheme',
          description: 'Your turnover qualifies for Composition Scheme (1% tax)',
          currentTax: regularTax,
          optimizedTax: compositionTax,
          savings: savings,
          priority: 'HIGH',
          action: 'File Form GST CMP-02 before start of financial year'
        });
        potentialSavings += savings;
      }
    }

    // 2. Input Tax Credit (ITC) Optimization
    const itcAnalysis = await this.analyzeITCUtilization(data);
    if (itcAnalysis.unutilizedITC > 0) {
      suggestions.push({
        type: 'ITC_OPTIMIZATION',
        title: 'Maximize Input Tax Credit',
        description: `You have ₹${itcAnalysis.unutilizedITC.toLocaleString()} unutilized ITC`,
        savings: itcAnalysis.unutilizedITC,
        priority: 'HIGH',
        action: 'Ensure all purchase invoices are properly recorded and claimed'
      });
      potentialSavings += itcAnalysis.unutilizedITC;
    }

    // 3. Reverse Charge Mechanism
    const rcmAnalysis = await this.analyzeRCMCompliance(data);
    if (rcmAnalysis.potentialIssues > 0) {
      suggestions.push({
        type: 'RCM_COMPLIANCE',
        title: 'Review Reverse Charge Transactions',
        description: `${rcmAnalysis.potentialIssues} transactions may require RCM`,
        priority: 'MEDIUM',
        action: 'Verify and pay tax under RCM to avoid penalties'
      });
    }

    // 4. E-Invoice Threshold
    if (annualRevenue > 1000000) {
      suggestions.push({
        type: 'E_INVOICE',
        title: 'Enable E-Invoicing',
        description: 'Your turnover exceeds ₹1 crore - e-invoicing is mandatory',
        priority: 'CRITICAL',
        action: 'Register on e-invoice portal and start generating e-invoices'
      });
    }

    return {
      country: 'INDIA',
      suggestions,
      potentialSavings,
      summary: `You can save up to ₹${potentialSavings.toLocaleString()} annually`
    };
  }

  /**
   * USA Tax Optimization
   */
  static async optimizeUSATax(data) {
    const { annualRevenue, expenses, businessType, filingStatus } = data;
    const suggestions = [];
    let potentialSavings = 0;

    // 1. Business Structure Optimization
    const structureAnalysis = this.analyzeBusinessStructure(data);
    if (structureAnalysis.savings > 0) {
      suggestions.push({
        type: 'BUSINESS_STRUCTURE',
        title: structureAnalysis.recommendation,
        description: structureAnalysis.description,
        savings: structureAnalysis.savings,
        priority: 'HIGH',
        action: 'Consult with CPA to change business structure'
      });
      potentialSavings += structureAnalysis.savings;
    }

    // 2. Deduction Maximization
    const deductions = this.analyzeDeductions(data);
    suggestions.push({
      type: 'DEDUCTIONS',
      title: 'Maximize Tax Deductions',
      description: `You may be eligible for $${deductions.totalDeductions.toLocaleString()} in deductions`,
      savings: deductions.taxSavings,
      priority: 'HIGH',
      action: 'Review and claim all eligible deductions',
      details: deductions.breakdown
    });
    potentialSavings += deductions.taxSavings;

    // 3. Retirement Contributions
    const retirementSavings = this.analyzeRetirementContributions(data);
    if (retirementSavings.additionalContribution > 0) {
      suggestions.push({
        type: 'RETIREMENT',
        title: 'Increase Retirement Contributions',
        description: `Contribute $${retirementSavings.additionalContribution.toLocaleString()} more to reduce taxable income`,
        savings: retirementSavings.taxSavings,
        priority: 'MEDIUM',
        action: 'Increase 401(k)/IRA contributions before year-end'
      });
      potentialSavings += retirementSavings.taxSavings;
    }

    // 4. State Tax Optimization
    const stateAnalysis = this.analyzeStateTaxes(data);
    if (stateAnalysis.savings > 0) {
      suggestions.push({
        type: 'STATE_TAX',
        title: stateAnalysis.recommendation,
        description: stateAnalysis.description,
        savings: stateAnalysis.savings,
        priority: 'MEDIUM',
        action: stateAnalysis.action
      });
      potentialSavings += stateAnalysis.savings;
    }

    return {
      country: 'USA',
      suggestions,
      potentialSavings,
      summary: `You can save up to $${potentialSavings.toLocaleString()} annually`
    };
  }

  /**
   * ========================================
   * TAX FORECASTING
   * ========================================
   */

  /**
   * Forecast tax liability for upcoming period
   */
  static async forecastTaxLiability(period, projections) {
    const { country, projectedRevenue, projectedExpenses } = projections;

    const db = await getDatabase();
    
    // Get historical data
    const historicalData = await db.executeSql(
      `SELECT 
        SUM(amount) as totalRevenue,
        SUM(total_tax) as totalTax,
        AVG(total_tax / amount) as avgTaxRate
       FROM transactions
       WHERE date >= date('now', '-12 months')
       AND type = 'SALES'`
    );

    const avgTaxRate = historicalData[0].rows.item(0).avgTaxRate || 0.18;

    // Calculate projected tax
    const projectedTax = projectedRevenue * avgTaxRate;

    // Monthly breakdown
    const monthlyForecast = [];
    const monthlyRevenue = projectedRevenue / 12;
    const monthlyTax = projectedTax / 12;

    for (let i = 0; i < 12; i++) {
      monthlyForecast.push({
        month: i + 1,
        revenue: monthlyRevenue,
        tax: monthlyTax,
        cumulativeTax: monthlyTax * (i + 1)
      });
    }

    return {
      period,
      projectedRevenue,
      projectedTax,
      avgTaxRate: (avgTaxRate * 100).toFixed(2) + '%',
      monthlyForecast,
      recommendations: [
        {
          title: 'Set aside monthly',
          amount: monthlyTax,
          description: 'Reserve this amount each month for tax payments'
        },
        {
          title: 'Quarterly payment',
          amount: projectedTax / 4,
          description: 'Make quarterly advance tax payments'
        }
      ]
    };
  }

  /**
   * ========================================
   * COMPARATIVE ANALYSIS
   * ========================================
   */

  /**
   * Compare tax liability across different scenarios
   */
  static async compareScenarios(scenarios) {
    const results = [];

    for (const scenario of scenarios) {
      const taxData = await GlobalTaxEngine.calculateTax(scenario);
      
      results.push({
        scenarioName: scenario.name,
        description: scenario.description,
        taxableAmount: taxData.taxableAmount,
        totalTax: taxData.totalTax,
        effectiveRate: ((taxData.totalTax / taxData.taxableAmount) * 100).toFixed(2) + '%',
        afterTaxAmount: taxData.taxableAmount - taxData.totalTax
      });
    }

    // Find best scenario
    const bestScenario = results.reduce((best, current) => 
      current.totalTax < best.totalTax ? current : best
    );

    return {
      scenarios: results,
      bestScenario,
      savings: results[0].totalTax - bestScenario.totalTax,
      recommendation: `Choose "${bestScenario.scenarioName}" to save ${
        ((results[0].totalTax - bestScenario.totalTax) / results[0].totalTax * 100).toFixed(1)
      }% on taxes`
    };
  }

  /**
   * ========================================
   * HELPER METHODS
   * ========================================
   */

  /**
   * Analyze ITC Utilization
   */
  static async analyzeITCUtilization(data) {
    const db = await getDatabase();
    
    const result = await db.executeSql(
      `SELECT 
        SUM(cgst + sgst + igst) as totalInputTax,
        SUM(CASE WHEN itc_claimed = 1 THEN cgst + sgst + igst ELSE 0 END) as claimedITC
       FROM transactions
       WHERE type = 'PURCHASE'
       AND date >= date('now', '-12 months')`
    );

    const totalInputTax = result[0].rows.item(0).totalInputTax || 0;
    const claimedITC = result[0].rows.item(0).claimedITC || 0;
    const unutilizedITC = totalInputTax - claimedITC;

    return {
      totalInputTax,
      claimedITC,
      unutilizedITC,
      utilizationRate: totalInputTax > 0 ? (claimedITC / totalInputTax * 100).toFixed(2) : 0
    };
  }

  /**
   * Analyze RCM Compliance
   */
  static async analyzeRCMCompliance(data) {
    const db = await getDatabase();
    
    const result = await db.executeSql(
      `SELECT COUNT(*) as count
       FROM transactions
       WHERE type = 'PURCHASE'
       AND supplier_gstin IS NULL
       AND amount > 5000
       AND date >= date('now', '-3 months')`
    );

    return {
      potentialIssues: result[0].rows.item(0).count
    };
  }

  /**
   * Analyze Business Structure (USA)
   */
  static analyzeBusinessStructure(data) {
    const { annualRevenue, businessType, currentStructure } = data;

    // Simplified analysis
    if (currentStructure === 'SOLE_PROPRIETOR' && annualRevenue > 100000) {
      const currentTax = annualRevenue * 0.25; // Simplified
      const llcTax = annualRevenue * 0.21; // Corporate rate
      const savings = currentTax - llcTax;

      return {
        recommendation: 'Consider forming an LLC or S-Corp',
        description: 'Potential tax savings through corporate structure',
        savings,
        currentStructure,
        recommendedStructure: 'LLC'
      };
    }

    return { savings: 0 };
  }

  /**
   * Analyze Deductions (USA)
   */
  static analyzeDeductions(data) {
    const { expenses, businessType } = data;

    const deductions = {
      homeOffice: expenses.rent * 0.2 || 0,
      vehicle: expenses.vehicle || 0,
      meals: expenses.meals * 0.5 || 0,
      travel: expenses.travel || 0,
      equipment: expenses.equipment || 0,
      insurance: expenses.insurance || 0
    };

    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
    const taxSavings = totalDeductions * 0.24; // Assuming 24% bracket

    return {
      totalDeductions,
      taxSavings,
      breakdown: deductions
    };
  }

  /**
   * Analyze Retirement Contributions (USA)
   */
  static analyzeRetirementContributions(data) {
    const { annualIncome, currentContributions = 0 } = data;

    const maxContribution = 22500; // 2024 401(k) limit
    const additionalContribution = Math.min(
      maxContribution - currentContributions,
      annualIncome * 0.1 // Suggest 10% of income
    );

    const taxSavings = additionalContribution * 0.24; // Assuming 24% bracket

    return {
      currentContributions,
      maxContribution,
      additionalContribution,
      taxSavings
    };
  }

  /**
   * Analyze State Taxes (USA)
   */
  static analyzeStateTaxes(data) {
    const { state, annualRevenue } = data;

    const stateTaxRates = {
      'CA': 0.0725,
      'TX': 0,
      'FL': 0,
      'NY': 0.04
    };

    const currentRate = stateTaxRates[state] || 0;
    
    // Find lowest tax state
    const lowestTaxState = Object.entries(stateTaxRates)
      .reduce((lowest, [st, rate]) => rate < lowest.rate ? { state: st, rate } : lowest, 
        { state, rate: currentRate });

    if (lowestTaxState.state !== state) {
      const savings = annualRevenue * (currentRate - lowestTaxState.rate);
      
      return {
        recommendation: `Consider relocating to ${lowestTaxState.state}`,
        description: `${lowestTaxState.state} has lower state tax rate`,
        savings,
        action: 'Evaluate business relocation feasibility'
      };
    }

    return { savings: 0 };
  }

  /**
   * ========================================
   * TAX CALENDAR & REMINDERS
   * ========================================
   */

  /**
   * Get upcoming tax deadlines
   */
  static async getUpcomingDeadlines(country) {
    const now = new Date();
    const deadlines = [];

    if (country === 'INDIA') {
      // GSTR-1 - 11th of next month
      const gstr1Date = new Date(now.getFullYear(), now.getMonth() + 1, 11);
      deadlines.push({
        type: 'GSTR-1',
        description: 'Outward Supplies Return',
        dueDate: gstr1Date,
        daysRemaining: Math.ceil((gstr1Date - now) / (1000 * 60 * 60 * 24)),
        priority: 'HIGH'
      });

      // GSTR-3B - 20th of next month
      const gstr3bDate = new Date(now.getFullYear(), now.getMonth() + 1, 20);
      deadlines.push({
        type: 'GSTR-3B',
        description: 'Summary Return',
        dueDate: gstr3bDate,
        daysRemaining: Math.ceil((gstr3bDate - now) / (1000 * 60 * 60 * 24)),
        priority: 'HIGH'
      });
    } else if (country === 'USA') {
      // Quarterly estimated tax
      const quarters = [
        { month: 3, day: 15, name: 'Q1' },
        { month: 5, day: 15, name: 'Q2' },
        { month: 8, day: 15, name: 'Q3' },
        { month: 0, day: 15, name: 'Q4' }
      ];

      quarters.forEach(q => {
        const dueDate = new Date(now.getFullYear(), q.month, q.day);
        if (dueDate > now) {
          deadlines.push({
            type: 'ESTIMATED_TAX',
            description: `${q.name} Estimated Tax Payment`,
            dueDate,
            daysRemaining: Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)),
            priority: 'HIGH'
          });
        }
      });
    }

    return deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }
}

export default AdvancedTaxCalculator;
