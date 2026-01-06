/**
 * COMPLIANCE REPORT SCREEN - WEB VERSION
 * Real-world compliance checking for web/desktop
 */

import React, { useState, useEffect } from 'react';
import './ComplianceReportScreenWeb.css';
import complianceEngine from '../../services/audit/complianceEngine';

const ComplianceReportScreenWeb = () => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('THIS_MONTH');

  useEffect(() => {
    generateReport();
  }, [selectedPeriod]);

  const generateReport = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getPeriodDates(selectedPeriod);
      const result = await complianceEngine.generateComplianceReport(startDate, endDate);

      if (result.success) {
        setReport(result.report);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Generate report error:', error);
      alert('Failed to generate compliance report');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodDates = (period) => {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'TODAY':
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString();
        break;
      case 'THIS_WEEK':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        startDate = weekStart.toISOString();
        endDate = new Date().toISOString();
        break;
      case 'THIS_MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        endDate = new Date().toISOString();
        break;
      case 'THIS_QUARTER':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString();
        endDate = new Date().toISOString();
        break;
      case 'THIS_YEAR':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
        endDate = new Date().toISOString();
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        endDate = new Date().toISOString();
    }

    return { startDate, endDate };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASS': return '#4CAF50';
      case 'FAIL': return '#F44336';
      case 'WARNING': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASS': return 'fa-check-circle';
      case 'FAIL': return 'fa-times-circle';
      case 'WARNING': return 'fa-exclamation-circle';
      default: return 'fa-question-circle';
    }
  };

  if (loading) {
    return (
      <div className="compliance-loading">
        <div className="spinner"></div>
        <p>Generating compliance report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="compliance-error">
        <i className="fas fa-exclamation-triangle"></i>
        <p>Failed to generate report</p>
        <button className="btn-retry" onClick={generateReport}>Retry</button>
      </div>
    );
  }

  return (
    <div className="compliance-container">
      {/* Header */}
      <div className="compliance-header">
        <div className="header-left">
          <h1>Compliance Report</h1>
          <p className="subtitle">Real-time compliance checking and validation</p>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={generateReport}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
          <button className="btn-export">
            <i className="fas fa-download"></i> Export PDF
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="period-selector">
        {['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR'].map(period => (
          <button
            key={period}
            className={`period-btn ${selectedPeriod === period ? 'active' : ''}`}
            onClick={() => setSelectedPeriod(period)}
          >
            {period.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Overall Status */}
      <div className={`overall-status ${report.overallStatus === 'COMPLIANT' ? 'compliant' : 'non-compliant'}`}>
        <div className="status-icon">
          <i className={`fas ${report.overallStatus === 'COMPLIANT' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
        </div>
        <div className="status-content">
          <h2>{report.overallStatus === 'COMPLIANT' ? 'COMPLIANT' : 'NON-COMPLIANT'}</h2>
          <p>{report.checks.filter(c => c.status === 'PASS').length} of {report.checks.length} checks passed</p>
        </div>
      </div>

      {/* Compliance Checks */}
      <div className="checks-section">
        <h2>Compliance Checks</h2>
        <div className="checks-grid">
          {report.checks.map((check, index) => (
            <div key={index} className="check-card">
              <div className="check-header">
                <div className="check-icon" style={{ color: getStatusColor(check.status) }}>
                  <i className={`fas ${getStatusIcon(check.status)}`}></i>
                </div>
                <div className="check-info">
                  <h3>{check.name}</h3>
                  <span className="check-status" style={{ backgroundColor: getStatusColor(check.status) }}>
                    {check.status}
                  </span>
                </div>
              </div>

              {/* Check Details */}
              {check.name === 'Trial Balance' && check.details && (
                <div className="check-details">
                  <div className="detail-row">
                    <span>Total Debit:</span>
                    <span>₹{check.details.totalDebit?.toLocaleString('en-IN') || 0}</span>
                  </div>
                  <div className="detail-row">
                    <span>Total Credit:</span>
                    <span>₹{check.details.totalCredit?.toLocaleString('en-IN') || 0}</span>
                  </div>
                  {check.details.difference !== 0 && (
                    <div className="detail-row error">
                      <span>Difference:</span>
                      <span>₹{Math.abs(check.details.difference || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              )}

              {check.name === 'Unposted Transactions' && check.details?.count > 0 && (
                <div className="check-details">
                  <p className="warning-text">
                    {check.details.count} unposted transaction(s) found
                  </p>
                </div>
              )}

              {check.name === 'Invoice Sequence' && check.details?.gaps?.length > 0 && (
                <div className="check-details">
                  <p className="warning-text">
                    {check.details.gaps.length} gap(s) in invoice sequence
                  </p>
                  {check.details.gaps.slice(0, 3).map((gap, i) => (
                    <p key={i} className="gap-text">
                      • Gap between {gap.from} and {gap.to} ({gap.missing} missing)
                    </p>
                  ))}
                </div>
              )}

              {check.name === 'Stock Validation' && check.details?.negativeItems?.length > 0 && (
                <div className="check-details">
                  <p className="warning-text">
                    {check.details.negativeItems.length} item(s) with negative stock
                  </p>
                  {check.details.negativeItems.slice(0, 3).map((item, i) => (
                    <p key={i} className="gap-text">
                      • {item.item_name}: {item.current_stock} {item.unit}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {report.overallStatus !== 'COMPLIANT' && (
        <div className="recommendations-section">
          <h2><i className="fas fa-lightbulb"></i> Recommendations</h2>
          <div className="recommendations-list">
            {report.checks.filter(c => c.status !== 'PASS').map((check, index) => (
              <div key={index} className="recommendation-item">
                <i className="fas fa-chevron-right"></i>
                <div className="recommendation-content">
                  <strong>{check.name}:</strong>
                  <span>
                    {check.name === 'Trial Balance' && ' Review and correct ledger entries to balance trial balance'}
                    {check.name === 'Unposted Transactions' && ' Post all draft transactions before closing period'}
                    {check.name === 'Invoice Sequence' && ' Review invoice numbering for gaps or duplicates'}
                    {check.name === 'Stock Validation' && ' Adjust negative stock items or review stock movements'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance Standards */}
      <div className="standards-section">
        <h2>Compliance Standards</h2>
        <div className="standards-grid">
          <div className="standard-card">
            <i className="fas fa-building"></i>
            <h3>Companies Act 2013</h3>
            <p>Complete audit trail and financial records</p>
          </div>
          <div className="standard-card">
            <i className="fas fa-file-invoice-dollar"></i>
            <h3>GST Act 2017</h3>
            <p>Valid GST rates and invoice compliance</p>
          </div>
          <div className="standard-card">
            <i className="fas fa-balance-scale"></i>
            <h3>Income Tax Act</h3>
            <p>Books of accounts and data retention</p>
          </div>
          <div className="standard-card">
            <i className="fas fa-check-double"></i>
            <h3>GAAP Principles</h3>
            <p>Double-entry bookkeeping and trial balance</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceReportScreenWeb;
