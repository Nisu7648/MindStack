import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';

const MenuDrawer = ({ visible, onClose, navigation, businessSetup }) => {
  const slideAnim = new Animated.Value(300);

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const MenuItem = ({ icon, title, subtitle, onPress, badge }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Text style={styles.menuIcon}>{icon}</Text>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );

  const MenuSection = ({ title, children }) => (
    <View style={styles.menuSection}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      {children}
    </View>
  );

  const Divider = () => <View style={styles.divider} />;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.drawerContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <ScrollView style={styles.drawer} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>MindStack</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Home */}
            <MenuSection>
              <MenuItem
                icon="🏠"
                title="Today's Accounting"
                subtitle="Back to main screen"
                onPress={() => {
                  onClose();
                  navigation.navigate('Dashboard');
                }}
              />
            </MenuSection>

            <Divider />

            {/* Books */}
            <MenuSection title="ACCOUNTING">
              <MenuItem
                icon="📚"
                title="My Books"
                subtitle="View all accounting books"
                onPress={() => {
                  onClose();
                  navigation.navigate('Books');
                }}
              />
              <MenuItem
                icon="💰"
                title="Cash Book"
                subtitle="All cash transactions"
                onPress={() => {
                  onClose();
                  navigation.navigate('CashBook');
                }}
              />
              <MenuItem
                icon="🏦"
                title="Bank Book"
                subtitle="All bank transactions"
                onPress={() => {
                  onClose();
                  navigation.navigate('BankBook');
                }}
              />
              <MenuItem
                icon="📖"
                title="Ledger"
                subtitle="Account-wise summary"
                onPress={() => {
                  onClose();
                  navigation.navigate('Ledger');
                }}
              />
              <MenuItem
                icon="⚖️"
                title="Trial Balance"
                subtitle="Verify accounts balance"
                onPress={() => {
                  onClose();
                  navigation.navigate('TrialBalance');
                }}
              />
              <MenuItem
                icon="📊"
                title="Profit & Loss"
                subtitle="Income and expenses"
                onPress={() => {
                  onClose();
                  navigation.navigate('ProfitLoss');
                }}
              />
              <MenuItem
                icon="📋"
                title="Balance Sheet"
                subtitle="Assets and liabilities"
                onPress={() => {
                  onClose();
                  navigation.navigate('BalanceSheet');
                }}
              />
            </MenuSection>

            <Divider />

            {/* GST - Only if enabled */}
            {businessSetup?.gstRegistered && (
              <>
                <MenuSection title="TAXES">
                  <MenuItem
                    icon="🧾"
                    title="GST & Taxes"
                    subtitle="Tax reports and summaries"
                    onPress={() => {
                      onClose();
                      navigation.navigate('GSTReports');
                    }}
                  />
                  <MenuItem
                    icon="📤"
                    title="Sales GST"
                    subtitle="Output tax summary"
                    onPress={() => {
                      onClose();
                      navigation.navigate('SalesGST');
                    }}
                  />
                  <MenuItem
                    icon="📥"
                    title="Purchase GST"
                    subtitle="Input credit summary"
                    onPress={() => {
                      onClose();
                      navigation.navigate('PurchaseGST');
                    }}
                  />
                  <MenuItem
                    icon="💾"
                    title="Export GST Data"
                    subtitle="Excel / JSON format"
                    onPress={() => {
                      onClose();
                      navigation.navigate('ExportGST');
                    }}
                  />
                </MenuSection>
                <Divider />
              </>
            )}

            {/* Records */}
            <MenuSection title="HISTORY">
              <MenuItem
                icon="📝"
                title="All Transactions"
                subtitle="View and search history"
                onPress={() => {
                  onClose();
                  navigation.navigate('AllTransactions');
                }}
              />
              <MenuItem
                icon="👥"
                title="Parties"
                subtitle="Customers and suppliers"
                onPress={() => {
                  onClose();
                  navigation.navigate('Parties');
                }}
              />
              <MenuItem
                icon="📦"
                title="Products & Services"
                subtitle="Manage inventory items"
                onPress={() => {
                  onClose();
                  navigation.navigate('Products');
                }}
              />
            </MenuSection>

            <Divider />

            {/* Business Settings */}
            <MenuSection title="SETTINGS">
              <MenuItem
                icon="🏢"
                title="Business Settings"
                subtitle="Company details and preferences"
                onPress={() => {
                  onClose();
                  navigation.navigate('BusinessSettings');
                }}
              />
              <MenuItem
                icon="🔔"
                title="Notifications"
                subtitle="Alerts and reminders"
                onPress={() => {
                  onClose();
                  navigation.navigate('Notifications');
                }}
              />
              <MenuItem
                icon="🔒"
                title="Security & Privacy"
                subtitle="Password and data protection"
                onPress={() => {
                  onClose();
                  navigation.navigate('Security');
                }}
              />
            </MenuSection>

            <Divider />

            {/* Subscription */}
            <MenuSection title="ACCOUNT">
              <MenuItem
                icon="💎"
                title="Subscription & Plan"
                subtitle="Premium • Renews Dec 31, 2025"
                badge="Active"
                onPress={() => {
                  onClose();
                  navigation.navigate('Subscription');
                }}
              />
              <MenuItem
                icon="📤"
                title="Export & CA Access"
                subtitle="Share books with professionals"
                onPress={() => {
                  onClose();
                  navigation.navigate('Export');
                }}
              />
            </MenuSection>

            <Divider />

            {/* Help & Support */}
            <MenuSection title="SUPPORT">
              <MenuItem
                icon="❓"
                title="How It Works"
                subtitle="Quick guide"
                onPress={() => {
                  onClose();
                  navigation.navigate('HowItWorks');
                }}
              />
              <MenuItem
                icon="💬"
                title="Contact Support"
                subtitle="Get help from our team"
                onPress={() => {
                  onClose();
                  navigation.navigate('Support');
                }}
              />
              <MenuItem
                icon="📄"
                title="Privacy & Terms"
                subtitle="Legal information"
                onPress={() => {
                  onClose();
                  navigation.navigate('Legal');
                }}
              />
            </MenuSection>

            <Divider />

            {/* Logout */}
            <MenuSection>
              <MenuItem
                icon="🚪"
                title="Logout"
                subtitle="Sign out of your account"
                onPress={() => {
                  onClose();
                  navigation.navigate('Logout');
                }}
              />
            </MenuSection>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  drawerContainer: {
    width: 320,
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  drawer: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 24,
    color: '#666',
  },
  menuSection: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 22,
    marginRight: 14,
    width: 28,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  badge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  menuArrow: {
    fontSize: 24,
    color: '#CCC',
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  bottomPadding: {
    height: 40,
  },
});

export default MenuDrawer;
