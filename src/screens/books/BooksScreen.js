import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const BooksScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Books</Text>
        <Text style={styles.subtitle}>Read-only view of all accounting books</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Books</Text>
        <Text style={styles.text}>• Cash Book</Text>
        <Text style={styles.text}>• Bank Book</Text>
        <Text style={styles.text}>• Ledger</Text>
        <Text style={styles.text}>• Trial Balance</Text>
        <Text style={styles.text}>• Profit & Loss</Text>
        <Text style={styles.text}>• Balance Sheet</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📌 These books are automatically prepared from your transactions.
          No manual editing required.
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
    borderLeftColor: '#1A1A1A',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default BooksScreen;
