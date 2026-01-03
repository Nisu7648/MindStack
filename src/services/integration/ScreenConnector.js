/**
 * SCREEN CONNECTOR
 * 
 * Automatically connects OneClickServiceManager to all screens
 * Import this in any screen and use one-click functions
 * 
 * Usage in screen:
 * import ScreenConnector from '../services/integration/ScreenConnector';
 * 
 * const result = await ScreenConnector.createInvoice(invoiceData);
 */

import OneClickServiceManager from './OneClickServiceManager';
import BackgroundServiceWorker from '../background/BackgroundServiceWorker';
import { Alert } from 'react-native';

class ScreenConnector {
  
  /**
   * Initialize on app start
   */
  static async initialize(userId, businessId) {
    try {
      // Start background services
      await BackgroundServiceWorker.initialize(userId, businessId);
      console.log('✅ ScreenConnector initialized');
    } catch (error) {
      console.error('ScreenConnector initialization error:', error);
    }
  }

  /**
   * ========================================
   * INVOICE SCREEN CONNECTOR
   * ========================================
   */
  static async createInvoice(invoiceData, businessId) {
    try {
      const result = await OneClickServiceManager.createInvoiceOneClick(invoiceData, businessId);
      
      if (result.success) {
        Alert.alert('✅ Success', result.message);
      } else {
        Alert.alert('❌ Error', result.error);
      }
      
      return result;
    } catch (error) {
      Alert.alert('❌ Error', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * AI TRANSACTION SCREEN CONNECTOR
   * ========================================
   */
  static async createAITransaction(naturalLanguageInput, businessId, userId) {
    try {
      const result = await OneClickServiceManager.createAITransactionOneClick(
        naturalLanguageInput,
        businessId,
        userId
      );
      
      if (result.success) {
        Alert.alert('✅ Success', result.message);
      } else {
        Alert.alert('❌ Error', result.error);
      }
      
      return result;
    } catch (error) {
      Alert.alert('❌ Error', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * PURCHASE SCREEN CONNECTOR
   * ========================================
   */
  static async createPurchase(purchaseData, businessId) {
    try {
      const result = await OneClickServiceManager.createPurchaseOneClick(purchaseData, businessId);
      
      if (result.success) {
        Alert.alert('✅ Success', result.message);
      } else {
        Alert.alert('❌ Error', result.error);
      }
      
      return result;
    } catch (error) {
      Alert.alert('❌ Error', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * EXPENSE SCREEN CONNECTOR
   * ========================================
   */
  static async createExpense(expenseData, businessId) {
    try {
      const result = await OneClickServiceManager.createExpenseOneClick(expenseData, businessId);
      
      if (result.success) {
        Alert.alert('✅ Success', result.message);
      } else {
        Alert.alert('❌ Error', result.error);
      }
      
      return result;
    } catch (error) {
      Alert.alert('❌ Error', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * PERIOD CLOSING SCREEN CONNECTOR
   * ========================================
   */
  static async closePeriod(period, businessId) {
    try {
      const result = await OneClickServiceManager.closePeriodOneClick(period, businessId);
      
      if (result.success) {
        Alert.alert(
          '✅ Success',
          `${result.message}\n\nPDFs saved to phone storage:\n- Trial Balance\n- Trading Account\n- Profit & Loss\n- Balance Sheet`
        );
      } else {
        Alert.alert('❌ Error', result.error);
      }
      
      return result;
    } catch (error) {
      Alert.alert('❌ Error', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * PAYROLL SCREEN CONNECTOR
   * ========================================
   */
  static async processPayroll(month, year, businessId) {
    try {
      const result = await OneClickServiceManager.processPayrollOneClick(month, year, businessId);
      
      if (result.success) {
        Alert.alert(
          '✅ Success',
          `${result.message}\n\nPayslips saved to phone storage`
        );
      } else {
        Alert.alert('❌ Error', result.error);
      }
      
      return result;
    } catch (error) {
      Alert.alert('❌ Error', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * BANK RECONCILIATION SCREEN CONNECTOR
   * ========================================
   */
  static async reconcileBank(connectionId) {
    try {
      const result = await OneClickServiceManager.reconcileBankOneClick(connectionId);
      
      if (result.success) {
        Alert.alert('✅ Success', result.message);
      } else {
        Alert.alert('❌ Error', result.error);
      }
      
      return result;
    } catch (error) {
      Alert.alert('❌ Error', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * BUSINESS HEALTH SCREEN CONNECTOR
   * ========================================
   */
  static async checkBusinessHealth(businessId) {
    try {
      const result = await OneClickServiceManager.checkBusinessHealthOneClick(businessId);
      
      if (result.success) {
        return result;
      } else {
        Alert.alert('❌ Error', result.error);
        return result;
      }
    } catch (error) {
      Alert.alert('❌ Error', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * SHOW LOADING
   * ========================================
   */
  static showLoading(message = 'Processing...') {
    // TODO: Show loading indicator
    console.log('⏳', message);
  }

  /**
   * ========================================
   * HIDE LOADING
   * ========================================
   */
  static hideLoading() {
    // TODO: Hide loading indicator
    console.log('✅ Done');
  }
}

export default ScreenConnector;
