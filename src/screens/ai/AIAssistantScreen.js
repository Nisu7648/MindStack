/**
 * AI FINANCIAL ASSISTANT CHAT SCREEN
 * 
 * Features:
 * - Conversational interface
 * - Natural language queries
 * - Real-time insights
 * - Visual data presentation
 * - Query suggestions
 * - Chat history
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import AIFinancialAssistant from '../services/ai/aiFinancialAssistant';

const AIAssistantScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef();

  const SUGGESTED_QUERIES = [
    "Why did my profit drop this month?",
    "Can I afford to hire 3 employees?",
    "What is my tax exposure next quarter?",
    "Which expense category is growing fastest?",
    "Show me cash flow forecast",
    "What's my burn rate?"
  ];

  useEffect(() => {
    // Welcome message
    setMessages([
      {
        id: Date.now(),
        type: 'assistant',
        text: "👋 Hi! I'm your AI Financial Assistant. Ask me anything about your business finances!",
        timestamp: new Date()
      }
    ]);
  }, []);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      // Process query with AI
      const result = await AIFinancialAssistant.processQuery(inputText);

      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        text: result.response,
        data: result.data,
        confidence: result.confidence,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        text: "I'm having trouble processing that. Could you rephrase your question?",
        error: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSuggestedQuery = (query) => {
    setInputText(query);
  };

  const renderMessage = (message) => {
    const isUser = message.type === 'user';

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer
        ]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>🤖</Text>
          </View>
        )}
        
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText
            ]}
          >
            {message.text}
          </Text>
          
          {message.confidence && (
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceText}>
                Confidence: {(message.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          )}

          {message.data && renderDataVisualization(message.data)}
          
          <Text style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>

        {isUser && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
      </View>
    );
  };

  const renderDataVisualization = (data) => {
    if (!data) return null;

    // Render different visualizations based on data type
    if (data.currentProfit !== undefined) {
      return (
        <View style={styles.dataCard}>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Current Profit:</Text>
            <Text style={[styles.dataValue, { color: data.currentProfit >= 0 ? '#10B981' : '#DC2626' }]}>
              ₹{data.currentProfit.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Last Month:</Text>
            <Text style={styles.dataValue}>
              ₹{data.lastProfit.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Change:</Text>
            <Text style={[styles.dataValue, { color: data.profitChange >= 0 ? '#10B981' : '#DC2626' }]}>
              {data.profitChange >= 0 ? '+' : ''}
              {data.profitChangePercent.toFixed(1)}%
            </Text>
          </View>
        </View>
      );
    }

    if (data.canAfford !== undefined) {
      return (
        <View style={styles.dataCard}>
          <View style={styles.affordabilityHeader}>
            <Text style={styles.affordabilityTitle}>
              {data.canAfford ? '✅ Affordable' : '⚠️ Not Recommended'}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Monthly Cost:</Text>
            <Text style={styles.dataValue}>
              ₹{data.monthlyCost.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Cash Runway:</Text>
            <Text style={styles.dataValue}>
              {data.monthsOfRunway.toFixed(1)} months
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Projected Profit:</Text>
            <Text style={[styles.dataValue, { color: data.projectedProfit >= 0 ? '#10B981' : '#DC2626' }]}>
              ₹{data.projectedProfit.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      );
    }

    if (data.totalTaxLiability !== undefined) {
      return (
        <View style={styles.dataCard}>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>GST Liability:</Text>
            <Text style={styles.dataValue}>
              ₹{data.gstLiability.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>TDS Liability:</Text>
            <Text style={styles.dataValue}>
              ₹{data.tdsLiability.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Income Tax:</Text>
            <Text style={styles.dataValue}>
              ₹{data.estimatedIncomeTax.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={[styles.dataRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Tax:</Text>
            <Text style={styles.totalValue}>
              ₹{data.totalTaxLiability.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  const renderSuggestedQueries = () => (
    <View style={styles.suggestionsContainer}>
      <Text style={styles.suggestionsTitle}>💡 Try asking:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {SUGGESTED_QUERIES.map((query, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionChip}
            onPress={() => handleSuggestedQuery(query)}
          >
            <Text style={styles.suggestionText}>{query}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(renderMessage)}
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={styles.loadingText}>Analyzing...</Text>
          </View>
        )}
      </ScrollView>

      {messages.length === 1 && renderSuggestedQueries()}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask me anything about your finances..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || loading}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  messagesContainer: {
    flex: 1
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end'
  },
  userMessageContainer: {
    justifyContent: 'flex-end'
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start'
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8
  },
  avatarText: {
    fontSize: 16
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16
  },
  userBubble: {
    backgroundColor: '#1A1A1A',
    borderBottomRightRadius: 4
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20
  },
  userText: {
    color: '#FFFFFF'
  },
  assistantText: {
    color: '#1A1A1A'
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4
  },
  confidenceContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  confidenceText: {
    fontSize: 11,
    color: '#6B7280'
  },
  dataCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  dataLabel: {
    fontSize: 13,
    color: '#6B7280'
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  affordabilityHeader: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  affordabilityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginLeft: 48
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280'
  },
  suggestionsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12
  },
  suggestionChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8
  },
  suggestionText: {
    fontSize: 13,
    color: '#1A1A1A'
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end'
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB'
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600'
  }
});

export default AIAssistantScreen;
