import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import booksService from '../../services/accounting/booksService';

const BooksScreen = () => {
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookData, setBookData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0], // April 1
    endDate: new Date().toISOString().split('T')[0]
  });

  const books = [
    { id: 'journal', name: 'Journal Book', icon: '📖', description: 'Complete transaction record' },
    { id: 'cash', name: 'Cash Book', icon: '💵', description: 'All cash transactions' },
    { id: 'bank', name: 'Bank Book', icon: '🏦', description: 'Bank account transactions' },
    { id: 'ledger', name: 'Ledger', icon: '📊', description: 'Account-wise details' },
    { id: 'trial', name: 'Trial Balance', icon: '⚖️', description: 'Balanced summary' },
    { id: 'pl', name: 'Profit & Loss', icon: '💰', description: 'Income statement' },
    { id: 'balance', name: 'Balance Sheet', icon: '📋', description: 'Financial position' }
  ];

  const loadBookData = async (bookId) => {
    setLoading(true);
    try {
      let data;
      switch (bookId) {
        case 'journal':
          data = await booksService.getJournalBook(dateRange.startDate, dateRange.endDate);
          break;
        case 'cash':
          data = await booksService.getCashBook(dateRange.startDate, dateRange.endDate);
          break;
        case 'bank':
          const bankAccounts = await booksService.getAllBankAccounts();
          if (bankAccounts.length > 0) {
            data = await booksService.getBankBook(bankAccounts[0].id, dateRange.startDate, dateRange.endDate);
          }
          break;
        case 'ledger':
          const accounts = await booksService.getAllAccounts();
          if (accounts.length > 0) {
            data = await booksService.getLedger(accounts[0].name, dateRange.startDate, dateRange.endDate);
          }
          break;
        case 'trial':
          data = await booksService.getTrialBalance(dateRange.endDate);
          break;
        case 'pl':
          data = await booksService.getProfitAndLoss(dateRange.startDate, dateRange.endDate);
          break;
        case 'balance':
          data = await booksService.getBalanceSheet(dateRange.endDate);
          break;
      }
      setBookData(data);
    } catch (error) {
      console.error('Error loading book:', error);
    } finally {
      setLoading(false);
    }
  };

  const openBook = (bookId) => {
    setSelectedBook(bookId);
    loadBookData(bookId);
  };

  const closeBook = () => {
    setSelectedBook(null);
    setBookData(null);
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderJournalBook = () => {
    if (!bookData || bookData.length === 0) {
      return <Text style={styles.emptyText}>No transactions found</Text>;
    }

    return (
      <ScrollView horizontal>
        <View>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: 100 }]}>Date</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Voucher No</Text>
            <Text style={[styles.tableHeaderText, { width: 250 }]}>Particulars</Text>
            <Text style={[styles.tableHeaderText, { width: 60 }]}>LF</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Debit (₹)</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Credit (₹)</Text>
          </View>

          {/* Rows */}
          {bookData.map((entry, index) => (
            <View key={index} style={styles.journalEntry}>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: 100 }]}>{entry.date}</Text>
                <Text style={[styles.tableCell, { width: 120 }]}>{entry.voucherNo}</Text>
                <Text style={[styles.tableCell, { width: 250, fontWeight: '600' }]}>{entry.narration}</Text>
                <Text style={[styles.tableCell, { width: 60 }]}></Text>
                <Text style={[styles.tableCell, { width: 120 }]}></Text>
                <Text style={[styles.tableCell, { width: 120 }]}></Text>
              </View>
              {entry.lines.map((line, lineIndex) => (
                <View key={lineIndex} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 100 }]}></Text>
                  <Text style={[styles.tableCell, { width: 120 }]}></Text>
                  <Text style={[styles.tableCell, { width: 250, paddingLeft: 20 }]}>
                    {line.debit > 0 ? 'Dr. ' : '    Cr. '}{line.accountName}
                  </Text>
                  <Text style={[styles.tableCell, { width: 60 }]}>{line.lf || '-'}</Text>
                  <Text style={[styles.tableCellNumber, { width: 120 }]}>
                    {line.debit > 0 ? formatCurrency(line.debit) : ''}
                  </Text>
                  <Text style={[styles.tableCellNumber, { width: 120 }]}>
                    {line.credit > 0 ? formatCurrency(line.credit) : ''}
                  </Text>
                </View>
              ))}
              <View style={styles.entrySeparator} />
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderCashBook = () => {
    if (!bookData) {
      return <Text style={styles.emptyText}>No data available</Text>;
    }

    return (
      <ScrollView horizontal>
        <View>
          {/* Opening Balance */}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>Opening Balance: {formatCurrency(bookData.openingBalance)}</Text>
          </View>

          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: 100 }]}>Date</Text>
            <Text style={[styles.tableHeaderText, { width: 200 }]}>Particulars</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Voucher No</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Receipts (₹)</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Payments (₹)</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Balance (₹)</Text>
          </View>

          {/* Rows */}
          {bookData.transactions.map((txn, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: 100 }]}>{txn.date}</Text>
              <Text style={[styles.tableCell, { width: 200 }]}>{txn.particulars}</Text>
              <Text style={[styles.tableCell, { width: 120 }]}>{txn.voucherNo}</Text>
              <Text style={[styles.tableCellNumber, { width: 120 }]}>
                {txn.receipts > 0 ? formatCurrency(txn.receipts) : ''}
              </Text>
              <Text style={[styles.tableCellNumber, { width: 120 }]}>
                {txn.payments > 0 ? formatCurrency(txn.payments) : ''}
              </Text>
              <Text style={[styles.tableCellNumber, { width: 120 }]}>{formatCurrency(txn.balance)}</Text>
            </View>
          ))}

          {/* Closing Balance */}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>Closing Balance: {formatCurrency(bookData.closingBalance)}</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderBankBook = () => {
    if (!bookData) {
      return <Text style={styles.emptyText}>No bank account found</Text>;
    }

    return (
      <ScrollView horizontal>
        <View>
          {/* Bank Name */}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>Bank: {bookData.bankAccountName}</Text>
          </View>

          {/* Opening Balance */}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>Opening Balance: {formatCurrency(bookData.openingBalance)}</Text>
          </View>

          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: 100 }]}>Date</Text>
            <Text style={[styles.tableHeaderText, { width: 200 }]}>Particulars</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Ref/Cheque No</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Deposits (₹)</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Withdrawals (₹)</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Balance (₹)</Text>
          </View>

          {/* Rows */}
          {bookData.transactions.map((txn, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: 100 }]}>{txn.date}</Text>
              <Text style={[styles.tableCell, { width: 200 }]}>{txn.particulars}</Text>
              <Text style={[styles.tableCell, { width: 120 }]}>{txn.referenceNo || '-'}</Text>
              <Text style={[styles.tableCellNumber, { width: 120 }]}>
                {txn.deposits > 0 ? formatCurrency(txn.deposits) : ''}
              </Text>
              <Text style={[styles.tableCellNumber, { width: 120 }]}>
                {txn.withdrawals > 0 ? formatCurrency(txn.withdrawals) : ''}
              </Text>
              <Text style={[styles.tableCellNumber, { width: 120 }]}>{formatCurrency(txn.balance)}</Text>
            </View>
          ))}

          {/* Closing Balance */}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>Closing Balance: {formatCurrency(bookData.closingBalance)}</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderLedger = () => {
    if (!bookData) {
      return <Text style={styles.emptyText}>No account selected</Text>;
    }

    return (
      <ScrollView horizontal>
        <View>
          {/* Account Name */}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>Account: {bookData.accountName}</Text>
          </View>

          {/* Opening Balance */}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>Opening Balance: {formatCurrency(bookData.openingBalance)}</Text>
          </View>

          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: 100 }]}>Date</Text>
            <Text style={[styles.tableHeaderText, { width: 200 }]}>Particulars</Text>
            <Text style={[styles.tableHeaderText, { width: 100 }]}>Voucher No</Text>
            <Text style={[styles.tableHeaderText, { width: 60 }]}>LF</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Debit (₹)</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Credit (₹)</Text>
            <Text style={[styles.tableHeaderText, { width: 120 }]}>Balance (₹)</Text>
          </View>

          {/* Rows */}
          {bookData.transactions.map((txn, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: 100 }]}>{txn.date}</Text>
              <Text style={[styles.tableCell, { width: 200 }]}>{txn.particulars}</Text>
              <Text style={[styles.tableCell, { width: 100 }]}>{txn.voucherNo}</Text>
              <Text style={[styles.tableCell, { width: 60 }]}>{txn.lf || '-'}</Text>
              <Text style={[styles.tableCellNumber, { width: 120 }]}>
                {txn.debit > 0 ? formatCurrency(txn.debit) : ''}
              </Text>
              <Text style={[styles.tableCellNumber, { width: 120 }]}>
                {txn.credit > 0 ? formatCurrency(txn.credit) : ''}
              </Text>
              <Text style={[styles.tableCellNumber, { width: 120 }]}>{formatCurrency(txn.balance)}</Text>
            </View>
          ))}

          {/* Closing Balance */}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>Closing Balance: {formatCurrency(bookData.closingBalance)}</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderTrialBalance = () => {
    if (!bookData) {
      return <Text style={styles.emptyText}>No data available</Text>;
    }

    return (
      <ScrollView horizontal>
        <View>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: 250 }]}>Account Name</Text>
            <Text style={[styles.tableHeaderText, { width: 150 }]}>Debit (₹)</Text>
            <Text style={[styles.tableHeaderText, { width: 150 }]}>Credit (₹)</Text>
          </View>

          {/* Rows */}
          {bookData.accounts.map((account, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: 250 }]}>{account.accountName}</Text>
              <Text style={[styles.tableCellNumber, { width: 150 }]}>
                {account.debit > 0 ? formatCurrency(account.debit) : ''}
              </Text>
              <Text style={[styles.tableCellNumber, { width: 150 }]}>
                {account.credit > 0 ? formatCurrency(account.credit) : ''}
              </Text>
            </View>
          ))}

          {/* Totals */}
          <View style={[styles.tableRow, styles.totalRow]}>
            <Text style={[styles.tableCell, { width: 250, fontWeight: 'bold' }]}>TOTAL</Text>
            <Text style={[styles.tableCellNumber, { width: 150, fontWeight: 'bold' }]}>
              {formatCurrency(bookData.totalDebit)}
            </Text>
            <Text style={[styles.tableCellNumber, { width: 150, fontWeight: 'bold' }]}>
              {formatCurrency(bookData.totalCredit)}
            </Text>
          </View>

          {/* Balance Status */}
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceText, { color: bookData.isBalanced ? '#10B981' : '#EF4444' }]}>
              {bookData.isBalanced ? '✅ Trial Balance is Balanced' : `❌ Difference: ${formatCurrency(bookData.difference)}`}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderProfitAndLoss = () => {
    if (!bookData) {
      return <Text style={styles.emptyText}>No data available</Text>;
    }

    return (
      <ScrollView>
        <View style={styles.reportContainer}>
          {/* Revenue Section */}
          <Text style={styles.sectionTitle}>REVENUE</Text>
          {bookData.revenue.map((item, index) => (
            <View key={index} style={styles.reportRow}>
              <Text style={styles.reportLabel}>{item.accountName}</Text>
              <Text style={styles.reportValue}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
          <View style={[styles.reportRow, styles.totalRow]}>
            <Text style={styles.reportLabelBold}>Total Revenue</Text>
            <Text style={styles.reportValueBold}>{formatCurrency(bookData.totalRevenue)}</Text>
          </View>

          {/* Expenses Section */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>EXPENSES</Text>
          {bookData.expenses.map((item, index) => (
            <View key={index} style={styles.reportRow}>
              <Text style={styles.reportLabel}>{item.accountName}</Text>
              <Text style={styles.reportValue}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
          <View style={[styles.reportRow, styles.totalRow]}>
            <Text style={styles.reportLabelBold}>Total Expenses</Text>
            <Text style={styles.reportValueBold}>{formatCurrency(bookData.totalExpenses)}</Text>
          </View>

          {/* Net Profit */}
          <View style={[styles.reportRow, styles.netProfitRow]}>
            <Text style={styles.netProfitLabel}>
              {bookData.netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
            </Text>
            <Text style={[styles.netProfitValue, { color: bookData.netProfit >= 0 ? '#10B981' : '#EF4444' }]}>
              {formatCurrency(Math.abs(bookData.netProfit))}
            </Text>
          </View>
          <Text style={styles.percentageText}>
            {bookData.netProfitPercentage.toFixed(2)}% of Revenue
          </Text>
        </View>
      </ScrollView>
    );
  };

  const renderBalanceSheet = () => {
    if (!bookData) {
      return <Text style={styles.emptyText}>No data available</Text>;
    }

    return (
      <ScrollView>
        <View style={styles.reportContainer}>
          {/* Assets Section */}
          <Text style={styles.sectionTitle}>ASSETS</Text>
          
          <Text style={styles.subSectionTitle}>Current Assets</Text>
          {bookData.assets.currentAssets.map((item, index) => (
            <View key={index} style={styles.reportRow}>
              <Text style={styles.reportLabel}>{item.accountName}</Text>
              <Text style={styles.reportValue}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}

          <Text style={styles.subSectionTitle}>Fixed Assets</Text>
          {bookData.assets.fixedAssets.map((item, index) => (
            <View key={index} style={styles.reportRow}>
              <Text style={styles.reportLabel}>{item.accountName}</Text>
              <Text style={styles.reportValue}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}

          <View style={[styles.reportRow, styles.totalRow]}>
            <Text style={styles.reportLabelBold}>Total Assets</Text>
            <Text style={styles.reportValueBold}>{formatCurrency(bookData.totalAssets)}</Text>
          </View>

          {/* Liabilities Section */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>LIABILITIES</Text>
          
          <Text style={styles.subSectionTitle}>Current Liabilities</Text>
          {bookData.liabilities.currentLiabilities.map((item, index) => (
            <View key={index} style={styles.reportRow}>
              <Text style={styles.reportLabel}>{item.accountName}</Text>
              <Text style={styles.reportValue}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}

          <Text style={styles.subSectionTitle}>Capital</Text>
          {bookData.liabilities.capital.map((item, index) => (
            <View key={index} style={styles.reportRow}>
              <Text style={styles.reportLabel}>{item.accountName}</Text>
              <Text style={styles.reportValue}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}

          <View style={[styles.reportRow, styles.totalRow]}>
            <Text style={styles.reportLabelBold}>Total Liabilities</Text>
            <Text style={styles.reportValueBold}>{formatCurrency(bookData.totalLiabilities)}</Text>
          </View>

          {/* Balance Status */}
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceText, { color: bookData.isBalanced ? '#10B981' : '#EF4444' }]}>
              {bookData.isBalanced ? '✅ Balance Sheet is Balanced' : `❌ Difference: ${formatCurrency(bookData.difference)}`}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderBookContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A1A1A" />
          <Text style={styles.loadingText}>Loading book...</Text>
        </View>
      );
    }

    switch (selectedBook) {
      case 'journal':
        return renderJournalBook();
      case 'cash':
        return renderCashBook();
      case 'bank':
        return renderBankBook();
      case 'ledger':
        return renderLedger();
      case 'trial':
        return renderTrialBalance();
      case 'pl':
        return renderProfitAndLoss();
      case 'balance':
        return renderBalanceSheet();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📚 My Books</Text>
        <Text style={styles.subtitle}>Read-only view of all accounting books</Text>
      </View>

      <ScrollView style={styles.booksList}>
        {books.map((book) => (
          <TouchableOpacity
            key={book.id}
            style={styles.bookCard}
            onPress={() => openBook(book.id)}
          >
            <Text style={styles.bookIcon}>{book.icon}</Text>
            <View style={styles.bookInfo}>
              <Text style={styles.bookName}>{book.name}</Text>
              <Text style={styles.bookDescription}>{book.description}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📌 These books are automatically prepared from your transactions. No manual editing required.
        </Text>
      </View>

      {/* Book Modal */}
      <Modal
        visible={selectedBook !== null}
        animationType="slide"
        onRequestClose={closeBook}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeBook} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕ Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {books.find(b => b.id === selectedBook)?.name}
            </Text>
            <View style={{ width: 80 }} />
          </View>

          <View style={styles.modalContent}>
            {renderBookContent()}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
  booksList: {
    flex: 1,
    padding: 16,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  bookIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  bookInfo: {
    flex: 1,
  },
  bookName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  bookDescription: {
    fontSize: 13,
    color: '#666',
  },
  arrow: {
    fontSize: 24,
    color: '#999',
  },
  infoBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1A1A1A',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    marginTop: 40,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tableCell: {
    fontSize: 13,
    color: '#1A1A1A',
    paddingHorizontal: 8,
  },
  tableCellNumber: {
    fontSize: 13,
    color: '#1A1A1A',
    paddingHorizontal: 8,
    textAlign: 'right',
  },
  journalEntry: {
    marginBottom: 8,
  },
  entrySeparator: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 4,
  },
  balanceRow: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginVertical: 8,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  totalRow: {
    backgroundColor: '#F9FAFB',
    borderTopWidth: 2,
    borderTopColor: '#1A1A1A',
  },
  reportContainer: {
    padding: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    marginTop: 8,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  reportLabel: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
  },
  reportValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  reportLabelBold: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '700',
    flex: 1,
  },
  reportValueBold: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '700',
  },
  netProfitRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  netProfitLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  netProfitValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  percentageText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
});

export default BooksScreen;
