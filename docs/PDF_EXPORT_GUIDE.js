/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MINDSTACK - COMPLETE PDF EXPORT & PRINT SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * QUICK REFERENCE GUIDE
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 1. BASIC USAGE - EXPORT BUTTON WITH MENU
 * ═══════════════════════════════════════════════════════════════════════
 */

import PDFExportButton from '../components/pdf/PDFExportButton';

// In your component:
<PDFExportButton
  reportType="INVOICE"
  data={{ invoice, items }}
  options={{ title: 'Tax Invoice' }}
  buttonText="Export PDF"
/>

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 2. QUICK EXPORT - ONE CLICK DOWNLOAD
 * ═══════════════════════════════════════════════════════════════════════
 */

import { QuickExportButton } from '../components/pdf/PDFExportButton';

<QuickExportButton
  reportType="STOCK_REPORT"
  data={{ products }}
  options={{ title: 'Stock Report' }}
  onPress={(result) => {
    console.log('PDF saved at:', result.filePath);
  }}
/>

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 3. QUICK PRINT - ONE CLICK PRINT
 * ═══════════════════════════════════════════════════════════════════════
 */

import { QuickPrintButton } from '../components/pdf/PDFExportButton';

<QuickPrintButton
  reportType="INVOICE"
  data={{ invoice, items }}
  options={{ title: 'Tax Invoice' }}
/>

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 4. PROGRAMMATIC EXPORT (WITHOUT BUTTON)
 * ═══════════════════════════════════════════════════════════════════════
 */

import PDFExportEngine from '../services/pdf/pdfExportEngine';

const exportPDF = async () => {
  const result = await PDFExportEngine.generatePDF(
    'CASH_BOOK',
    { entries, period: 'January 2024' },
    { title: 'Cash Book - January 2024' }
  );

  if (result.success) {
    console.log('PDF saved:', result.filePath);
    // Optionally share
    await PDFExportEngine.sharePDF(result.filePath);
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 5. PROGRAMMATIC PRINT (WITHOUT BUTTON)
 * ═══════════════════════════════════════════════════════════════════════
 */

const printReport = async () => {
  const result = await PDFExportEngine.printPDF(
    'DAY_CLOSING_REPORT',
    { dayClosing },
    { title: 'Day Closing Report' }
  );

  if (result.success) {
    console.log('Print job sent');
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 6. BULK EXPORT - MULTIPLE REPORTS AT ONCE
 * ═══════════════════════════════════════════════════════════════════════
 */

const bulkExport = async () => {
  const reports = [
    { type: 'CASH_BOOK', data: cashBookData },
    { type: 'BANK_BOOK', data: bankBookData },
    { type: 'TRIAL_BALANCE', data: trialBalanceData }
  ];

  for (const report of reports) {
    await PDFExportEngine.generatePDF(
      report.type,
      report.data,
      { title: report.type.replace(/_/g, ' ') }
    );
  }

  Alert.alert('Success', 'All reports exported!');
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * SUPPORTED REPORT TYPES (20+)
 * ═══════════════════════════════════════════════════════════════════════
 */

const REPORT_TYPES = {
  // Accounting Books (9 Subsidiary Books)
  CASH_BOOK: 'Cash Book (Double-sided Dr/Cr)',
  BANK_BOOK: 'Bank Book (Double-sided Dr/Cr)',
  PETTY_CASH_BOOK: 'Petty Cash Book (Double-sided Dr/Cr)',
  PURCHASE_BOOK: 'Purchase Book',
  SALES_BOOK: 'Sales Book',
  PURCHASE_RETURN_BOOK: 'Purchase Return Book',
  SALES_RETURN_BOOK: 'Sales Return Book',
  BILLS_RECEIVABLE_BOOK: 'Bills Receivable Book',
  BILLS_PAYABLE_BOOK: 'Bills Payable Book',
  JOURNAL: 'Journal Entries',
  LEDGER: 'Ledger Account',

  // Financial Statements
  TRIAL_BALANCE: 'Trial Balance',
  TRADING_ACCOUNT: 'Trading Account',
  PROFIT_LOSS: 'Profit & Loss Account',
  BALANCE_SHEET: 'Balance Sheet',

  // POS Reports
  INVOICE: 'Tax Invoice (GST Compliant)',
  SALES_REPORT: 'Sales Report',
  PURCHASE_REPORT: 'Purchase Report',
  STOCK_REPORT: 'Stock Report',
  DAY_CLOSING_REPORT: 'Day Closing Report',
  GST_REPORT: 'GST Report',
  PRODUCT_LIST: 'Product List',
  LOW_STOCK_REPORT: 'Low Stock Alert Report'
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * DATA STRUCTURE EXAMPLES
 * ═══════════════════════════════════════════════════════════════════════
 */

// INVOICE DATA
const invoiceData = {
  invoice: {
    invoice_number: 'INV-001',
    invoice_date: '2024-01-15',
    invoice_time: '14:30:00',
    customer_name: 'John Doe',
    customer_phone: '9876543210',
    customer_gstin: '29ABCDE1234F1Z5',
    subtotal: 10000,
    discount_amount: 500,
    cgst_amount: 475,
    sgst_amount: 475,
    igst_amount: 0,
    total_tax: 950,
    round_off: 0,
    grand_total: 10450,
    payment_mode: 'CASH'
  },
  items: [
    {
      product_name: 'Product 1',
      quantity: 2,
      unit: 'pcs',
      price: 5000,
      gst_percentage: 10,
      cgst_amount: 250,
      sgst_amount: 250,
      total_amount: 5500
    }
  ]
};

// CASH BOOK DATA
const cashBookData = {
  entries: [
    {
      entry_date: '2024-01-15',
      particulars: 'Cash Sales',
      voucher_number: 'RV-001',
      receipt_amount: 10000,
      payment_amount: 0,
      balance: 10000
    }
  ],
  period: 'January 2024'
};

// STOCK REPORT DATA
const stockReportData = {
  products: [
    {
      product_name: 'Product 1',
      sku: 'SKU001',
      current_stock: 100,
      unit: 'pcs',
      purchase_price: 500,
      selling_price: 600,
      minimum_stock_level: 20
    }
  ]
};

// TRIAL BALANCE DATA
const trialBalanceData = {
  entries: [
    {
      account_code: 'A001',
      account_name: 'Cash',
      account_type: 'ASSET',
      closing_balance: 50000,
      closing_balance_type: 'Dr'
    }
  ],
  period: 'FY 2023-24'
};

// DAY CLOSING DATA
const dayClosingData = {
  dayClosing: {
    closing_date: '2024-01-15',
    opening_cash: 5000,
    total_sales: 50000,
    total_cash_sales: 30000,
    total_upi_sales: 15000,
    total_card_sales: 5000,
    total_returns: 1000,
    total_expenses: 2000,
    expected_cash: 32000,
    actual_cash: 32000,
    cash_difference: 0,
    total_invoices: 25,
    total_returns_count: 2
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * PDF OPTIONS
 * ═══════════════════════════════════════════════════════════════════════
 */

const pdfOptions = {
  title: 'Report Title',           // Report title
  periodId: 123,                    // Period ID for logging
  
  // PDF generation options
  pdfOptions: {
    fileName: 'custom_name.pdf',   // Custom filename
    directory: 'Documents/Custom', // Custom directory
    base64: false                   // Return base64 instead of file
  },
  
  // Print options
  printOptions: {
    // React Native Print options
  },
  
  // Share options
  shareOptions: {
    title: 'Share Report',
    message: 'Check out this report',
    // React Native Share options
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════
 * FEATURES
 * ═══════════════════════════════════════════════════════════════════════
 */

/*
✅ ONE-CLICK EXPORT
  - Single button press to export any report
  - Automatic file naming with timestamp
  - Saved to Documents/MindStack folder

✅ ONE-CLICK PRINT
  - Direct print without saving
  - System print dialog
  - Print preview

✅ SHARE FUNCTIONALITY
  - Share via WhatsApp, Email, etc.
  - Native share dialog
  - PDF attachment

✅ PROFESSIONAL FORMAT
  - Company letterhead on all reports
  - Indian accounting format
  - Double-sided books (Dr/Cr sides)
  - GST compliant invoices
  - Signature sections
  - Page numbers
  - Professional styling

✅ INDIAN NUMBER FORMAT
  - Lakhs and Crores notation
  - Amount in words (Indian style)
  - ₹ symbol
  - Proper decimal formatting

✅ GST COMPLIANCE
  - GSTIN display
  - Tax breakup (CGST/SGST/IGST)
  - HSN codes
  - Taxable amounts
  - GST summary

✅ AUDIT TRAIL
  - All PDF generations logged
  - File path stored
  - Timestamp recorded
  - User tracking

✅ ERROR HANDLING
  - Graceful error messages
  - Loading states
  - Success/failure alerts
  - Retry options

✅ OFFLINE SUPPORT
  - Works completely offline
  - No internet required
  - Local file storage

✅ PERFORMANCE
  - Fast PDF generation
  - Optimized HTML rendering
  - Efficient memory usage
  - Background processing
*/

/**
 * ═══════════════════════════════════════════════════════════════════════
 * INSTALLATION REQUIREMENTS
 * ═══════════════════════════════════════════════════════════════════════
 */

/*
npm install --save react-native-html-to-pdf
npm install --save react-native-print
npm install --save react-native-share
npm install --save react-native-fs

// iOS
cd ios && pod install

// Android - Add to android/app/build.gradle:
implementation project(':react-native-html-to-pdf')
implementation project(':react-native-print')
implementation project(':react-native-share')
implementation project(':react-native-fs')
*/

/**
 * ═══════════════════════════════════════════════════════════════════════
 * PERMISSIONS (Android)
 * ═══════════════════════════════════════════════════════════════════════
 */

/*
Add to AndroidManifest.xml:

<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
*/

export default {
  REPORT_TYPES,
  invoiceData,
  cashBookData,
  stockReportData,
  trialBalanceData,
  dayClosingData,
  pdfOptions
};
