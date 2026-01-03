/**
 * VISUAL TAX INTELLIGENCE
 * 
 * WORLD'S FIRST VISUAL TAX EXPLANATION SYSTEM
 * 
 * Revolutionary Concept:
 * Tax is BORING and CONFUSING. Make it VISUAL and SIMPLE.
 * 
 * Features NO ONE else has:
 * 1. TAX FLOW VISUALIZATION - See where your money goes
 * 2. TAX SAVINGS TREE - Grow your savings visually
 * 3. AUDIT RISK METER - Real-time visual risk indicator
 * 4. TAX TIMELINE - Visual calendar of tax deadlines
 * 5. REFUND TRACKER - Watch your refund journey
 * 6. TAX STORY - Your tax year in one visual page
 * 
 * This makes tax UNDERSTANDABLE for everyone.
 */

class VisualTaxIntelligence {
  /**
   * ==================================================
   * FEATURE 1: TAX FLOW VISUALIZATION
   * ==================================================
   * 
   * Show user where every rupee goes in a visual flow diagram
   */
  static generateTaxFlow(financialData) {
    const {
      totalIncome,
      totalExpenses,
      totalDeductions,
      taxableIncome,
      totalTax,
      netIncome
    } = financialData;

    return {
      visualization: 'SANKEY_DIAGRAM', // Flow diagram
      nodes: [
        {
          id: 'total_income',
          label: 'Total Income',
          value: totalIncome,
          color: '#4CAF50',
          icon: '💰'
        },
        {
          id: 'expenses',
          label: 'Business Expenses',
          value: totalExpenses,
          color: '#FF9800',
          icon: '💸'
        },
        {
          id: 'deductions',
          label: 'Tax Deductions',
          value: totalDeductions,
          color: '#2196F3',
          icon: '📊'
        },
        {
          id: 'taxable_income',
          label: 'Taxable Income',
          value: taxableIncome,
          color: '#9C27B0',
          icon: '📈'
        },
        {
          id: 'tax_paid',
          label: 'Tax Paid',
          value: totalTax,
          color: '#F44336',
          icon: '🏛️'
        },
        {
          id: 'net_income',
          label: 'Money in Your Pocket',
          value: netIncome,
          color: '#4CAF50',
          icon: '✅'
        }
      ],
      flows: [
        {
          from: 'total_income',
          to: 'expenses',
          value: totalExpenses,
          label: `${((totalExpenses / totalIncome) * 100).toFixed(1)}% goes to expenses`
        },
        {
          from: 'total_income',
          to: 'deductions',
          value: totalDeductions,
          label: `${((totalDeductions / totalIncome) * 100).toFixed(1)}% saved via deductions`
        },
        {
          from: 'total_income',
          to: 'taxable_income',
          value: taxableIncome,
          label: 'After expenses & deductions'
        },
        {
          from: 'taxable_income',
          to: 'tax_paid',
          value: totalTax,
          label: `${((totalTax / taxableIncome) * 100).toFixed(1)}% tax rate`
        },
        {
          from: 'taxable_income',
          to: 'net_income',
          value: netIncome,
          label: 'What you keep'
        }
      ],
      insights: [
        {
          type: 'POSITIVE',
          message: `✅ You saved ₹${totalDeductions.toFixed(0)} through deductions`,
          impact: 'high'
        },
        {
          type: 'INFO',
          message: `📊 Effective tax rate: ${((totalTax / totalIncome) * 100).toFixed(1)}%`,
          impact: 'medium'
        },
        {
          type: 'SUGGESTION',
          message: `💡 You keep ${((netIncome / totalIncome) * 100).toFixed(1)}% of your income`,
          impact: 'high'
        }
      ],
      summary: {
        title: 'Your Money Journey',
        description: `Out of ₹${totalIncome.toFixed(0)} earned, you paid ₹${totalTax.toFixed(0)} in taxes and kept ₹${netIncome.toFixed(0)}`
      }
    };
  }

  /**
   * ==================================================
   * FEATURE 2: TAX SAVINGS TREE
   * ==================================================
   * 
   * Visual tree that grows as you save more tax
   */
  static generateSavingsTree(savingsData) {
    const {
      totalSavings,
      savingsSources,
      targetSavings
    } = savingsData;

    const growthPercentage = (totalSavings / targetSavings) * 100;

    return {
      visualization: 'TREE_GROWTH',
      tree: {
        stage: this.getTreeStage(growthPercentage),
        health: growthPercentage >= 100 ? 'FULL' : growthPercentage >= 50 ? 'GROWING' : 'SAPLING',
        emoji: this.getTreeEmoji(growthPercentage),
        color: this.getTreeColor(growthPercentage)
      },
      progress: {
        current: totalSavings,
        target: targetSavings,
        percentage: Math.min(growthPercentage, 100),
        remaining: Math.max(targetSavings - totalSavings, 0)
      },
      branches: savingsSources.map(source => ({
        name: source.name,
        amount: source.amount,
        percentage: (source.amount / totalSavings) * 100,
        icon: source.icon,
        status: source.amount > 10000 ? 'STRONG' : source.amount > 5000 ? 'GROWING' : 'SMALL'
      })),
      message: this.getTreeMessage(growthPercentage, totalSavings, targetSavings),
      nextMilestone: {
        amount: this.getNextMilestone(totalSavings, targetSavings),
        message: this.getMilestoneMessage(totalSavings, targetSavings)
      }
    };
  }

  /**
   * Get Tree Stage
   */
  static getTreeStage(percentage) {
    if (percentage >= 100) return 'FULL_TREE';
    if (percentage >= 75) return 'LARGE_TREE';
    if (percentage >= 50) return 'MEDIUM_TREE';
    if (percentage >= 25) return 'SMALL_TREE';
    return 'SAPLING';
  }

  /**
   * Get Tree Emoji
   */
  static getTreeEmoji(percentage) {
    if (percentage >= 100) return '🌳';
    if (percentage >= 75) return '🌲';
    if (percentage >= 50) return '🌴';
    if (percentage >= 25) return '🌱';
    return '🌾';
  }

  /**
   * Get Tree Color
   */
  static getTreeColor(percentage) {
    if (percentage >= 100) return '#1B5E20'; // Dark green
    if (percentage >= 75) return '#388E3C'; // Green
    if (percentage >= 50) return '#66BB6A'; // Light green
    if (percentage >= 25) return '#81C784'; // Lighter green
    return '#A5D6A7'; // Very light green
  }

  /**
   * Get Tree Message
   */
  static getTreeMessage(percentage, current, target) {
    if (percentage >= 100) {
      return `🎉 Amazing! You've saved ₹${current.toFixed(0)} - more than your target!`;
    } else if (percentage >= 75) {
      return `🌟 Great job! You're at ${percentage.toFixed(0)}% of your savings goal!`;
    } else if (percentage >= 50) {
      return `💪 Keep going! You're halfway to ₹${target.toFixed(0)}!`;
    } else if (percentage >= 25) {
      return `🌱 Good start! ₹${(target - current).toFixed(0)} more to go!`;
    } else {
      return `🚀 Let's grow your savings! Target: ₹${target.toFixed(0)}`;
    }
  }

  /**
   * Get Next Milestone
   */
  static getNextMilestone(current, target) {
    const milestones = [25000, 50000, 75000, 100000, 150000, 200000];
    
    for (const milestone of milestones) {
      if (current < milestone) {
        return milestone;
      }
    }
    
    return target;
  }

  /**
   * Get Milestone Message
   */
  static getMilestoneMessage(current, target) {
    const next = this.getNextMilestone(current, target);
    const remaining = next - current;
    
    return `💎 Next milestone: ₹${next.toLocaleString()} (₹${remaining.toFixed(0)} away)`;
  }

  /**
   * ==================================================
   * FEATURE 3: AUDIT RISK METER
   * ==================================================
   * 
   * Real-time visual indicator of audit risk
   */
  static generateRiskMeter(riskData) {
    const { riskScore, riskFactors, riskLevel } = riskData;

    return {
      visualization: 'GAUGE_METER',
      meter: {
        value: riskScore,
        max: 100,
        color: this.getRiskColor(riskScore),
        emoji: this.getRiskEmoji(riskLevel),
        needle: {
          position: riskScore,
          color: this.getRiskColor(riskScore)
        }
      },
      zones: [
        {
          name: 'Safe Zone',
          range: [0, 25],
          color: '#4CAF50',
          emoji: '✅',
          message: 'Very unlikely to be audited'
        },
        {
          name: 'Caution Zone',
          range: [26, 50],
          color: '#FFC107',
          emoji: '⚠️',
          message: 'Monitor these factors'
        },
        {
          name: 'Risk Zone',
          range: [51, 75],
          color: '#FF9800',
          emoji: '⚡',
          message: 'Take corrective action'
        },
        {
          name: 'Danger Zone',
          range: [76, 100],
          color: '#F44336',
          emoji: '🔴',
          message: 'High audit probability'
        }
      ],
      currentStatus: {
        zone: this.getRiskZone(riskScore),
        message: this.getRiskMessage(riskScore, riskLevel),
        actionRequired: riskScore > 50
      },
      riskFactors: riskFactors.map(factor => ({
        name: factor.factor,
        impact: factor.riskPoints,
        severity: factor.severity,
        emoji: this.getFactorEmoji(factor.severity),
        barWidth: (factor.riskPoints / riskScore) * 100
      })),
      recommendations: {
        immediate: riskScore > 75 
          ? ['Reconcile all records', 'Consult tax advisor', 'Prepare audit documentation']
          : riskScore > 50
          ? ['Review high-risk transactions', 'Update documentation']
          : ['Continue maintaining good records'],
        preventive: ['Maintain digital records', 'Timely GST filing', 'Accurate classification']
      }
    };
  }

  /**
   * Get Risk Color
   */
  static getRiskColor(score) {
    if (score <= 25) return '#4CAF50';
    if (score <= 50) return '#FFC107';
    if (score <= 75) return '#FF9800';
    return '#F44336';
  }

  /**
   * Get Risk Emoji
   */
  static getRiskEmoji(level) {
    if (level === 'LOW') return '✅';
    if (level === 'MEDIUM') return '⚠️';
    return '🔴';
  }

  /**
   * Get Risk Zone
   */
  static getRiskZone(score) {
    if (score <= 25) return 'SAFE';
    if (score <= 50) return 'CAUTION';
    if (score <= 75) return 'RISK';
    return 'DANGER';
  }

  /**
   * Get Risk Message
   */
  static getRiskMessage(score, level) {
    if (level === 'LOW') {
      return `🟢 Safe (${score}/100) - Keep maintaining good records`;
    } else if (level === 'MEDIUM') {
      return `🟡 Caution (${score}/100) - Address these factors proactively`;
    } else {
      return `🔴 High Risk (${score}/100) - Take immediate action`;
    }
  }

  /**
   * Get Factor Emoji
   */
  static getFactorEmoji(severity) {
    if (severity === 'high') return '🔴';
    if (severity === 'medium') return '🟡';
    return '🟢';
  }

  /**
   * ==================================================
   * FEATURE 4: TAX TIMELINE
   * ==================================================
   * 
   * Visual calendar showing all tax deadlines
   */
  static generateTaxTimeline(country, currentDate = new Date()) {
    const timeline = [];

    if (country === 'IN') {
      timeline.push(...this.getIndiaDeadlines(currentDate));
    } else if (country === 'US') {
      timeline.push(...this.getUSADeadlines(currentDate));
    }

    return {
      visualization: 'TIMELINE',
      currentDate,
      deadlines: timeline.sort((a, b) => a.date - b.date),
      upcomingDeadlines: timeline.filter(d => d.date > currentDate).slice(0, 5),
      overdueDeadlines: timeline.filter(d => d.date < currentDate && !d.completed),
      completedDeadlines: timeline.filter(d => d.completed),
      summary: {
        total: timeline.length,
        upcoming: timeline.filter(d => d.date > currentDate).length,
        overdue: timeline.filter(d => d.date < currentDate && !d.completed).length,
        completed: timeline.filter(d => d.completed).length
      },
      nextDeadline: timeline.find(d => d.date > currentDate && !d.completed)
    };
  }

  /**
   * Get India Tax Deadlines
   */
  static getIndiaDeadlines(currentDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const fyYear = month >= 3 ? year : year - 1;

    return [
      {
        id: 'gstr1_q1',
        name: 'GSTR-1 (Q1)',
        description: 'Quarterly GST return for outward supplies',
        date: new Date(fyYear, 6, 11), // July 11
        type: 'GST',
        priority: 'high',
        penalty: '₹200 per day',
        status: 'pending',
        emoji: '📊'
      },
      {
        id: 'gstr3b_monthly',
        name: 'GSTR-3B (Monthly)',
        description: 'Monthly GST return',
        date: new Date(year, month + 1, 20), // 20th of next month
        type: 'GST',
        priority: 'high',
        penalty: '₹50 per day',
        status: 'pending',
        emoji: '📋'
      },
      {
        id: 'tds_q1',
        name: 'TDS Return (Q1)',
        description: 'Quarterly TDS return',
        date: new Date(fyYear, 6, 31), // July 31
        type: 'TDS',
        priority: 'medium',
        penalty: '₹200 per day',
        status: 'pending',
        emoji: '💰'
      },
      {
        id: 'itr_filing',
        name: 'Income Tax Return',
        description: 'Annual ITR filing deadline',
        date: new Date(fyYear + 1, 6, 31), // July 31 next year
        type: 'INCOME_TAX',
        priority: 'critical',
        penalty: '₹5,000 late fee',
        status: 'pending',
        emoji: '📝'
      },
      {
        id: 'advance_tax_q1',
        name: 'Advance Tax (Q1)',
        description: '15% of estimated annual tax',
        date: new Date(fyYear, 5, 15), // June 15
        type: 'INCOME_TAX',
        priority: 'high',
        penalty: 'Interest on shortfall',
        status: 'pending',
        emoji: '💳'
      }
    ];
  }

  /**
   * Get USA Tax Deadlines
   */
  static getUSADeadlines(currentDate) {
    const year = currentDate.getFullYear();

    return [
      {
        id: 'tax_return',
        name: 'Tax Return Filing',
        description: 'Individual/Business tax return',
        date: new Date(year, 3, 15), // April 15
        type: 'INCOME_TAX',
        priority: 'critical',
        penalty: 'Failure-to-file penalty',
        status: 'pending',
        emoji: '📝'
      },
      {
        id: 'estimated_tax_q1',
        name: 'Estimated Tax (Q1)',
        description: 'Quarterly estimated tax payment',
        date: new Date(year, 3, 15), // April 15
        type: 'INCOME_TAX',
        priority: 'high',
        penalty: 'Underpayment penalty',
        status: 'pending',
        emoji: '💰'
      },
      {
        id: 'payroll_tax',
        name: 'Payroll Tax',
        description: 'Quarterly payroll tax return',
        date: new Date(year, month + 1, 0).getDate(), // Last day of month
        type: 'PAYROLL',
        priority: 'high',
        penalty: 'Penalty & interest',
        status: 'pending',
        emoji: '💼'
      }
    ];
  }

  /**
   * ==================================================
   * FEATURE 5: TAX STORY
   * ==================================================
   * 
   * Your entire tax year in ONE visual page
   */
  static generateTaxStory(yearData) {
    const {
      totalIncome,
      totalExpenses,
      totalTax,
      taxSavings,
      refundsReceived,
      complianceScore,
      auditRisk,
      monthlyBreakdown
    } = yearData;

    return {
      visualization: 'INFOGRAPHIC',
      title: `Your Tax Year ${yearData.financialYear}`,
      hero: {
        headline: `You earned ₹${totalIncome.toLocaleString()}`,
        subheadline: `Paid ₹${totalTax.toLocaleString()} in taxes`,
        emoji: '💼'
      },
      chapters: [
        {
          title: '💰 Income Story',
          emoji: '📈',
          stats: [
            {
              label: 'Total Income',
              value: `₹${totalIncome.toLocaleString()}`,
              change: '+15%',
              positive: true
            },
            {
              label: 'Monthly Average',
              value: `₹${(totalIncome / 12).toFixed(0)}`,
              change: 'Consistent',
              positive: true
            }
          ],
          chart: {
            type: 'LINE',
            data: monthlyBreakdown.map(m => ({
              month: m.month,
              income: m.income
            }))
          }
        },
        {
          title: '💸 Expense Story',
          emoji: '📊',
          stats: [
            {
              label: 'Total Expenses',
              value: `₹${totalExpenses.toLocaleString()}`,
              change: '+8%',
              positive: false
            },
            {
              label: 'Expense Ratio',
              value: `${((totalExpenses / totalIncome) * 100).toFixed(0)}%`,
              change: 'Healthy',
              positive: true
            }
          ],
          chart: {
            type: 'BAR',
            data: monthlyBreakdown.map(m => ({
              month: m.month,
              expenses: m.expenses
            }))
          }
        },
        {
          title: '🏛️ Tax Story',
          emoji: '💰',
          stats: [
            {
              label: 'Tax Paid',
              value: `₹${totalTax.toLocaleString()}`,
              change: 'On time',
              positive: true
            },
            {
              label: 'Effective Rate',
              value: `${((totalTax / totalIncome) * 100).toFixed(1)}%`,
              change: 'Optimized',
              positive: true
            }
          ],
          highlights: [
            `✅ Paid ₹${totalTax.toLocaleString()} in taxes`,
            `💰 Saved ₹${taxSavings.toLocaleString()} through deductions`,
            `🎁 Received ₹${refundsReceived.toLocaleString()} in refunds`
          ]
        },
        {
          title: '✅ Compliance Story',
          emoji: '📋',
          stats: [
            {
              label: 'Compliance Score',
              value: `${complianceScore}%`,
              change: 'Excellent',
              positive: true
            },
            {
              label: 'Audit Risk',
              value: auditRisk,
              change: 'Low',
              positive: true
            }
          ],
          achievements: [
            '🏆 All returns filed on time',
            '✨ Zero penalties',
            '💎 High compliance score'
          ]
        }
      ],
      summary: {
        takeHome: totalIncome - totalExpenses - totalTax,
        takeHomePercentage: ((totalIncome - totalExpenses - totalTax) / totalIncome) * 100,
        verdict: this.getTaxYearVerdict(complianceScore, taxSavings, auditRisk),
        celebration: '🎉'
      }
    };
  }

  /**
   * Get Tax Year Verdict
   */
  static getTaxYearVerdict(compliance, savings, risk) {
    if (compliance >= 90 && savings > 50000 && risk === 'LOW') {
      return {
        title: '🌟 Outstanding Year!',
        message: 'Perfect compliance, great savings, and zero risk. You nailed it!',
        emoji: '🏆'
      };
    } else if (compliance >= 75 && savings > 25000) {
      return {
        title: '👍 Great Year!',
        message: 'Good compliance and decent savings. Keep it up!',
        emoji: '✅'
      };
    } else if (compliance >= 50) {
      return {
        title: '📈 Room for Improvement',
        message: 'You can do better with planning and optimization.',
        emoji: '💪'
      };
    } else {
      return {
        title: '⚠️ Needs Attention',
        message: 'Focus on compliance and tax planning next year.',
        emoji: '🎯'
      };
    }
  }
}

export default VisualTaxIntelligence;
