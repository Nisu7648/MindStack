/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF EXPORT EXAMPLES - HOW TO USE IN DIFFERENT SCREENS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This file shows examples of using PDF export in various scenarios:
 * - Invoice export
 * - Stock report export
 * - Day closing report
 * - Financial statements
 * - All accounting books
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import PDFExportButton, { QuickExportButton, QuickPrintButton } from '../components/pdf/PDFExportButton';
import DatabaseService from '../services/database/databaseService';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * EXAMPLE 1: INVOICE SCREEN WITH PDF EXPORT
 * ═══════════════════════════════════════════════════════════════════════
 */
export const InvoiceScreenExample = ({ invoiceId }) => {
  const [invoiceData, setInvoiceData] = useState(null);

  useEffect(() => {
    loadInvoiceData();
  }, [invoiceId]);

  const loadInvoiceData = async () => {
    const db = await DatabaseService.getDatabase();
    
    // Get invoice
    const [invoiceResult] = await db.executeSql(
      'SELECT * FROM invoices WHERE id = ?',
      [invoiceId]
    );
    
    // Get invoice items
    const [itemsResult] = await db.executeSql(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [invoiceId]
    );

    const invoice = invoiceResult.rows.item(0);
    const items = [];
    for (let i = 0; i < itemsResult.rows.length; i++) {
      items.push(itemsResult.rows.item(i));
    }

    setInvoiceData({ invoice, items });
  };

  if (!invoiceData) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoice #{invoiceData.invoice.invoice_number}</Text>
        
        <View style={styles.actionButtons}>
          {/* Quick Print Button */}
          <QuickPrintButton
            reportType="INVOICE"
            data={invoiceData}
            options={{ title: 'Tax Invoice' }}
          />
          
          {/* Full Export Menu */}
          <PDFExportButton
            reportType="INVOICE"
            data={invoiceData}
            options={{ title: 'Tax Invoice' }}
            buttonText="Export"
          />
        </View>
      </View>

      {/* Invoice content here */}
    </View>
  );
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * EXAMPLE 2: STOCK REPORT SCREEN
 * ═══════════════════════════════════════════════════════════════════════
 */
export const StockReportScreenExample = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const db = await DatabaseService.getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM products WHERE is_active = 1 ORDER BY product_name'
    );

    const productList = [];
    for (let i = 0; i < result.rows.length; i++) {
      productList.push(result.rows.item(i));
    }

    setProducts(productList);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stock Report</Text>
        
        <PDFExportButton
          reportType="STOCK_REPORT"
          data={{ products }}
          options={{ title: 'Stock Report' }}
        />
      </View>

      {/* Stock list here */}
    </View>
  );
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * EXAMPLE 3: DAY CLOSING SCREEN
 * ═══════════════════════════════════════════════════════════════════════
 */
export const DayClosingScreenExample = ({ closingDate }) => {
  const [dayClosing, setDayClosing] = useState(null);

  useEffect(() => {
    loadDayClosing();
  }, [closingDate]);

  const loadDayClosing = async () => {
    const db = await DatabaseService.getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM day_closing WHERE closing_date = ?',
      [closingDate]
    );

    if (result.rows.length > 0) {
      setDayClosing(result.rows.item(0));
    }
  };

  if (!dayClosing) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Day Closing Report</Text>
        
        <PDFExportButton
          reportType="DAY_CLOSING_REPORT"
          data={{ dayClosing }}
          options={{ title: 'Day Closing Report' }}
        />
      </View>

      {/* Day closing details here */}
    </View>
  );
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * EXAMPLE 4: CASH BOOK SCREEN
 * ═══════════════════════════════════════════════════════════════════════
 */
export const CashBookScreenExample = ({ period }) => {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    loadCashBook();
  }, [period]);

  const loadCashBook = async () => {
    const db = await DatabaseService.getDatabase();
    
    let query = 'SELECT * FROM cash_book WHERE 1=1';
    const params = [];

    if (period) {
      query += ' AND period_id = ?';
      params.push(period.id);
    }

    query += ' ORDER BY entry_date, id';

    const [result] = await db.executeSql(query, params);

    const cashEntries = [];
    for (let i = 0; i < result.rows.length; i++) {
      cashEntries.push(result.rows.item(i));
    }

    setEntries(cashEntries);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cash Book</Text>
        
        <PDFExportButton
          reportType="CASH_BOOK"
          data={{ entries, period: period?.period_name }}
          options={{ 
            title: 'Cash Book',
            periodId: period?.id 
          }}
        />
      </View>

      {/* Cash book entries here */}
    </View>
  );
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * EXAMPLE 5: TRIAL BALANCE SCREEN
 * ═══════════════════════════════════════════════════════════════════════
 */
export const TrialBalanceScreenExample = ({ periodId }) => {
  const [trialBalance, setTrialBalance] = useState([]);

  useEffect(() => {
    loadTrialBalance();
  }, [periodId]);

  const loadTrialBalance = async () => {
    const db = await DatabaseService.getDatabase();
    const [result] = await db.executeSql(
      'SELECT * FROM trial_balance WHERE period_id = ? ORDER BY account_code',
      [periodId]
    );

    const entries = [];
    for (let i = 0; i < result.rows.length; i++) {
      entries.push(result.rows.item(i));
    }

    setTrialBalance(entries);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trial Balance</Text>
        
        <PDFExportButton
          reportType="TRIAL_BALANCE"
          data={{ entries: trialBalance }}
          options={{ 
            title: 'Trial Balance',
            periodId 
          }}
        />
      </View>

      {/* Trial balance table here */}
    </View>
  );
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * EXAMPLE 6: REPORTS MENU WITH MULTIPLE EXPORT OPTIONS
 * ═══════════════════════════════════════════════════════════════════════
 */
export const ReportsMenuExample = () => {
  const exportOptions = [
    {
      id: 'cash_book',
      title: 'Cash Book',
      icon: 'cash',
      reportType: 'CASH_BOOK',
      color: '#4CAF50'
    },
    {
      id: 'bank_book',
      title: 'Bank Book',
      icon: 'bank',
      reportType: 'BANK_BOOK',
      color: '#2196F3'
    },
    {
      id: 'purchase_book',
      title: 'Purchase Book',
      icon: 'cart',
      reportType: 'PURCHASE_BOOK',
      color: '#FF9800'
    },
    {
      id: 'sales_book',
      title: 'Sales Book',
      icon: 'receipt',
      reportType: 'SALES_BOOK',
      color: '#9C27B0'
    },
    {
      id: 'trial_balance',
      title: 'Trial Balance',
      icon: 'scale-balance',
      reportType: 'TRIAL_BALANCE',
      color: '#F44336'
    },
    {
      id: 'stock_report',
      title: 'Stock Report',
      icon: 'package-variant',
      reportType: 'STOCK_REPORT',
      color: '#00BCD4'
    }
  ];

  const handleExport = async (option) => {
    // Load data based on report type
    const data = await loadReportData(option.reportType);
    
    if (!data) {
      Alert.alert('Error', 'No data available for this report');
      return;
    }

    // Export will be handled by the PDFExportButton component
  };

  const loadReportData = async (reportType) => {
    // Load appropriate data based on report type
    // This is a simplified example
    const db = await DatabaseService.getDatabase();
    
    switch (reportType) {
      case 'CASH_BOOK':
        const [cashResult] = await db.executeSql('SELECT * FROM cash_book ORDER BY entry_date');
        return { entries: cashResult.rows.raw() };
      
      case 'STOCK_REPORT':
        const [stockResult] = await db.executeSql('SELECT * FROM products WHERE is_active = 1');
        return { products: stockResult.rows.raw() };
      
      // Add other cases...
      
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Export Reports</Text>
      
      {exportOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={styles.reportCard}
          onPress={() => handleExport(option)}
        >
          <View style={[styles.reportIcon, { backgroundColor: option.color + '20' }]}>
            <Text style={styles.reportIconText}>{option.icon}</Text>
          </View>
          
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>{option.title}</Text>
            <Text style={styles.reportSubtitle}>Export to PDF or Print</Text>
          </View>
          
          <QuickExportButton
            reportType={option.reportType}
            data={{}} // Will be loaded on press
            options={{ title: option.title }}
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * EXAMPLE 7: BULK EXPORT (EXPORT MULTIPLE REPORTS AT ONCE)
 * ═══════════════════════════════════════════════════════════════════════
 */
export const BulkExportExample = () => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleBulkExport = async () => {
    try {
      setExporting(true);
      setProgress(0);

      const reports = [
        'CASH_BOOK',
        'BANK_BOOK',
        'PURCHASE_BOOK',
        'SALES_BOOK',
        'TRIAL_BALANCE',
        'STOCK_REPORT'
      ];

      for (let i = 0; i < reports.length; i++) {
        const reportType = reports[i];
        const data = await loadReportData(reportType);
        
        if (data) {
          await PDFExportEngine.generatePDF(reportType, data, {
            title: reportType.replace(/_/g, ' ')
          });
        }

        setProgress(((i + 1) / reports.length) * 100);
      }

      Alert.alert('Success', 'All reports exported successfully!');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bulk Export</Text>
      
      <TouchableOpacity
        style={styles.bulkExportButton}
        onPress={handleBulkExport}
        disabled={exporting}
      >
        <Text style={styles.bulkExportText}>
          {exporting ? `Exporting... ${progress.toFixed(0)}%` : 'Export All Reports'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    padding: 16,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportIconText: {
    fontSize: 24,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  bulkExportButton: {
    backgroundColor: '#F44336',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bulkExportText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default {
  InvoiceScreenExample,
  StockReportScreenExample,
  DayClosingScreenExample,
  CashBookScreenExample,
  TrialBalanceScreenExample,
  ReportsMenuExample,
  BulkExportExample
};
