import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { TransactionService } from '../services/TransactionService';

const DashboardScreen = ({ navigation }) => {
  const [inputText, setInputText] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const micScale = new Animated.Value(1);

  useEffect(() => {
    loadTodayTransactions();
    updateDate();
  }, []);

  const updateDate = () => {
    const today = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    setCurrentDate(today.toLocaleDateString('en-IN', options));
  };

  const loadTodayTransactions = async () => {
    const result = await TransactionService.getTodayTransactions();
    if (result.success) {
      setTransactions(result.data);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const result = await TransactionService.processTransaction(inputText);
    
    if (result.success) {
      setTransactions([result.data, ...transactions]);
      setInputText('');
    }
  };

  const handleMicPress = () => {
    setIsRecording(true);
    Animated.sequence([
      Animated.timing(micScale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(micScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Voice recording logic will be implemented here
    setTimeout(() => {
      setIsRecording(false);
    }, 2000);
  };

  const renderTransactionCard = (transaction) => {
    const getCardStyle = () => {
      switch (transaction.status) {
        case 'success':
          return styles.successCard;
        case 'clarification':
          return styles.clarificationCard;
        case 'error':
          return styles.errorCard;
        default:
          return styles.successCard;
      }
    };

    const getIcon = () => {
      switch (transaction.status) {
        case 'success':
          return '✔';
        case 'clarification':
          return '⚠';
        case 'error':
          return '❌';
        default:
          return '✔';
      }
    };

    return (
      <View key={transaction.id} style={[styles.transactionCard, getCardStyle()]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>{getIcon()}</Text>
          <Text style={styles.cardTitle}>{transaction.title}</Text>
        </View>
        <Text style={styles.cardDescription}>{transaction.description}</Text>
        {transaction.amount && (
          <Text style={styles.cardAmount}>₹{transaction.amount.toLocaleString('en-IN')}</Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => navigation.openDrawer?.()}
          >
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.appTitle}>MindStack</Text>
            <Text style={styles.dateText}>Today • {currentDate}</Text>
          </View>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Reports')}
          >
            <Text style={styles.iconText}>📒</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.iconText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transaction Feed */}
      <ScrollView 
        style={styles.feedContainer}
        contentContainerStyle={styles.feedContent}
      >
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No transactions yet today
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Type or speak your first transaction below
            </Text>
          </View>
        ) : (
          transactions.map(renderTransactionCard)
        )}
      </ScrollView>

      {/* Input Box */}
      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.micButton}
          onPress={handleMicPress}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: micScale }] }}>
            <Text style={styles.micIcon}>🎤</Text>
          </Animated.View>
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder="Type or speak your transaction…"
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Listening...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    width: 32,
    height: 32,
    justifyContent: 'space-around',
    paddingVertical: 6,
    marginRight: 16,
  },
  menuLine: {
    width: 24,
    height: 2,
    backgroundColor: '#1A1A1A',
    borderRadius: 1,
  },
  titleContainer: {
    flex: 1,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  feedContainer: {
    flex: 1,
  },
  feedContent: {
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
  transactionCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  successCard: {
    borderLeftColor: '#34C759',
  },
  clarificationCard: {
    borderLeftColor: '#FF9500',
  },
  errorCard: {
    borderLeftColor: '#FF3B30',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  micButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 22,
  },
  micIcon: {
    fontSize: 24,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 22,
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  sendIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  recordingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DashboardScreen;
