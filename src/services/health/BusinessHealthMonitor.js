/**
 * BUSINESS HEALTH MONITOR SERVICE
 * 
 * "Is my business healthy?"
 * Answer in 3 seconds: 🟢 Healthy / 🟡 Watch out / 🔴 Trouble
 * 
 * This is NOT a dashboard. This is CLARITY.
 * 
 * Monitors:
 * - Cash flow health
 * - Profit quality
 * - Inventory health
 * - Tax risk
 * - Customer payment behavior
 * - Supplier payment behavior
 */

import { supabase } from '../supabase';

/**
 * HEALTH STATUS
 */
const HEALTH_STATUS = {
  HEALTHY: 'healthy',       // 🟢 Everything good
  WATCH_OUT: 'watch_out',   // 🟡 Some concerns
  TROUBLE: 'trouble'        // 🔴 Needs attention
};

/**
 * HEALTH FACTORS
 */
const FACTORS = {
  CASH_FLOW: 'cash_flow',
  PROFIT_QUALITY: 'profit_quality',
  INVENTORY: 'inventory',
  TAX_RISK: 'tax_risk',
  CUSTOMER_PAYMENTS: 'customer_payments',
  SUPPLIER_PAYMENTS: 'supplier_payments'
};

class BusinessHealthMonitor {
  /**
   * GET OVERALL BUSINESS HEALTH
   */
  static async getBusinessHealth(businessId) {
    console.log('🏥 Checking Business Health...');

    // Check all health factors
    const [
      cashFlowHealth,
      profitHealth,
      inventoryHealth,
      taxHealth,
      customerHealth,
      supplierHealth
    ] = await Promise.all([
      this.checkCashFlowHealth(businessId),
      this.checkProfitQuality(businessId),
      this.checkInventoryHealth(businessId),
      this.checkTaxRisk(businessId),
      this.checkCustomerPaymentHealth(businessId),
      this.checkSupplierPaymentHealth(businessId)
    ]);

    const factors = {
      cashFlow: cashFlowHealth,
      profit: profitHealth,
      inventory: inventoryHealth,
      tax: taxHealth,
      customers: customerHealth,
      suppliers: supplierHealth
    };

    // Calculate overall health
    const overallHealth = this.calculateOverallHealth(factors);

    // Get simple message
    const message = this.getHealthMessage(overallHealth, factors);

    // Get action items
    const actions = this.getActionItems(factors);

    return {
      status: overallHealth,
      message,
      factors,
      actions,
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * CHECK CASH FLOW HEALTH
   */
  static async checkCashFlowHealth(businessId) {
    // Get cash transactions for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .gte('date', thirtyDaysAgo.toISOString());

    let cashIn = 0;
    let cashOut = 0;

    for (const txn of transactions || []) {
      if (txn.type === 'sale' || txn.type === 'income') {
        cashIn += txn.amount;
      } else if (txn.type === 'purchase' || txn.type === 'expense') {
        cashOut += txn.amount;
      }
    }

    const netCashFlow = cashIn - cashOut;
    const cashFlowRatio = cashOut > 0 ? cashIn / cashOut : 1;

    // Get current cash balance
    const { data: cashAccount } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('business_id', businessId)
      .eq('account_type', 'cash');

    const cashBalance = cashAccount?.reduce((sum, entry) => {
      return sum + (entry.debit || 0) - (entry.credit || 0);
    }, 0) || 0;

    // Calculate days of cash remaining
    const avgDailyExpense = cashOut / 30;
    const daysOfCash = avgDailyExpense > 0 ? cashBalance / avgDailyExpense : 999;

    // Determine health
    let status = HEALTH_STATUS.HEALTHY;
    let score = 100;
    const issues = [];

    if (netCashFlow < 0) {
      status = HEALTH_STATUS.WATCH_OUT;
      score -= 20;
      issues.push('Negative cash flow this month');
    }

    if (daysOfCash < 7) {
      status = HEALTH_STATUS.TROUBLE;
      score -= 30;
      issues.push(`Only ${Math.floor(daysOfCash)} days of cash left`);
    } else if (daysOfCash < 15) {
      status = HEALTH_STATUS.WATCH_OUT;
      score -= 15;
      issues.push(`${Math.floor(daysOfCash)} days of cash remaining`);
    }

    if (cashFlowRatio < 1) {
      status = HEALTH_STATUS.WATCH_OUT;
      score -= 10;
      issues.push('Spending more than earning');
    }

    return {
      status,
      score,
      metrics: {
        cashIn,
        cashOut,
        netCashFlow,
        cashBalance,
        daysOfCash: Math.floor(daysOfCash),
        cashFlowRatio: cashFlowRatio.toFixed(2)
      },
      issues,
      message: this.getCashFlowMessage(status, daysOfCash, netCashFlow)
    };
  }

  /**
   * CHECK PROFIT QUALITY
   */
  static async checkProfitQuality(businessId) {
    // Get last 30 days data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .gte('date', thirtyDaysAgo.toISOString());

    let revenue = 0;
    let cogs = 0;
    let expenses = 0;

    for (const txn of transactions || []) {
      if (txn.type === 'sale') {
        revenue += txn.amount;
        cogs += txn.cogs || 0;
      } else if (txn.type === 'expense') {
        expenses += txn.amount;
      }
    }

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Determine health
    let status = HEALTH_STATUS.HEALTHY;
    let score = 100;
    const issues = [];

    if (netProfit < 0) {
      status = HEALTH_STATUS.TROUBLE;
      score -= 40;
      issues.push('Making losses');
    } else if (netMargin < 5) {
      status = HEALTH_STATUS.WATCH_OUT;
      score -= 20;
      issues.push('Very thin profit margins');
    }

    if (grossMargin < 20) {
      status = HEALTH_STATUS.WATCH_OUT;
      score -= 15;
      issues.push('Low gross margins');
    }

    if (expenses > revenue * 0.8) {
      status = HEALTH_STATUS.WATCH_OUT;
      score -= 10;
      issues.push('High expense ratio');
    }

    return {
      status,
      score,
      metrics: {
        revenue,
        cogs,
        expenses,
        grossProfit,
        netProfit,
        grossMargin: grossMargin.toFixed(1),
        netMargin: netMargin.toFixed(1)
      },
      issues,
      message: this.getProfitMessage(status, netMargin, grossMargin)
    };
  }

  /**
   * CHECK INVENTORY HEALTH
   */
  static async checkInventoryHealth(businessId) {
    const { data: items } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('business_id', businessId);

    let totalValue = 0;
    let deadStockValue = 0;
    let slowMovingValue = 0;
    let deadStockCount = 0;
    let slowMovingCount = 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const item of items || []) {
      const itemValue = item.quantity * item.cost_price;
      totalValue += itemValue;

      // Check last sale date
      const lastSaleDate = new Date(item.last_sale_date || 0);
      const daysSinceLastSale = (Date.now() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastSale > 90) {
        deadStockValue += itemValue;
        deadStockCount++;
      } else if (daysSinceLastSale > 60) {
        slowMovingValue += itemValue;
        slowMovingCount++;
      }
    }

    const deadStockPercent = totalValue > 0 ? (deadStockValue / totalValue) * 100 : 0;
    const slowMovingPercent = totalValue > 0 ? (slowMovingValue / totalValue) * 100 : 0;

    // Determine health
    let status = HEALTH_STATUS.HEALTHY;
    let score = 100;
    const issues = [];

    if (deadStockPercent > 20) {
      status = HEALTH_STATUS.TROUBLE;
      score -= 30;
      issues.push(`${deadStockPercent.toFixed(0)}% inventory is dead stock`);
    } else if (deadStockPercent > 10) {
      status = HEALTH_STATUS.WATCH_OUT;
      score -= 15;
      issues.push(`${deadStockPercent.toFixed(0)}% inventory not moving`);
    }

    if (slowMovingPercent > 30) {
      status = HEALTH_STATUS.WATCH_OUT;
      score -= 10;
      issues.push(`${slowMovingPercent.toFixed(0)}% inventory slow-moving`);
    }

    return {
      status,
      score,
      metrics: {
        totalValue,
        deadStockValue,
        slowMovingValue,
        deadStockCount,
        slowMovingCount,
        deadStockPercent: deadStockPercent.toFixed(1),
        slowMovingPercent: slowMovingPercent.toFixed(1)
      },
      issues,
      message: this.getInventoryMessage(status, deadStockPercent, slowMovingPercent)
    };
  }

  /**
   * CHECK TAX RISK
   */
  static async checkTaxRisk(businessId) {
    // Get tax readiness from Tax Autopilot
    const { data: taxStatus } = await supabase
      .from('tax_readiness')
      .select('*')
      .eq('business_id', businessId)
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();

    const readinessScore = taxStatus?.readiness_score || 0;
    const criticalIssues = taxStatus?.critical_issues || 0;
    const highIssues = taxStatus?.high_issues || 0;

    // Determine health
    let status = HEALTH_STATUS.HEALTHY;
    let score = readinessScore;
    const issues = [];

    if (readinessScore < 60) {
      status = HEALTH_STATUS.TROUBLE;
      issues.push('Not ready for tax filing');
    } else if (readinessScore < 80) {
      status = HEALTH_STATUS.WATCH_OUT;
      issues.push('Some tax issues need fixing');
    }

    if (criticalIssues > 0) {
      status = HEALTH_STATUS.TROUBLE;
      issues.push(`${criticalIssues} critical tax issues`);
    }

    return {
      status,
      score,
      metrics: {
        readinessScore,
        criticalIssues,
        highIssues
      },
      issues,
      message: this.getTaxMessage(status, readinessScore)
    };
  }

  /**
   * CHECK CUSTOMER PAYMENT HEALTH
   */
  static async checkCustomerPaymentHealth(businessId) {
    // Get receivables
    const { data: receivables } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .eq('type', 'sale')
      .eq('payment_status', 'pending');

    let totalReceivable = 0;
    let overdueAmount = 0;
    let overdueCount = 0;

    const today = new Date();

    for (const txn of receivables || []) {
      totalReceivable += txn.amount;

      const dueDate = new Date(txn.due_date);
      if (dueDate < today) {
        overdueAmount += txn.amount;
        overdueCount++;
      }
    }

    const overduePercent = totalReceivable > 0 ? (overdueAmount / totalReceivable) * 100 : 0;

    // Determine health
    let status = HEALTH_STATUS.HEALTHY;
    let score = 100;
    const issues = [];

    if (overduePercent > 40) {
      status = HEALTH_STATUS.TROUBLE;
      score -= 30;
      issues.push(`${overduePercent.toFixed(0)}% payments overdue`);
    } else if (overduePercent > 20) {
      status = HEALTH_STATUS.WATCH_OUT;
      score -= 15;
      issues.push(`${overduePercent.toFixed(0)}% payments overdue`);
    }

    if (overdueCount > 10) {
      status = HEALTH_STATUS.WATCH_OUT;
      score -= 10;
      issues.push(`${overdueCount} customers not paying on time`);
    }

    return {
      status,
      score,
      metrics: {
        totalReceivable,
        overdueAmount,
        overdueCount,
        overduePercent: overduePercent.toFixed(1)
      },
      issues,
      message: this.getCustomerMessage(status, overduePercent, overdueCount)
    };
  }

  /**
   * CHECK SUPPLIER PAYMENT HEALTH
   */
  static async checkSupplierPaymentHealth(businessId) {
    // Get payables
    const { data: payables } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .eq('type', 'purchase')
      .eq('payment_status', 'pending');

    let totalPayable = 0;
    let overdueAmount = 0;
    let overdueCount = 0;

    const today = new Date();

    for (const txn of payables || []) {
      totalPayable += txn.amount;

      const dueDate = new Date(txn.due_date);
      if (dueDate < today) {
        overdueAmount += txn.amount;
        overdueCount++;
      }
    }

    const overduePercent = totalPayable > 0 ? (overdueAmount / totalPayable) * 100 : 0;

    // Determine health
    let status = HEALTH_STATUS.HEALTHY;
    let score = 100;
    const issues = [];

    if (overduePercent > 30) {
      status = HEALTH_STATUS.TROUBLE;
      score -= 30;
      issues.push(`${overduePercent.toFixed(0)}% supplier payments overdue`);
    } else if (overduePercent > 15) {
      status = HEALTH_STATUS.WATCH_OUT;
      score -= 15;
      issues.push(`${overduePercent.toFixed(0)}% supplier payments overdue`);
    }

    return {
      status,
      score,
      metrics: {
        totalPayable,
        overdueAmount,
        overdueCount,
        overduePercent: overduePercent.toFixed(1)
      },
      issues,
      message: this.getSupplierMessage(status, overduePercent)
    };
  }

  /**
   * CALCULATE OVERALL HEALTH
   */
  static calculateOverallHealth(factors) {
    const statuses = Object.values(factors).map(f => f.status);

    // If any factor is in trouble, overall is trouble
    if (statuses.includes(HEALTH_STATUS.TROUBLE)) {
      return HEALTH_STATUS.TROUBLE;
    }

    // If 2+ factors need watching, overall needs watching
    const watchCount = statuses.filter(s => s === HEALTH_STATUS.WATCH_OUT).length;
    if (watchCount >= 2) {
      return HEALTH_STATUS.WATCH_OUT;
    }

    // If 1 factor needs watching, overall needs watching
    if (watchCount === 1) {
      return HEALTH_STATUS.WATCH_OUT;
    }

    return HEALTH_STATUS.HEALTHY;
  }

  /**
   * GET HEALTH MESSAGE
   */
  static getHealthMessage(status, factors) {
    if (status === HEALTH_STATUS.HEALTHY) {
      return '🟢 Your business is healthy! Keep it up.';
    }

    const problemAreas = Object.entries(factors)
      .filter(([_, factor]) => factor.status !== HEALTH_STATUS.HEALTHY)
      .map(([name, _]) => name);

    if (status === HEALTH_STATUS.WATCH_OUT) {
      return `🟡 Watch out! Issues in: ${problemAreas.join(', ')}`;
    }

    return `🔴 Needs attention! Critical issues in: ${problemAreas.join(', ')}`;
  }

  /**
   * GET ACTION ITEMS
   */
  static getActionItems(factors) {
    const actions = [];

    for (const [name, factor] of Object.entries(factors)) {
      if (factor.status !== HEALTH_STATUS.HEALTHY && factor.issues.length > 0) {
        actions.push({
          area: name,
          priority: factor.status === HEALTH_STATUS.TROUBLE ? 'high' : 'medium',
          issues: factor.issues,
          score: factor.score
        });
      }
    }

    // Sort by priority
    return actions.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return a.score - b.score;
    });
  }

  /**
   * HELPER MESSAGES
   */
  static getCashFlowMessage(status, daysOfCash, netCashFlow) {
    if (status === HEALTH_STATUS.HEALTHY) {
      return `Good cash position. ${Math.floor(daysOfCash)} days of cash available.`;
    } else if (status === HEALTH_STATUS.WATCH_OUT) {
      return `Cash running low. Only ${Math.floor(daysOfCash)} days left.`;
    } else {
      return `Critical! Only ${Math.floor(daysOfCash)} days of cash remaining.`;
    }
  }

  static getProfitMessage(status, netMargin, grossMargin) {
    if (status === HEALTH_STATUS.HEALTHY) {
      return `Healthy profits. ${netMargin}% net margin.`;
    } else if (status === HEALTH_STATUS.WATCH_OUT) {
      return `Thin margins. Only ${netMargin}% net profit.`;
    } else {
      return `Making losses. Need to improve margins.`;
    }
  }

  static getInventoryMessage(status, deadStockPercent, slowMovingPercent) {
    if (status === HEALTH_STATUS.HEALTHY) {
      return `Inventory moving well. Minimal dead stock.`;
    } else if (status === HEALTH_STATUS.WATCH_OUT) {
      return `${deadStockPercent}% inventory not moving. Review stock.`;
    } else {
      return `High dead stock (${deadStockPercent}%). Stop buying more.`;
    }
  }

  static getTaxMessage(status, readinessScore) {
    if (status === HEALTH_STATUS.HEALTHY) {
      return `Tax ready. ${readinessScore}% compliance score.`;
    } else if (status === HEALTH_STATUS.WATCH_OUT) {
      return `Some tax issues. ${readinessScore}% ready.`;
    } else {
      return `Not tax ready. Only ${readinessScore}% compliant.`;
    }
  }

  static getCustomerMessage(status, overduePercent, overdueCount) {
    if (status === HEALTH_STATUS.HEALTHY) {
      return `Customers paying on time.`;
    } else if (status === HEALTH_STATUS.WATCH_OUT) {
      return `${overdueCount} customers delaying payments.`;
    } else {
      return `${overduePercent}% payments overdue. Follow up urgently.`;
    }
  }

  static getSupplierMessage(status, overduePercent) {
    if (status === HEALTH_STATUS.HEALTHY) {
      return `Paying suppliers on time.`;
    } else if (status === HEALTH_STATUS.WATCH_OUT) {
      return `${overduePercent}% supplier payments overdue.`;
    } else {
      return `Many supplier payments overdue. Risk to supply chain.`;
    }
  }
}

export default BusinessHealthMonitor;
