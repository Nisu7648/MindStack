# 📚 MindStack - Complete Indian Accounting System

**Professional Double-Entry Bookkeeping System with User-Controlled Book Configuration**

---

## 🎯 Overview

MindStack is a complete, professional-grade accounting system built for Indian businesses. It implements traditional double-entry bookkeeping with full compliance to Indian accounting standards, GST, TDS, and Companies Act 2013 (MCA 2021).

### **Key Features:**
- ✅ Complete double-entry journal system
- ✅ Traditional journal book (A4 format)
- ✅ Account-wise ledger with running balance
- ✅ 9 subsidiary books (user-configurable)
- ✅ GST & TDS compliance
- ✅ PDF generation for all books
- ✅ Audit trail (MCA 2021 compliant)
- ✅ Never-fail error handling
- ✅ Indian numbering system (1,00,000.00)

---

## 📖 System Architecture

```
USER TRANSACTION
       ↓
JOURNAL ENTRY (Double-Entry)
       ↓
    ┌──────────────────────────────────┐
    │                                  │
    ↓                                  ↓
LEDGER (Account-wise)          SUBSIDIARY BOOKS
    │                          (User-Configurable)
    │                                  │
    ├─ Cash A/c                       ├─ Purchase Book
    ├─ Bank A/c                       ├─ Sales Book
    ├─ Sales A/c                      ├─ Purchase Return
    ├─ Purchase A/c                   ├─ Sales Return
    ├─ Debtors A/c                    ├─ Cash Book
    ├─ Creditors A/c                  ├─ Bank Book
    └─ All Accounts                   ├─ Petty Cash Book
                                      ├─ Bills Receivable
                                      └─ Bills Payable
       ↓
PDF GENERATION (A4 Format)
```

---

## 🚀 Quick Start

### **1. Record a Transaction:**

```javascript
import TransactionRecordingService from './services/accounting/transactionRecordingService';

// Simple sale transaction
const result = await TransactionRecordingService.recordTransaction({
  type: 'CREDIT_SALE',
  amount: 59000,
  customerName: 'ABC Pvt Ltd',
  invoiceNumber: 'INV-002',
  gstRate: 18
});

// Output:
// ✅ Transaction recorded successfully!
// Voucher: SAL-2425-0002
// Amount: ₹59,000.00
// Recorded in: Journal, Ledger, Sales Book
```

### **2. View Journal Book:**

```javascript
// Get December 2024 entries
const result = await TransactionRecordingService.getTransactionsByMonth('December', '2024');
console.log(result.data); // Array of journal entries
```

### **3. Generate PDF:**

```javascript
// Generate journal book PDF
await TransactionRecordingService.generateJournalBookPDF({
  month: 'December',
  year: '2024'
});
```

---

## 📚 Accounting Books

### **Mandatory Books (Always ON):**

#### **1. Journal Book**
Traditional chronological record of all transactions in A4 format.

**Format:**
```
Date | Particulars | L.F. | Debit (₹) | Credit (₹)
```

**Example:**
```
15-Dec-2024  Cash A/c Dr.                          10001    11,800.00
                 To Sales A/c                       40001                 10,000.00
                 To GST Output CGST A/c             20201                    900.00
                 To GST Output SGST A/c             20202                    900.00
             (Being goods sold for cash with GST)
             Ref: INV-001
```

#### **2. Ledger**
Account-wise record with running balance.

**Format:**
```
Date | Particulars | Voucher No. | Debit (₹) | Credit (₹) | Balance (₹)
```

**Example:**
```
15-Dec-2024  To Sales A/c       SAL-2425-001   11,800.00                11,800.00 Dr
17-Dec-2024  By Purchase A/c    PUR-2425-001                23,600.00   11,800.00 Cr
```

### **Optional Books (User-Configurable):**

#### **3. Purchase Book**
Records credit purchases only.

**Format:**
```
Date | Supplier Name | Invoice No. | Particulars | Amount (₹) | GST (₹) | Total (₹)
```

#### **4. Sales Book**
Records credit sales only.

**Format:**
```
Date | Customer Name | Invoice No. | Particulars | Amount (₹) | GST (₹) | Total (₹)
```

#### **5. Purchase Return Book (Debit Note Book)**
Records goods returned to suppliers.

**Format:**
```
Date | Supplier Name | Debit Note # | Particulars | Amount (₹) | GST (₹) | Total (₹)
```

#### **6. Sales Return Book (Credit Note Book)**
Records goods returned by customers.

**Format:**
```
Date | Customer Name | Credit Note # | Particulars | Amount (₹) | GST (₹) | Total (₹)
```

#### **7. Cash Book**
Records all cash transactions with running balance.

**Format:**
```
Date | Particulars | Voucher No. | Debit (₹) | Credit (₹) | Balance (₹)
```

#### **8. Bank Book**
Records all bank transactions with running balance.

**Format:**
```
Date | Particulars | Voucher No. | Debit (₹) | Credit (₹) | Balance (₹)
```

#### **9. Petty Cash Book (Imprest System)**
Records small expenses with fixed imprest amount.

**Format:**
```
Date | Particulars | Voucher No. | Receipt (₹) | Payment (₹) | Balance (₹)
```

#### **10. Bills Receivable Book**
Records bills received from debtors.

**Format:**
```
Date | From (Drawer) | Bill No. | Term (Days) | Due Date | Amount (₹)
```

#### **11. Bills Payable Book**
Records bills given to creditors.

**Format:**
```
Date | To (Payee) | Bill No. | Term (Days) | Due Date | Amount (₹)
```

---

## ⚙️ Book Configuration

Users can enable/disable books based on their business needs.

### **Configure Books:**

```javascript
import AccountingSettingsService from './services/accounting/accountingSettingsService';

// Disable Purchase Return Book
await AccountingSettingsService.toggleBook('PURCHASE_RETURN', false);

// Enable Purchase Return Book
await AccountingSettingsService.toggleBook('PURCHASE_RETURN', true);

// Check if book is enabled
const isEnabled = await AccountingSettingsService.isBookEnabled('PURCHASE_BOOK');

// Get all books with status
const result = await AccountingSettingsService.getAllBooksWithStatus();

// Reset to default (all books enabled)
await AccountingSettingsService.resetToDefault();
```

### **Business Size Examples:**

**Small Business (Minimal Books):**
- ✅ Journal Book (mandatory)
- ✅ Ledger (mandatory)
- ✅ Cash Book
- ❌ All other books disabled

**Medium Business (Standard Books):**
- ✅ Journal Book (mandatory)
- ✅ Ledger (mandatory)
- ✅ Purchase Book
- ✅ Sales Book
- ✅ Cash Book
- ✅ Bank Book

**Large Business (All Books):**
- ✅ All 11 books enabled (default)

---

## 💻 Usage Methods

### **Method 1: Auto-Detect (Recommended)**

System automatically determines which books to use based on transaction type:

```javascript
await TransactionRecordingService.recordTransaction({
  type: 'CREDIT_SALE',
  amount: 59000,
  customerName: 'ABC Pvt Ltd',
  gstRate: 18
});

// Automatically records in:
// ✅ Journal (always)
// ✅ Ledger (always)
// ✅ Sales Book (if enabled)
```

### **Method 2: User-Specified Books**

User explicitly specifies which books to record in:

```javascript
await TransactionRecordingService.recordTransaction({
  type: 'CREDIT_SALE',
  amount: 59000,
  customerName: 'ABC Pvt Ltd',
  recordInBooks: ['SALES_BOOK', 'CASH_BOOK'] // User specified
});
```

### **Method 3: Natural Language (AI)**

AI processes user's natural language request:

```javascript
// User: "Record purchase of goods worth ₹50,000 from XYZ Traders in purchase book"

// AI extracts and creates:
await TransactionRecordingService.recordTransaction({
  type: 'CREDIT_PURCHASE',
  amount: 50000,
  supplierName: 'XYZ Traders',
  recordInBooks: ['PURCHASE_BOOK'] // AI extracted
});
```

---

## 📊 Transaction Types

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

## 📄 PDF Generation

All books can be exported as professional A4 format PDFs:

```javascript
// Journal Book PDF
await TransactionRecordingService.generateJournalBookPDF({
  month: 'December',
  year: '2024'
});

// Ledger PDF
await LedgerService.generateLedgerPDF('10001', {
  fromDate: '2024-12-01',
  toDate: '2024-12-31'
});

// Purchase Book PDF
await SubsidiaryBooksPDFService.generatePurchaseBookPDF({
  month: 'December',
  year: '2024'
});

// Sales Book PDF
await SubsidiaryBooksPDFService.generateSalesBookPDF({
  fromDate: '2024-12-01',
  toDate: '2024-12-31'
});
```

**PDF Features:**
- ✅ A4 size (210mm × 297mm)
- ✅ Professional table layouts
- ✅ Indian numbering system (1,00,000.00)
- ✅ Company header
- ✅ Period/date range
- ✅ Summary with totals
- ✅ Ready for printing

---

## 🏛️ Indian Compliance

### **Companies Act 2013 (MCA 2021):**
- ✅ Complete audit trail
- ✅ Immutable journal entries
- ✅ Chronological recording
- ✅ Proper voucher numbering
- ✅ Date-wise organization

### **GST Compliance:**
- ✅ Automatic GST calculation
- ✅ CGST/SGST/IGST support
- ✅ Input/Output GST registers
- ✅ GST-compliant invoicing

### **TDS Compliance:**
- ✅ TDS calculation by section
- ✅ TDS registers
- ✅ Automatic deduction

---

## 📁 File Structure

```
src/
├── services/
│   └── accounting/
│       ├── journalService.js              (703 lines) - Core journal system
│       ├── journalHelpers.js              (500+ lines) - Common transactions
│       ├── journalBookService.js          (600+ lines) - Traditional journal book
│       ├── ledgerService.js               (500+ lines) - Account-wise ledger
│       ├── subsidiaryBooksService.js      (700+ lines) - 9 subsidiary books
│       ├── subsidiaryBooksPDFService.js   (600+ lines) - PDF generation
│       ├── accountingSettingsService.js   (400+ lines) - Book configuration
│       └── transactionRecordingService.js (600+ lines) - Main integration
```

---

## 📈 Statistics

### **Code:**
- **8 service files**
- **4,600+ lines of code**
- **100% Indian compliance**
- **Never-fail error handling**

### **Features:**
- ✅ 1 Journal system
- ✅ 1 Ledger system
- ✅ 9 Subsidiary books
- ✅ 11 PDF generators
- ✅ User-controlled configuration
- ✅ 3 recording methods
- ✅ GST/TDS integration
- ✅ Audit trail

---

## 🎓 Best Practices

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

## 📞 Support

For detailed guides, see:
- `JOURNAL_BOOK_GUIDE.md` - Complete journal book system
- `LEDGER_AND_SUBSIDIARY_BOOKS.md` - All subsidiary books
- `ACCOUNTING_SETTINGS_GUIDE.md` - Book configuration
- `INDIAN_ACCOUNTING_COMPLIANCE.md` - Compliance details

---

## 📝 License

MIT License - See LICENSE file for details

---

**Version:** 1.0  
**Status:** ✅ Production Ready  
**Last Updated:** January 1, 2025
