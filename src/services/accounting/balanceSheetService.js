/**
 * BALANCE SHEET SERVICE - COMPLETE LOGIC
 */

import StorageService from '../storage/storageService';
import LedgerService from './ledgerService';
import TradingProfitLossService from './tradingProfitLossService';
import moment from 'moment';

export class BalanceSheetService {
  static formatAmount(amount) {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  static async getBalanceSheet(asOnDate, filters = {}) {
    try {
      const profitLossResult = await TradingProfitLossService.getProfitAndLoss({
        ...filters,
        toDate: asOnDate
      });

      if (!profitLossResult.success) {
        return { success: false, error: 'Failed to calculate profit/loss' };
      }

      const netProfitOrLoss = profitLossResult.netProfit;
      const isProfit = netProfitOrLoss >= 0;

      const ledgerResult = await LedgerService.getAllLedgerAccounts({
        ...filters,
        toDate: asOnDate
      });

      if (!ledgerResult.success) return ledgerResult;

      const accounts = ledgerResult.data;

      const assets = {
        fixedAssets: [],
        currentAssets: [],
        investments: [],
        otherAssets: []
      };

      const liabilities = {
        capital: [],
        reserves: [],
        longTermLiabilities: [],
        currentLiabilities: [],
        provisions: []
      };

      for (const account of accounts) {
        const code = account.accountCode;
        const balance = account.balance;

        if (code.startsWith('1')) {
          if (code.startsWith('10')) {
            assets.fixedAssets.push({
              ...account,
              amount: Math.abs(balance)
            });
          } else if (code.startsWith('11')) {
            assets.currentAssets.push({
              ...account,
              amount: Math.abs(balance)
            });
          } else if (code.startsWith('12')) {
            assets.investments.push({
              ...account,
              amount: Math.abs(balance)
            });
          } else {
            assets.otherAssets.push({
              ...account,
              amount: Math.abs(balance)
            });
          }
        } else if (code.startsWith('2')) {
          if (code.startsWith('20')) {
            liabilities.longTermLiabilities.push({
              ...account,
              amount: Math.abs(balance)
            });
          } else if (code.startsWith('21')) {
            liabilities.currentLiabilities.push({
              ...account,
              amount: Math.abs(balance)
            });
          } else if (code.startsWith('22')) {
            liabilities.provisions.push({
              ...account,
              amount: Math.abs(balance)
            });
          } else {
            liabilities.currentLiabilities.push({
              ...account,
              amount: Math.abs(balance)
            });
          }
        } else if (code.startsWith('3')) {
          if (code.startsWith('30')) {
            liabilities.capital.push({
              ...account,
              amount: Math.abs(balance)
            });
          } else if (code.startsWith('31')) {
            liabilities.reserves.push({
              ...account,
              amount: Math.abs(balance)
            });
          } else {
            liabilities.capital.push({
              ...account,
              amount: Math.abs(balance)
            });
          }
        }
      }

      const totalFixedAssets = assets.fixedAssets.reduce((sum, a) => sum + a.amount, 0);
      const totalCurrentAssets = assets.currentAssets.reduce((sum, a) => sum + a.amount, 0);
      const totalInvestments = assets.investments.reduce((sum, a) => sum + a.amount, 0);
      const totalOtherAssets = assets.otherAssets.reduce((sum, a) => sum + a.amount, 0);
      const totalAssets = totalFixedAssets + totalCurrentAssets + totalInvestments + totalOtherAssets;

      const totalCapital = liabilities.capital.reduce((sum, a) => sum + a.amount, 0);
      const totalReserves = liabilities.reserves.reduce((sum, a) => sum + a.amount, 0);
      const totalLongTermLiabilities = liabilities.longTermLiabilities.reduce((sum, a) => sum + a.amount, 0);
      const totalCurrentLiabilities = liabilities.currentLiabilities.reduce((sum, a) => sum + a.amount, 0);
      const totalProvisions = liabilities.provisions.reduce((sum, a) => sum + a.amount, 0);

      const capitalAndReserves = totalCapital + totalReserves + (isProfit ? netProfitOrLoss : 0);
      const totalLiabilities = capitalAndReserves + totalLongTermLiabilities + totalCurrentLiabilities + totalProvisions + (isProfit ? 0 : Math.abs(netProfitOrLoss));

      const difference = Math.abs(totalAssets - totalLiabilities);
      const isBalanced = difference < 0.01;

      return {
        success: true,
        asOnDate: asOnDate,
        assets: assets,
        liabilities: liabilities,
        profitLoss: {
          amount: netProfitOrLoss,
          isProfit: isProfit,
          formatted: this.formatAmount(Math.abs(netProfitOrLoss))
        },
        summary: {
          totalFixedAssets: totalFixedAssets,
          totalCurrentAssets: totalCurrentAssets,
          totalInvestments: totalInvestments,
          totalOtherAssets: totalOtherAssets,
          totalAssets: totalAssets,
          totalCapital: totalCapital,
          totalReserves: totalReserves,
          capitalAndReserves: capitalAndReserves,
          totalLongTermLiabilities: totalLongTermLiabilities,
          totalCurrentLiabilities: totalCurrentLiabilities,
          totalProvisions: totalProvisions,
          totalLiabilities: totalLiabilities,
          difference: difference,
          isBalanced: isBalanced,
          totalFixedAssetsFormatted: this.formatAmount(totalFixedAssets),
          totalCurrentAssetsFormatted: this.formatAmount(totalCurrentAssets),
          totalInvestmentsFormatted: this.formatAmount(totalInvestments),
          totalOtherAssetsFormatted: this.formatAmount(totalOtherAssets),
          totalAssetsFormatted: this.formatAmount(totalAssets),
          totalCapitalFormatted: this.formatAmount(totalCapital),
          totalReservesFormatted: this.formatAmount(totalReserves),
          capitalAndReservesFormatted: this.formatAmount(capitalAndReserves),
          totalLongTermLiabilitiesFormatted: this.formatAmount(totalLongTermLiabilities),
          totalCurrentLiabilitiesFormatted: this.formatAmount(totalCurrentLiabilities),
          totalProvisionsFormatted: this.formatAmount(totalProvisions),
          totalLiabilitiesFormatted: this.formatAmount(totalLiabilities),
          differenceFormatted: this.formatAmount(difference)
        }
      };
    } catch (error) {
      console.error('Get balance sheet error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getComparativeBalanceSheet(date1, date2, filters = {}) {
    try {
      const bs1 = await this.getBalanceSheet(date1, filters);
      const bs2 = await this.getBalanceSheet(date2, filters);

      if (!bs1.success || !bs2.success) {
        return { success: false, error: 'Failed to get balance sheets' };
      }

      const comparison = {
        assets: {
          fixedAssets: this.compareItems(bs1.assets.fixedAssets, bs2.assets.fixedAssets),
          currentAssets: this.compareItems(bs1.assets.currentAssets, bs2.assets.currentAssets),
          investments: this.compareItems(bs1.assets.investments, bs2.assets.investments),
          otherAssets: this.compareItems(bs1.assets.otherAssets, bs2.assets.otherAssets)
        },
        liabilities: {
          capital: this.compareItems(bs1.liabilities.capital, bs2.liabilities.capital),
          reserves: this.compareItems(bs1.liabilities.reserves, bs2.liabilities.reserves),
          longTermLiabilities: this.compareItems(bs1.liabilities.longTermLiabilities, bs2.liabilities.longTermLiabilities),
          currentLiabilities: this.compareItems(bs1.liabilities.currentLiabilities, bs2.liabilities.currentLiabilities),
          provisions: this.compareItems(bs1.liabilities.provisions, bs2.liabilities.provisions)
        }
      };

      return {
        success: true,
        date1: date1,
        date2: date2,
        balanceSheet1: bs1,
        balanceSheet2: bs2,
        comparison: comparison,
        changes: {
          totalAssets: bs2.summary.totalAssets - bs1.summary.totalAssets,
          totalLiabilities: bs2.summary.totalLiabilities - bs1.summary.totalLiabilities,
          totalAssetsPercentage: ((bs2.summary.totalAssets - bs1.summary.totalAssets) / bs1.summary.totalAssets) * 100,
          totalLiabilitiesPercentage: ((bs2.summary.totalLiabilities - bs1.summary.totalLiabilities) / bs1.summary.totalLiabilities) * 100
        }
      };
    } catch (error) {
      console.error('Get comparative balance sheet error:', error);
      return { success: false, error: error.message };
    }
  }

  static compareItems(items1, items2) {
    const allCodes = new Set([
      ...items1.map(i => i.accountCode),
      ...items2.map(i => i.accountCode)
    ]);

    const comparison = [];

    for (const code of allCodes) {
      const item1 = items1.find(i => i.accountCode === code);
      const item2 = items2.find(i => i.accountCode === code);

      const amount1 = item1 ? item1.amount : 0;
      const amount2 = item2 ? item2.amount : 0;
      const change = amount2 - amount1;
      const percentageChange = amount1 !== 0 ? (change / amount1) * 100 : 0;

      comparison.push({
        accountCode: code,
        accountName: item1 ? item1.accountName : item2.accountName,
        amount1: amount1,
        amount2: amount2,
        change: change,
        percentageChange: percentageChange,
        amount1Formatted: this.formatAmount(amount1),
        amount2Formatted: this.formatAmount(amount2),
        changeFormatted: this.formatAmount(change),
        percentageChangeFormatted: percentageChange.toFixed(2) + '%'
      });
    }

    return comparison;
  }

  static async getFinancialRatios(asOnDate, filters = {}) {
    try {
      const bs = await this.getBalanceSheet(asOnDate, filters);
      
      if (!bs.success) return bs;

      const currentRatio = bs.summary.totalCurrentLiabilities !== 0 
        ? bs.summary.totalCurrentAssets / bs.summary.totalCurrentLiabilities 
        : 0;

      const quickAssets = bs.summary.totalCurrentAssets;
      const quickRatio = bs.summary.totalCurrentLiabilities !== 0
        ? quickAssets / bs.summary.totalCurrentLiabilities
        : 0;

      const debtEquityRatio = bs.summary.capitalAndReserves !== 0
        ? (bs.summary.totalLongTermLiabilities + bs.summary.totalCurrentLiabilities) / bs.summary.capitalAndReserves
        : 0;

      const proprietaryRatio = bs.summary.totalAssets !== 0
        ? bs.summary.capitalAndReserves / bs.summary.totalAssets
        : 0;

      const workingCapital = bs.summary.totalCurrentAssets - bs.summary.totalCurrentLiabilities;

      return {
        success: true,
        ratios: {
          currentRatio: currentRatio,
          quickRatio: quickRatio,
          debtEquityRatio: debtEquityRatio,
          proprietaryRatio: proprietaryRatio,
          workingCapital: workingCapital,
          currentRatioFormatted: currentRatio.toFixed(2),
          quickRatioFormatted: quickRatio.toFixed(2),
          debtEquityRatioFormatted: debtEquityRatio.toFixed(2),
          proprietaryRatioFormatted: proprietaryRatio.toFixed(2),
          workingCapitalFormatted: this.formatAmount(workingCapital)
        },
        interpretation: {
          currentRatio: currentRatio >= 2 ? 'Good' : currentRatio >= 1 ? 'Acceptable' : 'Poor',
          quickRatio: quickRatio >= 1 ? 'Good' : 'Poor',
          debtEquityRatio: debtEquityRatio <= 2 ? 'Good' : 'High',
          workingCapital: workingCapital > 0 ? 'Positive' : 'Negative'
        }
      };
    } catch (error) {
      console.error('Get financial ratios error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getVerticalAnalysis(asOnDate, filters = {}) {
    try {
      const bs = await this.getBalanceSheet(asOnDate, filters);
      
      if (!bs.success) return bs;

      const totalAssets = bs.summary.totalAssets;
      const totalLiabilities = bs.summary.totalLiabilities;

      const assetPercentages = {
        fixedAssets: (bs.summary.totalFixedAssets / totalAssets) * 100,
        currentAssets: (bs.summary.totalCurrentAssets / totalAssets) * 100,
        investments: (bs.summary.totalInvestments / totalAssets) * 100,
        otherAssets: (bs.summary.totalOtherAssets / totalAssets) * 100
      };

      const liabilityPercentages = {
        capitalAndReserves: (bs.summary.capitalAndReserves / totalLiabilities) * 100,
        longTermLiabilities: (bs.summary.totalLongTermLiabilities / totalLiabilities) * 100,
        currentLiabilities: (bs.summary.totalCurrentLiabilities / totalLiabilities) * 100,
        provisions: (bs.summary.totalProvisions / totalLiabilities) * 100
      };

      return {
        success: true,
        asOnDate: asOnDate,
        assetPercentages: assetPercentages,
        liabilityPercentages: liabilityPercentages,
        balanceSheet: bs
      };
    } catch (error) {
      console.error('Get vertical analysis error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getHorizontalAnalysis(baseDate, comparisonDate, filters = {}) {
    try {
      const bs1 = await this.getBalanceSheet(baseDate, filters);
      const bs2 = await this.getBalanceSheet(comparisonDate, filters);

      if (!bs1.success || !bs2.success) {
        return { success: false, error: 'Failed to get balance sheets' };
      }

      const assetChanges = {
        fixedAssets: {
          absolute: bs2.summary.totalFixedAssets - bs1.summary.totalFixedAssets,
          percentage: ((bs2.summary.totalFixedAssets - bs1.summary.totalFixedAssets) / bs1.summary.totalFixedAssets) * 100
        },
        currentAssets: {
          absolute: bs2.summary.totalCurrentAssets - bs1.summary.totalCurrentAssets,
          percentage: ((bs2.summary.totalCurrentAssets - bs1.summary.totalCurrentAssets) / bs1.summary.totalCurrentAssets) * 100
        },
        investments: {
          absolute: bs2.summary.totalInvestments - bs1.summary.totalInvestments,
          percentage: ((bs2.summary.totalInvestments - bs1.summary.totalInvestments) / bs1.summary.totalInvestments) * 100
        },
        totalAssets: {
          absolute: bs2.summary.totalAssets - bs1.summary.totalAssets,
          percentage: ((bs2.summary.totalAssets - bs1.summary.totalAssets) / bs1.summary.totalAssets) * 100
        }
      };

      const liabilityChanges = {
        capitalAndReserves: {
          absolute: bs2.summary.capitalAndReserves - bs1.summary.capitalAndReserves,
          percentage: ((bs2.summary.capitalAndReserves - bs1.summary.capitalAndReserves) / bs1.summary.capitalAndReserves) * 100
        },
        longTermLiabilities: {
          absolute: bs2.summary.totalLongTermLiabilities - bs1.summary.totalLongTermLiabilities,
          percentage: ((bs2.summary.totalLongTermLiabilities - bs1.summary.totalLongTermLiabilities) / bs1.summary.totalLongTermLiabilities) * 100
        },
        currentLiabilities: {
          absolute: bs2.summary.totalCurrentLiabilities - bs1.summary.totalCurrentLiabilities,
          percentage: ((bs2.summary.totalCurrentLiabilities - bs1.summary.totalCurrentLiabilities) / bs1.summary.totalCurrentLiabilities) * 100
        },
        totalLiabilities: {
          absolute: bs2.summary.totalLiabilities - bs1.summary.totalLiabilities,
          percentage: ((bs2.summary.totalLiabilities - bs1.summary.totalLiabilities) / bs1.summary.totalLiabilities) * 100
        }
      };

      return {
        success: true,
        baseDate: baseDate,
        comparisonDate: comparisonDate,
        assetChanges: assetChanges,
        liabilityChanges: liabilityChanges,
        balanceSheet1: bs1,
        balanceSheet2: bs2
      };
    } catch (error) {
      console.error('Get horizontal analysis error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default BalanceSheetService;
