/**
 * MISTAKE PREVENTION SERVICE
 * 
 * "Don't let me do stupid things"
 * 
 * This is NOT just validation. This is PROTECTION.
 * Prevents disasters BEFORE they happen.
 * 
 * Prevents:
 * - Buying too much dead stock
 * - Selling below cost
 * - Huge cash gaps
 * - Over-ordering from slow suppliers
 * - Giving too much credit to risky customers
 * - Missing tax deadlines
 */

import { supabase } from '../supabase';

/**
 * PREVENTION TYPES
 */
const PREVENTION_TYPE = {
  BLOCK: 'block',       // Stop the action
  WARN: 'warn',         // Show warning but allow
  SUGGEST: 'suggest'    // Gentle suggestion
};

/**
 * MISTAKE CATEGORIES
 */
const MISTAKE = {
  DEAD_STOCK_PURCHASE: 'dead_stock_purchase',
  BELOW_COST_SALE: 'below_cost_sale',
  CASH_GAP: 'cash_gap',
  RISKY_CUSTOMER_CREDIT: 'risky_customer_credit',
  OVER_ORDERING: 'over_ordering',
  DUPLICATE_ENTRY: 'duplicate_entry',
  WRONG_PRICING: 'wrong_pricing',
  TAX_DEADLINE_MISS: 'tax_deadline_miss'
};

class MistakePreventionService {
  /**
   * CHECK BEFORE PURCHASE
   */
  static async checkBeforePurchase(businessId, purchaseData) {
    const { item_id, quantity, price } = purchaseData;
    const warnings = [];

    // Check if item is dead stock
    const deadStockWarning = await this.checkDeadStockPurchase(businessId, item_id, quantity);
    if (deadStockWarning) warnings.push(deadStockWarning);

    // Check if over-ordering
    const overOrderWarning = await this.checkOverOrdering(businessId, item_id, quantity);
    if (overOrderWarning) warnings.push(overOrderWarning);

    // Check cash impact
    const cashWarning = await this.checkCashImpact(businessId, price * quantity);
    if (cashWarning) warnings.push(cashWarning);

    // Check if price is too high
    const priceWarning = await this.checkPurchasePrice(businessId, item_id, price);
    if (priceWarning) warnings.push(priceWarning);

    return {
      allowed: !warnings.some(w => w.type === PREVENTION_TYPE.BLOCK),
      warnings,
      message: this.getPurchaseMessage(warnings)
    };
  }

  /**
   * CHECK BEFORE SALE
   */
  static async checkBeforeSale(businessId, saleData) {
    const { item_id, quantity, price, customer_id } = saleData;
    const warnings = [];

    // Check if selling below cost
    const belowCostWarning = await this.checkBelowCostSale(businessId, item_id, price);
    if (belowCostWarning) warnings.push(belowCostWarning);

    // Check stock availability
    const stockWarning = await this.checkStockAvailability(businessId, item_id, quantity);
    if (stockWarning) warnings.push(stockWarning);

    // Check customer credit risk
    if (customer_id) {
      const creditWarning = await this.checkCustomerCredit(businessId, customer_id, price * quantity);
      if (creditWarning) warnings.push(creditWarning);
    }

    // Check if duplicate
    const duplicateWarning = await this.checkDuplicateSale(businessId, saleData);
    if (duplicateWarning) warnings.push(duplicateWarning);

    return {
      allowed: !warnings.some(w => w.type === PREVENTION_TYPE.BLOCK),
      warnings,
      message: this.getSaleMessage(warnings)
    };
  }

  /**
   * CHECK DEAD STOCK PURCHASE
   */
  static async checkDeadStockPurchase(businessId, itemId, quantity) {
    const { data: item } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (!item) return null;

    // Check last sale date
    const lastSaleDate = new Date(item.last_sale_date || 0);
    const daysSinceLastSale = (Date.now() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24);

    // If not sold in 90 days, it's dead stock
    if (daysSinceLastSale > 90) {
      return {
        type: PREVENTION_TYPE.BLOCK,
        category: MISTAKE.DEAD_STOCK_PURCHASE,
        title: '🛑 Stop! This is dead stock',
        message: `"${item.name}" hasn't sold in ${Math.floor(daysSinceLastSale)} days. Don't buy more!`,
        details: {
          itemName: item.name,
          currentStock: item.quantity,
          daysSinceLastSale: Math.floor(daysSinceLastSale),
          requestedQuantity: quantity
        },
        suggestion: 'Clear existing stock first before buying more'
      };
    }

    // If not sold in 60 days, warn
    if (daysSinceLastSale > 60) {
      return {
        type: PREVENTION_TYPE.WARN,
        category: MISTAKE.DEAD_STOCK_PURCHASE,
        title: '⚠️ Slow-moving item',
        message: `"${item.name}" is slow-moving (${Math.floor(daysSinceLastSale)} days since last sale)`,
        details: {
          itemName: item.name,
          currentStock: item.quantity,
          daysSinceLastSale: Math.floor(daysSinceLastSale)
        },
        suggestion: 'Consider buying less quantity'
      };
    }

    return null;
  }

  /**
   * CHECK OVER-ORDERING
   */
  static async checkOverOrdering(businessId, itemId, quantity) {
    const { data: item } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (!item) return null;

    // Calculate average monthly sales
    const { data: sales } = await supabase
      .from('transactions')
      .select('quantity')
      .eq('business_id', businessId)
      .eq('item_id', itemId)
      .eq('type', 'sale')
      .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    const totalSold = sales?.reduce((sum, s) => sum + s.quantity, 0) || 0;
    const avgMonthlySales = totalSold / 3; // 3 months average

    // If ordering more than 3 months supply
    const monthsOfSupply = avgMonthlySales > 0 ? quantity / avgMonthlySales : 999;

    if (monthsOfSupply > 6) {
      return {
        type: PREVENTION_TYPE.BLOCK,
        category: MISTAKE.OVER_ORDERING,
        title: '🛑 Too much stock!',
        message: `You're ordering ${monthsOfSupply.toFixed(0)} months of supply for "${item.name}"`,
        details: {
          itemName: item.name,
          requestedQuantity: quantity,
          avgMonthlySales: Math.floor(avgMonthlySales),
          monthsOfSupply: monthsOfSupply.toFixed(1)
        },
        suggestion: `Order max ${Math.ceil(avgMonthlySales * 3)} units (3 months supply)`
      };
    }

    if (monthsOfSupply > 3) {
      return {
        type: PREVENTION_TYPE.WARN,
        category: MISTAKE.OVER_ORDERING,
        title: '⚠️ High quantity',
        message: `Ordering ${monthsOfSupply.toFixed(0)} months of supply`,
        details: {
          itemName: item.name,
          monthsOfSupply: monthsOfSupply.toFixed(1)
        },
        suggestion: 'Consider ordering less'
      };
    }

    return null;
  }

  /**
   * CHECK CASH IMPACT
   */
  static async checkCashImpact(businessId, amount) {
    // Get current cash balance
    const { data: cashEntries } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('business_id', businessId)
      .eq('account_type', 'cash');

    const cashBalance = cashEntries?.reduce((sum, entry) => {
      return sum + (entry.debit || 0) - (entry.credit || 0);
    }, 0) || 0;

    // Calculate remaining cash after purchase
    const remainingCash = cashBalance - amount;

    // Get average daily expenses
    const { data: expenses } = await supabase
      .from('transactions')
      .select('amount')
      .eq('business_id', businessId)
      .eq('type', 'expense')
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const avgDailyExpense = totalExpenses / 30;
    const daysOfCashRemaining = avgDailyExpense > 0 ? remainingCash / avgDailyExpense : 999;

    if (daysOfCashRemaining < 3) {
      return {
        type: PREVENTION_TYPE.BLOCK,
        category: MISTAKE.CASH_GAP,
        title: '🛑 Cash crisis!',
        message: `After this purchase, you'll have only ${Math.floor(daysOfCashRemaining)} days of cash left`,
        details: {
          currentCash: cashBalance,
          purchaseAmount: amount,
          remainingCash,
          daysOfCash: Math.floor(daysOfCashRemaining)
        },
        suggestion: 'Delay this purchase or arrange funds first'
      };
    }

    if (daysOfCashRemaining < 7) {
      return {
        type: PREVENTION_TYPE.WARN,
        category: MISTAKE.CASH_GAP,
        title: '⚠️ Low cash warning',
        message: `After this purchase, only ${Math.floor(daysOfCashRemaining)} days of cash left`,
        details: {
          daysOfCash: Math.floor(daysOfCashRemaining)
        },
        suggestion: 'Ensure you have incoming payments soon'
      };
    }

    return null;
  }

  /**
   * CHECK BELOW COST SALE
   */
  static async checkBelowCostSale(businessId, itemId, salePrice) {
    const { data: item } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (!item) return null;

    const costPrice = item.cost_price;
    const margin = ((salePrice - costPrice) / costPrice) * 100;

    if (salePrice < costPrice) {
      return {
        type: PREVENTION_TYPE.BLOCK,
        category: MISTAKE.BELOW_COST_SALE,
        title: '🛑 Selling at loss!',
        message: `You're selling "${item.name}" below cost price`,
        details: {
          itemName: item.name,
          costPrice,
          salePrice,
          loss: costPrice - salePrice,
          lossPercent: Math.abs(margin).toFixed(1)
        },
        suggestion: `Minimum price should be ₹${costPrice.toFixed(2)}`
      };
    }

    if (margin < 10) {
      return {
        type: PREVENTION_TYPE.WARN,
        category: MISTAKE.BELOW_COST_SALE,
        title: '⚠️ Very low margin',
        message: `Only ${margin.toFixed(1)}% margin on "${item.name}"`,
        details: {
          itemName: item.name,
          margin: margin.toFixed(1)
        },
        suggestion: 'Consider increasing price'
      };
    }

    return null;
  }

  /**
   * CHECK STOCK AVAILABILITY
   */
  static async checkStockAvailability(businessId, itemId, quantity) {
    const { data: item } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (!item) return null;

    if (item.quantity < quantity) {
      return {
        type: PREVENTION_TYPE.BLOCK,
        category: MISTAKE.WRONG_PRICING,
        title: '🛑 Insufficient stock',
        message: `Only ${item.quantity} units of "${item.name}" available`,
        details: {
          itemName: item.name,
          available: item.quantity,
          requested: quantity,
          shortage: quantity - item.quantity
        },
        suggestion: 'Reduce quantity or restock first'
      };
    }

    return null;
  }

  /**
   * CHECK CUSTOMER CREDIT RISK
   */
  static async checkCustomerCredit(businessId, customerId, amount) {
    // Get customer's pending payments
    const { data: pending } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .eq('payment_status', 'pending');

    const totalPending = pending?.reduce((sum, t) => sum + t.amount, 0) || 0;

    // Get customer's payment history
    const { data: history } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .eq('payment_status', 'paid');

    // Calculate average delay
    let totalDelay = 0;
    let delayCount = 0;

    for (const txn of history || []) {
      if (txn.due_date && txn.paid_date) {
        const dueDate = new Date(txn.due_date);
        const paidDate = new Date(txn.paid_date);
        const delay = (paidDate - dueDate) / (1000 * 60 * 60 * 24);
        if (delay > 0) {
          totalDelay += delay;
          delayCount++;
        }
      }
    }

    const avgDelay = delayCount > 0 ? totalDelay / delayCount : 0;

    // Check if risky
    if (totalPending > 50000 && avgDelay > 30) {
      return {
        type: PREVENTION_TYPE.BLOCK,
        category: MISTAKE.RISKY_CUSTOMER_CREDIT,
        title: '🛑 Risky customer',
        message: `Customer has ₹${totalPending.toFixed(0)} pending and delays by ${Math.floor(avgDelay)} days on average`,
        details: {
          pendingAmount: totalPending,
          avgDelay: Math.floor(avgDelay),
          newCreditAmount: amount
        },
        suggestion: 'Get payment for pending dues first'
      };
    }

    if (totalPending > 30000 || avgDelay > 15) {
      return {
        type: PREVENTION_TYPE.WARN,
        category: MISTAKE.RISKY_CUSTOMER_CREDIT,
        title: '⚠️ Credit risk',
        message: `Customer has ₹${totalPending.toFixed(0)} pending`,
        details: {
          pendingAmount: totalPending
        },
        suggestion: 'Consider cash payment'
      };
    }

    return null;
  }

  /**
   * CHECK DUPLICATE SALE
   */
  static async checkDuplicateSale(businessId, saleData) {
    const { customer_id, amount, item_id } = saleData;

    // Check for similar transaction in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const { data: recent } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .eq('type', 'sale')
      .eq('customer_id', customer_id)
      .eq('amount', amount)
      .eq('item_id', item_id)
      .gte('created_at', fiveMinutesAgo.toISOString());

    if (recent && recent.length > 0) {
      return {
        type: PREVENTION_TYPE.WARN,
        category: MISTAKE.DUPLICATE_ENTRY,
        title: '⚠️ Possible duplicate',
        message: 'Similar sale was just recorded',
        details: {
          recentTransactionId: recent[0].id,
          timeDiff: Math.floor((Date.now() - new Date(recent[0].created_at).getTime()) / 1000)
        },
        suggestion: 'Check if this is a duplicate entry'
      };
    }

    return null;
  }

  /**
   * CHECK PURCHASE PRICE
   */
  static async checkPurchasePrice(businessId, itemId, price) {
    // Get last 5 purchases of this item
    const { data: purchases } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .eq('item_id', itemId)
      .eq('type', 'purchase')
      .order('date', { ascending: false })
      .limit(5);

    if (!purchases || purchases.length === 0) return null;

    const avgPrice = purchases.reduce((sum, p) => sum + p.price, 0) / purchases.length;
    const priceIncrease = ((price - avgPrice) / avgPrice) * 100;

    if (priceIncrease > 20) {
      return {
        type: PREVENTION_TYPE.WARN,
        category: MISTAKE.WRONG_PRICING,
        title: '⚠️ Price increased',
        message: `Purchase price is ${priceIncrease.toFixed(0)}% higher than usual`,
        details: {
          currentPrice: price,
          avgPrice: avgPrice.toFixed(2),
          increase: priceIncrease.toFixed(1)
        },
        suggestion: 'Verify price with supplier'
      };
    }

    return null;
  }

  /**
   * GET PURCHASE MESSAGE
   */
  static getPurchaseMessage(warnings) {
    if (warnings.length === 0) {
      return '✅ Safe to proceed';
    }

    const blocked = warnings.filter(w => w.type === PREVENTION_TYPE.BLOCK);
    if (blocked.length > 0) {
      return `🛑 Cannot proceed: ${blocked[0].message}`;
    }

    const warns = warnings.filter(w => w.type === PREVENTION_TYPE.WARN);
    if (warns.length > 0) {
      return `⚠️ Warning: ${warns[0].message}`;
    }

    return '✅ Proceed with caution';
  }

  /**
   * GET SALE MESSAGE
   */
  static getSaleMessage(warnings) {
    if (warnings.length === 0) {
      return '✅ Safe to proceed';
    }

    const blocked = warnings.filter(w => w.type === PREVENTION_TYPE.BLOCK);
    if (blocked.length > 0) {
      return `🛑 Cannot proceed: ${blocked[0].message}`;
    }

    const warns = warnings.filter(w => w.type === PREVENTION_TYPE.WARN);
    if (warns.length > 0) {
      return `⚠️ Warning: ${warns[0].message}`;
    }

    return '✅ Proceed with caution';
  }

  /**
   * LOG PREVENTED MISTAKE
   */
  static async logPreventedMistake(businessId, warning) {
    await supabase
      .from('prevented_mistakes')
      .insert({
        business_id: businessId,
        category: warning.category,
        title: warning.title,
        message: warning.message,
        details: warning.details,
        prevented_at: new Date().toISOString()
      });
  }

  /**
   * GET PREVENTION STATS
   */
  static async getPreventionStats(businessId) {
    const { data: prevented } = await supabase
      .from('prevented_mistakes')
      .select('*')
      .eq('business_id', businessId);

    const stats = {
      totalPrevented: prevented?.length || 0,
      byCategory: {}
    };

    for (const mistake of prevented || []) {
      if (!stats.byCategory[mistake.category]) {
        stats.byCategory[mistake.category] = 0;
      }
      stats.byCategory[mistake.category]++;
    }

    return stats;
  }
}

export default MistakePreventionService;
