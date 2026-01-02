/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ONE-CLICK PDF EXPORT & PRINT COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * - Export any table/report to PDF
 * - Print directly
 * - Share via WhatsApp/Email
 * - Download to device
 * - Professional Indian format
 * - GST compliant
 * 
 * USAGE:
 * <PDFExportButton 
 *   reportType="INVOICE" 
 *   data={invoiceData}
 *   options={{ title: 'Tax Invoice' }}
 * />
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PDFExportEngine from '../../services/pdf/pdfExportEngine';

const PDFExportButton = ({ reportType, data, options = {}, style, buttonText }) => {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * EXPORT TO PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handleExportPDF = async () => {
    try {
      setLoading(true);
      setShowMenu(false);

      const result = await PDFExportEngine.generatePDF(reportType, data, options);

      if (result.success) {
        Alert.alert(
          'Success',
          `PDF saved successfully!\n\nLocation: ${result.filePath}`,
          [
            { text: 'OK' },
            { 
              text: 'Share', 
              onPress: () => handleShare(result.filePath) 
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to generate PDF');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PRINT DIRECTLY
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handlePrint = async () => {
    try {
      setLoading(true);
      setShowMenu(false);

      const result = await PDFExportEngine.printPDF(reportType, data, options);

      if (result.success) {
        Alert.alert('Success', 'Print job sent successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to print');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SHARE PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handleShare = async (filePath) => {
    try {
      if (!filePath) {
        // Generate PDF first
        const result = await PDFExportEngine.generatePDF(reportType, data, options);
        if (!result.success) {
          Alert.alert('Error', result.error || 'Failed to generate PDF');
          return;
        }
        filePath = result.filePath;
      }

      const shareResult = await PDFExportEngine.sharePDF(filePath, {
        title: options.title || reportType,
        message: `${options.title || reportType} from MindStack`
      });

      if (!shareResult.success && shareResult.error !== 'User did not share') {
        Alert.alert('Error', shareResult.error || 'Failed to share');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setShowMenu(false);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * EXPORT & PRINT (BOTH)
   * ═══════════════════════════════════════════════════════════════════════
   */
  const handleExportAndPrint = async () => {
    try {
      setLoading(true);
      setShowMenu(false);

      // First export
      const exportResult = await PDFExportEngine.generatePDF(reportType, data, options);
      
      if (!exportResult.success) {
        Alert.alert('Error', exportResult.error || 'Failed to generate PDF');
        return;
      }

      // Then print
      const printResult = await PDFExportEngine.printPDF(reportType, data, options);

      if (printResult.success) {
        Alert.alert(
          'Success',
          `PDF saved and print job sent!\n\nLocation: ${exportResult.filePath}`
        );
      } else {
        Alert.alert(
          'Partial Success',
          `PDF saved but print failed.\n\nLocation: ${exportResult.filePath}`
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * MENU OPTIONS
   * ═══════════════════════════════════════════════════════════════════════
   */
  const menuOptions = [
    {
      id: 'export',
      title: 'Export to PDF',
      icon: 'file-pdf-box',
      color: '#F44336',
      onPress: handleExportPDF
    },
    {
      id: 'print',
      title: 'Print',
      icon: 'printer',
      color: '#2196F3',
      onPress: handlePrint
    },
    {
      id: 'share',
      title: 'Share',
      icon: 'share-variant',
      color: '#4CAF50',
      onPress: () => handleShare(null)
    },
    {
      id: 'both',
      title: 'Export & Print',
      icon: 'file-download',
      color: '#FF9800',
      onPress: handleExportAndPrint
    }
  ];

  return (
    <>
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={() => setShowMenu(true)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <Icon name="file-pdf-box" size={20} color="#FFF" />
            <Text style={styles.buttonText}>
              {buttonText || 'Export PDF'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Export Options</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={menuOptions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                    <Icon name={item.icon} size={24} color={item.color} />
                  </View>
                  <Text style={styles.menuItemText}>{item.title}</Text>
                  <Icon name="chevron-right" size={24} color="#CCC" />
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QUICK ACTION BUTTONS (FOR COMMON ACTIONS)
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const QuickExportButton = ({ reportType, data, options, onPress }) => {
  const [loading, setLoading] = useState(false);

  const handleQuickExport = async () => {
    try {
      setLoading(true);
      const result = await PDFExportEngine.generatePDF(reportType, data, options);
      
      if (result.success) {
        if (onPress) {
          onPress(result);
        } else {
          Alert.alert('Success', 'PDF exported successfully');
        }
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.quickButton}
      onPress={handleQuickExport}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#F44336" size="small" />
      ) : (
        <Icon name="download" size={24} color="#F44336" />
      )}
    </TouchableOpacity>
  );
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * QUICK PRINT BUTTON
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const QuickPrintButton = ({ reportType, data, options, onPress }) => {
  const [loading, setLoading] = useState(false);

  const handleQuickPrint = async () => {
    try {
      setLoading(true);
      const result = await PDFExportEngine.printPDF(reportType, data, options);
      
      if (result.success) {
        if (onPress) {
          onPress(result);
        } else {
          Alert.alert('Success', 'Print job sent');
        }
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.quickButton}
      onPress={handleQuickPrint}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#2196F3" size="small" />
      ) : (
        <Icon name="printer" size={24} color="#2196F3" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  quickButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '85%',
    maxWidth: 400,
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default PDFExportButton;
