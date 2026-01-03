/**
 * BACKGROUND SERVICE WORKER
 * 
 * Runs automatically in background
 * No user action needed
 * Keeps everything updated
 */

import BackgroundFetch from 'react-native-background-fetch';
import OneClickServiceManager from '../integration/OneClickServiceManager';
import BusinessHealthMonitor from '../health/BusinessHealthMonitor';
import TaxOptimizationEngine from '../tax/TaxOptimizationEngine';
import BankReconciliationService from '../banking/bankReconciliationService';
import { supabase } from '../supabase';

class BackgroundServiceWorker {
  
  /**
   * Initialize background services
   * Runs automatically when app starts
   */
  static async initialize(userId, businessId) {
    try {
      console.log('⚙️ Initializing background services...');

      // Configure background fetch
      await BackgroundFetch.configure({
        minimumFetchInterval: 60, // Run every hour
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true
      }, async (taskId) => {
        console.log('🔄 Background task running:', taskId);
        
        // Run all background tasks
        await this.runAllBackgroundTasks(businessId);
        
        // Finish task
        BackgroundFetch.finish(taskId);
      }, (error) => {
        console.error('Background fetch error:', error);
      });

      // Start background fetch
      await BackgroundFetch.start();

      console.log('✅ Background services initialized!');

    } catch (error) {
      console.error('Background service initialization error:', error);
    }
  }

  /**
   * Run all background tasks
   */
  static async runAllBackgroundTasks(businessId) {
    try {
      console.log('🔄 Running background tasks...');

      // Task 1: Business health check
      await this.checkBusinessHealth(businessId);

      // Task 2: Tax optimization scan
      await this.scanTaxOpportunities(businessId);

      // Task 3: Bank reconciliation (if connected)
      await this.autoReconcileBank(businessId);

      // Task 4: Inventory alerts
      await this.checkInventoryAlerts(businessId);

      // Task 5: Payment reminders
      await this.sendPaymentReminders(businessId);

      console.log('✅ Background tasks complete!');

    } catch (error) {
      console.error('Background tasks error:', error);
    }
  }

  /**
   * Task 1: Business health check
   * Runs every hour
   */
  static async checkBusinessHealth(businessId) {
    try {
      const health = await BusinessHealthMonitor.getBusinessHealth(businessId);
      
      // If critical alerts, notify user
      if (health.alerts.some(a => a.severity === 'critical')) {
        await this.sendNotification({
          title: '⚠️ Business Alert',
          body: `${health.alerts.length} critical issues detected`,
          data: { screen: 'BusinessHealth' }
        });
      }

      console.log('✅ Business health checked');
    } catch (error) {
      console.error('Business health check error:', error);
    }
  }

  /**
   * Task 2: Tax optimization scan
   * Runs every hour
   */
  static async scanTaxOpportunities(businessId) {
    try {
      // Get today's transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .gte('date', new Date().toISOString().split('T')[0]);

      let totalSavings = 0;

      // Check each transaction for tax savings
      for (const txn of transactions || []) {
        const savings = await TaxOptimizationEngine.getRealTimeSavings({
          amount: txn.amount,
          type: txn.type,
          date: txn.date,
          items: []
        });

        if (savings.hasSavings) {
          totalSavings += savings.totalPotentialSavings;
        }
      }

      // If significant savings found, notify user
      if (totalSavings > 1000) {
        await this.sendNotification({
          title: '💰 Tax Savings Available',
          body: `You can save ₹${totalSavings.toFixed(0)} today!`,
          data: { screen: 'TaxOptimization' }
        });
      }

      console.log('✅ Tax opportunities scanned');
    } catch (error) {
      console.error('Tax scan error:', error);
    }
  }

  /**
   * Task 3: Auto bank reconciliation
   * Runs every hour
   */
  static async autoReconcileBank(businessId) {
    try {
      // Get bank connections
      const { data: connections } = await supabase
        .from('bank_connections')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (!connections || connections.length === 0) return;

      // Auto-reconcile each connection
      for (const connection of connections) {
        const result = await BankReconciliationService.autoMatchTransactions(connection.id);
        
        if (result.matchedCount > 0) {
          await this.sendNotification({
            title: '🏦 Bank Reconciled',
            body: `${result.matchedCount} transactions matched automatically`,
            data: { screen: 'BankReconciliation' }
          });
        }
      }

      console.log('✅ Bank reconciliation complete');
    } catch (error) {
      console.error('Bank reconciliation error:', error);
    }
  }

  /**
   * Task 4: Inventory alerts
   * Runs every hour
   */
  static async checkInventoryAlerts(businessId) {
    try {
      // Get low stock items
      const { data: lowStock } = await supabase
        .from('inventory')
        .select('*, products(*)')
        .eq('business_id', businessId)
        .lt('current_quantity', supabase.raw('reorder_level'));

      if (lowStock && lowStock.length > 0) {
        await this.sendNotification({
          title: '📦 Low Stock Alert',
          body: `${lowStock.length} items need reordering`,
          data: { screen: 'Inventory' }
        });
      }

      console.log('✅ Inventory alerts checked');
    } catch (error) {
      console.error('Inventory alerts error:', error);
    }
  }

  /**
   * Task 5: Payment reminders
   * Runs every hour
   */
  static async sendPaymentReminders(businessId) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get overdue invoices
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('*, customers(*)')
        .eq('business_id', businessId)
        .eq('payment_status', 'unpaid')
        .lt('due_date', today);

      if (overdueInvoices && overdueInvoices.length > 0) {
        const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

        await this.sendNotification({
          title: '💳 Payment Overdue',
          body: `₹${totalOverdue.toFixed(0)} overdue from ${overdueInvoices.length} customers`,
          data: { screen: 'Receivables' }
        });
      }

      console.log('✅ Payment reminders sent');
    } catch (error) {
      console.error('Payment reminders error:', error);
    }
  }

  /**
   * Send push notification
   */
  static async sendNotification({ title, body, data }) {
    try {
      // Use React Native Push Notification or Firebase
      // For now, just log
      console.log('📱 Notification:', title, body);
      
      // TODO: Implement actual push notification
      // PushNotification.localNotification({ title, message: body, userInfo: data });

    } catch (error) {
      console.error('Send notification error:', error);
    }
  }

  /**
   * Stop background services
   */
  static async stop() {
    try {
      await BackgroundFetch.stop();
      console.log('⏹️ Background services stopped');
    } catch (error) {
      console.error('Stop background services error:', error);
    }
  }
}

export default BackgroundServiceWorker;
