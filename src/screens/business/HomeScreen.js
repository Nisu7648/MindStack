/**
 * HOME / DAILY BILLING SCREEN
 * Default screen - fastest access to billing
 * 
 * Features:
 * - Today's bills list
 * - Voice/Text input at bottom
 * - Quick actions
 * - Real-time sync status
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Voice from '@react-native-voice/voice';
import mindSlateIntegration from '../../services/ai/mindSlateIntegration';
import businessQueryIntegration from '../../services/ai/businessQueryIntegration';

const HomeScreen = ({ navigation }) => {
  const [todayBills, setTodayBills] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todaySummary, setTodaySummary] = useState({
    totalSales: 0,
    billCount: 0,
    cashSales: 0,
    creditSales: 0
  });

  useEffect(() => {
    loadTodayBills();
    loadTodaySummary();
    setupVoice();

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const setupVoice = async () => {
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechResults = (e) => {
      if (e.value && e.value[0]) {
        setInputText(e.value[0]);
        handleInput(e.value[0]);
      }
    };
  };

  const loadTodayBills = async () => {
    // Load today's bills from database
    // Implementation will connect to invoice service
    const bills = []; // Placeholder
    setTodayBills(bills);
  };

  const loadTodaySummary = async () => {
    // Load today's summary
    const result = await businessQueryIntegration.processQuery('Total sales today');
    if (result.status === 'ANSWER_READY') {
      setTodaySummary({
        totalSales: result.numeric_answer,
        billCount: result.details?.transactionCount || 0,
        cashSales: 0,
        creditSales: 0
      });
    }
  };

  const handleInput = async (text) => {
    if (!text.trim()) return;

    // Check if it's a transaction or query
    const lowerText = text.toLowerCase();

    if (lowerText.includes('bill') || lowerText.includes('invoice') || 
        lowerText.includes('scan') || /\d+/.test(text)) {
      // Transaction input - go to POS
      const result = await mindSlateIntegration.processInput(text);
      
      if (result.needsClarification) {
        setAiResponse({
          type: 'question',
          message: result.question
        });
      } else if (result.success) {
        // Navigate to POS with pre-filled data
        navigation.navigate('POSBilling', { 
          prefilledData: result.parsed 
        });
      }
    } else {
      // Business query
      const result = await businessQueryIntegration.processQuery(text);
      
      if (result.status === 'ANSWER_READY') {
        setAiResponse({
          type: 'answer',
          message: result.spoken_answer
        });
      }
    }

    setInputText('');
  };

  const startVoiceInput = async () => {
    try {
      await Voice.start('en-IN');
    } catch (error) {
      console.error('Voice error:', error);
    }
  };

  const openScanner = () => {
    navigation.navigate('BarcodeScanner');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodayBills();
    await loadTodaySummary();
    setRefreshing(false);
  };

  const renderBillCard = ({ item }) => (
    <TouchableOpacity
      style={styles.billCard}
      onPress={() => navigation.navigate('InvoicePreview', { invoiceId: item.id })}
    >
      <View style={styles.billCardHeader}>
        <Text style={styles.billNumber}>{item.invoiceNumber}</Text>
        <Text style={styles.billTime}>{item.time}</Text>
      </View>
      <View style={styles.billCardBody}>
        <Text style={styles.billAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
        <View style={styles.paymentBadge}>
          <Text style={styles.paymentText}>{item.paymentMode}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.businessName}>My Business</Text>
        <Text style={styles.dateText}>{new Date().toLocaleDateString('en-IN')}</Text>
        <View style={styles.syncStatus}>
          <Ionicons 
            name={isOnline ? "cloud-done" : "cloud-offline"} 
            size={24} 
            color={isOnline ? "#4CAF50" : "#FF9800"} 
          />
        </View>
      </View>

      {/* Today Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Today's Sales</Text>
          <Text style={styles.summaryValue}>
            ₹{todaySummary.totalSales.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Bills</Text>
          <Text style={styles.summaryValue}>{todaySummary.billCount}</Text>
        </View>
      </View>

      {/* AI Response */}
      {aiResponse && (
        <View style={[
          styles.aiResponse,
          aiResponse.type === 'question' ? styles.aiQuestion : styles.aiAnswer
        ]}>
          <Ionicons 
            name={aiResponse.type === 'question' ? "help-circle" : "checkmark-circle"} 
            size={20} 
            color={aiResponse.type === 'question' ? "#FF9800" : "#4CAF50"} 
          />
          <Text style={styles.aiResponseText}>{aiResponse.message}</Text>
          <TouchableOpacity onPress={() => setAiResponse(null)}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      {/* Bills List */}
      <FlatList
        data={todayBills}
        renderItem={renderBillCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.billsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#E0E0E0" />
            <Text style={styles.emptyText}>No bills today</Text>
            <Text style={styles.emptySubtext}>Start billing to see transactions here</Text>
          </View>
        }
      />

      {/* Quick Action Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => navigation.navigate('POSBilling')}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bottom Input Bar */}
      <View style={styles.bottomInputBar}>
        <TouchableOpacity
          style={[styles.inputButton, isListening && styles.inputButtonActive]}
          onPress={startVoiceInput}
        >
          <Ionicons 
            name="mic" 
            size={24} 
            color={isListening ? "#FF5252" : "#666"} 
          />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Type transaction or ask question..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleInput(inputText)}
          returnKeyType="send"
        />

        <TouchableOpacity
          style={styles.inputButton}
          onPress={openScanner}
        >
          <Ionicons name="scan" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121'
  },
  dateText: {
    fontSize: 14,
    color: '#666'
  },
  syncStatus: {
    width: 40,
    alignItems: 'flex-end'
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center'
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121'
  },
  aiResponse: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4
  },
  aiQuestion: {
    borderLeftColor: '#FF9800'
  },
  aiAnswer: {
    borderLeftColor: '#4CAF50'
  },
  aiResponseText: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
    marginLeft: 8
  },
  billsList: {
    padding: 16,
    paddingBottom: 100
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  billCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  billNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121'
  },
  billTime: {
    fontSize: 12,
    color: '#666'
  },
  billCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  billAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50'
  },
  paymentBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  paymentText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  bottomInputBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  inputButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#F5F5F5'
  },
  inputButtonActive: {
    backgroundColor: '#FFEBEE'
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    fontSize: 15,
    color: '#212121'
  }
});

export default HomeScreen;
