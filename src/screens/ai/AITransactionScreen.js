/**
 * AI TRANSACTION INPUT SCREEN
 * 
 * Revolutionary natural language transaction input
 * 
 * User just types what they did:
 * - "Sold 5 laptops to John for 50000"
 * - "Bought chairs from ABC for 15000"
 * - "Paid rent 25000"
 * - "मैंने राज को 5000 का माल बेचा"
 * 
 * AI understands, creates transaction automatically
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import AITransactionParser from '../../services/ai/AITransactionParser';
import InvoiceEngine from '../../services/invoice/InvoiceEngine';
import { supabase } from '../../services/supabase';

const AI_TRANSACTION_SCREEN = ({ navigation, businessId }) => {
  const [inputText, setInputText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedTransaction, setParsedTransaction] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [language, setLanguage] = useState('en');
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    loadSuggestions();
    loadRecentTransactions();
  }, []);

  /**
   * LOAD SUGGESTIONS
   */
  const loadSuggestions = async () => {
    const suggestions = await AITransactionParser.getSuggestions('', businessId);
    setSuggestions(suggestions.slice(0, 6));
  };

  /**
   * LOAD RECENT TRANSACTIONS
   */
  const loadRecentTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentTransactions(data || []);
  };

  /**
   * PARSE INPUT
   */
  const parseInput = async () => {
    if (!inputText.trim()) {
      Alert.alert('Empty Input', 'Please describe your transaction');
      return;
    }

    try {
      setParsing(true);

      const result = await AITransactionParser.parseTransaction(
        inputText,
        businessId,
        language
      );

      if (result.success) {
        setParsedTransaction(result.transaction);
        setLanguage(result.language);
      } else {
        Alert.alert('Could not understand', result.error);
      }

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setParsing(false);
    }
  };

  /**
   * CONFIRM AND CREATE TRANSACTION
   */
  const confirmTransaction = async () => {
    try {
      if (!parsedTransaction) return;

      // Validate
      const validation = AITransactionParser.validateParsedTransaction(parsedTransaction);
      if (!validation.isValid) {
        Alert.alert('Incomplete Information', validation.errors.join('\n'));
        return;
      }

      setParsing(true);

      // Create transaction based on type
      let result;

      switch (parsedTransaction.type) {
        case 'sale':
          result = await createSaleInvoice();
          break;
        case 'purchase':
          result = await createPurchase();
          break;
        case 'payment_in':
          result = await recordPaymentIn();
          break;
        case 'payment_out':
          result = await recordPaymentOut();
          break;
        case 'expense':
          result = await recordExpense();
          break;
        default:
          throw new Error('Unknown transaction type');
      }

      // Show success
      const message = AITransactionParser.generateConfirmationMessage(
        parsedTransaction,
        language
      );

      Alert.alert(
        '✅ Success',
        `${message}\n\nTransaction recorded and accounting updated automatically.`,
        [
          {
            text: 'New Transaction',
            onPress: () => {
              setInputText('');
              setParsedTransaction(null);
              loadRecentTransactions();
            }
          },
          {
            text: 'View Details',
            onPress: () => {
              if (parsedTransaction.type === 'sale') {
                navigation.navigate('InvoiceDetail', { invoiceId: result.id });
              } else {
                navigation.navigate('TransactionDetail', { transactionId: result.id });
              }
            }
          }
        ]
      );

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setParsing(false);
    }
  };

  /**
   * CREATE SALE INVOICE
   */
  const createSaleInvoice = async () => {
    const invoiceData = {
      businessId,
      customerId: parsedTransaction.partyId,
      invoiceType: 'tax_invoice',
      items: parsedTransaction.items.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        rate: item.rate || parsedTransaction.amount / item.quantity,
        gstRate: item.gstRate || 18
      })),
      paidAmount: 0
    };

    const result = await InvoiceEngine.createInvoice(invoiceData);
    return result.invoice;
  };

  /**
   * CREATE PURCHASE
   */
  const createPurchase = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        business_id: businessId,
        type: 'purchase',
        supplier_id: parsedTransaction.partyId,
        amount: parsedTransaction.amount,
        items: parsedTransaction.items,
        date: new Date().toISOString(),
        description: inputText
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  /**
   * RECORD PAYMENT IN
   */
  const recordPaymentIn = async () => {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        business_id: businessId,
        customer_id: parsedTransaction.partyId,
        amount: parsedTransaction.amount,
        payment_method: 'cash',
        payment_date: new Date().toISOString(),
        description: inputText
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  /**
   * RECORD PAYMENT OUT
   */
  const recordPaymentOut = async () => {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        business_id: businessId,
        supplier_id: parsedTransaction.partyId,
        amount: parsedTransaction.amount,
        payment_method: 'cash',
        payment_date: new Date().toISOString(),
        description: inputText
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  /**
   * RECORD EXPENSE
   */
  const recordExpense = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        business_id: businessId,
        type: 'expense',
        amount: parsedTransaction.amount,
        date: new Date().toISOString(),
        description: inputText
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  /**
   * USE SUGGESTION
   */
  const useSuggestion = (suggestion) => {
    setInputText(suggestion);
  };

  /**
   * EDIT PARSED FIELD
   */
  const editField = (field, value) => {
    setParsedTransaction({
      ...parsedTransaction,
      [field]: value
    });
  };

  const getTransactionTypeColor = (type) => {
    const colors = {
      sale: '#4CAF50',
      purchase: '#2196F3',
      payment_in: '#8BC34A',
      payment_out: '#F44336',
      expense: '#FF9800'
    };
    return colors[type] || '#9E9E9E';
  };

  const getTransactionTypeIcon = (type) => {
    const icons = {
      sale: '💵',
      purchase: '🛒',
      payment_in: '💰',
      payment_out: '💳',
      expense: '💸'
    };
    return icons[type] || '📝';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Transaction</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>🤖 Just describe what you did</Text>
          <Text style={styles.instructionsText}>
            Type in any language. AI will understand and create the transaction automatically.
          </Text>
          
          <View style={styles.examplesContainer}>
            <Text style={styles.examplesTitle}>Examples:</Text>
            <Text style={styles.exampleText}>• "Sold 5 laptops to John for 50000"</Text>
            <Text style={styles.exampleText}>• "Bought chairs from ABC for 15000"</Text>
            <Text style={styles.exampleText}>• "Paid rent 25000"</Text>
            <Text style={styles.exampleText}>• "मैंने राज को 5000 का माल बेचा"</Text>
          </View>
        </View>

        {/* Input Area */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Describe your transaction:</Text>
          <TextInput
            style={styles.input}
            placeholder="Type here in any language..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            numberOfLines={4}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.parseButton, parsing && styles.parseButtonDisabled]}
            onPress={parseInput}
            disabled={parsing}
          >
            {parsing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.parseButtonText}>🤖 Understand & Parse</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Suggestions */}
        {suggestions.length > 0 && !parsedTransaction && (
          <View style={styles.suggestionsCard}>
            <Text style={styles.suggestionsTitle}>💡 Quick Suggestions:</Text>
            <View style={styles.suggestionsGrid}>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => useSuggestion(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Parsed Transaction */}
        {parsedTransaction && (
          <View style={styles.parsedCard}>
            <View style={styles.parsedHeader}>
              <Text style={styles.parsedTitle}>✅ Understood!</Text>
              <View
                style={[
                  styles.confidenceBadge,
                  { backgroundColor: parsedTransaction.confidence > 0.7 ? '#4CAF50' : '#FF9800' }
                ]}
              >
                <Text style={styles.confidenceText}>
                  {Math.round(parsedTransaction.confidence * 100)}% confident
                </Text>
              </View>
            </View>

            {/* Transaction Type */}
            <View style={styles.parsedField}>
              <Text style={styles.fieldLabel}>Transaction Type:</Text>
              <View
                style={[
                  styles.typeChip,
                  { backgroundColor: getTransactionTypeColor(parsedTransaction.type) }
                ]}
              >
                <Text style={styles.typeEmoji}>{getTransactionTypeIcon(parsedTransaction.type)}</Text>
                <Text style={styles.typeText}>
                  {parsedTransaction.type?.toUpperCase().replace('_', ' ')}
                </Text>
              </View>
            </View>

            {/* Party */}
            {parsedTransaction.party && (
              <View style={styles.parsedField}>
                <Text style={styles.fieldLabel}>
                  {parsedTransaction.type === 'sale' || parsedTransaction.type === 'payment_in'
                    ? 'Customer:'
                    : 'Supplier:'}
                </Text>
                <Text style={styles.fieldValue}>{parsedTransaction.party}</Text>
              </View>
            )}

            {/* Amount */}
            <View style={styles.parsedField}>
              <Text style={styles.fieldLabel}>Amount:</Text>
              <Text style={[styles.fieldValue, styles.amountValue]}>
                ₹{parsedTransaction.amount?.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Items */}
            {parsedTransaction.items && parsedTransaction.items.length > 0 && (
              <View style={styles.parsedField}>
                <Text style={styles.fieldLabel}>Items:</Text>
                {parsedTransaction.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemText}>
                      {item.quantity}x {item.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Language Detected */}
            <View style={styles.languageInfo}>
              <Text style={styles.languageText}>
                🌐 Language: {language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : language}
              </Text>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[styles.confirmButton, parsing && styles.confirmButtonDisabled]}
              onPress={confirmTransaction}
              disabled={parsing}
            >
              {parsing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmButtonText}>✅ Confirm & Create Transaction</Text>
              )}
            </TouchableOpacity>

            {/* Edit Button */}
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setParsedTransaction(null)}
            >
              <Text style={styles.editButtonText}>✏️ Edit Input</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Transactions */}
        {recentTransactions.length > 0 && !parsedTransaction && (
          <View style={styles.recentCard}>
            <Text style={styles.recentTitle}>📋 Recent Transactions:</Text>
            {recentTransactions.map((txn, index) => (
              <View key={index} style={styles.recentItem}>
                <Text style={styles.recentType}>{txn.type}</Text>
                <Text style={styles.recentAmount}>₹{txn.amount?.toLocaleString('en-IN')}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    paddingTop: 40
  },
  backButton: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF'
  },
  content: {
    flex: 1,
    padding: 15
  },
  instructionsCard: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10
  },
  instructionsText: {
    fontSize: 15,
    color: '#1565C0',
    lineHeight: 22,
    marginBottom: 15
  },
  examplesContainer: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    padding: 12,
    borderRadius: 8
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 8
  },
  exampleText: {
    fontSize: 13,
    color: '#1976D2',
    marginBottom: 5
  },
  inputCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 15
  },
  parseButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  parseButtonDisabled: {
    backgroundColor: '#BDBDBD'
  },
  parseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  suggestionsCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  suggestionChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8
  },
  suggestionText: {
    fontSize: 13,
    color: '#1976D2'
  },
  parsedCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#4CAF50'
  },
  parsedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  parsedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF'
  },
  parsedField: {
    marginBottom: 15
  },
  fieldLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start'
  },
  typeEmoji: {
    fontSize: 20,
    marginRight: 8
  },
  typeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF'
  },
  itemRow: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginTop: 5
  },
  itemText: {
    fontSize: 14,
    color: '#333'
  },
  languageInfo: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15
  },
  languageText: {
    fontSize: 13,
    color: '#666'
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10
  },
  confirmButtonDisabled: {
    backgroundColor: '#BDBDBD'
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  editButton: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  editButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600'
  },
  recentCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 8
  },
  recentType: {
    fontSize: 14,
    color: '#666'
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  }
});

export default AI_TRANSACTION_SCREEN;
