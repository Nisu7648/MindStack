import AsyncStorage from '@react-native-async-storage/async-storage';

export class SetupService {
  static SETUP_KEY = '@mindstack_setup';
  static SETUP_COMPLETE_KEY = '@mindstack_setup_complete';

  // Save business setup data
  static async saveBusinessSetup(setupData) {
    try {
      const setupInfo = {
        businessName: setupData.businessName,
        businessType: setupData.businessType,
        gstRegistered: setupData.gstRegistered,
        gstin: setupData.gstin || null,
        state: setupData.state,
        financialYearStart: setupData.financialYearStart,
        monthlyTransactions: setupData.monthlyTransactions || null,
        setupCompletedAt: new Date().toISOString(),
      };

      // Save setup data
      await AsyncStorage.setItem(this.SETUP_KEY, JSON.stringify(setupInfo));

      // Mark setup as complete
      await AsyncStorage.setItem(this.SETUP_COMPLETE_KEY, 'true');

      return { success: true, data: setupInfo };
    } catch (error) {
      console.error('Save setup error:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if setup is complete
  static async isSetupComplete() {
    try {
      const setupComplete = await AsyncStorage.getItem(this.SETUP_COMPLETE_KEY);
      return setupComplete === 'true';
    } catch (error) {
      console.error('Check setup error:', error);
      return false;
    }
  }

  // Get business setup data
  static async getBusinessSetup() {
    try {
      const setupData = await AsyncStorage.getItem(this.SETUP_KEY);
      if (setupData) {
        return { success: true, data: JSON.parse(setupData) };
      }
      return { success: false, error: 'No setup data found' };
    } catch (error) {
      console.error('Get setup error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update business setup data
  static async updateBusinessSetup(updates) {
    try {
      const currentSetup = await this.getBusinessSetup();
      if (!currentSetup.success) {
        return { success: false, error: 'No existing setup found' };
      }

      const updatedSetup = {
        ...currentSetup.data,
        ...updates,
        lastUpdatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(this.SETUP_KEY, JSON.stringify(updatedSetup));

      return { success: true, data: updatedSetup };
    } catch (error) {
      console.error('Update setup error:', error);
      return { success: false, error: error.message };
    }
  }

  // Reset setup (for testing or re-setup)
  static async resetSetup() {
    try {
      await AsyncStorage.removeItem(this.SETUP_KEY);
      await AsyncStorage.removeItem(this.SETUP_COMPLETE_KEY);
      return { success: true };
    } catch (error) {
      console.error('Reset setup error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get business type display name
  static getBusinessTypeDisplay(businessType) {
    const types = {
      trader: 'Trader / Shop',
      service: 'Service Business',
    };
    return types[businessType] || businessType;
  }

  // Validate GSTIN format
  static validateGSTIN(gstin) {
    if (!gstin) return true; // Optional field
    
    // GSTIN format: 2 digits (state code) + 10 alphanumeric (PAN) + 1 digit (entity number) + 1 letter (Z) + 1 alphanumeric (checksum)
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
  }

  // Get state code from GSTIN
  static getStateCodeFromGSTIN(gstin) {
    if (!gstin || gstin.length < 2) return null;
    return gstin.substring(0, 2);
  }

  // Calculate financial year
  static getCurrentFinancialYear(startMonth = 'April') {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 0-indexed

    const startMonthNumber = {
      'January': 1,
      'April': 4,
      'July': 7,
      'October': 10,
    }[startMonth] || 4;

    if (currentMonth >= startMonthNumber) {
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
  }

  // Get tax type based on state
  static getTaxType(businessState, customerState) {
    if (businessState === customerState) {
      return 'CGST_SGST'; // Intra-state
    } else {
      return 'IGST'; // Inter-state
    }
  }
}
