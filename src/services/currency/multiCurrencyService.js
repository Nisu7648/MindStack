/**
 * MULTI-CURRENCY MANAGEMENT SERVICE
 * 
 * Features:
 * - Multi-currency transactions
 * - Real-time exchange rates
 * - Currency conversion
 * - Foreign exchange gain/loss tracking
 * - Multi-currency reporting
 * - Currency-wise P&L
 * - Revaluation of foreign currency balances
 */

import { DatabaseService } from '../database/databaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class MultiCurrencyService {
  static BASE_CURRENCY = 'INR';
  
  static SUPPORTED_CURRENCIES = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' }
  ];

  /**
   * Fetch latest exchange rates
   */
  static async fetchExchangeRates() {
    try {
      // Using a free exchange rate API
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${this.BASE_CURRENCY}`);
      const data = await response.json();
      
      if (data && data.rates) {
        // Store rates in database
        await this.storeExchangeRates(data.rates, data.date);
        
        // Cache in AsyncStorage
        await AsyncStorage.setItem('exchange_rates', JSON.stringify(data.rates));
        await AsyncStorage.setItem('exchange_rates_date', data.date);
        
        return {
          success: true,
          rates: data.rates,
          date: data.date
        };
      }
      
      throw new Error('Invalid response from exchange rate API');
    } catch (error) {
      console.error('Fetch exchange rates error:', error);
      
      // Try to get cached rates
      const cachedRates = await AsyncStorage.getItem('exchange_rates');
      if (cachedRates) {
        return {
          success: true,
          rates: JSON.parse(cachedRates),
          cached: true
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Store exchange rates in database
   */
  static async storeExchangeRates(rates, date) {
    try {
      const db = await DatabaseService.getDatabase();
      
      for (const [currency, rate] of Object.entries(rates)) {
        await db.executeSql(
          `INSERT OR REPLACE INTO exchange_rates (
            currency_code, rate, base_currency, rate_date, created_at
          ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [currency, rate, this.BASE_CURRENCY, date]
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error('Store exchange rates error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get exchange rate for a currency
   */
  static async getExchangeRate(fromCurrency, toCurrency = this.BASE_CURRENCY) {
    try {
      if (fromCurrency === toCurrency) {
        return { success: true, rate: 1 };
      }

      const db = await DatabaseService.getDatabase();
      
      // Get latest rate
      const [result] = await db.executeSql(
        `SELECT rate FROM exchange_rates 
        WHERE currency_code = ? AND base_currency = ?
        ORDER BY rate_date DESC LIMIT 1`,
        [fromCurrency, this.BASE_CURRENCY]
      );

      if (result.rows.length > 0) {
        const fromRate = result.rows.item(0).rate;
        
        if (toCurrency === this.BASE_CURRENCY) {
          return { success: true, rate: fromRate };
        }
        
        // Get target currency rate
        const [toResult] = await db.executeSql(
          `SELECT rate FROM exchange_rates 
          WHERE currency_code = ? AND base_currency = ?
          ORDER BY rate_date DESC LIMIT 1`,
          [toCurrency, this.BASE_CURRENCY]
        );
        
        if (toResult.rows.length > 0) {
          const toRate = toResult.rows.item(0).rate;
          const crossRate = fromRate / toRate;
          return { success: true, rate: crossRate };
        }
      }

      // If not found, fetch latest rates
      await this.fetchExchangeRates();
      return await this.getExchangeRate(fromCurrency, toCurrency);
    } catch (error) {
      console.error('Get exchange rate error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert amount between currencies
   */
  static async convertCurrency(amount, fromCurrency, toCurrency = this.BASE_CURRENCY) {
    try {
      const rateResult = await this.getExchangeRate(fromCurrency, toCurrency);
      
      if (!rateResult.success) {
        throw new Error('Failed to get exchange rate');
      }

      const convertedAmount = amount * rateResult.rate;

      return {
        success: true,
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount,
        targetCurrency: toCurrency,
        exchangeRate: rateResult.rate
      };
    } catch (error) {
      console.error('Convert currency error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record multi-currency transaction
   */
  static async recordMultiCurrencyTransaction(transactionData) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Convert to base currency
      const conversion = await this.convertCurrency(
        transactionData.amount,
        transactionData.currency,
        this.BASE_CURRENCY
      );

      if (!conversion.success) {
        throw new Error('Currency conversion failed');
      }

      await db.executeSql('BEGIN TRANSACTION');

      // Record transaction in original currency
      const result = await db.executeSql(
        `INSERT INTO multi_currency_transactions (
          transaction_date, description, amount, currency,
          base_currency_amount, exchange_rate, transaction_type,
          account_id, reference_number, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          transactionData.date,
          transactionData.description,
          transactionData.amount,
          transactionData.currency,
          conversion.convertedAmount,
          conversion.exchangeRate,
          transactionData.type,
          transactionData.accountId,
          transactionData.referenceNumber
        ]
      );

      // Create corresponding journal entry in base currency
      await db.executeSql(
        `INSERT INTO journal_entries (
          transaction_date, description, debit_amount, credit_amount,
          account_id, voucher_number, multi_currency_txn_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          transactionData.date,
          `${transactionData.description} (${transactionData.currency})`,
          transactionData.type === 'DEBIT' ? conversion.convertedAmount : 0,
          transactionData.type === 'CREDIT' ? conversion.convertedAmount : 0,
          transactionData.accountId,
          transactionData.voucherNumber,
          result[0].insertId
        ]
      );

      await db.executeSql('COMMIT');

      return {
        success: true,
        transactionId: result[0].insertId,
        originalAmount: transactionData.amount,
        originalCurrency: transactionData.currency,
        baseCurrencyAmount: conversion.convertedAmount,
        exchangeRate: conversion.exchangeRate
      };
    } catch (error) {
      await db.executeSql('ROLLBACK');
      console.error('Record multi-currency transaction error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate foreign exchange gain/loss
   */
  static async calculateForexGainLoss(accountId, asOfDate = null) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const dateFilter = asOfDate ? `AND transaction_date <= '${asOfDate}'` : '';

      // Get all foreign currency transactions for the account
      const [transactions] = await db.executeSql(
        `SELECT * FROM multi_currency_transactions
        WHERE account_id = ? ${dateFilter}
        ORDER BY transaction_date`,
        [accountId]
      );

      let totalGainLoss = 0;
      const details = [];

      for (let i = 0; i < transactions.rows.length; i++) {
        const txn = transactions.rows.item(i);
        
        // Get current exchange rate
        const currentRate = await this.getExchangeRate(txn.currency, this.BASE_CURRENCY);
        
        if (currentRate.success) {
          const currentValue = txn.amount * currentRate.rate;
          const originalValue = txn.base_currency_amount;
          const gainLoss = currentValue - originalValue;
          
          totalGainLoss += gainLoss;
          
          details.push({
            transactionId: txn.id,
            date: txn.transaction_date,
            amount: txn.amount,
            currency: txn.currency,
            originalRate: txn.exchange_rate,
            currentRate: currentRate.rate,
            originalValue,
            currentValue,
            gainLoss
          });
        }
      }

      return {
        success: true,
        accountId,
        totalGainLoss,
        details,
        asOfDate: asOfDate || new Date().toISOString()
      };
    } catch (error) {
      console.error('Calculate forex gain/loss error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Revalue foreign currency balances
   */
  static async revalueForeignCurrencyBalances(asOfDate = null) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Get all accounts with foreign currency balances
      const [accounts] = await db.executeSql(
        `SELECT DISTINCT account_id, currency
        FROM multi_currency_transactions
        WHERE currency != ?`,
        [this.BASE_CURRENCY]
      );

      const revaluations = [];
      let totalGainLoss = 0;

      for (let i = 0; i < accounts.rows.length; i++) {
        const account = accounts.rows.item(i);
        
        const result = await this.calculateForexGainLoss(account.account_id, asOfDate);
        
        if (result.success) {
          revaluations.push({
            accountId: account.account_id,
            currency: account.currency,
            gainLoss: result.totalGainLoss
          });
          
          totalGainLoss += result.totalGainLoss;
        }
      }

      // Record revaluation journal entry
      if (totalGainLoss !== 0) {
        await this.recordRevaluationEntry(totalGainLoss, asOfDate);
      }

      return {
        success: true,
        revaluations,
        totalGainLoss,
        asOfDate: asOfDate || new Date().toISOString()
      };
    } catch (error) {
      console.error('Revalue foreign currency balances error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record revaluation journal entry
   */
  static async recordRevaluationEntry(gainLoss, asOfDate) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const isGain = gainLoss > 0;
      const amount = Math.abs(gainLoss);

      await db.executeSql(
        `INSERT INTO journal_entries (
          transaction_date, description, debit_amount, credit_amount,
          account_name, voucher_number, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          asOfDate || new Date().toISOString(),
          'Foreign Exchange Revaluation',
          isGain ? 0 : amount,
          isGain ? amount : 0,
          isGain ? 'Foreign Exchange Gain' : 'Foreign Exchange Loss',
          `FX-REV-${Date.now()}`
        ]
      );

      return { success: true };
    } catch (error) {
      console.error('Record revaluation entry error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get multi-currency P&L
   */
  static async getMultiCurrencyPL(startDate, endDate) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Get transactions by currency
      const [transactions] = await db.executeSql(
        `SELECT 
          currency,
          SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE 0 END) as revenue,
          SUM(CASE WHEN transaction_type = 'DEBIT' THEN amount ELSE 0 END) as expenses,
          SUM(CASE WHEN transaction_type = 'CREDIT' THEN base_currency_amount ELSE 0 END) as revenue_base,
          SUM(CASE WHEN transaction_type = 'DEBIT' THEN base_currency_amount ELSE 0 END) as expenses_base
        FROM multi_currency_transactions
        WHERE transaction_date BETWEEN ? AND ?
        GROUP BY currency`,
        [startDate, endDate]
      );

      const currencyPL = [];
      let totalRevenueBase = 0;
      let totalExpensesBase = 0;

      for (let i = 0; i < transactions.rows.length; i++) {
        const row = transactions.rows.item(i);
        const profit = row.revenue - row.expenses;
        const profitBase = row.revenue_base - row.expenses_base;
        
        currencyPL.push({
          currency: row.currency,
          revenue: row.revenue,
          expenses: row.expenses,
          profit,
          revenueBase: row.revenue_base,
          expensesBase: row.expenses_base,
          profitBase
        });

        totalRevenueBase += row.revenue_base;
        totalExpensesBase += row.expenses_base;
      }

      return {
        success: true,
        currencyPL,
        summary: {
          totalRevenueBase,
          totalExpensesBase,
          totalProfitBase: totalRevenueBase - totalExpensesBase,
          baseCurrency: this.BASE_CURRENCY
        },
        period: { startDate, endDate }
      };
    } catch (error) {
      console.error('Get multi-currency P&L error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get currency exposure report
   */
  static async getCurrencyExposureReport() {
    try {
      const db = await DatabaseService.getDatabase();
      
      const [exposure] = await db.executeSql(
        `SELECT 
          currency,
          SUM(amount) as total_amount,
          SUM(base_currency_amount) as total_base_amount,
          COUNT(*) as transaction_count
        FROM multi_currency_transactions
        WHERE currency != ?
        GROUP BY currency`,
        [this.BASE_CURRENCY]
      );

      const exposures = [];
      let totalExposure = 0;

      for (let i = 0; i < exposure.rows.length; i++) {
        const row = exposure.rows.item(i);
        
        // Get current value
        const currentRate = await this.getExchangeRate(row.currency, this.BASE_CURRENCY);
        const currentValue = currentRate.success ? row.total_amount * currentRate.rate : row.total_base_amount;
        const unrealizedGainLoss = currentValue - row.total_base_amount;
        
        exposures.push({
          currency: row.currency,
          totalAmount: row.total_amount,
          originalBaseValue: row.total_base_amount,
          currentBaseValue: currentValue,
          unrealizedGainLoss,
          transactionCount: row.transaction_count
        });

        totalExposure += currentValue;
      }

      return {
        success: true,
        exposures,
        totalExposure,
        baseCurrency: this.BASE_CURRENCY
      };
    } catch (error) {
      console.error('Get currency exposure report error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule automatic rate updates
   */
  static async scheduleRateUpdates() {
    // Update rates every 6 hours
    setInterval(async () => {
      await this.fetchExchangeRates();
    }, 6 * 60 * 60 * 1000);

    return { success: true, message: 'Rate updates scheduled' };
  }

  /**
   * Get currency symbol
   */
  static getCurrencySymbol(currencyCode) {
    const currency = this.SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    return currency ? currency.symbol : currencyCode;
  }

  /**
   * Format amount with currency
   */
  static formatAmount(amount, currencyCode) {
    const symbol = this.getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export default MultiCurrencyService;
