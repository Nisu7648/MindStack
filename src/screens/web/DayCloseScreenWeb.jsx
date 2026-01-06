/**
 * DAY CLOSE SCREEN - WEB VERSION
 * Daily cash verification and closing
 */

import React, { useState, useEffect } from 'react';
import './DayCloseScreenWeb.css';
import integrationService from '../../services/integration/integrationService';
import cashGuard from '../../services/pos/cashGuard';

const DayCloseScreenWeb = () => {
  const [loading, setLoading] = useState(true);
  const [isDayStarted, setIsDayStarted] = useState(false);
  const [summary, setSummary] = useState(null);
  const [physicalCash, setPhysicalCash] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    checkDayStatus();
  }, []);

  const checkDayStatus = async () => {
    try {
      setLoading(true);
      const started = await cashGuard.isDayStarted();
      setIsDayStarted(started);

      if (started) {
        const summaryResult = await cashGuard.getTodaySalesSummary();
        if (summaryResult.success) {
          setSummary(summaryResult.summary);
        }
      }
    } catch (error) {
      console.error('Check day status error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDay = async () => {
    const openingCash = prompt('Enter opening cash amount:');
    if (!openingCash) return;

    try {
      const result = await cashGuard.startDay(parseFloat(openingCash));
      if (result.success) {
        alert('Day started successfully!');
        checkDayStatus();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Start day error:', error);
      alert('Failed to start day');
    }
  };

  const handleCloseDay = async () => {
    if (!physicalCash) {
      alert('Please enter physical cash amount');
      return;
    }

    try {
      const result = await integrationService.closeDay(parseFloat(physicalCash));

      if (result.success) {
        const dayClose = result.dayClose;
        let message = `Day closed successfully!\n\n`;
        message += `Expected Cash: ₹${dayClose.expected_cash}\n`;
        message += `Physical Cash: ₹${dayClose.physical_cash}\n`;
        message += `Difference: ₹${Math.abs(dayClose.difference)}\n`;
        message += `Status: ${dayClose.status}`;

        alert(message);
        setShowConfirm(false);
        setPhysicalCash('');
        checkDayStatus();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Close day error:', error);
      alert('Failed to close day');
    }
  };

  if (loading) {
    return (
      <div className="dayclose-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isDayStarted) {
    return (
      <div className="dayclose-container">
        <div className="dayclose-empty">
          <i className="fas fa-sun"></i>
          <h2>Day Not Started</h2>
          <p>Start the day to begin billing operations</p>
          <button className="btn-start-day" onClick={handleStartDay}>
            <i className="fas fa-play"></i> Start Day
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dayclose-container">
      {/* Header */}
      <div className="dayclose-header">
        <div className="header-left">
          <h1>Day Close</h1>
          <p className="subtitle">Daily cash verification and closing</p>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={checkDayStatus}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="card-icon primary">
            <i className="fas fa-wallet"></i>
          </div>
          <div className="card-content">
            <div className="card-value">₹{summary?.opening_cash?.toLocaleString('en-IN') || 0}</div>
            <div className="card-label">Opening Cash</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon success">
            <i className="fas fa-money-bill-wave"></i>
          </div>
          <div className="card-content">
            <div className="card-value">₹{summary?.cash_sales?.toLocaleString('en-IN') || 0}</div>
            <div className="card-label">Cash Sales</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon info">
            <i className="fas fa-credit-card"></i>
          </div>
          <div className="card-content">
            <div className="card-value">₹{summary?.upi_sales?.toLocaleString('en-IN') || 0}</div>
            <div className="card-label">UPI Sales</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon warning">
            <i className="fas fa-calculator"></i>
          </div>
          <div className="card-content">
            <div className="card-value">₹{summary?.expected_cash?.toLocaleString('en-IN') || 0}</div>
            <div className="card-label">Expected Cash</div>
          </div>
        </div>
      </div>

      {/* Sales Breakdown */}
      <div className="breakdown-section">
        <h2>Sales Breakdown</h2>
        <div className="breakdown-grid">
          <div className="breakdown-card">
            <div className="breakdown-header">
              <i className="fas fa-receipt"></i>
              <span>Total Bills</span>
            </div>
            <div className="breakdown-value">{summary?.total_bills || 0}</div>
          </div>

          <div className="breakdown-card">
            <div className="breakdown-header">
              <i className="fas fa-rupee-sign"></i>
              <span>Total Sales</span>
            </div>
            <div className="breakdown-value">₹{summary?.total_sales?.toLocaleString('en-IN') || 0}</div>
          </div>

          <div className="breakdown-card">
            <div className="breakdown-header">
              <i className="fas fa-money-bill"></i>
              <span>Cash</span>
            </div>
            <div className="breakdown-value">₹{summary?.cash_sales?.toLocaleString('en-IN') || 0}</div>
          </div>

          <div className="breakdown-card">
            <div className="breakdown-header">
              <i className="fas fa-mobile-alt"></i>
              <span>UPI</span>
            </div>
            <div className="breakdown-value">₹{summary?.upi_sales?.toLocaleString('en-IN') || 0}</div>
          </div>

          <div className="breakdown-card">
            <div className="breakdown-header">
              <i className="fas fa-credit-card"></i>
              <span>Card</span>
            </div>
            <div className="breakdown-value">₹{summary?.card_sales?.toLocaleString('en-IN') || 0}</div>
          </div>

          <div className="breakdown-card">
            <div className="breakdown-header">
              <i className="fas fa-clock"></i>
              <span>Credit</span>
            </div>
            <div className="breakdown-value">₹{summary?.credit_sales?.toLocaleString('en-IN') || 0}</div>
          </div>
        </div>
      </div>

      {/* Cash Verification */}
      <div className="verification-section">
        <h2>Cash Verification</h2>
        <div className="verification-card">
          <div className="verification-info">
            <div className="info-row">
              <span>Opening Cash:</span>
              <strong>₹{summary?.opening_cash?.toLocaleString('en-IN') || 0}</strong>
            </div>
            <div className="info-row">
              <span>Cash Sales:</span>
              <strong>₹{summary?.cash_sales?.toLocaleString('en-IN') || 0}</strong>
            </div>
            <div className="info-row total">
              <span>Expected Cash:</span>
              <strong>₹{summary?.expected_cash?.toLocaleString('en-IN') || 0}</strong>
            </div>
          </div>

          <div className="verification-input">
            <label>Enter Physical Cash Amount:</label>
            <div className="input-group">
              <span className="input-prefix">₹</span>
              <input
                type="number"
                className="cash-input"
                placeholder="0.00"
                value={physicalCash}
                onChange={(e) => setPhysicalCash(e.target.value)}
              />
            </div>
          </div>

          {physicalCash && (
            <div className="difference-preview">
              <div className={`difference ${parseFloat(physicalCash) === summary?.expected_cash ? 'matched' : 'mismatch'}`}>
                <span>Difference:</span>
                <strong>
                  ₹{Math.abs((parseFloat(physicalCash) || 0) - (summary?.expected_cash || 0)).toFixed(2)}
                  {parseFloat(physicalCash) < summary?.expected_cash ? ' SHORT' : 
                   parseFloat(physicalCash) > summary?.expected_cash ? ' EXCESS' : ' MATCHED'}
                </strong>
              </div>
            </div>
          )}

          <button
            className="btn-close-day"
            onClick={() => setShowConfirm(true)}
            disabled={!physicalCash}
          >
            <i className="fas fa-moon"></i> Close Day
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Day Close</h2>
              <button className="btn-close" onClick={() => setShowConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="confirm-details">
                <p><strong>Are you sure you want to close the day?</strong></p>
                <div className="confirm-summary">
                  <div className="confirm-row">
                    <span>Expected Cash:</span>
                    <span>₹{summary?.expected_cash?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="confirm-row">
                    <span>Physical Cash:</span>
                    <span>₹{parseFloat(physicalCash).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="confirm-row highlight">
                    <span>Difference:</span>
                    <span>
                      ₹{Math.abs((parseFloat(physicalCash) || 0) - (summary?.expected_cash || 0)).toFixed(2)}
                      {parseFloat(physicalCash) < summary?.expected_cash ? ' SHORT' : 
                       parseFloat(physicalCash) > summary?.expected_cash ? ' EXCESS' : ' MATCHED'}
                    </span>
                  </div>
                </div>
                <p className="warning-text">
                  <i className="fas fa-exclamation-triangle"></i>
                  This action cannot be undone. Make sure all bills are completed.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleCloseDay}>
                Confirm Close Day
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayCloseScreenWeb;
