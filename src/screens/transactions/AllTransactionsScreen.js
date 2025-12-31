import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const AllTransactionsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Transactions</Text>
        <Text style={styles.subtitle}>View and search transaction history</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <Text style={styles.text}>• View all historical transactions</Text>
        <Text style={styles.text}>• Search by date, amount, or party</Text>
        <Text style={styles.text}>• Natural language entries</Text>
        <Text style={styles.text}>• Status indicators (✔ / ⚠)</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📌 All transactions are shown in natural language format. No journal format here.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 8,
  },
  infoBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default AllTransactionsScreen;
