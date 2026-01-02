/**
 * TRADING AND PROFIT & LOSS SERVICE - COMPLETE LOGIC
 */

import StorageService from '../storage/storageService';
import LedgerService from './ledgerService';
import moment from 'moment';

export class TradingProfitLossService {
  static formatAmount(amount) {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  static async getTradingAccount(filters = {}) {
    try {
      const ledgerResult = await LedgerService.getAllLedgerAccounts(filters);
      
      if (!ledgerResult.success) return ledgerResult;

      const accounts = ledgerResult.data;

      const tradingData = {
        openingStock: 0,
        purchases: 0,
        purchaseReturns: 0,
        directExpenses: [],
        sales: 0,
        salesReturns: 0,
        closingStock: 0
      };

      for (const account of accounts) {
        const code = account.accountCode;
        const balance = Math.abs(account.balance);

        if (code === '5001' || account.accountName.toLowerCase().includes('opening stock')) {
          tradingData.openingStock = balance;
        } else if (code === '5002' || account.accountName.toLowerCase().includes('purchases')) {
          tradingData.purchases = balance;
        } else if (code === '5003' || account.accountName.toLowerCase().includes('purchase return')) {
          tradingData.purchaseReturns = balance;
        } else if (code === '4001' || account.accountName.toLowerCase().includes('sales')) {
          tradingData.sales = balance;
        } else if (code === '4002' || account.accountName.toLowerCase().includes('sales return')) {
          tradingData.salesReturns = balance;
        } else if (code === '5004' || account.accountName.toLowerCase().includes('closing stock')) {
          tradingData.closingStock = balance;
        } else if (code.startsWith('50') && !['5001', '5002', '5003', '5004'].includes(code)) {
          tradingData.directExpenses.push({
            accountCode: code,
            accountName: account.accountName,
            amount: balance
          });
        }
      }

      const netPurchases = tradingData.purchases - tradingData.purchaseReturns;
      const netSales = tradingData.sales - tradingData.salesReturns;
      const totalDirectExpenses = tradingData.directExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      const costOfGoodsSold = tradingData.openingStock + netPurchases + totalDirectExpenses - tradingData.closingStock;
      const grossProfit = netSales - costOfGoodsSold;
      const isGrossProfit = grossProfit >= 0;

      return {
        success: true,
        data: tradingData,
        calculations: {
          netPurchases: netPurchases,
          netSales: netSales,
          totalDirectExpenses: totalDirectExpenses,
          costOfGoodsSold: costOfGoodsSold,
          grossProfit: Math.abs(grossProfit),
          isGrossProfit: isGrossProfit,
          netPurchasesFormatted: this.formatAmount(netPurchases),
          netSalesFormatted: this.formatAmount(netSales),
          totalDirectExpensesFormatted: this.formatAmount(totalDirectExpenses),
          costOfGoodsSoldFormatted: this.formatAmount(costOfGoodsSold),
          grossProfitFormatted: this.formatAmount(Math.abs(grossProfit))
        }
      };
    } catch (error) {
      console.error('Get trading account error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getProfitAndLossAccount(filters = {}) {
    try {
      const tradingResult = await this.getTradingAccount(filters);
      
      if (!tradingResult.success) return tradingResult;

      const grossProfit = tradingResult.calculations.isGrossProfit 
        ? tradingResult.calculations.grossProfit 
        : 0;
      const grossLoss = !tradingResult.calculations.isGrossProfit 
        ? tradingResult.calculations.grossProfit 
        : 0;

      const ledgerResult = await LedgerService.getAllLedgerAccounts(filters);
      
      if (!ledgerResult.success) return ledgerResult;

      const accounts = ledgerResult.data;

      const profitLossData = {
        indirectIncomes: [],
        indirectExpenses: [],
        financialIncomes: [],
        financialExpenses: []
      };

      for (const account of accounts) {
        const code = account.accountCode;
        const balance = Math.abs(account.balance);

        if (code.startsWith('41')) {
          profitLossData.indirectIncomes.push({
            accountCode: code,
            accountName: account.accountName,
            amount: balance
          });
        } else if (code.startsWith('42')) {
          profitLossData.financialIncomes.push({
            accountCode: code,
            accountName: account.accountName,
            amount: balance
          });
        } else if (code.startsWith('51')) {
          profitLossData.indirectExpenses.push({
            accountCode: code,
            accountName: account.accountName,
            amount: balance
          });
        } else if (code.startsWith('52')) {
          profitLossData.financialExpenses.push({
            accountCode: code,
            accountName: account.accountName,
            amount: balance
          });
        }
      }

      const totalIndirectIncomes = profitLossData.indirectIncomes.reduce((sum, i) => sum + i.amount, 0);
      const totalFinancialIncomes = profitLossData.financialIncomes.reduce((sum, i) => sum + i.amount, 0);
      const totalIndirectExpenses = profitLossData.indirectExpenses.reduce((sum, e) => sum + e.amount, 0);
      const totalFinancialExpenses = profitLossData.financialExpenses.reduce((sum, e) => sum + e.amount, 0);

      const totalIncomes = grossProfit + totalIndirectIncomes + totalFinancialIncomes;
      const totalExpenses = grossLoss + totalIndirectExpenses + totalFinancialExpenses;

      const netProfit = totalIncomes - totalExpenses;
      const isNetProfit = netProfit >= 0;

      return {
        success: true,
        tradingAccount: tradingResult,
        data: profitLossData,
        calculations: {
          grossProfit: grossProfit,
          grossLoss: grossLoss,
          totalIndirectIncomes: totalIndirectIncomes,
          totalFinancialIncomes: totalFinancialIncomes,
          totalIndirectExpenses: totalIndirectExpenses,
          totalFinancialExpenses: totalFinancialExpenses,
          totalIncomes: totalIncomes,
          totalExpenses: totalExpenses,
          netProfit: Math.abs(netProfit),
          isNetProfit: isNetProfit,
          grossProfitFormatted: this.formatAmount(grossProfit),
          grossLossFormatted: this.formatAmount(grossLoss),
          totalIndirectIncomesFormatted: this.formatAmount(totalIndirectIncomes),
          totalFinancialIncomesFormatted: this.formatAmount(totalFinancialIncomes),
          totalIndirectExpensesFormatted: this.formatAmount(totalIndirectExpenses),
          totalFinancialExpensesFormatted: this.formatAmount(totalFinancialExpenses),
          totalIncomesFormatted: this.formatAmount(totalIncomes),
          totalExpensesFormatted: this.formatAmount(totalExpenses),
          netProfitFormatted: this.formatAmount(Math.abs(netProfit))
        }
      };
    } catch (error) {
      console.error('Get profit and loss account error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getProfitAndLoss(filters = {}) {
    try {
      const result = await this.getProfitAndLossAccount(filters);
      
      if (!result.success) return result;

      const netProfit = result.calculations.isNetProfit 
        ? result.calculations.netProfit 
        : -result.calculations.netProfit;

      return {
        success: true,
        netProfit: netProfit,
        isProfit: result.calculations.isNetProfit,
        formatted: this.formatAmount(Math.abs(netProfit))
      };
    } catch (error) {
      console.error('Get profit and loss error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getComparativeProfitLoss(filters1 = {}, filters2 = {}) {
    try {
      const pl1 = await this.getProfitAndLossAccount(filters1);
      const pl2 = await this.getProfitAndLossAccount(filters2);

      if (!pl1.success || !pl2.success) {
        return { success: false, error: 'Failed to get profit & loss accounts' };
      }

      const comparison = {
        grossProfit: {
          period1: pl1.calculations.grossProfit,
          period2: pl2.calculations.grossProfit,
          change: pl2.calculations.grossProfit - pl1.calculations.grossProfit,
          percentageChange: pl1.calculations.grossProfit !== 0 
            ? ((pl2.calculations.grossProfit - pl1.calculations.grossProfit) / pl1.calculations.grossProfit) * 100 
            : 0
        },
        netProfit: {
          period1: pl1.calculations.isNetProfit ? pl1.calculations.netProfit : -pl1.calculations.netProfit,
          period2: pl2.calculations.isNetProfit ? pl2.calculations.netProfit : -pl2.calculations.netProfit,
          change: (pl2.calculations.isNetProfit ? pl2.calculations.netProfit : -pl2.calculations.netProfit) - 
                  (pl1.calculations.isNetProfit ? pl1.calculations.netProfit : -pl1.calculations.netProfit),
          percentageChange: pl1.calculations.netProfit !== 0 
            ? (((pl2.calculations.isNetProfit ? pl2.calculations.netProfit : -pl2.calculations.netProfit) - 
                (pl1.calculations.isNetProfit ? pl1.calculations.netProfit : -pl1.calculations.netProfit)) / 
                Math.abs(pl1.calculations.isNetProfit ? pl1.calculations.netProfit : -pl1.calculations.netProfit)) * 100 
            : 0
        },
        totalIncomes: {
          period1: pl1.calculations.totalIncomes,
          period2: pl2.calculations.totalIncomes,
          change: pl2.calculations.totalIncomes - pl1.calculations.totalIncomes,
          percentageChange: pl1.calculations.totalIncomes !== 0 
            ? ((pl2.calculations.totalIncomes - pl1.calculations.totalIncomes) / pl1.calculations.totalIncomes) * 100 
            : 0
        },
        totalExpenses: {
          period1: pl1.calculations.totalExpenses,
          period2: pl2.calculations.totalExpenses,
          change: pl2.calculations.totalExpenses - pl1.calculations.totalExpenses,
          percentageChange: pl1.calculations.totalExpenses !== 0 
            ? ((pl2.calculations.totalExpenses - pl1.calculations.totalExpenses) / pl1.calculations.totalExpenses) * 100 
            : 0
        }
      };

      return {
        success: true,
        profitLoss1: pl1,
        profitLoss2: pl2,
        comparison: comparison
      };
    } catch (error) {
      console.error('Get comparative profit & loss error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getProfitabilityRatios(filters = {}) {
    try {
      const plResult = await this.getProfitAndLossAccount(filters);
      
      if (!plResult.success) return plResult;

      const netSales = plResult.tradingAccount.calculations.netSales;
      const grossProfit = plResult.calculations.grossProfit;
      const netProfit = plResult.calculations.isNetProfit 
        ? plResult.calculations.netProfit 
        : -plResult.calculations.netProfit;

      const grossProfitRatio = netSales !== 0 ? (grossProfit / netSales) * 100 : 0;
      const netProfitRatio = netSales !== 0 ? (netProfit / netSales) * 100 : 0;
      const operatingRatio = netSales !== 0 
        ? ((plResult.calculations.totalExpenses) / netSales) * 100 
        : 0;

      return {
        success: true,
        ratios: {
          grossProfitRatio: grossProfitRatio,
          netProfitRatio: netProfitRatio,
          operatingRatio: operatingRatio,
          grossProfitRatioFormatted: grossProfitRatio.toFixed(2) + '%',
          netProfitRatioFormatted: netProfitRatio.toFixed(2) + '%',
          operatingRatioFormatted: operatingRatio.toFixed(2) + '%'
        },
        interpretation: {
          grossProfitRatio: grossProfitRatio >= 25 ? 'Good' : grossProfitRatio >= 15 ? 'Acceptable' : 'Poor',
          netProfitRatio: netProfitRatio >= 10 ? 'Good' : netProfitRatio >= 5 ? 'Acceptable' : 'Poor',
          operatingRatio: operatingRatio <= 75 ? 'Good' : operatingRatio <= 85 ? 'Acceptable' : 'Poor'
        }
      };
    } catch (error) {
      console.error('Get profitability ratios error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getVerticalAnalysis(filters = {}) {
    try {
      const plResult = await this.getProfitAndLossAccount(filters);
      
      if (!plResult.success) return plResult;

      const netSales = plResult.tradingAccount.calculations.netSales;

      const percentages = {
        costOfGoodsSold: (plResult.tradingAccount.calculations.costOfGoodsSold / netSales) * 100,
        grossProfit: (plResult.calculations.grossProfit / netSales) * 100,
        indirectExpenses: (plResult.calculations.totalIndirectExpenses / netSales) * 100,
        financialExpenses: (plResult.calculations.totalFinancialExpenses / netSales) * 100,
        netProfit: ((plResult.calculations.isNetProfit ? plResult.calculations.netProfit : -plResult.calculations.netProfit) / netSales) * 100
      };

      return {
        success: true,
        percentages: percentages,
        profitLoss: plResult
      };
    } catch (error) {
      console.error('Get vertical analysis error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getBreakEvenAnalysis(filters = {}) {
    try {
      const plResult = await this.getProfitAndLossAccount(filters);
      
      if (!plResult.success) return plResult;

      const sales = plResult.tradingAccount.calculations.netSales;
      const variableCosts = plResult.tradingAccount.calculations.costOfGoodsSold;
      const fixedCosts = plResult.calculations.totalIndirectExpenses + plResult.calculations.totalFinancialExpenses;

      const contributionMargin = sales - variableCosts;
      const contributionMarginRatio = sales !== 0 ? (contributionMargin / sales) * 100 : 0;
      
      const breakEvenSales = contributionMarginRatio !== 0 
        ? (fixedCosts / (contributionMarginRatio / 100)) 
        : 0;

      const marginOfSafety = sales - breakEvenSales;
      const marginOfSafetyRatio = sales !== 0 ? (marginOfSafety / sales) * 100 : 0;

      return {
        success: true,
        analysis: {
          sales: sales,
          variableCosts: variableCosts,
          fixedCosts: fixedCosts,
          contributionMargin: contributionMargin,
          contributionMarginRatio: contributionMarginRatio,
          breakEvenSales: breakEvenSales,
          marginOfSafety: marginOfSafety,
          marginOfSafetyRatio: marginOfSafetyRatio,
          salesFormatted: this.formatAmount(sales),
          variableCostsFormatted: this.formatAmount(variableCosts),
          fixedCostsFormatted: this.formatAmount(fixedCosts),
          contributionMarginFormatted: this.formatAmount(contributionMargin),
          contributionMarginRatioFormatted: contributionMarginRatio.toFixed(2) + '%',
          breakEvenSalesFormatted: this.formatAmount(breakEvenSales),
          marginOfSafetyFormatted: this.formatAmount(marginOfSafety),
          marginOfSafetyRatioFormatted: marginOfSafetyRatio.toFixed(2) + '%'
        }
      };
    } catch (error) {
      console.error('Get break-even analysis error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default TradingProfitLossService;
