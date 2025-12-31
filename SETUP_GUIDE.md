# 🚀 MindStack Setup Guide

## Quick Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Nisu7648/MindStack.git
cd MindStack
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup React Native Environment
Follow the official React Native setup guide for your platform:
- [Android Setup](https://reactnative.dev/docs/environment-setup)
- [iOS Setup](https://reactnative.dev/docs/environment-setup) (Mac only)

### 4. Run the Application

**For Android:**
```bash
npm run android
```

**For iOS (Mac only):**
```bash
cd ios && pod install && cd ..
npm run ios
```

## Project Structure

```
MindStack/
├── src/
│   ├── database/              # SQLite database schema and queries
│   │   ├── schema.js          # Database tables definition
│   │   └── queries.js         # SQL query functions
│   │
│   ├── services/              # Business logic layer
│   │   ├── AccountingEngine.js
│   │   ├── GSTCalculator.js
│   │   ├── TDSCalculator.js
│   │   ├── InvoiceService.js
│   │   ├── PaymentService.js
│   │   ├── StockManagementService.js
│   │   ├── ReportService.js
│   │   ├── LocalOCRScanner.js
│   │   └── accounting-engine/  # CA-Grade Accounting Engine
│   │       ├── AccountingSystem.js
│   │       ├── CAAccountingEngine.js
│   │       ├── NaturalLanguageProcessor.js
│   │       ├── GSTComplianceEngine.js
│   │       └── LedgerManager.js
│   │
│   ├── screens/               # React Native UI screens
│   │   ├── LoginScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── CreateInvoiceScreen.js
│   │   ├── RecordPaymentScreen.js
│   │   ├── ReportsScreen.js
│   │   ├── StockManagementScreen.js
│   │   ├── SettingsScreen.js
│   │   ├── CustomerManagementScreen.js
│   │   └── ProductManagementScreen.js
│   │
│   ├── components/            # Reusable UI components
│   │   ├── ErrorBoundary.js
│   │   ├── LoadingSpinner.js
│   │   └── EmptyState.js
│   │
│   └── __tests__/             # Test suites
│       ├── services/
│       └── components/
│
├── docs/                      # Documentation
│   └── ACCOUNTING_ENGINE.md
│
├── examples/                  # Usage examples
│   └── accounting-engine-demo.js
│
├── App.js                     # Main navigation setup
├── package.json               # Dependencies
├── .gitignore                 # Git ignore rules
└── LICENSE                    # MIT License
```

## Source Files to Copy

### Essential Files (Already Added ✅)
- ✅ README.md
- ✅ package.json
- ✅ App.js
- ✅ .gitignore
- ✅ LICENSE

### Files to Copy from Original Repository

You need to copy the following directories from the original repository:

1. **src/database/** - Database schema and queries
2. **src/services/** - All business logic services
3. **src/screens/** - All UI screens
4. **src/components/** - Reusable components
5. **src/__tests__/** - Test suites
6. **docs/** - Documentation files
7. **examples/** - Example code

### Manual Copy Instructions

Since the original repository (ranay3277-star/ai-accounting-pos-system) contains the complete source code, you can:

**Option 1: Clone and Copy**
```bash
# Clone the original repo
git clone https://github.com/ranay3277-star/ai-accounting-pos-system.git temp-repo

# Copy the src directory
cp -r temp-repo/src MindStack/

# Copy docs and examples
cp -r temp-repo/docs MindStack/
cp -r temp-repo/examples MindStack/

# Clean up
rm -rf temp-repo
```

**Option 2: Download as ZIP**
1. Visit: https://github.com/ranay3277-star/ai-accounting-pos-system
2. Click "Code" → "Download ZIP"
3. Extract and copy the `src/`, `docs/`, and `examples/` folders to MindStack

## Configuration

### 1. Database Setup
The app uses SQLite for local storage. The database will be automatically created on first run.

### 2. Company Settings
Configure your company details in the Settings screen:
- Company Name
- GST Number
- PAN Number
- Address
- Tax Settings

### 3. Initial Data
You can add:
- Customers/Suppliers
- Products
- Opening Stock
- Opening Balances

## Testing

Run the test suite:
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Features to Test

1. **Accounting Engine**
   - Natural language transaction processing
   - Voice input (requires device with microphone)
   - Double-entry bookkeeping validation

2. **GST Calculations**
   - CGST/SGST for intra-state
   - IGST for inter-state
   - Reverse charge mechanism

3. **Inventory Management**
   - Stock in/out
   - FIFO valuation
   - Low stock alerts

4. **Reports**
   - Trial Balance
   - Profit & Loss
   - Balance Sheet
   - GST Reports
   - Stock Reports

## Troubleshooting

### Common Issues

**1. Metro Bundler Issues**
```bash
npm start -- --reset-cache
```

**2. Android Build Errors**
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

**3. iOS Pod Issues**
```bash
cd ios && pod deintegrate && pod install && cd ..
```

**4. Database Errors**
- Clear app data and reinstall
- Check SQLite permissions

## Next Steps

1. ✅ Copy source files from original repository
2. ✅ Install dependencies
3. ✅ Run tests to verify setup
4. ✅ Configure company settings
5. ✅ Start using the app!

## Support

For issues or questions:
- GitHub Issues: https://github.com/Nisu7648/MindStack/issues
- Original Repo: https://github.com/ranay3277-star/ai-accounting-pos-system

## License

MIT License - See LICENSE file for details
