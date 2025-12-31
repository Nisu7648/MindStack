import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const GSTReportsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GST & Taxes</Text>
        <Text style={styles.subtitle}>Tax reports and summaries</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Reports</Text>
        <Text style={styles.text}>• Sales GST Summary</Text>
        <Text style={styles.text}>• Purchase GST Summary</Text>
        <Text style={styles.text}>• Output Tax</Text>
        <Text style={styles.text}>• Input Credit</Text>
        <Text style={styles.text}>• Export GST Data (Excel / JSON)</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📌 GST reports are prepared automatically. No filing inside V1 — only preparation.
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
    borderLeftColor: '#34C759',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default GSTReportsScreen;
