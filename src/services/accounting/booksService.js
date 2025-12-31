/**
 * BOOKS SERVICE - ACCOUNTING BOOKS GENERATION
 * 
 * Generates all accounting books from journal entries:
 * - Journal Book
 * - Cash Book
 * - Bank Book
 * - Ledger
 * - Trial Balance
 * - Profit & Loss
 * - Balance Sheet
 */

import { getDatabase } from '../database/schema';

/**
 * JOURNAL BOOK
 * Complete chronological record of all transactions
 */
export const getJournalBook = async (startDate, endDate) => {
  const db = await getDatabase();
  
  const query = `
    SELECT 
      t.id,
      t.voucher_no,
      t.voucher_type,
      t.date,
      t.narration,
      l.account_name,
      l.debit,
      l.credit,
      l.ledger_folio
    FROM transactions t
    INNER JOIN ledger l ON t.id = l.transaction_id
    WHERE t.date BETWEEN ? AND ?
    AND t.status = 'POSTED'
    ORDER BY t.date ASC, t.voucher_no ASC, l.id ASC
  `;
  
  const result = await db.executeSql(query, [startDate, endDate]);
  const entries = [];
  
  for (let i = 0; i < result[0].rows.length; i++) {
    entries.push(result[0].rows.item(i));
  }
  
  // Group by transaction
  const grouped = {};
  entries.forEach(entry => {
    if (!grouped[entry.voucher_no]) {
      grouped[entry.voucher_no] = {
        voucherNo: entry.voucher_no,
        voucherType: entry.voucher_type,
        date: entry.date,
        narration: entry.narration,
        lines: []
      };
    }
    grouped[entry.voucher_no].lines.push({
      accountName: entry.account_name,
      debit: entry.debit,
      credit: entry.credit,
      lf: entry.ledger_folio
    });
  });
  
  return Object.values(grouped);
};

/**
 * CASH BOOK
 * All cash transactions with running balance
 */
export const getCashBook = async (startDate, endDate) => {
  const db = await getDatabase();
  
  // Get opening balance
  const openingQuery = `
    SELECT 
      COALESCE(SUM(debit - credit), 0) as opening_balance
    FROM ledger
    WHERE account_name = 'Cash'
    AND date < ?
  `;
  
  const openingResult = await db.executeSql(openingQuery, [startDate]);
  const openingBalance = openingResult[0].rows.item(0).opening_balance;
  
  // Get cash transactions
  const query = `
    SELECT 
      t.date,
      t.voucher_no,
      t.voucher_type,
      t.narration,
      l.debit as receipts,
      l.credit as payments
    FROM transactions t
    INNER JOIN ledger l ON t.id = l.transaction_id
    WHERE l.account_name = 'Cash'
    AND t.date BETWEEN ? AND ?
    AND t.status = 'POSTED'
    ORDER BY t.date ASC, t.voucher_no ASC
  `;
  
  const result = await db.executeSql(query, [startDate, endDate]);
  const transactions = [];
  let balance = openingBalance;
  
  for (let i = 0; i < result[0].rows.length; i++) {
    const row = result[0].rows.item(i);
    balance += row.receipts - row.payments;
    
    transactions.push({
      date: row.date,
      particulars: row.narration,
      voucherNo: row.voucher_no,
      voucherType: row.voucher_type,
      receipts: row.receipts,
      payments: row.payments,
      balance: balance
    });
  }
  
  return {
    openingBalance,
    transactions,
    closingBalance: balance
  };
};

/**
 * BANK BOOK
 * All bank transactions with running balance
 */
export const getBankBook = async (bankAccountId, startDate, endDate) => {
  const db = await getDatabase();
  
  // Get bank account name
  const bankQuery = `SELECT account_name FROM bank_accounts WHERE id = ?`;
  const bankResult = await db.executeSql(bankQuery, [bankAccountId]);
  const bankAccountName = bankResult[0].rows.item(0).account_name;
  
  // Get opening balance
  const openingQuery = `
    SELECT 
      COALESCE(SUM(debit - credit), 0) as opening_balance
    FROM ledger
    WHERE account_name = ?
    AND date < ?
  `;
  
  const openingResult = await db.executeSql(openingQuery, [bankAccountName, startDate]);
  const openingBalance = openingResult[0].rows.item(0).opening_balance;
  
  // Get bank transactions
  const query = `
    SELECT 
      t.date,
      t.voucher_no,
      t.voucher_type,
      t.narration,
      t.reference_no,
      l.debit as deposits,
      l.credit as withdrawals
    FROM transactions t
    INNER JOIN ledger l ON t.id = l.transaction_id
    WHERE l.account_name = ?
    AND t.date BETWEEN ? AND ?
    AND t.status = 'POSTED'
    ORDER BY t.date ASC, t.voucher_no ASC
  `;
  
  const result = await db.executeSql(query, [bankAccountName, startDate, endDate]);
  const transactions = [];
  let balance = openingBalance;
  
  for (let i = 0; i < result[0].rows.length; i++) {
    const row = result[0].rows.item(i);
    balance += row.deposits - row.withdrawals;
    
    transactions.push({
      date: row.date,
      particulars: row.narration,
      voucherNo: row.voucher_no,
      referenceNo: row.reference_no,
      deposits: row.deposits,
      withdrawals: row.withdrawals,
      balance: balance
    });
  }
  
  return {
    bankAccountName,
    openingBalance,
    transactions,
    closingBalance: balance
  };
};

/**
 * LEDGER
 * Account-wise transaction details
 */
export const getLedger = async (accountName, startDate, endDate) => {
  const db = await getDatabase();
  
  // Get opening balance
  const openingQuery = `
    SELECT 
      COALESCE(SUM(debit - credit), 0) as opening_balance
    FROM ledger
    WHERE account_name = ?
    AND date < ?
  `;
  
  const openingResult = await db.executeSql(openingQuery, [accountName, startDate]);
  const openingBalance = openingResult[0].rows.item(0).opening_balance;
  
  // Get transactions
  const query = `
    SELECT 
      t.date,
      t.voucher_no,
      t.voucher_type,
      t.narration,
      l.debit,
      l.credit,
      l.ledger_folio
    FROM transactions t
    INNER JOIN ledger l ON t.id = l.transaction_id
    WHERE l.account_name = ?
    AND t.date BETWEEN ? AND ?
    AND t.status = 'POSTED'
    ORDER BY t.date ASC, t.voucher_no ASC
  `;
  
  const result = await db.executeSql(query, [accountName, startDate, endDate]);
  const transactions = [];
  let balance = openingBalance;
  
  for (let i = 0; i < result[0].rows.length; i++) {
    const row = result[0].rows.item(i);
    balance += row.debit - row.credit;
    
    transactions.push({
      date: row.date,
      particulars: row.narration,
      voucherNo: row.voucher_no,
      voucherType: row.voucher_type,
      lf: row.ledger_folio,
      debit: row.debit,
      credit: row.credit,
      balance: balance
    });
  }
  
  return {
    accountName,
    openingBalance,
    transactions,
    closingBalance: balance
  };
};

/**
 * TRIAL BALANCE
 * Summary of all accounts with debit/credit totals
 */
export const getTrialBalance = async (asOnDate) => {
  const db = await getDatabase();
  
  const query = `
    SELECT 
      a.name as account_name,
      a.type as account_type,
      a.group_name,
      COALESCE(SUM(l.debit), 0) as total_debit,
      COALESCE(SUM(l.credit), 0) as total_credit
    FROM accounts a
    LEFT JOIN ledger l ON a.name = l.account_name AND l.date <= ?
    GROUP BY a.name, a.type, a.group_name
    HAVING total_debit > 0 OR total_credit > 0
    ORDER BY a.group_name, a.name
  `;
  
  const result = await db.executeSql(query, [asOnDate]);
  const accounts = [];
  let totalDebit = 0;
  let totalCredit = 0;
  
  for (let i = 0; i < result[0].rows.length; i++) {
    const row = result[0].rows.item(i);
    const debit = row.total_debit;
    const credit = row.total_credit;
    const balance = debit - credit;
    
    accounts.push({
      accountName: row.account_name,
      accountType: row.account_type,
      groupName: row.group_name,
      debit: balance > 0 ? balance : 0,
      credit: balance < 0 ? Math.abs(balance) : 0
    });
    
    totalDebit += balance > 0 ? balance : 0;
    totalCredit += balance < 0 ? Math.abs(balance) : 0;
  }
  
  return {
    asOnDate,
    accounts,
    totalDebit,
    totalCredit,
    difference: Math.abs(totalDebit - totalCredit),
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
  };
};

/**
 * PROFIT & LOSS STATEMENT
 * Income statement for a period
 */
export const getProfitAndLoss = async (startDate, endDate) => {
  const db = await getDatabase();
  
  // Get revenue accounts
  const revenueQuery = `
    SELECT 
      a.name as account_name,
      COALESCE(SUM(l.credit - l.debit), 0) as amount
    FROM accounts a
    LEFT JOIN ledger l ON a.name = l.account_name 
      AND l.date BETWEEN ? AND ?
    WHERE a.group_name IN ('Sales', 'Other Income', 'Revenue')
    GROUP BY a.name
    HAVING amount > 0
    ORDER BY amount DESC
  `;
  
  const revenueResult = await db.executeSql(revenueQuery, [startDate, endDate]);
  const revenue = [];
  let totalRevenue = 0;
  
  for (let i = 0; i < revenueResult[0].rows.length; i++) {
    const row = revenueResult[0].rows.item(i);
    revenue.push({
      accountName: row.account_name,
      amount: row.amount
    });
    totalRevenue += row.amount;
  }
  
  // Get expense accounts
  const expenseQuery = `
    SELECT 
      a.name as account_name,
      COALESCE(SUM(l.debit - l.credit), 0) as amount
    FROM accounts a
    LEFT JOIN ledger l ON a.name = l.account_name 
      AND l.date BETWEEN ? AND ?
    WHERE a.group_name IN ('Cost of Goods Sold', 'Operating Expenses', 'Depreciation', 'Interest', 'Other Expenses')
    GROUP BY a.name
    HAVING amount > 0
    ORDER BY amount DESC
  `;
  
  const expenseResult = await db.executeSql(expenseQuery, [startDate, endDate]);
  const expenses = [];
  let totalExpenses = 0;
  
  for (let i = 0; i < expenseResult[0].rows.length; i++) {
    const row = expenseResult[0].rows.item(i);
    expenses.push({
      accountName: row.account_name,
      amount: row.amount
    });
    totalExpenses += row.amount;
  }
  
  const netProfit = totalRevenue - totalExpenses;
  
  return {
    period: { startDate, endDate },
    revenue,
    totalRevenue,
    expenses,
    totalExpenses,
    netProfit,
    netProfitPercentage: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  };
};

/**
 * BALANCE SHEET
 * Financial position as on a date
 */
export const getBalanceSheet = async (asOnDate) => {
  const db = await getDatabase();
  
  // Get assets
  const assetsQuery = `
    SELECT 
      a.name as account_name,
      a.group_name,
      COALESCE(SUM(l.debit - l.credit), 0) as amount
    FROM accounts a
    LEFT JOIN ledger l ON a.name = l.account_name AND l.date <= ?
    WHERE a.type = 'REAL' AND a.group_name IN ('Current Assets', 'Fixed Assets', 'Investments')
    GROUP BY a.name, a.group_name
    HAVING amount > 0
    ORDER BY a.group_name, amount DESC
  `;
  
  const assetsResult = await db.executeSql(assetsQuery, [asOnDate]);
  const assets = { currentAssets: [], fixedAssets: [], investments: [] };
  let totalAssets = 0;
  
  for (let i = 0; i < assetsResult[0].rows.length; i++) {
    const row = assetsResult[0].rows.item(i);
    const asset = {
      accountName: row.account_name,
      amount: row.amount
    };
    
    if (row.group_name === 'Current Assets') assets.currentAssets.push(asset);
    else if (row.group_name === 'Fixed Assets') assets.fixedAssets.push(asset);
    else if (row.group_name === 'Investments') assets.investments.push(asset);
    
    totalAssets += row.amount;
  }
  
  // Get liabilities
  const liabilitiesQuery = `
    SELECT 
      a.name as account_name,
      a.group_name,
      COALESCE(SUM(l.credit - l.debit), 0) as amount
    FROM accounts a
    LEFT JOIN ledger l ON a.name = l.account_name AND l.date <= ?
    WHERE a.type = 'PERSONAL' AND a.group_name IN ('Current Liabilities', 'Long-term Liabilities', 'Capital')
    GROUP BY a.name, a.group_name
    HAVING amount > 0
    ORDER BY a.group_name, amount DESC
  `;
  
  const liabilitiesResult = await db.executeSql(liabilitiesQuery, [asOnDate]);
  const liabilities = { currentLiabilities: [], longTermLiabilities: [], capital: [] };
  let totalLiabilities = 0;
  
  for (let i = 0; i < liabilitiesResult[0].rows.length; i++) {
    const row = liabilitiesResult[0].rows.item(i);
    const liability = {
      accountName: row.account_name,
      amount: row.amount
    };
    
    if (row.group_name === 'Current Liabilities') liabilities.currentLiabilities.push(liability);
    else if (row.group_name === 'Long-term Liabilities') liabilities.longTermLiabilities.push(liability);
    else if (row.group_name === 'Capital') liabilities.capital.push(liability);
    
    totalLiabilities += row.amount;
  }
  
  return {
    asOnDate,
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    difference: Math.abs(totalAssets - totalLiabilities),
    isBalanced: Math.abs(totalAssets - totalLiabilities) < 0.01
  };
};

/**
 * GET ALL ACCOUNTS LIST
 * For ledger selection
 */
export const getAllAccounts = async () => {
  const db = await getDatabase();
  
  const query = `
    SELECT 
      name,
      type,
      group_name,
      parent_account
    FROM accounts
    ORDER BY group_name, name
  `;
  
  const result = await db.executeSql(query);
  const accounts = [];
  
  for (let i = 0; i < result[0].rows.length; i++) {
    accounts.push(result[0].rows.item(i));
  }
  
  return accounts;
};

/**
 * GET ALL BANK ACCOUNTS
 * For bank book selection
 */
export const getAllBankAccounts = async () => {
  const db = await getDatabase();
  
  const query = `
    SELECT 
      id,
      account_name,
      bank_name,
      account_number,
      ifsc_code
    FROM bank_accounts
    WHERE is_active = 1
    ORDER BY bank_name, account_name
  `;
  
  const result = await db.executeSql(query);
  const bankAccounts = [];
  
  for (let i = 0; i < result[0].rows.length; i++) {
    bankAccounts.push(result[0].rows.item(i));
  }
  
  return bankAccounts;
};

export default {
  getJournalBook,
  getCashBook,
  getBankBook,
  getLedger,
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet,
  getAllAccounts,
  getAllBankAccounts
};
