# Indian Accounting Rules & Regulations - MindStack Implementation Guide

## 📋 Table of Contents
1. [GST Compliance](#gst-compliance)
2. [TDS Provisions](#tds-provisions)
3. [Accounting Standards](#accounting-standards)
4. [Inventory Management](#inventory-management)
5. [Bank Reconciliation](#bank-reconciliation)
6. [POS System Compliance](#pos-system-compliance)

---

## 🏛️ GST COMPLIANCE

### GST Act Provisions (Updated 2025)

#### GST Rate Structure (Effective September 22, 2025)
India's GST regime simplified to primarily **two slabs: 5% and 18%**, with luxury goods at **40%**.

| GST Rate | Category | Examples |
|----------|----------|----------|
| **0% (Nil)** | Essential Items | Paneer, pizza bread, khakhra, chapati, erasers |
| **5%** | Basic Goods & Services | Chocolates, soaps, shampoo, biscuits, mineral water, tyres, footwear (>₹2500), drugs/medicines, beauty services |
| **18%** | Standard Rate | Default for most goods/services |
| **40%** | Luxury/Sin Goods | Tobacco, cigarettes, pan masala, aerated drinks, luxury vehicles (>1500cc/4000mm), yachts, casinos |

#### HSN/SAC Codes
- **HSN (Harmonized System of Nomenclature)**: For goods
- **SAC (Services Accounting Code)**: For services
- Mandatory for proper GST classification and rate application

### Input Tax Credit (ITC) Rules

**Key Requirements (2025 Updates):**
- Clear exceptions/illustrations for ITC claims
- Mandatory ISD (Input Service Distributor) registration from April 1, 2025
- No refund on pre-discharged tax/interest/penalty
- Renting premises for hotels clarified from April 1, 2025

**ITC Calculation Logic:**
```javascript
// Input Tax Credit Calculation
const calculateITC = (inputGST, outputGST) => {
  const itcClaim = Math.min(inputGST, outputGST);
  const gstPayable = outputGST - itcClaim;
  const itcCarryForward = inputGST - itcClaim;
  
  return {
    itcClaimed: itcClaim.toFixed(2),
    gstPayable: gstPayable.toFixed(2),
    itcCarryForward: itcCarryForward.toFixed(2)
  };
};
```

### GST Return Filing Requirements

#### GSTR-1 (Outward Supplies)
- **Frequency**: Monthly/Quarterly based on turnover
- **Content**: Details of all outward supplies
- **Deadline**: 11th of next month (monthly) / 13th of month after quarter (quarterly)

#### GSTR-3B (Summary Return)
- **Frequency**: Monthly for most businesses
- **Content**: Summary of outward supplies, ITC claimed, tax payment
- **Deadline**: 20th of next month

#### Implementation Code:
```javascript
// GSTR-1 Data Structure
const gstr1Data = {
  gstin: "27AABCU9603R1ZM",
  returnPeriod: "012025", // MMYYYY
  b2b: [], // B2B invoices
  b2cl: [], // B2C large invoices (>₹2.5 lakh)
  b2cs: [], // B2C small invoices
  cdnr: [], // Credit/Debit notes (registered)
  cdnur: [], // Credit/Debit notes (unregistered)
  exp: [], // Export invoices
  hsn: [] // HSN-wise summary
};

// GSTR-3B Data Structure
const gstr3bData = {
  gstin: "27AABCU9603R1ZM",
  returnPeriod: "012025",
  outwardSupplies: {
    taxable: 0,
    igst: 0,
    cgst: 0,
    sgst: 0,
    cess: 0
  },
  itcClaimed: {
    igst: 0,
    cgst: 0,
    sgst: 0,
    cess: 0
  },
  taxPayable: {
    igst: 0,
    cgst: 0,
    sgst: 0,
    cess: 0
  }
};
```

### Reverse Charge Mechanism (RCM)
Recipients (not suppliers) pay GST on specified supplies from unregistered persons.

```javascript
// RCM Calculation
const calculateRCM = (amount, gstRate, isRCMApplicable) => {
  if (!isRCMApplicable) return { rcmAmount: 0, totalPayable: amount };
  
  const rcmAmount = amount * (gstRate / 100);
  const totalPayable = amount + rcmAmount;
  
  return {
    baseAmount: amount.toFixed(2),
    rcmAmount: rcmAmount.toFixed(2),
    totalPayable: totalPayable.toFixed(2)
  };
};
```

### E-Way Bill Requirements
- **Mandatory for**: Inter-state/intra-state movement of goods >₹50,000
- **Validity**: 1 day per 200km
- **Generation**: Via GST portal

```javascript
// E-Way Bill Data Structure
const eWayBillData = {
  supplyType: "O", // O=Outward, I=Inward
  subSupplyType: "1", // 1=Supply, 2=Import, 3=Export, etc.
  docType: "INV", // INV, BIL, CHL, etc.
  docNo: "INV001",
  docDate: "31/12/2025",
  fromGstin: "27AABCU9603R1ZM",
  toGstin: "29AABCU9603R1ZM",
  fromPincode: "400001",
  toPincode: "560001",
  totalValue: 100000,
  cgstValue: 9000,
  sgstValue: 9000,
  igstValue: 0,
  cessValue: 0,
  transporterId: "",
  transporterDocNo: "",
  transMode: "1", // 1=Road, 2=Rail, 3=Air, 4=Ship
  vehicleNo: "MH01AB1234"
};
```

---

## 💰 TDS PROVISIONS (Income Tax Act, 1961)

### TDS Rates by Section

| Section | Payment Type | Rate (Resident) | Threshold |
|---------|-------------|-----------------|-----------|
| **194C** | Contractor/Sub-contractor | 1% (Individual/HUF), 2% (Others) | ₹30,000 (single), ₹1,00,000 (aggregate) |
| **194J** | Professional/Technical Fees | 2% or 10% | ₹30,000 |
| **194I** | Rent - Plant/Machinery | 2% | ₹2,40,000 |
| **194I** | Rent - Land/Building | 10% | ₹2,40,000 |
| **194H** | Commission/Brokerage | 5% | ₹15,000 |

### TDS Calculation Implementation

```javascript
// TDS Calculator
const calculateTDS = (amount, section, payeeType = 'individual') => {
  const tdsRates = {
    '194C': { individual: 1, others: 2, threshold: 30000, aggregateThreshold: 100000 },
    '194J': { rate: 10, threshold: 30000 },
    '194I_machinery': { rate: 2, threshold: 240000 },
    '194I_building': { rate: 10, threshold: 240000 },
    '194H': { rate: 5, threshold: 15000 }
  };
  
  const config = tdsRates[section];
  if (!config) return { error: 'Invalid section' };
  
  // Check threshold
  if (amount < config.threshold) {
    return {
      amount: amount.toFixed(2),
      tdsAmount: 0,
      netPayable: amount.toFixed(2),
      message: 'Below threshold, no TDS applicable'
    };
  }
  
  // Calculate TDS
  const rate = section === '194C' 
    ? (payeeType === 'individual' ? config.individual : config.others)
    : config.rate;
    
  const tdsAmount = amount * (rate / 100);
  const netPayable = amount - tdsAmount;
  
  return {
    grossAmount: amount.toFixed(2),
    tdsRate: rate + '%',
    tdsAmount: tdsAmount.toFixed(2),
    netPayable: netPayable.toFixed(2),
    section: section
  };
};

// Example Usage
console.log(calculateTDS(50000, '194C', 'individual'));
// Output: { grossAmount: '50000.00', tdsRate: '1%', tdsAmount: '500.00', netPayable: '49500.00', section: '194C' }
```

### TDS Return Filing (Quarterly)

| Quarter | Period | Due Date |
|---------|--------|----------|
| Q1 | April - June | 31st July |
| Q2 | July - September | 31st October |
| Q3 | October - December | 31st January |
| Q4 | January - March | 31st May |

**Forms:**
- **Form 24Q**: Salary TDS
- **Form 26Q**: Non-salary TDS (194C, 194J, 194I, 194H, etc.)
- **Form 27Q**: TDS on payments to non-residents
- **Form 27EQ**: TCS (Tax Collected at Source)

### Form 26AS Integration

```javascript
// Form 26AS Data Structure
const form26ASData = {
  pan: "AABCU9603R",
  financialYear: "2024-25",
  partA: { // TDS on salary
    deductorName: "",
    deductorTAN: "",
    totalAmountPaid: 0,
    totalTDSDeducted: 0,
    quarters: []
  },
  partB: { // TDS on other than salary
    deductions: []
  },
  partC: { // Tax paid (advance/self-assessment)
    payments: []
  },
  partD: { // Refunds
    refunds: []
  },
  partE: { // High-value transactions (SFT)
    transactions: []
  },
  partF: { // TDS on property (194-IA)
    propertyTransactions: []
  },
  partG: { // TDS defaults
    defaults: []
  }
};

// Verify TDS with 26AS
const verifyTDSWith26AS = (deductedTDS, form26ASData) => {
  const totalIn26AS = form26ASData.partB.deductions.reduce((sum, d) => sum + d.tdsAmount, 0);
  const difference = deductedTDS - totalIn26AS;
  
  return {
    deductedTDS: deductedTDS.toFixed(2),
    reflectedIn26AS: totalIn26AS.toFixed(2),
    difference: difference.toFixed(2),
    status: Math.abs(difference) < 1 ? 'Matched' : 'Mismatch'
  };
};
```

---

## 📊 ACCOUNTING STANDARDS

### Ind AS vs AS Standards

#### Applicability

**Ind AS (Indian Accounting Standards - IFRS Converged):**
- Listed companies
- Companies with net worth ≥ ₹500 crore (from April 2016)
- Unlisted companies with net worth ≥ ₹250 crore (from April 2017)
- NBFCs, banks, insurers (from April 2018/2019)

**AS (Old Indian GAAP):**
- Smaller entities not covered by Ind AS
- Emphasis on legal compliance

#### Key Differences

| Aspect | Ind AS | AS |
|--------|--------|-----|
| **Basis** | Principles-based (IFRS aligned) | Rules-based |
| **Revenue Recognition** | Ind AS 115 (5-step model) | AS 9 |
| **Leases** | Ind AS 116 (on balance sheet) | AS 19 (off balance sheet) |
| **Financial Instruments** | Ind AS 109 (fair value) | AS 13 (historical cost) |
| **Extraordinary Items** | Prohibited | Allowed |
| **Disclosures** | Extensive | Limited |

### Double Entry Bookkeeping

**Fundamental Equation:**
```
Assets = Liabilities + Equity
```

**Rules:**
- Every transaction affects at least two accounts
- Total debits must equal total credits
- Maintained as per ICAI guidelines and Companies Act 2013

```javascript
// Double Entry Transaction
const recordTransaction = (db, transaction) => {
  const { date, description, entries } = transaction;
  
  // Validate: Total debits = Total credits
  const totalDebits = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredits = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
  
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error('Transaction not balanced: Debits ≠ Credits');
  }
  
  // Insert into ledger
  const txnId = await db.executeSql(
    'INSERT INTO transactions (txn_date, description) VALUES (?, ?)',
    [date, description]
  );
  
  for (const entry of entries) {
    await db.executeSql(
      'INSERT INTO ledger (date, account_id, description, debit, credit) VALUES (?, ?, ?, ?, ?)',
      [date, entry.accountId, description, entry.debit || 0, entry.credit || 0]
    );
  }
  
  return txnId;
};

// Example: Purchase with GST
const purchaseTransaction = {
  date: '2025-12-31',
  description: 'Purchase of goods from ABC Ltd',
  entries: [
    { accountId: 101, debit: 10000, credit: 0 }, // Purchases A/c
    { accountId: 201, debit: 1800, credit: 0 },  // GST Input A/c (18%)
    { accountId: 301, debit: 0, credit: 11800 }  // Creditors A/c
  ]
};
```

### Chart of Accounts Structure

```javascript
// Standard Chart of Accounts (Companies Act Schedule III)
const chartOfAccounts = {
  assets: {
    current: {
      cash: { code: '1001', name: 'Cash in Hand' },
      bank: { code: '1002', name: 'Bank Accounts' },
      receivables: { code: '1003', name: 'Trade Receivables' },
      inventory: { code: '1004', name: 'Inventory' },
      gstInput: { code: '1005', name: 'GST Input Tax Credit' }
    },
    nonCurrent: {
      ppe: { code: '1101', name: 'Property, Plant & Equipment' },
      intangibles: { code: '1102', name: 'Intangible Assets' },
      investments: { code: '1103', name: 'Long-term Investments' }
    }
  },
  liabilities: {
    current: {
      payables: { code: '2001', name: 'Trade Payables' },
      gstOutput: { code: '2002', name: 'GST Output Tax Payable' },
      tdsPayable: { code: '2003', name: 'TDS Payable' },
      shortTermLoans: { code: '2004', name: 'Short-term Borrowings' }
    },
    nonCurrent: {
      longTermLoans: { code: '2101', name: 'Long-term Borrowings' },
      deferredTax: { code: '2102', name: 'Deferred Tax Liability' }
    }
  },
  equity: {
    shareCapital: { code: '3001', name: 'Share Capital' },
    reserves: { code: '3002', name: 'Reserves & Surplus' },
    retainedEarnings: { code: '3003', name: 'Retained Earnings' }
  },
  revenue: {
    sales: { code: '4001', name: 'Sales Revenue' },
    otherIncome: { code: '4002', name: 'Other Income' },
    interestIncome: { code: '4003', name: 'Interest Income' }
  },
  expenses: {
    cogs: { code: '5001', name: 'Cost of Goods Sold' },
    salaries: { code: '5002', name: 'Salaries & Wages' },
    rent: { code: '5003', name: 'Rent Expense' },
    utilities: { code: '5004', name: 'Utilities' },
    depreciation: { code: '5005', name: 'Depreciation' },
    interest: { code: '5006', name: 'Interest Expense' }
  }
};
```

### Financial Statements Format (Schedule III)

#### 1. Balance Sheet (Statement of Financial Position)

```javascript
// Balance Sheet Structure
const balanceSheet = {
  assetsSide: {
    nonCurrentAssets: {
      ppe: 0,
      intangibleAssets: 0,
      investments: 0,
      deferredTaxAssets: 0,
      otherNonCurrentAssets: 0
    },
    currentAssets: {
      inventories: 0,
      tradeReceivables: 0,
      cashAndCashEquivalents: 0,
      shortTermLoans: 0,
      otherCurrentAssets: 0
    },
    totalAssets: 0
  },
  equityAndLiabilitiesSide: {
    equity: {
      shareCapital: 0,
      reservesAndSurplus: 0,
      totalEquity: 0
    },
    nonCurrentLiabilities: {
      longTermBorrowings: 0,
      deferredTaxLiabilities: 0,
      otherNonCurrentLiabilities: 0
    },
    currentLiabilities: {
      shortTermBorrowings: 0,
      tradePayables: 0,
      otherCurrentLiabilities: 0,
      shortTermProvisions: 0
    },
    totalEquityAndLiabilities: 0
  }
};
```

#### 2. Profit & Loss Statement

```javascript
// P&L Statement Structure
const profitAndLoss = {
  revenue: {
    revenueFromOperations: 0,
    otherIncome: 0,
    totalRevenue: 0
  },
  expenses: {
    costOfMaterialsConsumed: 0,
    purchasesOfStockInTrade: 0,
    changesInInventories: 0,
    employeeBenefits: 0,
    financeCharges: 0,
    depreciation: 0,
    otherExpenses: 0,
    totalExpenses: 0
  },
  profitBeforeTax: 0,
  taxExpense: {
    currentTax: 0,
    deferredTax: 0,
    totalTax: 0
  },
  profitAfterTax: 0,
  earningsPerShare: 0
};
```

#### 3. Cash Flow Statement (Ind AS 7)

```javascript
// Cash Flow Statement
const cashFlowStatement = {
  operatingActivities: {
    profitBeforeTax: 0,
    adjustments: {
      depreciation: 0,
      interestExpense: 0,
      interestIncome: 0
    },
    workingCapitalChanges: {
      tradeReceivables: 0,
      inventories: 0,
      tradePayables: 0
    },
    cashGeneratedFromOperations: 0,
    taxesPaid: 0,
    netCashFromOperating: 0
  },
  investingActivities: {
    purchaseOfPPE: 0,
    saleOfInvestments: 0,
    interestReceived: 0,
    netCashFromInvesting: 0
  },
  financingActivities: {
    proceedsFromBorrowings: 0,
    repaymentOfBorrowings: 0,
    interestPaid: 0,
    dividendsPaid: 0,
    netCashFromFinancing: 0
  },
  netIncreaseInCash: 0,
  cashAtBeginning: 0,
  cashAtEnd: 0
};
```

---

## 📦 INVENTORY MANAGEMENT

### Valuation Methods (Ind AS 2)

**Permitted Methods in India:**
1. **FIFO (First-In, First-Out)** ✅
2. **Weighted Average Cost (WAC)** ✅
3. **LIFO (Last-In, First-Out)** ❌ PROHIBITED since 2016

### FIFO Implementation

```javascript
// FIFO Inventory Layers
const fifoInventory = {
  itemId: 'ITEM001',
  layers: [
    { date: '2025-01-01', qty: 100, unitCost: 50 },
    { date: '2025-02-01', qty: 150, unitCost: 55 },
    { date: '2025-03-01', qty: 200, unitCost: 52 }
  ]
};

// FIFO Cost Calculation
const calculateFIFOCost = (layers, qtyOut) => {
  let remaining = qtyOut;
  let totalCost = 0;
  const updatedLayers = [];
  
  for (const layer of layers) {
    if (remaining <= 0) {
      updatedLayers.push(layer);
      continue;
    }
    
    const qtyUsed = Math.min(layer.qty, remaining);
    totalCost += qtyUsed * layer.unitCost;
    remaining -= qtyUsed;
    
    if (layer.qty > qtyUsed) {
      updatedLayers.push({
        ...layer,
        qty: layer.qty - qtyUsed
      });
    }
  }
  
  return {
    cogs: totalCost.toFixed(2),
    avgCost: (totalCost / qtyOut).toFixed(2),
    remainingLayers: updatedLayers
  };
};

// Example
console.log(calculateFIFOCost(fifoInventory.layers, 180));
// Uses 100 @ ₹50 + 80 @ ₹55 = ₹9,400
```

### Weighted Average Cost (WAC) Implementation

```javascript
// WAC Calculation
const calculateWAC = (currentQty, currentAvgCost, newQty, newCost) => {
  const totalValue = (currentQty * currentAvgCost) + (newQty * newCost);
  const totalQty = currentQty + newQty;
  const newAvgCost = totalValue / totalQty;
  
  return {
    totalQty: totalQty,
    avgCost: newAvgCost.toFixed(2),
    totalValue: totalValue.toFixed(2)
  };
};

// Example: Current 100 units @ ₹50, Purchase 150 units @ ₹55
console.log(calculateWAC(100, 50, 150, 55));
// Output: { totalQty: 250, avgCost: '53.00', totalValue: '13250.00' }

// COGS Calculation with WAC
const calculateCOGS_WAC = (avgCost, qtySold) => {
  return {
    cogs: (avgCost * qtySold).toFixed(2),
    avgCost: avgCost.toFixed(2),
    qtySold: qtySold
  };
};
```

### Lower of Cost or Net Realizable Value (NRV)

```javascript
// NRV Calculation (Ind AS 2 requirement)
const calculateNRV = (estimatedSellingPrice, estimatedCostsToComplete, estimatedCostsToSell) => {
  return estimatedSellingPrice - estimatedCostsToComplete - estimatedCostsToSell;
};

// Inventory Valuation
const valuateInventory = (cost, nrv) => {
  const valuationAmount = Math.min(cost, nrv);
  const writeDown = cost - valuationAmount;
  
  return {
    cost: cost.toFixed(2),
    nrv: nrv.toFixed(2),
    valuationAmount: valuationAmount.toFixed(2),
    writeDown: writeDown > 0 ? writeDown.toFixed(2) : '0.00',
    method: cost <= nrv ? 'Cost' : 'NRV'
  };
};

// Example
const cost = 5000;
const nrv = calculateNRV(6000, 500, 300); // NRV = 5200
console.log(valuateInventory(cost, nrv));
// Output: { cost: '5000.00', nrv: '5200.00', valuationAmount: '5000.00', writeDown: '0.00', method: 'Cost' }
```

### Stock Register Maintenance

```sql
-- Inventory Movements Table
CREATE TABLE inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  movement_type TEXT NOT NULL, -- 'IN' or 'OUT'
  date DATE NOT NULL,
  qty INTEGER NOT NULL,
  unit_cost DECIMAL(15,2),
  reference_type TEXT, -- 'PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN'
  reference_no TEXT,
  balance_qty INTEGER,
  balance_value DECIMAL(15,2),
  FOREIGN KEY (item_id) REFERENCES inventory(id)
);

-- Stock Register Query
SELECT 
  im.date,
  im.reference_type,
  im.reference_no,
  CASE WHEN im.movement_type = 'IN' THEN im.qty ELSE 0 END as qty_in,
  CASE WHEN im.movement_type = 'OUT' THEN im.qty ELSE 0 END as qty_out,
  im.balance_qty,
  im.unit_cost,
  im.balance_value
FROM inventory_movements im
WHERE im.item_id = ?
ORDER BY im.date, im.id;
```

---

## 🏦 BANK RECONCILIATION

### Bank Reconciliation Process (Companies Act 2013, Section 128)

**Mandatory Requirements:**
- Periodic reconciliation (typically monthly)
- Proper documentation for audit trail
- Supports GST ITC claims and RBI compliance

### Reconciliation Steps

```javascript
// Bank Reconciliation Statement
const performBankReconciliation = (cashBook, bankStatement, previousBRS) => {
  // Step 1: Verify opening balances
  const cashBookOpening = previousBRS?.cashBookClosing || 0;
  const bankStatementOpening = previousBRS?.bankStatementClosing || 0;
  
  // Step 2: Match transactions
  const matchedTransactions = [];
  const unmatchedCashBook = [];
  const unmatchedBankStatement = [];
  
  // Simple matching logic (can be enhanced with fuzzy matching)
  cashBook.forEach(cbEntry => {
    const match = bankStatement.find(bsEntry => 
      Math.abs(cbEntry.amount - bsEntry.amount) < 0.01 &&
      Math.abs(new Date(cbEntry.date) - new Date(bsEntry.date)) <= 3 * 24 * 60 * 60 * 1000 // 3 days
    );
    
    if (match) {
      matchedTransactions.push({ cashBook: cbEntry, bankStatement: match });
    } else {
      unmatchedCashBook.push(cbEntry);
    }
  });
  
  bankStatement.forEach(bsEntry => {
    const alreadyMatched = matchedTransactions.some(m => m.bankStatement === bsEntry);
    if (!alreadyMatched) {
      unmatchedBankStatement.push(bsEntry);
    }
  });
  
  // Step 3: Identify discrepancies
  const outstandingCheques = unmatchedCashBook.filter(e => e.type === 'CHEQUE_ISSUED');
  const depositsInTransit = unmatchedCashBook.filter(e => e.type === 'DEPOSIT');
  const bankCharges = unmatchedBankStatement.filter(e => e.type === 'BANK_CHARGES');
  const directDebits = unmatchedBankStatement.filter(e => e.type === 'DIRECT_DEBIT');
  const interestCredits = unmatchedBankStatement.filter(e => e.type === 'INTEREST');
  
  // Step 4: Calculate adjusted balances
  const cashBookBalance = cashBook.reduce((sum, e) => sum + e.amount, cashBookOpening);
  const bankStatementBalance = bankStatement.reduce((sum, e) => sum + e.amount, bankStatementOpening);
  
  // Adjust bank balance to match cash book
  let adjustedBankBalance = bankStatementBalance;
  adjustedBankBalance += depositsInTransit.reduce((sum, e) => sum + e.amount, 0);
  adjustedBankBalance -= outstandingCheques.reduce((sum, e) => sum + Math.abs(e.amount), 0);
  
  // Adjust cash book balance
  let adjustedCashBookBalance = cashBookBalance;
  adjustedCashBookBalance -= bankCharges.reduce((sum, e) => sum + Math.abs(e.amount), 0);
  adjustedCashBookBalance -= directDebits.reduce((sum, e) => sum + Math.abs(e.amount), 0);
  adjustedCashBookBalance += interestCredits.reduce((sum, e) => sum + e.amount, 0);
  
  return {
    cashBookBalance: cashBookBalance.toFixed(2),
    bankStatementBalance: bankStatementBalance.toFixed(2),
    adjustedCashBookBalance: adjustedCashBookBalance.toFixed(2),
    adjustedBankBalance: adjustedBankBalance.toFixed(2),
    difference: (adjustedCashBookBalance - adjustedBankBalance).toFixed(2),
    reconciled: Math.abs(adjustedCashBookBalance - adjustedBankBalance) < 0.01,
    outstandingCheques: outstandingCheques,
    depositsInTransit: depositsInTransit,
    bankCharges: bankCharges,
    directDebits: directDebits,
    interestCredits: interestCredits,
    matchedCount: matchedTransactions.length,
    unmatchedCashBookCount: unmatchedCashBook.length,
    unmatchedBankStatementCount: unmatchedBankStatement.length
  };
};
```

### Automated Reconciliation with AI/OCR

```javascript
// Fuzzy Matching for Transaction Description
const calculateLevenshteinDistance = (str1, str2) => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Enhanced Matching with Fuzzy Logic
const fuzzyMatchTransactions = (cashBookEntry, bankStatementEntry, thresholds = {}) => {
  const {
    amountTolerance = 0.01, // 1%
    dateTolerance = 3, // days
    descriptionSimilarity = 0.7 // 70% similarity
  } = thresholds;
  
  // Amount matching
  const amountDiff = Math.abs(cashBookEntry.amount - bankStatementEntry.amount);
  const amountMatch = amountDiff / Math.abs(cashBookEntry.amount) <= amountTolerance;
  
  // Date matching
  const dateDiff = Math.abs(new Date(cashBookEntry.date) - new Date(bankStatementEntry.date));
  const dateMatch = dateDiff <= dateTolerance * 24 * 60 * 60 * 1000;
  
  // Description matching (Levenshtein distance)
  const desc1 = (cashBookEntry.description || '').toLowerCase();
  const desc2 = (bankStatementEntry.description || '').toLowerCase();
  const maxLen = Math.max(desc1.length, desc2.length);
  const distance = calculateLevenshteinDistance(desc1, desc2);
  const similarity = 1 - (distance / maxLen);
  const descriptionMatch = similarity >= descriptionSimilarity;
  
  return {
    isMatch: amountMatch && dateMatch && descriptionMatch,
    confidence: ((amountMatch ? 0.4 : 0) + (dateMatch ? 0.3 : 0) + (similarity * 0.3)).toFixed(2),
    details: {
      amountMatch,
      dateMatch,
      descriptionMatch,
      similarity: similarity.toFixed(2)
    }
  };
};
```

### Bank Reconciliation Statement Format

```javascript
// BRS Report Generation
const generateBRS = (reconciliationData, period) => {
  return {
    title: 'Bank Reconciliation Statement',
    period: period,
    date: new Date().toISOString().split('T')[0],
    
    section1: {
      title: 'Balance as per Cash Book',
      balance: reconciliationData.cashBookBalance,
      add: [
        { item: 'Cheques deposited but not credited', amount: reconciliationData.depositsInTransit.reduce((s, e) => s + e.amount, 0) },
        { item: 'Interest credited by bank', amount: reconciliationData.interestCredits.reduce((s, e) => s + e.amount, 0) }
      ],
      less: [
        { item: 'Cheques issued but not presented', amount: reconciliationData.outstandingCheques.reduce((s, e) => s + Math.abs(e.amount), 0) },
        { item: 'Bank charges', amount: reconciliationData.bankCharges.reduce((s, e) => s + Math.abs(e.amount), 0) },
        { item: 'Direct debits', amount: reconciliationData.directDebits.reduce((s, e) => s + Math.abs(e.amount), 0) }
      ],
      adjustedBalance: reconciliationData.adjustedCashBookBalance
    },
    
    section2: {
      title: 'Balance as per Bank Statement',
      balance: reconciliationData.bankStatementBalance,
      adjustedBalance: reconciliationData.adjustedBankBalance
    },
    
    reconciliation: {
      status: reconciliationData.reconciled ? 'RECONCILED' : 'NOT RECONCILED',
      difference: reconciliationData.difference
    }
  };
};
```

---

## 🖥️ POS SYSTEM COMPLIANCE

### GST-Compliant Invoice Requirements

#### Mandatory Fields on Tax Invoice

```javascript
// GST Invoice Structure
const gstInvoice = {
  // Header
  invoiceNo: "INV/2025/001",
  invoiceDate: "31/12/2025",
  invoiceType: "TAX_INVOICE", // or "BILL_OF_SUPPLY" for nil-rated/exempt
  
  // Supplier Details
  supplier: {
    gstin: "27AABCU9603R1ZM",
    legalName: "ABC Enterprises Pvt Ltd",
    tradeName: "ABC Store",
    address: "123, MG Road, Mumbai, Maharashtra - 400001",
    stateCode: "27", // Maharashtra
    phone: "+91-22-12345678",
    email: "billing@abcstore.com"
  },
  
  // Recipient Details
  recipient: {
    gstin: "29AABCU9603R1ZM", // Optional for B2C
    legalName: "XYZ Traders",
    address: "456, Brigade Road, Bangalore, Karnataka - 560001",
    stateCode: "29", // Karnataka
    phone: "+91-80-87654321"
  },
  
  // Place of Supply
  placeOfSupply: "29-Karnataka",
  
  // Line Items
  items: [
    {
      slNo: 1,
      description: "Product A",
      hsnCode: "8471", // HSN for goods
      sacCode: null, // SAC for services
      qty: 10,
      unit: "NOS",
      rate: 1000,
      taxableValue: 10000,
      gstRate: 18,
      cgst: 900, // For intra-state
      sgst: 900, // For intra-state
      igst: 0, // For inter-state
      cess: 0,
      totalAmount: 11800
    }
  ],
  
  // Totals
  totals: {
    totalTaxableValue: 10000,
    totalCGST: 900,
    totalSGST: 900,
    totalIGST: 0,
    totalCess: 0,
    roundOff: 0,
    totalInvoiceValue: 11800,
    amountInWords: "Rupees Eleven Thousand Eight Hundred Only"
  },
  
  // QR Code (Mandatory for B2B)
  qrCode: "data:image/png;base64,...", // Dynamic QR with invoice details
  
  // Bank Details
  bankDetails: {
    accountName: "ABC Enterprises Pvt Ltd",
    accountNo: "1234567890",
    ifscCode: "HDFC0001234",
    bankName: "HDFC Bank",
    branch: "MG Road, Mumbai"
  },
  
  // Terms & Conditions
  terms: [
    "Goods once sold will not be taken back",
    "Subject to Mumbai jurisdiction"
  ],
  
  // Signature
  authorizedSignatory: "For ABC Enterprises Pvt Ltd"
};
```

### GST Calculation Logic for POS

```javascript
// Determine GST Type (CGST+SGST or IGST)
const determineGSTType = (supplierStateCode, recipientStateCode) => {
  return supplierStateCode === recipientStateCode ? 'INTRA_STATE' : 'INTER_STATE';
};

// Calculate GST for Invoice Line Item
const calculateLineItemGST = (taxableValue, gstRate, gstType) => {
  const totalGST = taxableValue * (gstRate / 100);
  
  if (gstType === 'INTRA_STATE') {
    return {
      cgst: (totalGST / 2).toFixed(2),
      sgst: (totalGST / 2).toFixed(2),
      igst: 0,
      totalGST: totalGST.toFixed(2)
    };
  } else {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalGST.toFixed(2),
      totalGST: totalGST.toFixed(2)
    };
  }
};

// Complete Invoice Calculation
const calculateInvoice = (items, supplierState, recipientState) => {
  const gstType = determineGSTType(supplierState, recipientState);
  
  let totalTaxableValue = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  
  const processedItems = items.map(item => {
    const taxableValue = item.qty * item.rate;
    const gst = calculateLineItemGST(taxableValue, item.gstRate, gstType);
    const totalAmount = taxableValue + parseFloat(gst.totalGST);
    
    totalTaxableValue += taxableValue;
    totalCGST += parseFloat(gst.cgst);
    totalSGST += parseFloat(gst.sgst);
    totalIGST += parseFloat(gst.igst);
    
    return {
      ...item,
      taxableValue: taxableValue.toFixed(2),
      cgst: gst.cgst,
      sgst: gst.sgst,
      igst: gst.igst,
      totalAmount: totalAmount.toFixed(2)
    };
  });
  
  const totalInvoiceValue = totalTaxableValue + totalCGST + totalSGST + totalIGST;
  const roundOff = Math.round(totalInvoiceValue) - totalInvoiceValue;
  const finalAmount = Math.round(totalInvoiceValue);
  
  return {
    items: processedItems,
    gstType: gstType,
    totals: {
      totalTaxableValue: totalTaxableValue.toFixed(2),
      totalCGST: totalCGST.toFixed(2),
      totalSGST: totalSGST.toFixed(2),
      totalIGST: totalIGST.toFixed(2),
      roundOff: roundOff.toFixed(2),
      totalInvoiceValue: finalAmount.toFixed(2)
    }
  };
};
```

### Dynamic QR Code Generation

```javascript
// QR Code Data for GST Invoice (as per CBIC specification)
const generateInvoiceQRData = (invoice) => {
  const qrData = {
    SupplierGSTIN: invoice.supplier.gstin,
    InvoiceNo: invoice.invoiceNo,
    InvoiceDate: invoice.invoiceDate,
    InvoiceValue: invoice.totals.totalInvoiceValue,
    PlaceOfSupply: invoice.placeOfSupply,
    ReverseCharge: "N",
    InvoiceType: invoice.invoiceType,
    HSN: invoice.items.map(i => i.hsnCode).join(',')
  };
  
  // Format as per CBIC: Key1=Value1|Key2=Value2|...
  const qrString = Object.entries(qrData)
    .map(([key, value]) => `${key}=${value}`)
    .join('|');
  
  return qrString;
  // Use QR code library to generate image from this string
};
```

### E-Invoicing Integration

```javascript
// E-Invoice API Integration (for businesses above threshold)
const generateEInvoice = async (invoice) => {
  // Step 1: Prepare JSON payload as per e-invoice schema
  const eInvoicePayload = {
    Version: "1.1",
    TranDtls: {
      TaxSch: "GST",
      SupTyp: "B2B",
      RegRev: "N",
      IgstOnIntra: "N"
    },
    DocDtls: {
      Typ: "INV",
      No: invoice.invoiceNo,
      Dt: invoice.invoiceDate
    },
    SellerDtls: {
      Gstin: invoice.supplier.gstin,
      LglNm: invoice.supplier.legalName,
      Addr1: invoice.supplier.address,
      Loc: "Mumbai",
      Pin: 400001,
      Stcd: invoice.supplier.stateCode
    },
    BuyerDtls: {
      Gstin: invoice.recipient.gstin,
      LglNm: invoice.recipient.legalName,
      Pos: invoice.placeOfSupply.split('-')[0],
      Addr1: invoice.recipient.address,
      Loc: "Bangalore",
      Pin: 560001,
      Stcd: invoice.recipient.stateCode
    },
    ItemList: invoice.items.map((item, idx) => ({
      SlNo: (idx + 1).toString(),
      IsServc: "N",
      HsnCd: item.hsnCode,
      Qty: item.qty,
      Unit: item.unit,
      UnitPrice: item.rate,
      TotAmt: item.taxableValue,
      Discount: 0,
      AssAmt: item.taxableValue,
      GstRt: item.gstRate,
      IgstAmt: item.igst,
      CgstAmt: item.cgst,
      SgstAmt: item.sgst,
      TotItemVal: item.totalAmount
    })),
    ValDtls: {
      AssVal: invoice.totals.totalTaxableValue,
      CgstVal: invoice.totals.totalCGST,
      SgstVal: invoice.totals.totalSGST,
      IgstVal: invoice.totals.totalIGST,
      TotInvVal: invoice.totals.totalInvoiceValue
    }
  };
  
  // Step 2: Send to IRP (Invoice Registration Portal)
  // const response = await fetch('https://einvoice.nic.in/api/v1/generate', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': 'Bearer YOUR_AUTH_TOKEN'
  //   },
  //   body: JSON.stringify(eInvoicePayload)
  // });
  
  // Step 3: Receive IRN (Invoice Reference Number) and QR Code
  // const eInvoiceResponse = await response.json();
  
  return {
    irn: "IRN_GENERATED_BY_IRP",
    ackNo: "ACK_NUMBER",
    ackDate: new Date().toISOString(),
    signedInvoice: "DIGITALLY_SIGNED_INVOICE_JSON",
    signedQRCode: "QR_CODE_WITH_IRN"
  };
};
```

---

## 📝 IMPLEMENTATION CHECKLIST

### Database Setup
- [ ] Create SQLite database with proper schema
- [ ] Implement double-entry ledger tables
- [ ] Set up inventory layers for FIFO/WAC
- [ ] Create GST and TDS tracking tables
- [ ] Implement bank reconciliation tables

### GST Module
- [ ] GST rate calculator (5%, 18%, 40%)
- [ ] HSN/SAC code management
- [ ] ITC calculation and tracking
- [ ] GSTR-1 data preparation
- [ ] GSTR-3B data preparation
- [ ] E-way bill generation
- [ ] Reverse charge mechanism

### TDS Module
- [ ] TDS calculator for all sections (194C, 194J, 194I, 194H)
- [ ] Threshold checking
- [ ] Quarterly return preparation (26Q)
- [ ] Form 26AS integration
- [ ] TDS certificate generation (16A)

### Accounting Module
- [ ] Chart of accounts setup
- [ ] Double-entry transaction recording
- [ ] Trial balance generation
- [ ] Profit & Loss statement
- [ ] Balance sheet (Schedule III format)
- [ ] Cash flow statement

### Inventory Module
- [ ] FIFO implementation
- [ ] Weighted Average Cost implementation
- [ ] Lower of cost or NRV valuation
- [ ] Stock register maintenance
- [ ] Inventory movement tracking

### Bank Reconciliation
- [ ] Automated matching algorithm
- [ ] Fuzzy matching for descriptions
- [ ] Outstanding cheques tracking
- [ ] Bank charges adjustment
- [ ] BRS report generation

### POS System
- [ ] GST-compliant invoice generation
- [ ] Dynamic QR code on invoices
- [ ] E-invoicing integration
- [ ] HSN/SAC code lookup
- [ ] Real-time GST calculation
- [ ] Print/PDF invoice generation

### Reporting
- [ ] 50+ financial reports
- [ ] GST reports (GSTR-1, GSTR-3B)
- [ ] TDS reports (26Q, 27Q)
- [ ] Inventory reports
- [ ] Bank reconciliation reports
- [ ] Audit trail reports

---

## 🔗 Official Resources

### Government Portals
- **GST Portal**: https://www.gst.gov.in/
- **Income Tax Portal**: https://www.incometaxindia.gov.in/
- **TRACES (TDS)**: https://www.tdscpc.gov.in/
- **E-Invoice Portal**: https://einvoice.nic.in/
- **MCA Portal**: https://www.mca.gov.in/

### Regulatory Bodies
- **CBIC (Central Board of Indirect Taxes and Customs)**: https://www.cbic.gov.in/
- **ICAI (Institute of Chartered Accountants of India)**: https://www.icai.org/
- **RBI (Reserve Bank of India)**: https://www.rbi.org.in/

### Standards & Acts
- **Companies Act 2013**: Schedule III for financial statements
- **Income Tax Act 1961**: TDS provisions
- **CGST Act 2017**: GST regulations
- **Ind AS**: Indian Accounting Standards

---

## 📞 Support & Compliance

For implementation support or compliance queries:
- Consult with a Chartered Accountant
- Refer to official government notifications
- Use certified GST Suvidha Providers (GSPs)
- Implement regular audits and reviews

---

**Document Version**: 1.0  
**Last Updated**: December 31, 2025  
**Compliance Status**: Updated with 2025 GST reforms

---

*This document provides comprehensive guidelines for implementing Indian accounting rules and regulations in the MindStack application. Always verify with latest government notifications and consult professionals for specific compliance requirements.*
