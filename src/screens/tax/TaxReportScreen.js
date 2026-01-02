/**
 * TAX REPORT SCREEN
 * 
 * Generate comprehensive tax reports for:
 * - India: GSTR-1, GSTR-3B, GSTR-9, TDS Reports
 * - USA: Sales Tax by State, Federal Income Tax, Payroll Tax
 * - Europe: VAT Returns, VIES Declarations, OSS Reports
 * 
 * Features:
 * - Period selection (Monthly, Quarterly, Annual)
 * - One-click report generation
 * - Export to PDF/Excel
 * - Tax readiness score
 * - Missing data alerts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import GlobalTaxEngine from '../../services/tax/GlobalTaxEngine';
import { getDatabase } from '../../database/schema';

const TaxReportScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [businessCountry, setBusinessCountry] = useState('INDIA');
  const [reportType, setReportType] = useState('');
  const [period, setPeriod] = useState('CURRENT_MONTH');
  const [state, setState] = useState('');
  const [reportData, setReportData] = useState(null);
  const [taxReadiness, setTaxReadiness] = useState(null);

  useEffect(() => {
    loadBusinessSettings();
    calculateTaxReadiness();
  }, []);

  /**
   * Load business country from settings
   */
  const loadBusinessSettings = async () => {
    try {
      const db = await getDatabase();
      const result = await db.executeSql(
        'SELECT country, state FROM business_settings LIMIT 1'
      );
      
      if (result[0].rows.length > 0) {
        const settings = result[0].rows.item(0);
        setBusinessCountry(settings.country);
        setState(settings.state);
      }
    } catch (error) {
      console.error('Error loading business settings:', error);
    }
  };

  /**
   * Calculate Tax Readiness Score
   */
  const calculateTaxReadiness = async () => {
    try {
      const db = await getDatabase();
      
      // Check for missing data
      const issues = [];
      
      // Check for transactions without tax info
      const missingTax = await db.executeSql(
        `SELECT COUNT(*) as count FROM transactions 
         WHERE (cgst IS NULL OR sgst IS NULL OR igst IS NULL) 
         AND amount > 0 
         AND date >= date('now', '-30 days')`
      );
      
      if (missingTax[0].rows.item(0).count > 0) {
        issues.push({
          severity: 'HIGH',
          message: `${missingTax[0].rows.item(0).count} transactions missing tax information`
        });
      }

      // Check for missing invoices
      const missingInvoices = await db.executeSql(
        `SELECT COUNT(*) as count FROM transactions 
         WHERE invoice_number IS NULL 
         AND type = 'SALES' 
         AND amount > 1000 
         AND date >= date('now', '-30 days')`
      );
      
      if (missingInvoices[0].rows.item(0).count > 0) {
        issues.push({
          severity: 'CRITICAL',
          message: `${missingInvoices[0].rows.item(0).count} sales without invoice numbers`
        });
      }

      // Calculate readiness score
      const maxScore = 100;
      const deductions = issues.reduce((sum, issue) => {
        return sum + (issue.severity === 'CRITICAL' ? 20 : 10);
      }, 0);
      
      const score = Math.max(0, maxScore - deductions);
      
      setTaxReadiness({
        score,
        grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D',
        issues,
        status: score >= 75 ? 'READY' : 'NEEDS_ATTENTION'
      });
    } catch (error) {
      console.error('Error calculating tax readiness:', error);
    }
  };

  /**
   * Get period dates
   */
  const getPeriodDates = () => {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'CURRENT_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      
      case 'LAST_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      
      case 'CURRENT_QUARTER':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      
      case 'LAST_QUARTER':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        startDate = new Date(now.getFullYear(), lastQuarter * 3, 1);
        endDate = new Date(now.getFullYear(), (lastQuarter + 1) * 3, 0);
        break;
      
      case 'FINANCIAL_YEAR':
        // India: April to March
        const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        startDate = new Date(fyStart, 3, 1); // April 1
        endDate = new Date(fyStart + 1, 2, 31); // March 31
        break;
      
      case 'CALENDAR_YEAR':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  /**
   * Generate Tax Report
   */
  const generateReport = async () => {
    if (!reportType) {
      Alert.alert('Error', 'Please select a report type');
      return;
    }

    setLoading(true);
    
    try {
      const periodDates = getPeriodDates();
      let report;

      switch (businessCountry) {
        case 'INDIA':
          report = await GlobalTaxEngine.generateIndiaGSTReport(periodDates, reportType);
          break;
        
        case 'USA':
          if (reportType === 'SALES_TAX') {
            report = await GlobalTaxEngine.generateUSASalesTaxReport(periodDates, state);
          }
          break;
        
        case 'UK':
        case 'FR':
        case 'DE':
        case 'ES':
        case 'IT':
          report = await GlobalTaxEngine.generateEUVATReport(periodDates, businessCountry);
          break;
        
        default:
          throw new Error('Country not supported');
      }

      setReportData(report);
      Alert.alert('Success', 'Tax report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Export Report
   */
  const exportReport = async (format) => {
    if (!reportData) {
      Alert.alert('Error', 'Please generate a report first');
      return;
    }

    Alert.alert('Export', `Exporting report as ${format}...`);
    // TODO: Implement PDF/Excel export
  };

  /**
   * Render India GST Report Options
   */
  const renderIndiaOptions = () => (
    <>
      <Text style={styles.label}>GST Report Type</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={reportType}
          onValueChange={setReportType}
          style={styles.picker}
        >
          <Picker.Item label="Select Report Type" value="" />
          <Picker.Item label="GSTR-1 (Outward Supplies)" value="GSTR1" />
          <Picker.Item label="GSTR-3B (Summary Return)" value="GSTR3B" />
          <Picker.Item label="GSTR-9 (Annual Return)" value="GSTR9" />
          <Picker.Item label="GSTR-2A (Purchase Register)" value="GSTR2A" />
          <Picker.Item label="GSTR-7 (TDS Return)" value="GSTR7" />
        </Picker>
      </View>

      <Text style={styles.infoText}>
        {reportType === 'GSTR1' && '📄 Monthly/Quarterly outward supplies to be filed by 11th'}
        {reportType === 'GSTR3B' && '📄 Monthly summary return - Due by 20th of next month'}
        {reportType === 'GSTR9' && '📄 Annual return - Due by December 31st'}
      </Text>
    </>
  );

  /**
   * Render USA Report Options
   */
  const renderUSAOptions = () => (
    <>
      <Text style={styles.label}>Tax Report Type</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={reportType}
          onValueChange={setReportType}
          style={styles.picker}
        >
          <Picker.Item label="Select Report Type" value="" />
          <Picker.Item label="Sales Tax Report" value="SALES_TAX" />
          <Picker.Item label="Federal Income Tax" value="INCOME_TAX" />
          <Picker.Item label="Payroll Tax (Form 941)" value="PAYROLL_TAX" />
          <Picker.Item label="Quarterly Estimated Tax" value="ESTIMATED_TAX" />
        </Picker>
      </View>

      {reportType === 'SALES_TAX' && (
        <>
          <Text style={styles.label}>State</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={state}
              onValueChange={setState}
              style={styles.picker}
            >
              <Picker.Item label="Select State" value="" />
              <Picker.Item label="California (CA)" value="CA" />
              <Picker.Item label="New York (NY)" value="NY" />
              <Picker.Item label="Texas (TX)" value="TX" />
              <Picker.Item label="Florida (FL)" value="FL" />
              {/* Add all 50 states */}
            </Picker>
          </View>
        </>
      )}
    </>
  );

  /**
   * Render EU VAT Report Options
   */
  const renderEUOptions = () => (
    <>
      <Text style={styles.label}>VAT Report Type</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={reportType}
          onValueChange={setReportType}
          style={styles.picker}
        >
          <Picker.Item label="Select Report Type" value="" />
          <Picker.Item label="VAT Return" value="VAT_RETURN" />
          <Picker.Item label="VIES Declaration" value="VIES" />
          <Picker.Item label="OSS Return" value="OSS" />
          <Picker.Item label="Intrastat Report" value="INTRASTAT" />
        </Picker>
      </View>

      <Text style={styles.infoText}>
        {reportType === 'VAT_RETURN' && '📄 Monthly/Quarterly VAT return'}
        {reportType === 'VIES' && '📄 Intra-EU supplies declaration'}
        {reportType === 'OSS' && '📄 One-Stop Shop quarterly return'}
      </Text>
    </>
  );

  /**
   * Render Report Summary
   */
  const renderReportSummary = () => {
    if (!reportData) return null;

    return (
      <View style={styles.reportContainer}>
        <Text style={styles.reportTitle}>
          {reportData.reportType} Report
        </Text>

        {/* India GST Report */}
        {reportData.reportType === 'GSTR-1' && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Outward Supplies Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Invoices:</Text>
              <Text style={styles.summaryValue}>{reportData.summary.totalInvoices}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxable Value:</Text>
              <Text style={styles.summaryValue}>₹{reportData.summary.totalTaxableValue.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>CGST:</Text>
              <Text style={styles.summaryValue}>₹{reportData.summary.totalCGST.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>SGST:</Text>
              <Text style={styles.summaryValue}>₹{reportData.summary.totalSGST.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>IGST:</Text>
              <Text style={styles.summaryValue}>₹{reportData.summary.totalIGST.toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Tax:</Text>
              <Text style={styles.totalValue}>₹{reportData.summary.totalTax.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {reportData.reportType === 'GSTR-3B' && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>GSTR-3B Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Outward Tax:</Text>
              <Text style={styles.summaryValue}>₹{reportData.outwardSupplies.tax.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>ITC Available:</Text>
              <Text style={styles.summaryValue}>₹{reportData.itcAvailable.toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Net Tax Payable:</Text>
              <Text style={styles.totalValue}>₹{reportData.netTaxPayable.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* USA Sales Tax Report */}
        {reportData.reportType === 'USA_SALES_TAX' && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Sales Tax Report - {reportData.state}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Transactions:</Text>
              <Text style={styles.summaryValue}>{reportData.totalTransactions}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Sales:</Text>
              <Text style={styles.summaryValue}>${reportData.totalSales.toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Tax Collected:</Text>
              <Text style={styles.totalValue}>${reportData.totalTaxCollected.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* EU VAT Report */}
        {reportData.reportType === 'EU_VAT_VIES' && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>VIES Declaration - {reportData.country}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Intra-EU Supplies:</Text>
              <Text style={styles.summaryValue}>{reportData.totalIntraEUSupplies}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Value:</Text>
              <Text style={styles.totalValue}>€{reportData.totalValue.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Export Buttons */}
        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={[styles.button, styles.exportButton]}
            onPress={() => exportReport('PDF')}
          >
            <Text style={styles.buttonText}>📄 Export PDF</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.exportButton]}
            onPress={() => exportReport('EXCEL')}
          >
            <Text style={styles.buttonText}>📊 Export Excel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Tax Readiness Card */}
      {taxReadiness && (
        <View style={[
          styles.readinessCard,
          { backgroundColor: taxReadiness.status === 'READY' ? '#E8F5E9' : '#FFF3E0' }
        ]}>
          <View style={styles.readinessHeader}>
            <Text style={styles.readinessTitle}>Tax Readiness Score</Text>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreText}>{taxReadiness.score}</Text>
              <Text style={styles.gradeText}>Grade {taxReadiness.grade}</Text>
            </View>
          </View>
          
          {taxReadiness.issues.length > 0 && (
            <View style={styles.issuesContainer}>
              <Text style={styles.issuesTitle}>Issues Found:</Text>
              {taxReadiness.issues.map((issue, index) => (
                <Text key={index} style={styles.issueText}>
                  {issue.severity === 'CRITICAL' ? '🔴' : '🟡'} {issue.message}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Report Configuration */}
      <View style={styles.configCard}>
        <Text style={styles.sectionTitle}>Generate Tax Report</Text>

        <Text style={styles.label}>Country</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={businessCountry}
            onValueChange={setBusinessCountry}
            style={styles.picker}
          >
            <Picker.Item label="🇮🇳 India" value="INDIA" />
            <Picker.Item label="🇺🇸 United States" value="USA" />
            <Picker.Item label="🇬🇧 United Kingdom" value="UK" />
            <Picker.Item label="🇫🇷 France" value="FR" />
            <Picker.Item label="🇩🇪 Germany" value="DE" />
            <Picker.Item label="🇪🇸 Spain" value="ES" />
            <Picker.Item label="🇮🇹 Italy" value="IT" />
          </Picker>
        </View>

        {/* Country-specific options */}
        {businessCountry === 'INDIA' && renderIndiaOptions()}
        {businessCountry === 'USA' && renderUSAOptions()}
        {['UK', 'FR', 'DE', 'ES', 'IT'].includes(businessCountry) && renderEUOptions()}

        <Text style={styles.label}>Period</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={period}
            onValueChange={setPeriod}
            style={styles.picker}
          >
            <Picker.Item label="Current Month" value="CURRENT_MONTH" />
            <Picker.Item label="Last Month" value="LAST_MONTH" />
            <Picker.Item label="Current Quarter" value="CURRENT_QUARTER" />
            <Picker.Item label="Last Quarter" value="LAST_QUARTER" />
            <Picker.Item label="Financial Year" value="FINANCIAL_YEAR" />
            <Picker.Item label="Calendar Year" value="CALENDAR_YEAR" />
          </Picker>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.generateButton]}
          onPress={generateReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Generate Report</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Report Summary */}
      {renderReportSummary()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  readinessCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2
  },
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  readinessTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2
  },
  scoreText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  gradeText: {
    fontSize: 12,
    color: '#666666'
  },
  issuesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  issuesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1A1A1A'
  },
  issueText: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4
  },
  configCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1A1A1A'
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 8,
    color: '#1A1A1A'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA'
  },
  picker: {
    height: 50
  },
  infoText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    fontStyle: 'italic'
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16
  },
  generateButton: {
    backgroundColor: '#4CAF50'
  },
  exportButton: {
    backgroundColor: '#2196F3',
    flex: 1,
    marginHorizontal: 4
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  reportContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1A1A1A'
  },
  summaryCard: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1A1A1A'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666'
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A'
  },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
    marginTop: 8,
    paddingTop: 12
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  exportButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
});

export default TaxReportScreen;
