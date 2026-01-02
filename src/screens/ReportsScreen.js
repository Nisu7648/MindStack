// src/screens/ReportsScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';

const ReportsScreen = ({ navigation }) => {
  
  const reports = [
    { id: 1, name: 'Profit & Loss', icon: '📊', screen: 'TradingProfitLoss' },
    { id: 2, name: 'Balance Sheet', icon: '📈', screen: 'BalanceSheet' },
    { id: 3, name: 'Trial Balance', icon: '⚖️', screen: 'TrialBalance' },
    { id: 4, name: 'Ledger', icon: '📖', screen: 'Ledger' },
    { id: 5, name: 'Day Book', icon: '📅', screen: null },
    { id: 6, name: 'Cash Book', icon: '💵', screen: null },
    { id: 7, name: 'Sales Register', icon: '🛒', screen: null },
    { id: 8, name: 'Purchase Register', icon: '📦', screen: null },
    { id: 9, name: 'GST Reports', icon: '🧾', screen: 'GSTReports' },
    { id: 10, name: 'Stock Summary', icon: '📊', screen: null }
  ];

  const handleReportPress = (report) => {
    if (report.screen) {
      navigation.navigate(report.screen);
    } else {
      // TODO: Implement report generation
      alert(`${report.name} - Coming Soon!`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Financial Reports</Text>
        <Text style={styles.subtitle}>View and export reports</Text>
      </View>

      <View style={styles.grid}>
        {reports.map(report => (
          <TouchableOpacity
            key={report.id}
            style={styles.reportCard}
            onPress={() => handleReportPress(report)}
          >
            <Text style={styles.reportIcon}>{report.icon}</Text>
            <Text style={styles.reportName}>{report.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10
  },
  reportCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    margin: '1%',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  reportIcon: {
    fontSize: 40,
    marginBottom: 10
  },
  reportName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center'
  }
});

export default ReportsScreen;
