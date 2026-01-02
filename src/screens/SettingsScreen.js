// src/screens/SettingsScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';

const SettingsScreen = ({ navigation }) => {
  
  const settingsSections = [
    {
      title: 'Company',
      items: [
        { id: 1, name: 'Company Profile', icon: '🏢', action: () => alert('Coming Soon') },
        { id: 2, name: 'GST Settings', icon: '🧾', action: () => alert('Coming Soon') },
        { id: 3, name: 'Financial Year', icon: '📅', action: () => alert('Coming Soon') }
      ]
    },
    {
      title: 'Accounting',
      items: [
        { id: 4, name: 'Chart of Accounts', icon: '📊', action: () => alert('Coming Soon') },
        { id: 5, name: 'Opening Balances', icon: '💰', action: () => alert('Coming Soon') },
        { id: 6, name: 'Voucher Settings', icon: '📝', action: () => alert('Coming Soon') }
      ]
    },
    {
      title: 'Data',
      items: [
        { id: 7, name: 'Backup Data', icon: '💾', action: () => handleBackup() },
        { id: 8, name: 'Restore Data', icon: '♻️', action: () => handleRestore() },
        { id: 9, name: 'Export Data', icon: '📤', action: () => alert('Coming Soon') }
      ]
    },
    {
      title: 'Account',
      items: [
        { id: 10, name: 'Profile', icon: '👤', action: () => alert('Coming Soon') },
        { id: 11, name: 'Change Password', icon: '🔒', action: () => alert('Coming Soon') },
        { id: 12, name: 'Logout', icon: '🚪', action: () => handleLogout() }
      ]
    }
  ];

  const handleBackup = () => {
    Alert.alert(
      'Backup Data',
      'Create a backup of all your data?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Backup', onPress: () => alert('Backup created successfully!') }
      ]
    );
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore Data',
      'This will replace all current data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: () => alert('Select backup file') }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => navigation.replace('SignIn') }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {settingsSections.map((section, index) => (
        <View key={index} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.settingItem}
              onPress={item.action}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>{item.icon}</Text>
                <Text style={styles.settingName}>{item.name}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>MindStack v1.0.0</Text>
        <Text style={styles.footerText}>© 2025 All rights reserved</Text>
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
  section: {
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    paddingBottom: 10
  },
  settingItem: {
    backgroundColor: '#fff',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 15
  },
  settingName: {
    fontSize: 16,
    color: '#1A1A1A'
  },
  arrow: {
    fontSize: 24,
    color: '#ccc'
  },
  footer: {
    padding: 30,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5
  }
});

export default SettingsScreen;
