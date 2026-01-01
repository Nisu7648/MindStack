# 📚 PROFESSIONAL JOURNAL SYSTEM - COMPLETE INDIAN COMPLIANCE

**Complete Implementation of Indian Accounting Standards & Government Regulations**

---

## 🏛️ LEGAL COMPLIANCE FRAMEWORK

### ✅ Companies Act 2013, Section 128
**Books of Accounts Requirements:**
- ✅ Double-entry bookkeeping system (mandatory)
- ✅ Accrual basis accounting
- ✅ Maintained at registered office
- ✅ 8-year record retention period
- ✅ True and fair view of financial position
- ✅ Electronic records allowed (with India-based servers)
- ✅ Annual intimation to ROC during filing

**Penalties for Non-Compliance:**
- Imprisonment up to 1 year
- Fine ₹50,000 to ₹5,00,000
- Applies to MD, CFO, or designated person

### ✅ GST Act 2017
**Tax Compliance:**
- ✅ Input Tax Credit (ITC) tracking
- ✅ Output Tax liability calculation
- ✅ CGST + SGST for intra-state transactions
- ✅ IGST for inter-state transactions
- ✅ GST rates: 0%, 0.25%, 3%, 5%, 12%, 18%, 28%
- ✅ Separate ledgers for each GST component

### ✅ Income Tax Act 1961
**TDS Compliance:**
- ✅ Section 194A: Interest (10%)
- ✅ Section 194C: Contractors (1%)
- ✅ Section 194H: Commission (5%)
- ✅ Section 194I: Rent (10%)
- ✅ Section 194J: Professional services (10%)
- ✅ Section 194Q: Purchase of goods (0.1%)

### ✅ MCA Notification 2021
**Audit Trail Requirements:**
- ✅ Tamper-proof audit trail for every transaction
- ✅ Sequential voucher numbering
- ✅ Edit log for all modifications
- ✅ Mandatory from FY 2023-24
- ✅ Verified by auditors

### ✅ Indian Accounting Standards (Ind AS)
**ICAI Guidelines:**
- ✅ Uniform accounting practices
- ✅ Recognition and measurement standards
- ✅ Disclosure requirements
- ✅ Applicable to companies based on net worth/listing

---

## 📅 FINANCIAL YEAR CONFIGURATION

**India Standard:**
- **Start Date:** April 1
- **End Date:** March 31
- **Example:** FY 2024-25 = April 1, 2024 to March 31, 2025

**Voucher Numbering Format:**
```
VT-FY-NNNN

VT = Voucher Type (PAY, REC, JNL, CON, SAL, PUR, DBN, CRN, MEM)
FY = Financial Year (2425 for FY 2024-25)
NNNN = Sequential Number (0001, 0002, 0003...)

Examples:
PAY-2425-0001  (Payment voucher #1 in FY 2024-25)
REC-2425-0002  (Receipt voucher #2 in FY 2024-25)
SAL-2425-0003  (Sales voucher #3 in FY 2024-25)
```

---

## 🎯 GOLDEN RULES OF ACCOUNTING

### 1️⃣ PERSONAL ACCOUNTS
**Definition:** Accounts of persons, companies, banks, debtors, creditors

**Rules:**
- **Debit:** The Receiver
- **Credit:** The Giver

**Examples:**
```
Customer buys goods on credit:
Dr. Customer A/c (Receiver)
    Cr. Sales A/c

Payment to supplier:
Dr. Supplier A/c (Giver)
    Cr. Cash A/c
```

### 2️⃣ REAL ACCOUNTS
**Definition:** Assets - Cash, Bank, Furniture, Stock, Land, Building, Machinery

**Rules:**
- **Debit:** What comes in
- **Credit:** What goes out

**Examples:**
```
Purchase furniture for cash:
Dr. Furniture A/c (comes in)
    Cr. Cash A/c (goes out)

Sell old machinery:
Dr. Cash A/c (comes in)
    Cr. Machinery A/c (goes out)
```

### 3️⃣ NOMINAL ACCOUNTS
**Definition:** Expenses, Income, Losses, Gains

**Rules:**
- **Debit:** All Expenses and Losses
- **Credit:** All Incomes and Gains

**Examples:**
```
Pay rent:
Dr. Rent Expense A/c (expense)
    Cr. Cash A/c

Receive interest:
Dr. Cash A/c
    Cr. Interest Income A/c (income)
```

---

## 📊 CHART OF ACCOUNTS STRUCTURE

### 5-Digit Numbering System (GST/Ind AS Compliant)

**1XXXX - ASSETS**
```
10000 - Current Assets
  10001 - Cash
  10002 - Bank
  10200 - Accounts Receivable (Debtors)
  10300 - Inventory
  10400 - Prepaid Expenses
  10500 - GST Input CGST
  10501 - GST Input SGST
  10502 - GST Input IGST

11000 - Fixed Assets
  11001 - Land & Building
  11002 - Plant & Machinery
  11003 - Furniture & Fixtures
  11004 - Vehicles
  11005 - Computers
```

**2XXXX - LIABILITIES**
```
20000 - Current Liabilities
  20001 - Accounts Payable (Creditors)
  20002 - Short-term Loans

20200 - Tax Liabilities
  20201 - GST Output CGST
  20202 - GST Output SGST
  20203 - GST Output IGST
  20210 - TDS Payable
  20211 - TCS Payable
  20220 - Income Tax Payable

21000 - Long-term Liabilities
  21001 - Long-term Loans
```

**3XXXX - EQUITY**
```
30001 - Capital
30002 - Retained Earnings
30003 - Reserves
```

**4XXXX - INCOME/REVENUE**
```
40000 - Sales Revenue
  40001 - Domestic Sales
  40002 - Export Sales
  40003 - Service Income
40010 - Interest Income
40020 - Other Income
```

**5XXXX - EXPENSES**
```
50000 - Direct Expenses
  50001 - Cost of Goods Sold
  50002 - Purchases
  50003 - Freight Inward

51000 - Indirect Expenses
  51001 - Salaries
  51002 - Rent
  51003 - Electricity
  51004 - Telephone
  51010 - Depreciation
  51020 - Interest Expense

52000 - Tax Expenses
  52001 - Income Tax Expense
  52002 - GST Expense
```

---

## 📝 VOUCHER TYPES (Indian Accounting Practice)

### 1. PAYMENT VOUCHER (F5 in Tally)
**Purpose:** Record cash or bank payments

**Examples:**
- Paying suppliers
- Paying expenses (rent, salary, electricity)
- Paying creditors
- TDS payments

**Format:**
```
Voucher No: PAY-2425-0001
Date: 15-Dec-2024

Dr. Rent Expense A/c          ₹10,000
    Cr. Cash A/c                      ₹10,000

Narration: Rent paid for December 2024
```

### 2. RECEIPT VOUCHER (F6 in Tally)
**Purpose:** Record cash or bank receipts

**Examples:**
- Receiving from customers
- Receiving from debtors
- Interest received
- Other income received

**Format:**
```
Voucher No: REC-2425-0001
Date: 15-Dec-2024

Dr. Cash A/c                  ₹50,000
    Cr. Customer A/c                  ₹50,000

Narration: Payment received from ABC Ltd
```

### 3. JOURNAL VOUCHER (F7 in Tally)
**Purpose:** Non-cash adjustments

**Examples:**
- Depreciation
- Provisions
- Accruals
- Adjustments
- Corrections

**Format:**
```
Voucher No: JNL-2425-0001
Date: 31-Mar-2025

Dr. Depreciation Expense A/c  ₹25,000
    Cr. Accumulated Depreciation A/c  ₹25,000

Narration: Depreciation on machinery @ 10% p.a.
```

### 4. CONTRA VOUCHER (F4 in Tally)
**Purpose:** Cash-Bank transfers

**Examples:**
- Cash deposited to bank
- Cash withdrawn from bank

**Format:**
```
Voucher No: CON-2425-0001
Date: 15-Dec-2024

Dr. Bank A/c                  ₹1,00,000
    Cr. Cash A/c                      ₹1,00,000

Narration: Cash deposited to HDFC Bank
```

### 5. SALES VOUCHER (F8 in Tally)
**Purpose:** Record sales transactions

**Examples:**
- Cash sales
- Credit sales
- Sales with GST

**Format:**
```
Voucher No: SAL-2425-0001
Date: 15-Dec-2024
Invoice: INV-001

Dr. Customer A/c              ₹1,18,000
    Cr. Sales A/c                     ₹1,00,000
    Cr. GST Output CGST A/c           ₹9,000
    Cr. GST Output SGST A/c           ₹9,000

Narration: Goods sold to XYZ Ltd - Invoice INV-001
GST @ 18% (CGST 9% + SGST 9%)
```

### 6. PURCHASE VOUCHER (F9 in Tally)
**Purpose:** Record purchase transactions

**Examples:**
- Cash purchases
- Credit purchases
- Purchases with GST (ITC)

**Format:**
```
Voucher No: PUR-2425-0001
Date: 15-Dec-2024
Invoice: PINV-001

Dr. Purchases A/c             ₹1,00,000
Dr. GST Input CGST A/c        ₹9,000
Dr. GST Input SGST A/c        ₹9,000
    Cr. Supplier A/c                  ₹1,18,000

Narration: Goods purchased from ABC Traders - Invoice PINV-001
GST @ 18% (CGST 9% + SGST 9%) - ITC claimed
```

### 7. DEBIT NOTE (Ctrl+F9 in Tally)
**Purpose:** Purchase returns, price reduction

**Format:**
```
Voucher No: DBN-2425-0001
Date: 20-Dec-2024

Dr. Supplier A/c              ₹11,800
    Cr. Purchase Returns A/c          ₹10,000
    Cr. GST Input CGST A/c            ₹900
    Cr. GST Input SGST A/c            ₹900

Narration: Goods returned to ABC Traders - Debit Note DN-001
```

### 8. CREDIT NOTE (Ctrl+F8 in Tally)
**Purpose:** Sales returns, discounts

**Format:**
```
Voucher No: CRN-2425-0001
Date: 20-Dec-2024

Dr. Sales Returns A/c         ₹10,000
Dr. GST Output CGST A/c       ₹900
Dr. GST Output SGST A/c       ₹900
    Cr. Customer A/c                  ₹11,800

Narration: Goods returned by XYZ Ltd - Credit Note CN-001
```

---

## 💼 COMMON BUSINESS TRANSACTIONS

### 1. Cash Sale with GST
```javascript
JournalHelpers.recordCashSale({
  amount: 11800,
  customerName: 'Walk-in Customer',
  invoiceNumber: 'INV-001',
  gstRate: 18,
  date: '2024-12-15'
});

// Journal Entry Created:
// Dr. Cash A/c                 ₹11,800
//     Cr. Sales A/c                    ₹10,000
//     Cr. GST Output CGST A/c          ₹900
//     Cr. GST Output SGST A/c          ₹900
```

### 2. Credit Sale
```javascript
JournalHelpers.recordCreditSale({
  amount: 50000,
  customerName: 'ABC Ltd',
  invoiceNumber: 'INV-002',
  gstRate: 18,
  date: '2024-12-15'
});

// Journal Entry Created:
// Dr. ABC Ltd A/c              ₹59,000
//     Cr. Sales A/c                    ₹50,000
//     Cr. GST Output CGST A/c          ₹4,500
//     Cr. GST Output SGST A/c          ₹4,500
```

### 3. Cash Purchase with GST
```javascript
JournalHelpers.recordCashPurchase({
  amount: 23600,
  supplierName: 'XYZ Traders',
  invoiceNumber: 'PINV-001',
  gstRate: 18,
  date: '2024-12-15'
});

// Journal Entry Created:
// Dr. Purchases A/c            ₹20,000
// Dr. GST Input CGST A/c       ₹1,800
// Dr. GST Input SGST A/c       ₹1,800
//     Cr. Cash A/c                     ₹23,600
```

### 4. Expense Payment with TDS
```javascript
JournalHelpers.recordExpensePayment({
  amount: 10000,
  expenseType: 'Rent',
  description: 'Office rent for December 2024',
  paymentMode: 'BANK',
  tdsSection: { section: '194I', rate: 10 },
  date: '2024-12-15'
});

// Journal Entry Created:
// Dr. Rent Expense A/c         ₹10,000
//     Cr. Bank A/c                     ₹9,000
//     Cr. TDS Payable A/c              ₹1,000
// (TDS u/s 194I @ 10%)
```

### 5. Contra Entry (Cash to Bank)
```javascript
JournalHelpers.recordContraEntry({
  amount: 100000,
  fromAccount: 'CASH',
  toAccount: 'BANK',
  description: 'Cash deposited to HDFC Bank',
  date: '2024-12-15'
});

// Journal Entry Created:
// Dr. Bank A/c                 ₹1,00,000
//     Cr. Cash A/c                     ₹1,00,000
```

### 6. Depreciation Entry
```javascript
JournalHelpers.recordDepreciation({
  amount: 25000,
  assetName: 'Machinery',
  assetCode: '11002',
  rate: 10,
  method: 'SLM',
  date: '2025-03-31'
});

// Journal Entry Created:
// Dr. Depreciation Expense A/c ₹25,000
//     Cr. Accumulated Depreciation - Machinery A/c ₹25,000
```

---

## 🔒 AUDIT TRAIL COMPLIANCE

### Mandatory Requirements (MCA 2021)
1. ✅ **Sequential Voucher Numbering** - No gaps allowed
2. ✅ **Tamper-proof Records** - Cannot modify posted entries
3. ✅ **Edit Log** - Track all changes with user, timestamp
4. ✅ **Audit Trail Enabled** - Always on, cannot be disabled
5. ✅ **8-Year Retention** - All records preserved

### Audit Log Structure
```json
{
  "id": "1234567890",
  "action": "CREATE",
  "journalId": "JNL-2425-0001",
  "voucherNumber": "PAY-2425-0001",
  "timestamp": "2024-12-15T10:30:00Z",
  "user": "admin@company.com",
  "changes": "Journal entry created",
  "ipAddress": "192.168.1.100",
  "deviceInfo": "Mobile App v1.0"
}
```

---

## ✅ VALIDATION RULES

### Mandatory Checks
1. ✅ **Debit = Credit** (within ₹0.01 tolerance)
2. ✅ **Minimum 2 entries** (double-entry system)
3. ✅ **Positive amounts** (no negative values)
4. ✅ **Date within FY** (April 1 to March 31)
5. ✅ **Sequential voucher numbers** (no duplicates)
6. ✅ **Mandatory narration** (description required)
7. ✅ **Valid account codes** (from Chart of Accounts)

### Error Messages
```
❌ "Debits (₹10,000) must equal Credits (₹9,500)"
❌ "Minimum 2 entries required for double-entry system"
❌ "Amounts cannot be negative"
❌ "Date must be within financial year 2024-25"
❌ "Narration is mandatory"
```

---

## 📈 USAGE EXAMPLES

### Example 1: Complete Sales Transaction
```javascript
// Step 1: Record credit sale
const sale = await JournalHelpers.recordCreditSale({
  amount: 118000,
  customerName: 'ABC Pvt Ltd',
  invoiceNumber: 'INV-2425-001',
  gstRate: 18,
  date: '2024-12-15'
});

// Step 2: Later, receive payment
const receipt = await JournalHelpers.recordReceiptFromDebtor({
  amount: 118000,
  customerName: 'ABC Pvt Ltd',
  paymentMode: 'UPI',
  reference: 'UPI/123456789',
  date: '2024-12-20'
});
```

### Example 2: Complete Purchase Transaction
```javascript
// Step 1: Record credit purchase
const purchase = await JournalHelpers.recordCreditPurchase({
  amount: 59000,
  supplierName: 'XYZ Traders',
  invoiceNumber: 'PINV-2425-001',
  gstRate: 18,
  date: '2024-12-15'
});

// Step 2: Later, make payment
const payment = await JournalHelpers.recordPaymentToCreditor({
  amount: 59000,
  supplierName: 'XYZ Traders',
  paymentMode: 'NEFT',
  reference: 'NEFT/987654321',
  date: '2024-12-25'
});
```

---

## 🎓 BEST PRACTICES

### 1. Narration Writing
✅ **Good Narrations:**
- "Goods sold to ABC Ltd - Invoice INV-001"
- "Office rent paid for December 2024"
- "Cash deposited to HDFC Bank A/c 123456"
- "Depreciation on machinery @ 10% p.a. (SLM)"

❌ **Bad Narrations:**
- "Sale"
- "Payment"
- "Entry"
- "Adjustment"

### 2. Reference Documentation
Always include:
- Invoice numbers
- Receipt numbers
- Cheque numbers
- Bank transaction IDs
- Supporting document references

### 3. GST Compliance
- Always split CGST and SGST for intra-state
- Use IGST for inter-state transactions
- Claim ITC only on eligible purchases
- Maintain separate GST registers

### 4. TDS Compliance
- Deduct TDS as per applicable section
- Issue TDS certificates (Form 16A)
- File quarterly TDS returns
- Deposit TDS by due dates

---

## 📞 SUPPORT & REFERENCES

### Official Resources
- **Companies Act 2013:** https://www.mca.gov.in
- **GST Portal:** https://www.gst.gov.in
- **Income Tax:** https://www.incometax.gov.in
- **ICAI:** https://www.icai.org

### MindStack Support
- **Documentation:** `/docs`
- **Code:** `src/services/accounting/journalService.js`
- **Helpers:** `src/services/accounting/journalHelpers.js`

---

**Last Updated:** January 1, 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready  
**Compliance:** ✅ Fully Compliant with Indian Laws
