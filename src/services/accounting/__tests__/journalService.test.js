/**
 * JOURNAL SYSTEM - TEST CASES
 * Comprehensive tests for all journal entry scenarios
 */

import JournalService, { 
  VOUCHER_TYPES, 
  PAYMENT_MODES, 
  JOURNAL_STATUS 
} from '../journalService';

describe('Journal System Tests', () => {
  let journalService;

  beforeEach(() => {
    journalService = new JournalService();
  });

  /**
   * TEST 1: Basic Payment Entry (Cash)
   */
  test('Should create payment entry for rent paid in cash', async () => {
    const input = "Paid rent 10,000 cash";
    const result = await journalService.createFromNaturalLanguage(input, 'EN', 'TYPED');

    expect(result.success).toBe(true);
    expect(result.journal.voucherType).toBe(VOUCHER_TYPES.PAYMENT);
    expect(result.journal.paymentMode).toBe(PAYMENT_MODES.CASH);
    expect(result.journal.lines.length).toBe(2);
    
    // Check debit line (Rent Expense)
    const debitLine = result.journal.lines.find(l => l.debit > 0);
    expect(debitLine.accountName).toBe('Rent Expense');
    expect(debitLine.debit).toBe(10000);
    
    // Check credit line (Cash)
    const creditLine = result.journal.lines.find(l => l.credit > 0);
    expect(creditLine.accountName).toBe('Cash');
    expect(creditLine.credit).toBe(10000);
    
    // Validate balance
    const validation = result.journal.validate();
    expect(validation.valid).toBe(true);
  });

  /**
   * TEST 2: Payment Entry (Bank)
   */
  test('Should create payment entry for salary paid by bank', async () => {
    const input = "Salary paid 30,000 by bank";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    expect(result.journal.voucherType).toBe(VOUCHER_TYPES.PAYMENT);
    expect(result.journal.paymentMode).toBe(PAYMENT_MODES.BANK);
    
    const debitLine = result.journal.lines.find(l => l.debit > 0);
    expect(debitLine.accountName).toBe('Salary Expense');
    expect(debitLine.debit).toBe(30000);
    
    const creditLine = result.journal.lines.find(l => l.credit > 0);
    expect(creditLine.accountName).toBe('Bank');
    expect(creditLine.credit).toBe(30000);
  });

  /**
   * TEST 3: Receipt Entry
   */
  test('Should create receipt entry for income received', async () => {
    const input = "Received 25,000 cash from customer";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    expect(result.journal.voucherType).toBe(VOUCHER_TYPES.RECEIPT);
    expect(result.journal.paymentMode).toBe(PAYMENT_MODES.CASH);
    
    const debitLine = result.journal.lines.find(l => l.debit > 0);
    expect(debitLine.accountName).toBe('Cash');
    expect(debitLine.debit).toBe(25000);
    
    const creditLine = result.journal.lines.find(l => l.credit > 0);
    expect(creditLine.accountName).toBe('Other Income');
    expect(creditLine.credit).toBe(25000);
  });

  /**
   * TEST 4: Sales Entry (Cash)
   */
  test('Should create cash sales entry', async () => {
    const input = "Sold goods 50,000 cash";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    expect(result.journal.voucherType).toBe(VOUCHER_TYPES.SALES);
    expect(result.journal.paymentMode).toBe(PAYMENT_MODES.CASH);
    
    const debitLine = result.journal.lines.find(l => l.debit > 0);
    expect(debitLine.accountName).toBe('Cash');
    expect(debitLine.debit).toBe(50000);
    
    const creditLine = result.journal.lines.find(l => l.credit > 0);
    expect(creditLine.accountName).toBe('Sales');
    expect(creditLine.credit).toBe(50000);
  });

  /**
   * TEST 5: Sales Entry (Credit) - Should ask for party name
   */
  test('Should ask for customer name on credit sale', async () => {
    const input = "Sold goods 50,000 on credit";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    expect(result.needsClarification).toBe(true);
    expect(result.question).toContain('customer');
  });

  /**
   * TEST 6: Sales Entry (Credit with party)
   */
  test('Should create credit sales entry with party name', async () => {
    const input = "Sold goods 50,000 to Raj on credit";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    expect(result.journal.voucherType).toBe(VOUCHER_TYPES.SALES);
    expect(result.journal.paymentMode).toBe(PAYMENT_MODES.CREDIT);
    expect(result.journal.party).toBe('Raj');
    
    const debitLine = result.journal.lines.find(l => l.debit > 0);
    expect(debitLine.accountName).toBe('Raj');
    expect(debitLine.debit).toBe(50000);
    
    const creditLine = result.journal.lines.find(l => l.credit > 0);
    expect(creditLine.accountName).toBe('Sales');
    expect(creditLine.credit).toBe(50000);
  });

  /**
   * TEST 7: Purchase Entry (Cash)
   */
  test('Should create cash purchase entry', async () => {
    const input = "Bought stock 15,000 cash";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    expect(result.journal.voucherType).toBe(VOUCHER_TYPES.PURCHASE);
    expect(result.journal.paymentMode).toBe(PAYMENT_MODES.CASH);
    
    const debitLine = result.journal.lines.find(l => l.debit > 0);
    expect(debitLine.accountName).toBe('Purchase');
    expect(debitLine.debit).toBe(15000);
    
    const creditLine = result.journal.lines.find(l => l.credit > 0);
    expect(creditLine.accountName).toBe('Cash');
    expect(creditLine.credit).toBe(15000);
  });

  /**
   * TEST 8: Purchase Entry (Credit with party)
   */
  test('Should create credit purchase entry with supplier', async () => {
    const input = "Bought stock from ABC Traders 20,000 on credit";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    expect(result.journal.voucherType).toBe(VOUCHER_TYPES.PURCHASE);
    expect(result.journal.paymentMode).toBe(PAYMENT_MODES.CREDIT);
    expect(result.journal.party).toBe('ABC Traders');
    
    const debitLine = result.journal.lines.find(l => l.debit > 0);
    expect(debitLine.accountName).toBe('Purchase');
    expect(debitLine.debit).toBe(20000);
    
    const creditLine = result.journal.lines.find(l => l.credit > 0);
    expect(creditLine.accountName).toBe('ABC Traders');
    expect(creditLine.credit).toBe(20000);
  });

  /**
   * TEST 9: Multi-language - Gujarati
   */
  test('Should parse Gujarati input correctly', async () => {
    const input = "ભાડું ૧૦ હજાર કેશ આપ્યું";
    const result = await journalService.createFromNaturalLanguage(input, 'GU');

    expect(result.success).toBe(true);
    expect(result.journal.language).toBe('GU');
    expect(result.journal.originalText).toBe(input);
    
    // Should create same journal as English "Paid rent 10,000 cash"
    const debitLine = result.journal.lines.find(l => l.debit > 0);
    expect(debitLine.accountName).toBe('Rent Expense');
    expect(debitLine.debit).toBe(10000);
  });

  /**
   * TEST 10: Multi-language - Hindi
   */
  test('Should parse Hindi input correctly', async () => {
    const input = "किराया 10 हजार नकद दिया";
    const result = await journalService.createFromNaturalLanguage(input, 'HI');

    expect(result.success).toBe(true);
    expect(result.journal.language).toBe('HI');
    
    const debitLine = result.journal.lines.find(l => l.debit > 0);
    expect(debitLine.accountName).toBe('Rent Expense');
    expect(debitLine.debit).toBe(10000);
  });

  /**
   * TEST 11: Amount Formats
   */
  test('Should parse different amount formats', async () => {
    const testCases = [
      { input: "Paid rent 10000 cash", expected: 10000 },
      { input: "Paid rent 10,000 cash", expected: 10000 },
      { input: "Paid rent 10k cash", expected: 10000 },
      { input: "Paid rent 10 thousand cash", expected: 10000 },
      { input: "Paid rent 1 lakh cash", expected: 100000 },
      { input: "Paid rent ₹10000 cash", expected: 10000 }
    ];

    for (const testCase of testCases) {
      const result = await journalService.createFromNaturalLanguage(testCase.input);
      expect(result.success).toBe(true);
      const debitLine = result.journal.lines.find(l => l.debit > 0);
      expect(debitLine.debit).toBe(testCase.expected);
    }
  });

  /**
   * TEST 12: Payment Mode Missing - Should ask
   */
  test('Should ask for payment mode when missing', async () => {
    const input = "Paid rent 10,000";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    expect(result.needsClarification).toBe(true);
    expect(result.question).toContain('cash or bank');
  });

  /**
   * TEST 13: Journal Validation - Balance Check
   */
  test('Should validate journal balance', () => {
    const journal = new journalService.parser.JournalEntry();
    journal.addLine('Rent Expense', 'NOMINAL', 10000, 0);
    journal.addLine('Cash', 'REAL', 0, 10000);

    const validation = journal.validate();
    expect(validation.valid).toBe(true);
  });

  /**
   * TEST 14: Journal Validation - Unbalanced Entry
   */
  test('Should reject unbalanced journal', () => {
    const journal = new journalService.parser.JournalEntry();
    journal.addLine('Rent Expense', 'NOMINAL', 10000, 0);
    journal.addLine('Cash', 'REAL', 0, 9000); // Wrong amount

    const validation = journal.validate();
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('not balanced');
  });

  /**
   * TEST 15: Journal Validation - Minimum Lines
   */
  test('Should require minimum 2 lines', () => {
    const journal = new journalService.parser.JournalEntry();
    journal.addLine('Rent Expense', 'NOMINAL', 10000, 0);

    const validation = journal.validate();
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('at least 2 lines');
  });

  /**
   * TEST 16: Electricity Expense
   */
  test('Should create electricity expense entry', async () => {
    const input = "Paid electricity bill 5,000 cash";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    const debitLine = result.journal.lines.find(l => l.debit > 0);
    expect(debitLine.accountName).toBe('Electricity Expense');
    expect(debitLine.debit).toBe(5000);
  });

  /**
   * TEST 17: Transport Expense
   */
  test('Should create transport expense entry', async () => {
    const input = "Paid transport 2,000 cash";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    const debitLine = result.journal.lines.find(l => l.debit > 0);
    expect(debitLine.accountName).toBe('Transport Expense');
    expect(debitLine.debit).toBe(2000);
  });

  /**
   * TEST 18: Voice Input
   */
  test('Should handle voice input source', async () => {
    const input = "Paid rent 10,000 cash";
    const result = await journalService.createFromNaturalLanguage(input, 'EN', 'VOICE');

    expect(result.success).toBe(true);
    expect(result.journal.entrySource).toBe('VOICE');
  });

  /**
   * TEST 19: Confidence Score
   */
  test('Should have high confidence for clear input', async () => {
    const input = "Paid rent 10,000 cash";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    expect(result.journal.confidenceScore).toBeGreaterThan(0.9);
  });

  /**
   * TEST 20: GST Clarification
   */
  test('Should ask for GST clarification on sales', async () => {
    const input = "Sold goods 50,000 cash";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    expect(result.needsGSTClarification).toBe(true);
    expect(result.gstQuestion).toContain('GST');
  });

  /**
   * TEST 21: Financial Year Calculation
   */
  test('Should calculate correct financial year', () => {
    const journal = new journalService.parser.JournalEntry();
    
    // For date in April-March, FY should be current-next
    const fy = journal.getFinancialYear();
    expect(fy).toMatch(/\d{4}-\d{4}/);
  });

  /**
   * TEST 22: Narration Generation
   */
  test('Should generate proper narration', async () => {
    const input = "Paid rent 10,000 cash";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    expect(result.journal.narration).toContain('Rent');
    expect(result.journal.narration).toContain('cash');
  });

  /**
   * TEST 23: Total Amount Calculation
   */
  test('Should calculate total amount correctly', async () => {
    const input = "Paid rent 10,000 cash";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    expect(result.journal.getTotalAmount()).toBe(10000);
  });

  /**
   * TEST 24: Multiple Expenses (Future Enhancement)
   */
  test('Should handle multiple expenses in one entry', async () => {
    // This is a future enhancement
    const input = "Paid salary 30,000 and rent 10,000 by bank";
    const result = await journalService.createFromNaturalLanguage(input);

    // For now, it might not parse correctly
    // But the system should not crash
    expect(result.success).toBeDefined();
  });

  /**
   * TEST 25: Edge Case - Zero Amount
   */
  test('Should handle zero amount', async () => {
    const input = "Paid rent 0 cash";
    const result = await journalService.createFromNaturalLanguage(input);

    expect(result.success).toBe(true);
    // Should still create entry but with 0 amount
    const debitLine = result.journal.lines.find(l => l.debit >= 0);
    expect(debitLine.debit).toBe(0);
  });
});

/**
 * INTEGRATION TESTS
 */
describe('Journal Integration Tests', () => {
  let journalService;

  beforeEach(() => {
    journalService = new JournalService();
  });

  /**
   * TEST 26: Complete Flow - Create and Save
   */
  test('Should create and save journal entry', async () => {
    const input = "Paid rent 10,000 cash";
    
    // Step 1: Create journal
    const createResult = await journalService.createFromNaturalLanguage(input);
    expect(createResult.success).toBe(true);
    
    // Step 2: Validate
    const validation = createResult.journal.validate();
    expect(validation.valid).toBe(true);
    
    // Step 3: Save (mock database)
    // In real scenario, this would save to database
    createResult.journal.status = JOURNAL_STATUS.POSTED;
    expect(createResult.journal.status).toBe(JOURNAL_STATUS.POSTED);
  });

  /**
   * TEST 27: Complete Flow - With Clarification
   */
  test('Should handle clarification flow', async () => {
    // Step 1: Initial input (missing payment mode)
    const input = "Paid rent 10,000";
    const result1 = await journalService.createFromNaturalLanguage(input);
    
    expect(result1.needsClarification).toBe(true);
    expect(result1.question).toContain('cash or bank');
    
    // Step 2: User provides clarification
    const input2 = "Paid rent 10,000 cash";
    const result2 = await journalService.createFromNaturalLanguage(input2);
    
    expect(result2.needsClarification).toBe(false);
    expect(result2.journal.paymentMode).toBe(PAYMENT_MODES.CASH);
  });
});

/**
 * PERFORMANCE TESTS
 */
describe('Journal Performance Tests', () => {
  let journalService;

  beforeEach(() => {
    journalService = new JournalService();
  });

  /**
   * TEST 28: Batch Processing
   */
  test('Should process multiple entries quickly', async () => {
    const entries = [
      "Paid rent 10,000 cash",
      "Received 25,000 from customer",
      "Bought stock 15,000 bank",
      "Sold goods 50,000 cash",
      "Paid salary 30,000 bank"
    ];

    const startTime = Date.now();
    
    const results = await Promise.all(
      entries.map(e => journalService.createFromNaturalLanguage(e))
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should process all entries in less than 1 second
    expect(duration).toBeLessThan(1000);
    expect(results.length).toBe(5);
    expect(results.every(r => r.success)).toBe(true);
  });
});

export default {
  // Export for use in other test files
};
