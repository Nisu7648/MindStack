/**
 * CASH & PAYMENT MISMATCH PREVENTION
 * End-of-day cash guard
 * 
 * System knows:
 * - Cash sales
 * - UPI sales
 * - Card sales
 * 
 * At day close:
 * - Ask cashier to enter physical cash
 * - Show difference clearly
 * - No auto-adjustment allowed
 */

import { table } from '../database/queryBuilder';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cash Guard
 */
class CashGuard {
  constructor() {
    this.dayStartCash = 0;
    this.dayStartTime = null;
  }

  /**
   * START DAY
   * Record opening cash
   */
  async startDay(openingCash = 0) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if day already started
      const existing = await AsyncStorage.getItem(`day_start_${today}`);
      if (existing) {
        return {
          success: false,
          error: 'Day already started',
          alreadyStarted: true
        };
      }

      // Save day start
      await AsyncStorage.setItem(`day_start_${today}`, JSON.stringify({
        openingCash,
        startTime: new Date().toISOString()
      }));

      this.dayStartCash = openingCash;
      this.dayStartTime = new Date().toISOString();

      return { success: true };
    } catch (error) {
      console.error('Start day error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET TODAY'S SALES SUMMARY
   */
  async getTodaySalesSummary() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get all invoices for today
      const invoices = await table('invoices')
        .where('invoice_date', '>=', `${today}T00:00:00`)
        .where('invoice_date', '<', `${today}T23:59:59`)
        .where('status', 'active')
        .get();

      if (!invoices.success) {
        return {
          success: false,
          error: 'Failed to fetch invoices'
        };
      }

      // Calculate totals by payment mode
      let cashSales = 0;
      let upiSales = 0;
      let cardSales = 0;
      let creditSales = 0;
      let totalSales = 0;

      for (const invoice of invoices.data) {
        const amount = invoice.total_amount || 0;
        totalSales += amount;

        switch (invoice.payment_mode) {
          case 'CASH':
            cashSales += amount;
            break;
          case 'UPI':
            upiSales += amount;
            break;
          case 'CARD':
            cardSales += amount;
            break;
          case 'CREDIT':
            creditSales += amount;
            break;
        }
      }

      return {
        success: true,
        summary: {
          totalSales,
          cashSales,
          upiSales,
          cardSales,
          creditSales,
          invoiceCount: invoices.data.length
        }
      };
    } catch (error) {
      console.error('Get sales summary error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * CALCULATE EXPECTED CASH
   */
  async calculateExpectedCash() {
    try {
      const summary = await this.getTodaySalesSummary();
      
      if (!summary.success) {
        return { success: false, error: summary.error };
      }

      // Get opening cash
      const today = new Date().toISOString().split('T')[0];
      const dayStart = await AsyncStorage.getItem(`day_start_${today}`);
      
      let openingCash = 0;
      if (dayStart) {
        const data = JSON.parse(dayStart);
        openingCash = data.openingCash || 0;
      }

      // Expected cash = Opening + Cash Sales
      const expectedCash = openingCash + summary.summary.cashSales;

      return {
        success: true,
        openingCash,
        cashSales: summary.summary.cashSales,
        expectedCash
      };
    } catch (error) {
      console.error('Calculate expected cash error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * CLOSE DAY
   * Verify physical cash
   */
  async closeDay(physicalCash) {
    try {
      const expected = await this.calculateExpectedCash();
      
      if (!expected.success) {
        return { success: false, error: expected.error };
      }

      const difference = physicalCash - expected.expectedCash;

      // Save day close record
      const today = new Date().toISOString().split('T')[0];
      
      await table('day_close').insert({
        id: `DC_${Date.now()}`,
        date: today,
        opening_cash: expected.openingCash,
        cash_sales: expected.cashSales,
        expected_cash: expected.expectedCash,
        physical_cash: physicalCash,
        difference,
        closed_at: new Date().toISOString(),
        closed_by: 'CASHIER' // TODO: Get from auth
      });

      // Clear day start
      await AsyncStorage.removeItem(`day_start_${today}`);

      return {
        success: true,
        dayClose: {
          openingCash: expected.openingCash,
          cashSales: expected.cashSales,
          expectedCash: expected.expectedCash,
          physicalCash,
          difference,
          status: difference === 0 ? 'MATCHED' : 
                  difference > 0 ? 'EXCESS' : 'SHORT'
        }
      };
    } catch (error) {
      console.error('Close day error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * CHECK IF DAY STARTED
   */
  async isDayStarted() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dayStart = await AsyncStorage.getItem(`day_start_${today}`);
      
      return dayStart !== null;
    } catch (error) {
      console.error('Check day started error:', error);
      return false;
    }
  }

  /**
   * GET DAY CLOSE HISTORY
   */
  async getDayCloseHistory(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await table('day_close')
        .where('date', '>=', cutoffDate.toISOString().split('T')[0])
        .orderBy('date', 'DESC')
        .get();

      if (!result.success) {
        return { success: false, error: 'Failed to fetch history' };
      }

      return {
        success: true,
        history: result.data.map(record => ({
          ...record,
          status: record.difference === 0 ? 'MATCHED' :
                  record.difference > 0 ? 'EXCESS' : 'SHORT'
        }))
      };
    } catch (error) {
      console.error('Get day close history error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const cashGuard = new CashGuard();

export default cashGuard;
export { CashGuard };
