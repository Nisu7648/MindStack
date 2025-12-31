import AsyncStorage from '@react-native-async-storage/async-storage';

export class TransactionService {
  static TRANSACTIONS_KEY = '@mindstack_transactions';

  // Process natural language transaction input
  static async processTransaction(input) {
    try {
      // This is a simplified version - in production, this would use NLP/AI
      const transaction = await this.parseTransaction(input);
      
      // Save transaction
      await this.saveTransaction(transaction);

      return { success: true, data: transaction };
    } catch (error) {
      console.error('Process transaction error:', error);
      return { 
        success: false, 
        error: error.message,
        data: {
          id: Date.now().toString(),
          status: 'error',
          title: 'Could not understand',
          description: 'Please say it again with amount and payment mode',
          timestamp: new Date().toISOString(),
        }
      };
    }
  }

  // Parse natural language input into transaction
  static async parseTransaction(input) {
    const lowerInput = input.toLowerCase();
    
    // Extract amount (simple regex for demo)
    const amountMatch = input.match(/₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

    // Detect transaction type
    let type = 'expense';
    let title = 'Expense recorded';
    
    if (lowerInput.includes('sale') || lowerInput.includes('sold') || lowerInput.includes('income')) {
      type = 'income';
      title = 'Sale recorded';
    } else if (lowerInput.includes('purchase') || lowerInput.includes('bought')) {
      type = 'purchase';
      title = 'Purchase recorded';
    } else if (lowerInput.includes('payment') || lowerInput.includes('paid')) {
      type = 'payment';
      title = 'Payment recorded';
    }

    // Detect payment mode
    let paymentMode = 'cash';
    if (lowerInput.includes('bank') || lowerInput.includes('upi') || lowerInput.includes('online')) {
      paymentMode = 'bank';
    }

    // Extract party name (simplified)
    let party = null;
    const fromMatch = input.match(/from\s+([a-zA-Z\s]+?)(?:\s+₹|\s+\d|$)/i);
    const toMatch = input.match(/to\s+([a-zA-Z\s]+?)(?:\s+₹|\s+\d|$)/i);
    if (fromMatch) party = fromMatch[1].trim();
    if (toMatch) party = toMatch[1].trim();

    // Check if we need clarification
    if (!amount) {
      return {
        id: Date.now().toString(),
        status: 'clarification',
        title: 'I need one detail',
        description: 'What was the amount?',
        timestamp: new Date().toISOString(),
        originalInput: input,
      };
    }

    // Create transaction object
    return {
      id: Date.now().toString(),
      status: 'success',
      title,
      description: party 
        ? `${party} – ₹${amount.toLocaleString('en-IN')} (${paymentMode === 'cash' ? 'Cash' : 'Bank'})`
        : `₹${amount.toLocaleString('en-IN')} (${paymentMode === 'cash' ? 'Cash' : 'Bank'})`,
      amount,
      type,
      party,
      paymentMode,
      timestamp: new Date().toISOString(),
      originalInput: input,
    };
  }

  // Save transaction to storage
  static async saveTransaction(transaction) {
    try {
      const existingData = await AsyncStorage.getItem(this.TRANSACTIONS_KEY);
      const transactions = existingData ? JSON.parse(existingData) : [];
      
      transactions.unshift(transaction);
      
      await AsyncStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(transactions));
      
      return { success: true };
    } catch (error) {
      console.error('Save transaction error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get today's transactions
  static async getTodayTransactions() {
    try {
      const existingData = await AsyncStorage.getItem(this.TRANSACTIONS_KEY);
      const allTransactions = existingData ? JSON.parse(existingData) : [];
      
      // Filter for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayTransactions = allTransactions.filter(t => {
        const transactionDate = new Date(t.timestamp);
        transactionDate.setHours(0, 0, 0, 0);
        return transactionDate.getTime() === today.getTime();
      });
      
      return { success: true, data: todayTransactions };
    } catch (error) {
      console.error('Get today transactions error:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // Get all transactions
  static async getAllTransactions() {
    try {
      const existingData = await AsyncStorage.getItem(this.TRANSACTIONS_KEY);
      const transactions = existingData ? JSON.parse(existingData) : [];
      
      return { success: true, data: transactions };
    } catch (error) {
      console.error('Get all transactions error:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // Delete transaction
  static async deleteTransaction(transactionId) {
    try {
      const existingData = await AsyncStorage.getItem(this.TRANSACTIONS_KEY);
      const transactions = existingData ? JSON.parse(existingData) : [];
      
      const filtered = transactions.filter(t => t.id !== transactionId);
      
      await AsyncStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(filtered));
      
      return { success: true };
    } catch (error) {
      console.error('Delete transaction error:', error);
      return { success: false, error: error.message };
    }
  }
}
