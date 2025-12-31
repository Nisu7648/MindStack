# JOURNAL SYSTEM - COMPLETE GUIDE

## 🎯 Philosophy

**Journal = Atomic Truth of Business Activity**

Everything else (ledger, GST, P&L, balance sheet) is **DERIVED**, never entered manually.

### Core Rules
- ❗ No ledger without journal
- ❗ No GST without journal  
- ❗ No report without journal

---

## 📚 Golden Rules of Accounting

### 1. PERSONAL ACCOUNTS (People, Companies, Banks)
- **Debit the Receiver**
- **Credit the Giver**

**Example:** Paid ₹5,000 to supplier Ram
- Debit: Ram (Receiver)
- Credit: Cash (Giver)

### 2. REAL ACCOUNTS (Assets - Cash, Furniture, Stock)
- **Debit what comes in**
- **Credit what goes out**

**Example:** Bought furniture ₹50,000 for cash
- Debit: Furniture (Comes in)
- Credit: Cash (Goes out)

### 3. NOMINAL ACCOUNTS (Expenses, Income, Losses, Gains)
- **Debit all Expenses and Losses**
- **Credit all Incomes and Gains**

**Example:** Paid rent ₹10,000
- Debit: Rent Expense (Expense)
- Credit: Cash (Goes out)

---

## 🎤 Natural Language Input Examples

### English
```
"Paid rent 10,000 cash"
"Sold goods 50,000 to Raj with GST"
"Bought stock from wholesaler bank payment"
"Received 25,000 from customer"
"Salary paid 30,000 by bank"
```

### Gujarati (ગુજરાતી)
```
"ભાડું ૧૦ હજાર કેશ આપ્યું"
"રાજને ૫૦ હજારનો માલ વેચ્યો"
"બેંકમાંથી સ્ટોક ખરીદ્યો"
```

### Hindi (हिंदी)
```
"किराया 10 हजार नकद दिया"
"राज को 50 हजार का माल बेचा"
"बैंक से स्टॉक खरीदा"
```

### Marathi (मराठी)
```
"भाडे १० हजार रोख दिले"
"राजला ५० हजाराचा माल विकला"
"बँकेतून स्टॉक खरेदी केला"
```

---

## 💻 Usage Examples

### 1. Basic Payment Entry

```javascript
import JournalService from './services/accounting/journalService';

const journalService = new JournalService();

// User input
const input = "Paid rent 10,000 cash";

// Create journal
const result = await journalService.createFromNaturalLanguage(input, 'EN', 'TYPED');

if (result.success) {
  console.log('Journal created:', result.journal);
  
  // Check if clarification needed
  if (result.needsClarification) {
    console.log('Question:', result.question);
    // Show question to user
  } else {
    // Save journal
    const saveResult = await journalService.saveJournal(result.journal);
    console.log('Saved:', saveResult);
  }
}
```

**Output:**
```
Journal Entry:
Voucher Type: PAYMENT
Date: 2025-12-31
Narration: Rent Expense paid in cash

Lines:
  Rent Expense    Dr.  ₹10,000.00
  Cash            Cr.              ₹10,000.00
                      ₹10,000.00   ₹10,000.00

Status: PENDING (Awaiting confirmation)
```

### 2. Sales Entry with GST

```javascript
const input = "Sold goods 50,000 to Raj";

const result = await journalService.createFromNaturalLanguage(input);

// System asks: "Was this a cash sale or credit sale?"
// User responds: "Credit"

// System asks: "Is GST applicable on this sale?"
// User responds: "Yes, 18%"

// Final journal with GST:
// Raj (Debtor)         Dr.  ₹59,000.00
//   Sales              Cr.              ₹50,000.00
//   CGST Output        Cr.              ₹4,500.00
//   SGST Output        Cr.              ₹4,500.00
```

### 3. Purchase Entry

```javascript
const input = "Bought stock from wholesaler bank payment 25000";

const result = await journalService.createFromNaturalLanguage(input);

// Journal:
// Purchase             Dr.  ₹25,000.00
//   Bank               Cr.              ₹25,000.00
```

### 4. Multi-language Input

```javascript
// Gujarati input
const input = "ભાડું ૧૦ હજાર કેશ આપ્યું";

const result = await journalService.createFromNaturalLanguage(input, 'GU', 'VOICE');

// System internally converts to:
// "Paid rent 10,000 cash"
// And creates same journal as English input
```

---

## 🔄 Complete Transaction Flow

### Step 1: User Input
```
User says: "Paid electricity bill 5000 cash"
```

### Step 2: System Parsing
```javascript
{
  action: 'PAID',
  account: 'Electricity Expense',
  amount: 5000,
  paymentMode: 'CASH',
  confidence: 0.95
}
```

### Step 3: Journal Creation
```
Electricity Expense  Dr.  ₹5,000.00
Cash                 Cr.              ₹5,000.00
```

### Step 4: User Confirmation
```
Show to user:
"Electricity bill of ₹5,000 paid in cash on 31 Dec 2025"

Buttons:
✔ Confirm
✏ Edit
```

### Step 5: Posting
```javascript
// After confirmation
await journalService.saveJournal(journal);

// System automatically:
// 1. Generates voucher number: PAY/000001
// 2. Posts to ledger
// 3. Updates account balances
// 4. Creates audit trail
```

---

## 📊 Voucher Types

### 1. Payment Voucher (F5)
**Purpose:** Record cash/bank payments

**Examples:**
- Rent payment
- Salary payment
- Supplier payment
- Expense payment

**Format:**
```
Expense/Creditor     Dr.  ₹X
  Cash/Bank          Cr.      ₹X
```

### 2. Receipt Voucher (F6)
**Purpose:** Record cash/bank receipts

**Examples:**
- Customer payment
- Income received
- Debtor collection

**Format:**
```
Cash/Bank            Dr.  ₹X
  Income/Debtor      Cr.      ₹X
```

### 3. Journal Voucher (F7)
**Purpose:** Non-cash adjustments

**Examples:**
- Depreciation
- Bad debts
- Provisions
- Corrections

**Format:**
```
Expense              Dr.  ₹X
  Provision          Cr.      ₹X
```

### 4. Contra Voucher (F4)
**Purpose:** Cash-Bank transfers

**Example:**
```
Bank                 Dr.  ₹X
  Cash               Cr.      ₹X
```

### 5. Sales Voucher (F8)
**Purpose:** Record sales

**Format:**
```
Cash/Debtor          Dr.  ₹X
  Sales              Cr.      ₹X
```

### 6. Purchase Voucher (F9)
**Purpose:** Record purchases

**Format:**
```
Purchase             Dr.  ₹X
  Cash/Creditor      Cr.      ₹X
```

### 7. Debit Note (Ctrl+F9)
**Purpose:** Purchase returns

**Format:**
```
Creditor             Dr.  ₹X
  Purchase Returns   Cr.      ₹X
```

### 8. Credit Note (Ctrl+F8)
**Purpose:** Sales returns

**Format:**
```
Sales Returns        Dr.  ₹X
  Debtor             Cr.      ₹X
```

---

## 🎯 Smart Question System

### When System Asks Questions

**Rule:** Ask only ONE question at a time

#### 1. Payment Mode Missing
```
Input: "Paid rent 10,000"
Question: "Was this paid in cash or bank?"
Options: [Cash] [Bank] [UPI] [Card]
```

#### 2. Party Missing (Credit Sale)
```
Input: "Sold goods 50,000 on credit"
Question: "Who is the customer?"
Input field: [Customer name]
```

#### 3. GST Unclear
```
Input: "Sold goods 50,000"
Question: "Is GST applicable on this sale?"
Options: [Yes] [No]

If Yes:
"What is the GST rate?"
Options: [5%] [18%] [40%]
```

---

## 📱 UX Flow

### Confirmation Screen

```
┌─────────────────────────────────────┐
│  Journal Entry                      │
├─────────────────────────────────────┤
│                                     │
│  Rent of ₹10,000 paid in cash      │
│  on 31 Dec 2025                     │
│                                     │
│  Rent Expense    Dr.  ₹10,000.00   │
│  Cash            Cr.  ₹10,000.00   │
│                                     │
│  Voucher: PAY/000123                │
│  Confidence: 95%                    │
│                                     │
├─────────────────────────────────────┤
│  [✔ Confirm]        [✏ Edit]       │
└─────────────────────────────────────┘
```

---

## 🔍 Advanced Features

### 1. Compound Entries

```javascript
// Multiple accounts in one entry
const input = "Paid salary 30,000 and rent 10,000 by bank";

// Journal:
// Salary Expense       Dr.  ₹30,000.00
// Rent Expense         Dr.  ₹10,000.00
//   Bank               Cr.              ₹40,000.00
```

### 2. Date Handling

```javascript
// Relative dates
"Paid rent 10,000 yesterday"
"Received payment last Monday"
"Salary paid on 25th"

// System maps to actual dates
```

### 3. Amount Formats

```javascript
// All these work:
"10000"
"10,000"
"10k"
"10 thousand"
"1 lakh"
"₹10000"
```

### 4. Voice Input

```javascript
const result = await journalService.createFromNaturalLanguage(
  voiceTranscript,
  detectedLanguage,
  'VOICE'
);

// System handles:
// - Speech recognition errors
// - Multiple languages
// - Accents and dialects
```

---

## 📈 Reports Generated from Journal

### 1. Ledger
```sql
SELECT 
  a.name,
  l.date,
  l.description,
  l.debit,
  l.credit,
  l.balance
FROM ledger l
JOIN accounts a ON l.account_id = a.id
WHERE a.name = 'Cash'
ORDER BY l.date;
```

### 2. Trial Balance
```sql
SELECT 
  a.name,
  SUM(l.debit) as total_debit,
  SUM(l.credit) as total_credit,
  SUM(l.debit - l.credit) as balance
FROM ledger l
JOIN accounts a ON l.account_id = a.id
GROUP BY a.id;
```

### 3. Profit & Loss
```sql
SELECT 
  SUM(CASE WHEN a.type = 'revenue' THEN l.credit - l.debit END) as income,
  SUM(CASE WHEN a.type = 'expense' THEN l.debit - l.credit END) as expenses
FROM ledger l
JOIN accounts a ON l.account_id = a.id;
```

---

## 🛡️ Validation Rules

### 1. Balance Check
```javascript
// Total Debit MUST equal Total Credit
if (totalDebit !== totalCredit) {
  throw new Error('Journal not balanced');
}
```

### 2. Minimum Lines
```javascript
// At least 2 lines required
if (lines.length < 2) {
  throw new Error('Minimum 2 accounts required');
}
```

### 3. Amount Validation
```javascript
// Each line must have either debit or credit (not both)
if (line.debit > 0 && line.credit > 0) {
  throw new Error('Cannot have both debit and credit');
}
```

### 4. Date Validation
```javascript
// Cannot post to closed financial year
if (journal.date < financialYearStart) {
  throw new Error('Financial year is closed');
}
```

---

## 🔐 Audit Trail

Every journal entry stores:
- Original text (user input)
- Language detected
- Confidence score
- Entry source (typed/voice)
- Timestamp
- User ID
- IP address
- Device info

**Example:**
```json
{
  "journalId": 123,
  "voucherNo": "PAY/000123",
  "originalText": "Paid rent 10,000 cash",
  "language": "EN",
  "confidence": 0.95,
  "entrySource": "TYPED",
  "createdBy": "user@example.com",
  "createdAt": "2025-12-31T10:30:00Z",
  "ipAddress": "192.168.1.1",
  "device": "iPhone 15"
}
```

---

## 🚀 Performance Optimization

### 1. Batch Processing
```javascript
// Process multiple entries at once
const entries = [
  "Paid rent 10,000 cash",
  "Received 25,000 from customer",
  "Bought stock 15,000 bank"
];

const results = await Promise.all(
  entries.map(e => journalService.createFromNaturalLanguage(e))
);
```

### 2. Caching
```javascript
// Cache frequently used accounts
const accountCache = new Map();

async function getAccount(name) {
  if (accountCache.has(name)) {
    return accountCache.get(name);
  }
  const account = await db.getAccount(name);
  accountCache.set(name, account);
  return account;
}
```

---

## 📚 API Reference

### Create Journal
```javascript
journalService.createFromNaturalLanguage(input, language, source)
```

**Parameters:**
- `input` (string): Natural language input
- `language` (string): Language code (EN, HI, GU, etc.)
- `source` (string): TYPED, VOICE, IMPORT

**Returns:**
```javascript
{
  success: true,
  journal: JournalEntry,
  needsClarification: false,
  question: null
}
```

### Save Journal
```javascript
journalService.saveJournal(journal)
```

**Returns:**
```javascript
{
  success: true,
  journalId: 123,
  voucherNo: "PAY/000123",
  message: "Journal entry saved successfully"
}
```

### Get Journal
```javascript
journalService.getJournal(journalId)
```

### List Journals
```javascript
journalService.listJournals({
  voucherType: 'PAYMENT',
  fromDate: '2025-01-01',
  toDate: '2025-12-31',
  status: 'POSTED',
  limit: 50,
  offset: 0
})
```

### Void Journal
```javascript
journalService.voidJournal(journalId, reason)
```

---

## 🎓 Best Practices

### 1. Always Validate
```javascript
const validation = journal.validate();
if (!validation.valid) {
  console.error(validation.error);
  return;
}
```

### 2. Use Transactions
```javascript
await db.transaction(async (tx) => {
  // All operations here are atomic
  await saveJournal(tx, journal);
  await updateBalances(tx, journal);
});
```

### 3. Preserve Original Input
```javascript
// Always store original text for audit
journal.originalText = userInput;
journal.language = detectedLanguage;
```

### 4. Handle Errors Gracefully
```javascript
try {
  const result = await journalService.createFromNaturalLanguage(input);
  if (result.needsClarification) {
    // Ask user for clarification
    showQuestion(result.question);
  }
} catch (error) {
  // Show user-friendly error
  showError("Could not understand the entry. Please try again.");
}
```

---

## 🌟 Why This Design Works

1. **User-Friendly:** No accounting knowledge required
2. **Accurate:** CA-level accuracy with golden rules
3. **Auditable:** Complete trail of every entry
4. **Multi-lingual:** Works in 10+ Indian languages
5. **Voice-Ready:** Optimized for voice input
6. **Scalable:** Handles millions of entries
7. **Compliant:** Follows Indian accounting standards

---

**Document Version:** 1.0  
**Last Updated:** December 31, 2025  
**Status:** Production Ready
