# ⚙️ ACCOUNTING SETTINGS & BOOK CONFIGURATION

## User-Controlled Book Management System

---

## 🎯 OVERVIEW

Users can now **customize which accounting books to maintain** based on their business needs. This provides flexibility while ensuring compliance with mandatory books (Journal & Ledger).

### **Default Configuration:**
✅ All books enabled by default

### **Mandatory Books (Cannot be disabled):**
- ✅ Journal Book
- ✅ Ledger

### **Optional Books (Can be enabled/disabled):**
- Purchase Book
- Sales Book
- Purchase Return Book
- Sales Return Book
- Cash Book
- Bank Book
- Petty Cash Book
- Bills Receivable Book
- Bills Payable Book

---

## 📱 SETTINGS SCREEN

### **Access Settings:**
```
Main Menu → Settings → Accounting Settings → Book Configuration
```

### **Settings Interface:**

```
═══════════════════════════════════════════════════════════════════════════════
                        ACCOUNTING BOOK CONFIGURATION
═══════════════════════════════════════════════════════════════════════════════

MANDATORY BOOKS (Always ON):
┌─────────────────────────────────────────────────────────────────────────────┐
│ ✅ Journal Book                                                              │
│    Records all transactions in chronological order                          │
│    Status: ENABLED (Mandatory)                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ ✅ Ledger                                                                    │
│    Account-wise record of all transactions                                  │
│    Status: ENABLED (Mandatory)                                              │
└─────────────────────────────────────────────────────────────────────────────┘

OPTIONAL BOOKS:
┌─────────────────────────────────────────────────────────────────────────────┐
│ ☑️ Purchase Book                                          [Toggle ON/OFF]   │
│    Records credit purchases only                                            │
│    Status: ENABLED                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ ☑️ Sales Book                                             [Toggle ON/OFF]   │
│    Records credit sales only                                                │
│    Status: ENABLED                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ ☑️ Purchase Return Book                                   [Toggle ON/OFF]   │
│    Records goods returned to suppliers (Debit Notes)                        │
│    Status: ENABLED                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ ☑️ Sales Return Book                                      [Toggle ON/OFF]   │
│    Records goods returned by customers (Credit Notes)                       │
│    Status: ENABLED                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ ☑️ Cash Book                                              [Toggle ON/OFF]   │
│    Records all cash transactions                                            │
│    Status: ENABLED                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ ☑️ Bank Book                                              [Toggle ON/OFF]   │
│    Records all bank transactions                                            │
│    Status: ENABLED                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ ☑️ Petty Cash Book                                        [Toggle ON/OFF]   │
│    Records small expenses (Imprest System)                                  │
│    Status: ENABLED                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ ☑️ Bills Receivable Book                                  [Toggle ON/OFF]   │
│    Records bills received from debtors                                      │
│    Status: ENABLED                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ ☑️ Bills Payable Book                                     [Toggle ON/OFF]   │
│    Records bills given to creditors                                         │
│    Status: ENABLED                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

                    [Reset to Default]  [Save Settings]
═══════════════════════════════════════════════════════════════════════════════
```

---

## 💻 USAGE IN CODE

### **1. Get Current Settings:**

```javascript
import AccountingSettingsService from './services/accounting/accountingSettingsService';

// Get all settings
const result = await AccountingSettingsService.getSettings();
console.log(result.data.enabledBooks);

// Output:
// {
//   JOURNAL: true,
//   LEDGER: true,
//   PURCHASE_BOOK: true,
//   SALES_BOOK: true,
//   PURCHASE_RETURN: false,  // User disabled this
//   SALES_RETURN: false,     // User disabled this
//   CASH_BOOK: true,
//   BANK_BOOK: true,
//   PETTY_CASH_BOOK: false,  // User disabled this
//   BILLS_RECEIVABLE: false, // User disabled this
//   BILLS_PAYABLE: false     // User disabled this
// }
```

### **2. Enable/Disable a Book:**

```javascript
// Disable Purchase Return Book
await AccountingSettingsService.toggleBook('PURCHASE_RETURN', false);
// ✅ Purchase Return Book disabled successfully

// Enable Purchase Return Book
await AccountingSettingsService.toggleBook('PURCHASE_RETURN', true);
// ✅ Purchase Return Book enabled successfully

// Try to disable Journal (will fail)
await AccountingSettingsService.toggleBook('JOURNAL', false);
// ❌ Journal Book is mandatory and cannot be disabled
```

### **3. Check if Book is Enabled:**

```javascript
const isEnabled = await AccountingSettingsService.isBookEnabled('PURCHASE_BOOK');
console.log(isEnabled); // true or false
```

### **4. Get All Books with Status:**

```javascript
const result = await AccountingSettingsService.getAllBooksWithStatus();
console.log(result.data);

// Output:
// [
//   {
//     type: 'JOURNAL',
//     name: 'Journal Book',
//     description: 'Records all transactions in chronological order (Mandatory)',
//     enabled: true,
//     mandatory: true
//   },
//   {
//     type: 'PURCHASE_BOOK',
//     name: 'Purchase Book',
//     description: 'Records credit purchases only',
//     enabled: true,
//     mandatory: false
//   },
//   ...
// ]
```

### **5. Reset to Default (All Books Enabled):**

```javascript
await AccountingSettingsService.resetToDefault();
// ✅ Settings reset to default (all books enabled)
```

---

## 📝 MAIN SCREEN USAGE

### **Method 1: Auto-Detect Books (Recommended)**

User enters transaction, system automatically determines which books to record in based on transaction type and settings:

```javascript
import TransactionRecordingService from './services/accounting/transactionRecordingService';

// User enters: "Sold goods to ABC Ltd for ₹59,000 with 18% GST"
const result = await TransactionRecordingService.recordTransaction({
  type: 'CREDIT_SALE',
  amount: 59000,
  customerName: 'ABC Pvt Ltd',
  invoiceNumber: 'INV-002',
  gstRate: 18
});

// System automatically records in:
// ✅ Journal (always)
// ✅ Ledger (always)
// ✅ Sales Book (if enabled)
// ✅ Cash Book (if enabled and payment mode is cash)

console.log(result.message);
// ✅ Transaction recorded successfully!
// Voucher: SAL-2425-0002
// Amount: ₹59,000.00
// Recorded in: Journal, Ledger, Sales Book
```

### **Method 2: User Specifies Books**

User can explicitly mention which books to record in:

```javascript
// User says: "Record this sale in Sales Book and Cash Book"
const result = await TransactionRecordingService.recordTransaction({
  type: 'CREDIT_SALE',
  amount: 59000,
  customerName: 'ABC Pvt Ltd',
  invoiceNumber: 'INV-002',
  gstRate: 18,
  recordInBooks: ['SALES_BOOK', 'CASH_BOOK'] // User specified
});

// System records in:
// ✅ Journal (always)
// ✅ Ledger (always)
// ✅ Sales Book (user specified, if enabled)
// ✅ Cash Book (user specified, if enabled)
```

### **Method 3: Natural Language (AI Processing)**

User can use natural language, AI processes and determines books:

```javascript
// User says: "Record purchase of goods worth ₹50,000 from XYZ Traders in purchase book"

// AI processes and creates:
const result = await TransactionRecordingService.recordTransaction({
  type: 'CREDIT_PURCHASE',
  amount: 50000,
  supplierName: 'XYZ Traders',
  recordInBooks: ['PURCHASE_BOOK'] // AI extracted from user's request
});
```

---

## 🎯 TRANSACTION TYPE → BOOK MAPPING

### **Automatic Book Detection:**

| Transaction Type | Books Recorded (if enabled) |
|-----------------|----------------------------|
| **CASH_SALE** | Journal, Ledger, Sales Book, Cash Book |
| **CREDIT_SALE** | Journal, Ledger, Sales Book |
| **CASH_PURCHASE** | Journal, Ledger, Purchase Book, Cash Book |
| **CREDIT_PURCHASE** | Journal, Ledger, Purchase Book |
| **PURCHASE_RETURN** | Journal, Ledger, Purchase Return Book |
| **SALES_RETURN** | Journal, Ledger, Sales Return Book |
| **CASH_RECEIPT** | Journal, Ledger, Cash Book |
| **CASH_PAYMENT** | Journal, Ledger, Cash Book |
| **BANK_RECEIPT** | Journal, Ledger, Bank Book |
| **BANK_PAYMENT** | Journal, Ledger, Bank Book |
| **PETTY_CASH** | Journal, Ledger, Petty Cash Book |
| **BILL_RECEIVABLE** | Journal, Ledger, Bills Receivable Book |
| **BILL_PAYABLE** | Journal, Ledger, Bills Payable Book |

---

## 📊 EXAMPLES

### **Example 1: Small Business (Minimal Books)**

**Business:** Small retail shop, only cash transactions

**Settings:**
```
✅ Journal Book (mandatory)
✅ Ledger (mandatory)
❌ Purchase Book (disabled)
❌ Sales Book (disabled)
❌ Purchase Return Book (disabled)
❌ Sales Return Book (disabled)
✅ Cash Book (enabled)
❌ Bank Book (disabled)
❌ Petty Cash Book (disabled)
❌ Bills Receivable Book (disabled)
❌ Bills Payable Book (disabled)
```

**Transaction:**
```javascript
{
  type: 'CASH_SALE',
  amount: 5000,
  customerName: 'Walk-in Customer'
}
```

**Recorded in:**
- ✅ Journal
- ✅ Ledger
- ✅ Cash Book
- ❌ Sales Book (disabled by user)

---

### **Example 2: Medium Business (Standard Books)**

**Business:** Trading company with credit sales/purchases

**Settings:**
```
✅ Journal Book (mandatory)
✅ Ledger (mandatory)
✅ Purchase Book (enabled)
✅ Sales Book (enabled)
✅ Purchase Return Book (enabled)
✅ Sales Return Book (enabled)
✅ Cash Book (enabled)
✅ Bank Book (enabled)
❌ Petty Cash Book (disabled)
❌ Bills Receivable Book (disabled)
❌ Bills Payable Book (disabled)
```

**Transaction:**
```javascript
{
  type: 'CREDIT_SALE',
  amount: 59000,
  customerName: 'ABC Pvt Ltd',
  invoiceNumber: 'INV-002',
  gstRate: 18
}
```

**Recorded in:**
- ✅ Journal
- ✅ Ledger
- ✅ Sales Book

---

### **Example 3: Large Business (All Books)**

**Business:** Manufacturing company with complex transactions

**Settings:**
```
✅ All books enabled (default)
```

**Transaction:**
```javascript
{
  type: 'CREDIT_PURCHASE',
  amount: 100000,
  supplierName: 'XYZ Industries',
  invoiceNumber: 'PINV-001',
  gstRate: 18
}
```

**Recorded in:**
- ✅ Journal
- ✅ Ledger
- ✅ Purchase Book

---

## 🔧 COMPANY DETAILS SETTINGS

Users can also configure company details:

```javascript
await AccountingSettingsService.updateCompanyDetails({
  companyName: 'ABC Pvt Ltd',
  financialYearStart: 'April',
  gstNumber: '27AABCU9603R1ZM',
  panNumber: 'AABCU9603R',
  address: '123, Main Street, Mumbai - 400001',
  phone: '+91 98765 43210',
  email: 'info@abcpvtltd.com'
});
```

These details will appear in:
- PDF headers
- Invoice generation
- Reports
- Financial statements

---

## 📄 PDF GENERATION WITH SETTINGS

PDFs are generated only for enabled books:

```javascript
// Generate Sales Book PDF (only if enabled)
const isEnabled = await AccountingSettingsService.isBookEnabled('SALES_BOOK');

if (isEnabled) {
  await SubsidiaryBooksPDFService.generateSalesBookPDF({
    month: 'December',
    year: '2024'
  });
} else {
  console.log('Sales Book is disabled in settings');
}
```

---

## ✅ BENEFITS

### **1. Flexibility:**
- Users choose only the books they need
- Reduces clutter and complexity
- Faster data entry

### **2. Compliance:**
- Journal and Ledger always maintained (mandatory)
- Meets legal requirements
- Audit trail preserved

### **3. Customization:**
- Small businesses: Minimal books
- Medium businesses: Standard books
- Large businesses: All books

### **4. Efficiency:**
- Less data to manage
- Faster PDF generation
- Reduced storage

---

## 🎓 BEST PRACTICES

### **1. Start with Default:**
- Begin with all books enabled
- Disable books gradually as you understand your needs

### **2. Mandatory Books:**
- Never try to disable Journal or Ledger
- These are required for compliance

### **3. Review Periodically:**
- Review book settings quarterly
- Enable books if business grows
- Disable unused books

### **4. Backup Before Changes:**
- Export data before disabling books
- Keep PDF copies of disabled books

---

## 📈 STATISTICS

### **Files Created:**
- ✅ **accountingSettingsService.js** - 400+ lines (Settings management)
- ✅ **Updated transactionRecordingService.js** - 600+ lines (Settings integration)

### **Features:**
- ✅ 11 configurable books
- ✅ 2 mandatory books (Journal, Ledger)
- ✅ 9 optional books
- ✅ Company details configuration
- ✅ Auto-detect book recording
- ✅ User-specified book recording
- ✅ Natural language support

---

**Last Updated:** January 1, 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready  
**Feature:** User-Controlled Book Configuration
