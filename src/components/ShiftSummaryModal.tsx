import React, { useState, useMemo, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { 
  Lock, DollarSign, CreditCard, Smartphone, Calculator, CheckCircle2, 
  AlertTriangle, ArrowRight, Printer, FileText, RefreshCw, X, ShieldCheck, 
  Coins, TrendingUp, Receipt, ChevronDown, ChevronUp, Layers, Download,
  Mail, Share2, Copy, Search, Filter, Plus, Minus, ArrowDownRight,
  ArrowUpRight, Vault, Clock, User, Check, Send, Sparkles, Building2,
  Calendar, Award, HelpCircle
} from 'lucide-react';
import { PaymentMethod, Order } from '../types';
import { useCurrency } from '../context/CurrencyContext';

export interface ShiftTransaction {
  id: string;
  time: string;
  total: number;
  paymentMethod: PaymentMethod;
  itemsCount: number;
  customerName?: string;
  cashTendered?: number;
  cashChange?: number;
  tax?: number;
  discount?: number;
}

export interface CashMovement {
  id: string;
  time: string;
  type: 'cash_in' | 'cash_out' | 'safe_drop';
  amount: number;
  category: string;
  reason: string;
  staffName: string;
}

export interface ShiftReportData {
  reportId: string;
  reportType: 'X_READING' | 'Z_READING';
  timestamp: string;
  shiftStartTime: string;
  staffName: string;
  terminalId: string;
  openingFloat: number;
  totalSales: number;
  grossSales: number;
  totalTax: number;
  totalDiscounts: number;
  totalTransactions: number;
  cashSales: number;
  cardSales: number;
  digitalWalletSales: number;
  otherSales: number;
  cashInTotal: number;
  cashOutTotal: number;
  safeDropsTotal: number;
  expectedDrawerCash: number;
  actualDrawerCash: number;
  variance: number;
  varianceReason?: string;
  supervisorSignature?: string;
  notes: string;
  cashMovements: CashMovement[];
}

interface ShiftSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStaffName: string;
  shiftStartCash: number;
  shiftTransactions: ShiftTransaction[];
  onFinalizeShift: (report: ShiftReportData) => void;
  shiftStartTime?: string;
  terminalId?: string;
}

// Payment method branding colors
const PAYMENT_COLORS = {
  'Cash': '#10B981',           // Emerald
  'Credit/Debit Card': '#6366F1', // Indigo
  'Digital Wallet': '#F59E0B',  // Amber
  'Other': '#8B5CF6'           // Violet
};

// Initial realistic cash movements
const INITIAL_CASH_MOVEMENTS: CashMovement[] = [
  {
    id: 'CM-101',
    time: '10:15 AM',
    type: 'cash_in',
    amount: 50.00,
    category: 'Float Top-up',
    reason: 'Added roll of $5 bills from vault',
    staffName: 'Marcus Vance'
  },
  {
    id: 'CM-102',
    time: '01:30 PM',
    type: 'cash_out',
    amount: 24.50,
    category: 'Petty Cash',
    reason: 'Store supplies & receipt paper rolls',
    staffName: 'Marcus Vance'
  }
];

// Sample past shift archives
const HISTORICAL_SHIFT_REPORTS: ShiftReportData[] = [
  {
    reportId: 'EOD-98201',
    reportType: 'Z_READING',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    shiftStartTime: '08:00 AM',
    staffName: 'Elena Rostova',
    terminalId: 'Terminal #01',
    openingFloat: 250.00,
    totalSales: 1420.50,
    grossSales: 1540.00,
    totalTax: 120.74,
    totalDiscounts: 45.00,
    totalTransactions: 18,
    cashSales: 410.50,
    cardSales: 780.00,
    digitalWalletSales: 230.00,
    otherSales: 0,
    cashInTotal: 50.00,
    cashOutTotal: 0,
    safeDropsTotal: 200.00,
    expectedDrawerCash: 510.50,
    actualDrawerCash: 510.50,
    variance: 0.00,
    notes: 'Smooth evening closeout. Register perfectly balanced.',
    cashMovements: []
  },
  {
    reportId: 'EOD-98150',
    reportType: 'Z_READING',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    shiftStartTime: '08:00 AM',
    staffName: 'Sarah Connor',
    terminalId: 'Terminal #01',
    openingFloat: 250.00,
    totalSales: 1895.20,
    grossSales: 2050.00,
    totalTax: 161.09,
    totalDiscounts: 70.00,
    totalTransactions: 24,
    cashSales: 560.20,
    cardSales: 1040.00,
    digitalWalletSales: 295.00,
    otherSales: 0,
    cashInTotal: 0,
    cashOutTotal: 15.00,
    safeDropsTotal: 300.00,
    expectedDrawerCash: 495.20,
    actualDrawerCash: 495.20,
    variance: 0.00,
    notes: 'Weekend rush handled well. Petty cash receipt for cleaning supplies filed.',
    cashMovements: []
  }
];

export default function ShiftSummaryModal({
  isOpen,
  onClose,
  activeStaffName,
  shiftStartCash,
  shiftTransactions,
  onFinalizeShift,
  shiftStartTime = '08:00 AM',
  terminalId = 'Terminal #01 (Front Register)'
}: ShiftSummaryModalProps) {
  const { formatAmount, currencySymbol } = useCurrency();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'reconciliation' | 'movements' | 'denominations' | 'ledger' | 'history'>('overview');
  
  // Closeout mode: X-Reading (interim audit) or Z-Reading (formal end of day)
  const [readingMode, setReadingMode] = useState<'Z_READING' | 'X_READING'>('Z_READING');
  
  // Reconciliation inputs
  const [reconciledCash, setReconciledCash] = useState<number | ''>('');
  const [varianceReason, setVarianceReason] = useState<string>('');
  const [customVarianceNote, setCustomVarianceNote] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [supervisorName, setSupervisorName] = useState('Store Manager (Supervisor)');
  const [supervisorVerified, setSupervisorVerified] = useState(false);
  const [cashierNotes, setCashierNotes] = useState('');
  
  // Cash Movements State
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(INITIAL_CASH_MOVEMENTS);
  const [showAddMovementModal, setShowAddMovementModal] = useState(false);
  const [newMovementType, setNewMovementType] = useState<'cash_in' | 'cash_out' | 'safe_drop'>('cash_out');
  const [newMovementAmount, setNewMovementAmount] = useState<number | ''>('');
  const [newMovementCategory, setNewMovementCategory] = useState('Petty Cash Expense');
  const [newMovementReason, setNewMovementReason] = useState('');

  // Modals & Slips
  const [showPrintSlip, setShowPrintSlip] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [managerEmail, setManagerEmail] = useState('accounting@nexuspos.io');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [selectedHistoricalReport, setSelectedHistoricalReport] = useState<ShiftReportData | null>(null);

  // Search & Filter for Transactions tab
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerPaymentFilter, setLedgerPaymentFilter] = useState('All');

  // Cash Denominations
  const [denominations, setDenominations] = useState({
    // Bills
    hundreds: 0,   // $100
    fifties: 0,    // $50
    twenties: 0,   // $20
    tens: 0,       // $10
    fives: 0,      // $5
    twos: 0,       // $2
    singles: 0,    // $1
    // Loose Coins
    halves: 0,     // $0.50
    quarters: 0,   // $0.25
    dimes: 0,      // $0.10
    nickels: 0,    // $0.05
    pennies: 0,    // $0.01
    // Coin Rolls
    rollQuarters: 0, // $10.00 (40 coins)
    rollDimes: 0,    // $5.00 (50 coins)
    rollNickels: 0,  // $2.00 (40 coins)
    rollPennies: 0   // $0.50 (50 coins)
  });

  // Calculate bill total, loose coin total, coin rolls total, and grand total
  const { billsTotal, coinsTotal, rollsTotal, totalFromDenominations } = useMemo(() => {
    const bills = (
      denominations.hundreds * 100 +
      denominations.fifties * 50 +
      denominations.twenties * 20 +
      denominations.tens * 10 +
      denominations.fives * 5 +
      denominations.twos * 2 +
      denominations.singles * 1
    );

    const coins = (
      denominations.halves * 0.50 +
      denominations.quarters * 0.25 +
      denominations.dimes * 0.10 +
      denominations.nickels * 0.05 +
      denominations.pennies * 0.01
    );

    const rolls = (
      denominations.rollQuarters * 10.00 +
      denominations.rollDimes * 5.00 +
      denominations.rollNickels * 2.00 +
      denominations.rollPennies * 0.50
    );

    return {
      billsTotal: bills,
      coinsTotal: coins,
      rollsTotal: rolls,
      totalFromDenominations: bills + coins + rolls
    };
  }, [denominations]);

  // Apply denomination count to reconciliation state
  const handleApplyDenominations = () => {
    setReconciledCash(parseFloat(totalFromDenominations.toFixed(2)));
    setActiveTab('reconciliation');
  };

  const handleResetDenominations = () => {
    if (confirm('Reset all counted bills and coin rolls to zero?')) {
      setDenominations({
        hundreds: 0, fifties: 0, twenties: 0, tens: 0, fives: 0, twos: 0, singles: 0,
        halves: 0, quarters: 0, dimes: 0, nickels: 0, pennies: 0,
        rollQuarters: 0, rollDimes: 0, rollNickels: 0, rollPennies: 0
      });
    }
  };

  // Add Cash Movement
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof newMovementAmount !== 'number' || newMovementAmount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    const movement: CashMovement = {
      id: `CM-${Math.floor(100 + Math.random() * 900)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: newMovementType,
      amount: newMovementAmount,
      category: newMovementCategory,
      reason: newMovementReason || 'Standard register cash adjustment',
      staffName: activeStaffName
    };

    setCashMovements(prev => [movement, ...prev]);
    setNewMovementAmount('');
    setNewMovementReason('');
    setShowAddMovementModal(false);
  };

  // Quick helper to increment a denomination
  const incrementDenom = (key: keyof typeof denominations, delta: number) => {
    setDenominations(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta)
    }));
  };

  // Compute full shift metrics & balances
  const metrics = useMemo(() => {
    let cashTotal = 0;
    let cashCount = 0;
    let cardTotal = 0;
    let cardCount = 0;
    let digitalTotal = 0;
    let digitalCount = 0;
    let otherTotal = 0;
    let otherCount = 0;
    let totalItems = 0;
    let totalTax = 0;
    let totalDiscounts = 0;

    shiftTransactions.forEach(t => {
      totalItems += (t.itemsCount || 1);
      totalTax += (t.tax || (t.total * 0.085)); // 8.5% default tax calculation if not explicit
      totalDiscounts += (t.discount || 0);

      if (t.paymentMethod === 'Cash') {
        cashTotal += t.total;
        cashCount += 1;
      } else if (t.paymentMethod === 'Credit/Debit Card') {
        cardTotal += t.total;
        cardCount += 1;
      } else if (t.paymentMethod === 'Digital Wallet' || t.paymentMethod === 'Mobile Pay') {
        digitalTotal += t.total;
        digitalCount += 1;
      } else {
        otherTotal += t.total;
        otherCount += 1;
      }
    });

    const totalSales = cashTotal + cardTotal + digitalTotal + otherTotal;
    const grossSales = totalSales + totalDiscounts;
    const totalTransactions = shiftTransactions.length;
    
    // Cash Movements calculations
    const cashInTotal = cashMovements
      .filter(m => m.type === 'cash_in')
      .reduce((sum, m) => sum + m.amount, 0);

    const cashOutTotal = cashMovements
      .filter(m => m.type === 'cash_out')
      .reduce((sum, m) => sum + m.amount, 0);

    const safeDropsTotal = cashMovements
      .filter(m => m.type === 'safe_drop')
      .reduce((sum, m) => sum + m.amount, 0);

    // Formula: Opening Float + Cash Sales + Cash In - Cash Out - Safe Drops = Expected Drawer Cash
    const expectedDrawerCash = shiftStartCash + cashTotal + cashInTotal - cashOutTotal - safeDropsTotal;
    const actualCash = typeof reconciledCash === 'number' ? reconciledCash : 0;
    const variance = actualCash > 0 ? actualCash - expectedDrawerCash : 0;

    const chartData = [
      {
        name: 'Cash',
        value: parseFloat(cashTotal.toFixed(2)),
        count: cashCount,
        color: PAYMENT_COLORS['Cash'],
        pct: totalSales > 0 ? ((cashTotal / totalSales) * 100).toFixed(1) : '0'
      },
      {
        name: 'Credit/Debit Card',
        value: parseFloat(cardTotal.toFixed(2)),
        count: cardCount,
        color: PAYMENT_COLORS['Credit/Debit Card'],
        pct: totalSales > 0 ? ((cardTotal / totalSales) * 100).toFixed(1) : '0'
      },
      {
        name: 'Digital Wallet',
        value: parseFloat(digitalTotal.toFixed(2)),
        count: digitalCount,
        color: PAYMENT_COLORS['Digital Wallet'],
        pct: totalSales > 0 ? ((digitalTotal / totalSales) * 100).toFixed(1) : '0'
      }
    ];

    if (otherTotal > 0) {
      chartData.push({
        name: 'Other / Split',
        value: parseFloat(otherTotal.toFixed(2)),
        count: otherCount,
        color: PAYMENT_COLORS['Other'],
        pct: totalSales > 0 ? ((otherTotal / totalSales) * 100).toFixed(1) : '0'
      });
    }

    return {
      totalSales,
      grossSales,
      totalTax,
      totalDiscounts,
      totalTransactions,
      totalItems,
      cashTotal,
      cashCount,
      cardTotal,
      cardCount,
      digitalTotal,
      digitalCount,
      otherTotal,
      otherCount,
      cashInTotal,
      cashOutTotal,
      safeDropsTotal,
      expectedDrawerCash,
      actualCash,
      variance,
      chartData,
      avgTicket: totalTransactions > 0 ? totalSales / totalTransactions : 0,
      unitsPerTransaction: totalTransactions > 0 ? (totalItems / totalTransactions).toFixed(1) : '0'
    };
  }, [shiftTransactions, shiftStartCash, reconciledCash, cashMovements]);

  // Filtered transactions for the ledger tab
  const filteredLedger = useMemo(() => {
    return shiftTransactions.filter(t => {
      const matchesSearch = t.id.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                            (t.customerName && t.customerName.toLowerCase().includes(ledgerSearch.toLowerCase()));
      const matchesPayment = ledgerPaymentFilter === 'All' || t.paymentMethod === ledgerPaymentFilter;
      return matchesSearch && matchesPayment;
    });
  }, [shiftTransactions, ledgerSearch, ledgerPaymentFilter]);

  if (!isOpen) return null;

  // Complete Closeout
  const handleCompleteCloseout = () => {
    if (typeof reconciledCash !== 'number' || reconciledCash < 0) {
      alert('Please enter or count the physical cash in the drawer before completing closeout.');
      setActiveTab('reconciliation');
      return;
    }

    if (Math.abs(metrics.variance) >= 0.05 && !varianceReason) {
      alert('A cash variance has been detected. Please select a discrepancy reason before proceeding.');
      setActiveTab('reconciliation');
      return;
    }

    setIsFinalizing(true);
    setTimeout(() => {
      const report: ShiftReportData = {
        reportId: `EOD-${Date.now().toString().slice(-6)}`,
        reportType: readingMode,
        timestamp: new Date().toISOString(),
        shiftStartTime: shiftStartTime,
        staffName: activeStaffName,
        terminalId: terminalId,
        openingFloat: shiftStartCash,
        totalSales: metrics.totalSales,
        grossSales: metrics.grossSales,
        totalTax: metrics.totalTax,
        totalDiscounts: metrics.totalDiscounts,
        totalTransactions: metrics.totalTransactions,
        cashSales: metrics.cashTotal,
        cardSales: metrics.cardTotal,
        digitalWalletSales: metrics.digitalTotal,
        otherSales: metrics.otherTotal,
        cashInTotal: metrics.cashInTotal,
        cashOutTotal: metrics.cashOutTotal,
        safeDropsTotal: metrics.safeDropsTotal,
        expectedDrawerCash: metrics.expectedDrawerCash,
        actualDrawerCash: metrics.actualCash,
        variance: metrics.variance,
        varianceReason: varianceReason ? `${varianceReason}${customVarianceNote ? ` (${customVarianceNote})` : ''}` : undefined,
        supervisorSignature: supervisorVerified ? supervisorName : undefined,
        notes: cashierNotes,
        cashMovements: cashMovements
      };

      onFinalizeShift(report);
      setIsFinalizing(false);
      onClose();
    }, 900);
  };

  // Export CSV Report
  const handleExportCSV = () => {
    let csv = `NEXUS POS SHIFT SUMMARY REPORT\n`;
    csv += `Report ID,${readingMode === 'Z_READING' ? 'Z-READING (EOD CLOSEOUT)' : 'X-READING (INTERIM AUDIT)'}\n`;
    csv += `Terminal,${terminalId}\n`;
    csv += `Operator,${activeStaffName}\n`;
    csv += `Shift Start,${shiftStartTime}\n`;
    csv += `Generated At,${new Date().toLocaleString()}\n\n`;

    csv += `FINANCIAL SUMMARY\n`;
    csv += `Gross Sales,${metrics.grossSales.toFixed(2)}\n`;
    csv += `Discounts Given,${metrics.totalDiscounts.toFixed(2)}\n`;
    csv += `Net Total Sales,${metrics.totalSales.toFixed(2)}\n`;
    csv += `Sales Tax Collected,${metrics.totalTax.toFixed(2)}\n`;
    csv += `Total Transactions,${metrics.totalTransactions}\n`;
    csv += `Average Ticket,${metrics.avgTicket.toFixed(2)}\n\n`;

    csv += `PAYMENT CHANNEL BREAKDOWN\n`;
    csv += `Cash Sales,${metrics.cashTotal.toFixed(2)} (${metrics.cashCount} orders)\n`;
    csv += `Card Sales,${metrics.cardTotal.toFixed(2)} (${metrics.cardCount} orders)\n`;
    csv += `Digital Wallet NFC,${metrics.digitalTotal.toFixed(2)} (${metrics.digitalCount} orders)\n`;
    csv += `Other/Split,${metrics.otherTotal.toFixed(2)} (${metrics.otherCount} orders)\n\n`;

    csv += `CASH DRAWER RECONCILIATION\n`;
    csv += `Starting Float,${shiftStartCash.toFixed(2)}\n`;
    csv += `(+) Cash Sales,${metrics.cashTotal.toFixed(2)}\n`;
    csv += `(+) Cash In (Add Float),${metrics.cashInTotal.toFixed(2)}\n`;
    csv += `(-) Cash Out (Petty Cash),${metrics.cashOutTotal.toFixed(2)}\n`;
    csv += `(-) Safe Drops,${metrics.safeDropsTotal.toFixed(2)}\n`;
    csv += `Expected Cash in Drawer,${metrics.expectedDrawerCash.toFixed(2)}\n`;
    csv += `Actual Counted Cash,${metrics.actualCash.toFixed(2)}\n`;
    csv += `Variance,${metrics.variance.toFixed(2)}\n`;
    csv += `Variance Reason,${varianceReason || 'N/A'}\n\n`;

    csv += `TRANSACTIONS LEDGER\n`;
    csv += `ID,Time,Customer,Payment Method,Items,Amount\n`;
    shiftTransactions.forEach(t => {
      csv += `"${t.id}","${t.time}","${t.customerName || 'Walk-in'}","${t.paymentMethod}",${t.itemsCount},${t.total.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Shift-Report-${terminalId.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dispatch Email Report Simulation
  const handleSendEmailReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerEmail) return;
    setEmailStatus('sending');
    setTimeout(() => {
      setEmailStatus('sent');
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailStatus('idle');
      }, 1500);
    }, 1000);
  };

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const summaryText = `
=== NEXUS POS SHIFT RECONCILIATION ===
Terminal: ${terminalId}
Operator: ${activeStaffName}
Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
Mode: ${readingMode}

FINANCIALS:
- Net Sales: ${formatAmount(metrics.totalSales)} (${metrics.totalTransactions} tx)
- Gross Sales: ${formatAmount(metrics.grossSales)}
- Tax Collected: ${formatAmount(metrics.totalTax)}
- Discounts: -${formatAmount(metrics.totalDiscounts)}
- Avg Ticket: ${formatAmount(metrics.avgTicket)}

CHANNELS:
- Cash: ${formatAmount(metrics.cashTotal)}
- Card: ${formatAmount(metrics.cardTotal)}
- Digital Wallet: ${formatAmount(metrics.digitalTotal)}

DRAWER RECONCILIATION:
- Starting Float: ${formatAmount(shiftStartCash)}
- Cash Collected: +${formatAmount(metrics.cashTotal)}
- Cash In / Out: +${formatAmount(metrics.cashInTotal)} / -${formatAmount(metrics.cashOutTotal)}
- Safe Drops: -${formatAmount(metrics.safeDropsTotal)}
- Expected Cash: ${formatAmount(metrics.expectedDrawerCash)}
- Actual Counted: ${formatAmount(metrics.actualCash)}
- Variance: ${formatAmount(metrics.variance)} ${Math.abs(metrics.variance) < 0.01 ? '(BALANCED)' : '(DISCREPANCY)'}
======================================
    `.trim();

    navigator.clipboard.writeText(summaryText);
    alert('Shift summary copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 z-50 overflow-y-auto" id="shift-summary-modal-backdrop">
      <div 
        className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-gray-100 flex flex-col max-h-[96dvh] sm:max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150" 
        id="shift-summary-modal-dialog"
      >
        
        {/* TOP HEADER BAR */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-gray-150 flex flex-col md:flex-row justify-between md:items-center gap-3 bg-slate-50/80" id="shift-modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Shift Summary & EOD Reconciliation</h2>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  readingMode === 'Z_READING' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  {readingMode === 'Z_READING' ? 'Z-Reading (End of Day)' : 'X-Reading (Interim Audit)'}
                </span>
              </div>
              <p className="text-xs text-gray-500 flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                <span>Terminal: <strong className="text-slate-800">{terminalId}</strong></span>
                <span>•</span>
                <span>Staff: <strong className="text-slate-800">{activeStaffName}</strong></span>
                <span>•</span>
                <span>Shift Started: <strong className="text-slate-700">{shiftStartTime}</strong></span>
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto" id="shift-header-actions">
            {/* Reading Mode Switcher */}
            <div className="bg-white p-0.5 rounded-xl border border-gray-200 flex text-xs font-bold shadow-3xs">
              <button
                type="button"
                onClick={() => setReadingMode('Z_READING')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  readingMode === 'Z_READING' ? 'bg-slate-900 text-white' : 'text-gray-500 hover:text-slate-800'
                }`}
                title="Z-Report: Official Closeout & Till Lock"
              >
                Z-Closeout
              </button>
              <button
                type="button"
                onClick={() => setReadingMode('X_READING')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  readingMode === 'X_READING' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:text-slate-800'
                }`}
                title="X-Report: Mid-shift reading without locking till"
              >
                X-Audit
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={() => setShowPrintSlip(true)}
              className="p-2 sm:px-3 sm:py-1.5 bg-white border border-gray-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-3xs flex items-center gap-1.5"
              id="btn-print-shift-slip"
              title="Print Thermal Slip"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print Slip</span>
            </button>

            {/* Email Report Button */}
            <button
              onClick={() => setShowEmailModal(true)}
              className="p-2 sm:px-3 sm:py-1.5 bg-white border border-gray-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-3xs flex items-center gap-1.5"
              id="btn-email-shift-report"
              title="Email EOD Report to Store Manager"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Email Report</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="p-2 sm:px-3 sm:py-1.5 bg-white border border-gray-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-3xs flex items-center gap-1.5"
              id="btn-export-csv"
              title="Download CSV Spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Copy Summary */}
            <button
              onClick={handleCopySummary}
              className="p-2 bg-white border border-gray-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-3xs"
              title="Copy Summary to Clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-slate-600" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-slate-900 flex items-center justify-center transition-all shadow-3xs ml-1"
              id="btn-close-shift-modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS BAR (Horizontal Scrollable for all screen sizes) */}
        <div className="px-4 sm:px-6 border-b border-gray-150 flex gap-1 sm:gap-2 overflow-x-auto scrollbar-none bg-white shrink-0" id="shift-modal-nav-tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-slate-800'
            }`}
            id="tab-shift-overview"
          >
            <TrendingUp className="w-3.5 h-3.5" /> Overview & Charts
          </button>

          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'reconciliation'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-slate-800'
            }`}
            id="tab-shift-reconciliation"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> 
            <span>Reconciliation & Variance</span>
            {typeof reconciledCash === 'number' && (
              <span className={`w-2 h-2 rounded-full ${Math.abs(metrics.variance) < 0.01 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            )}
          </button>

          <button
            onClick={() => setActiveTab('denominations')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'denominations'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-slate-800'
            }`}
            id="tab-shift-denominations"
          >
            <Coins className="w-3.5 h-3.5" /> 
            <span>Denomination Counter</span>
            {totalFromDenominations > 0 && (
              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-mono font-bold">
                {formatAmount(totalFromDenominations, { compact: true })}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'movements'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-slate-800'
            }`}
            id="tab-shift-movements"
          >
            <Vault className="w-3.5 h-3.5" /> 
            <span>Cash In / Out</span>
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
              {cashMovements.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-slate-800'
            }`}
            id="tab-shift-ledger"
          >
            <Receipt className="w-3.5 h-3.5" /> 
            <span>Sales Ledger</span>
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
              {shiftTransactions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-slate-800'
            }`}
            id="tab-shift-history"
          >
            <Clock className="w-3.5 h-3.5" /> 
            <span>Past Z-Reports</span>
          </button>
        </div>

        {/* MODAL MAIN CONTENT BODY (Scrollable on all devices) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50" id="shift-modal-body">
          
          {/* TAB 1: OVERVIEW & GRAPHICAL ANALYTICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6" id="shift-tab-overview-content">
              
              {/* Primary KPI Grid (Responsive 2 to 4 cols) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-150/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Net Shift Sales</span>
                  <span className="text-lg sm:text-xl font-black text-slate-900 block mt-0.5 font-mono">
                    {formatAmount(metrics.totalSales)}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    {metrics.totalTransactions} transactions • Avg {formatAmount(metrics.avgTicket)}
                  </span>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-150/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Cash Collected</span>
                  <span className="text-lg sm:text-xl font-black text-emerald-700 block mt-0.5 font-mono">
                    {formatAmount(metrics.cashTotal)}
                  </span>
                  <span className="text-[10px] text-emerald-700/80 mt-1 block">
                    {metrics.cashCount} cash sales in till
                  </span>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-150/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Card Terminals</span>
                  <span className="text-lg sm:text-xl font-black text-indigo-700 block mt-0.5 font-mono">
                    {formatAmount(metrics.cardTotal)}
                  </span>
                  <span className="text-[10px] text-indigo-700/80 mt-1 block">
                    {metrics.cardCount} card/chip payments
                  </span>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-150/80 shadow-2xs">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Digital NFC Wallet</span>
                  <span className="text-lg sm:text-xl font-black text-amber-700 block mt-0.5 font-mono">
                    {formatAmount(metrics.digitalTotal)}
                  </span>
                  <span className="text-[10px] text-amber-700/80 mt-1 block">
                    {metrics.digitalCount} Apple / Google Pay
                  </span>
                </div>
              </div>

              {/* Secondary Metrics Bar (Gross, Tax, Discounts, Items) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-2xl border border-gray-150 text-xs">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase block">Gross Sales</span>
                  <span className="font-bold text-slate-900 font-mono text-xs">{formatAmount(metrics.grossSales)}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase block">Tax Collected (8.5%)</span>
                  <span className="font-bold text-slate-900 font-mono text-xs">{formatAmount(metrics.totalTax)}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase block">Discounts Given</span>
                  <span className="font-bold text-emerald-600 font-mono text-xs">-{formatAmount(metrics.totalDiscounts)}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase block">Units Sold (UPT)</span>
                  <span className="font-bold text-slate-900 font-mono text-xs">{metrics.totalItems} units ({metrics.unitsPerTransaction}/tx)</span>
                </div>
              </div>

              {/* Graphical Payment Breakdown Card */}
              <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-150 shadow-xs space-y-4" id="graphical-payment-breakdown">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Payment Methods Revenue Share</span>
                    </h3>
                    <p className="text-xs text-gray-500">Breakdown of shift revenue across all register payment channels</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('reconciliation')}
                    className="self-start sm:self-auto text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                  >
                    <span>Go to Drawer Reconciliation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Stacked Percentage Bar */}
                <div className="space-y-1.5">
                  <div className="h-3.5 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                    {metrics.chartData.map((item, idx) => {
                      const widthPercent = metrics.totalSales > 0 ? (item.value / metrics.totalSales) * 100 : 0;
                      if (widthPercent === 0) return null;
                      return (
                        <div
                          key={idx}
                          style={{ width: `${widthPercent}%`, backgroundColor: item.color }}
                          className="h-full transition-all duration-500 relative group"
                          title={`${item.name}: ${formatAmount(item.value)} (${item.pct}%)`}
                        />
                      );
                    })}
                  </div>

                  {/* Horizontal Bar Labels */}
                  <div className="flex flex-wrap gap-3 sm:gap-4 text-xs pt-1 justify-between">
                    {metrics.chartData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-slate-700 text-[11px] sm:text-xs">{item.name}:</span>
                        <span className="font-bold text-slate-900 font-mono text-[11px] sm:text-xs">{formatAmount(item.value)}</span>
                        <span className="text-gray-400 font-mono text-[10px]">({item.pct}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart and Channel Cards Side-by-Side */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2">
                  
                  {/* Donut Chart (5 cols) */}
                  <div className="md:col-span-5 h-44 sm:h-52 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.chartData}
                          innerRadius={46}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                        >
                          {metrics.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: any) => [formatAmount(Number(value)), name]}
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderColor: '#1E293B',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Sales</span>
                      <span className="text-sm font-black text-slate-900 font-mono">
                        {formatAmount(metrics.totalSales, { compact: true })}
                      </span>
                    </div>
                  </div>

                  {/* Channel Breakdown Cards (7 cols) */}
                  <div className="md:col-span-7 space-y-2.5">
                    {/* Cash Row */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 border border-emerald-150/70 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-3xs shrink-0">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-emerald-950 block">Cash Payments</span>
                          <span className="text-[10px] text-emerald-700">In-drawer currency • {metrics.cashCount} orders</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 text-sm block">{formatAmount(metrics.cashTotal)}</span>
                        <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                          {metrics.totalSales > 0 ? ((metrics.cashTotal / metrics.totalSales) * 100).toFixed(1) : 0}% of shift
                        </span>
                      </div>
                    </div>

                    {/* Card Row */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/60 border border-indigo-150/70 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-3xs shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-indigo-950 block">Credit & Debit Cards</span>
                          <span className="text-[10px] text-indigo-700">Chip/PIN & Tap • {metrics.cardCount} orders</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 text-sm block">{formatAmount(metrics.cardTotal)}</span>
                        <span className="text-[10px] text-indigo-800 font-bold bg-indigo-100 px-1.5 py-0.5 rounded">
                          {metrics.totalSales > 0 ? ((metrics.cardTotal / metrics.totalSales) * 100).toFixed(1) : 0}% of shift
                        </span>
                      </div>
                    </div>

                    {/* Digital Wallet Row */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/60 border border-amber-150/70 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-3xs shrink-0">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-amber-950 block">Digital Wallet (NFC)</span>
                          <span className="text-[10px] text-amber-800">Apple/Google Pay • {metrics.digitalCount} orders</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 text-sm block">{formatAmount(metrics.digitalTotal)}</span>
                        <span className="text-[10px] text-amber-900 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                          {metrics.totalSales > 0 ? ((metrics.digitalTotal / metrics.totalSales) * 100).toFixed(1) : 0}% of shift
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Cash Drawer Summary Card */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-150 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-slate-900">Current Expected Drawer Cash Balance</h4>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Opening Float ({formatAmount(shiftStartCash)}) + Cash Collected ({formatAmount(metrics.cashTotal)}) + Adjustments ({formatAmount(metrics.cashInTotal - metrics.cashOutTotal - metrics.safeDropsTotal)})
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-lg sm:text-xl font-black font-mono text-indigo-700">
                    {formatAmount(metrics.expectedDrawerCash)}
                  </span>
                  <button
                    onClick={() => setActiveTab('reconciliation')}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all whitespace-nowrap"
                  >
                    Count & Reconcile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RECONCILIATION & VARIANCE CONTROL */}
          {activeTab === 'reconciliation' && (
            <div className="space-y-6" id="shift-tab-reconciliation-content">
              <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-150 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-gray-150 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" /> 
                      <span>Cash Drawer Balancing & Discrepancy Audit</span>
                    </h3>
                    <p className="text-xs text-gray-500">Reconcile opening float, cash sales, paid-outs, and physical cash count</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('denominations')}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-3 py-1.5 rounded-xl transition-all self-start sm:self-auto"
                  >
                    <Calculator className="w-3.5 h-3.5" /> 
                    <span>Open Bill & Coin Counter</span>
                  </button>
                </div>

                {/* Mathematical Equation Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Expected Formula Breakdown */}
                  <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-2xl border border-gray-150">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Drawer Cash Ledger Formula</span>
                    
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Starting Cash Float:</span>
                      <span className="font-mono font-bold text-slate-900">{formatAmount(shiftStartCash)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-slate-600">
                      <span>(+) Shift Cash Sales Collected:</span>
                      <span className="font-mono font-bold text-emerald-700">+{formatAmount(metrics.cashTotal)}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>(+) Cash In / Float Additions:</span>
                      <span className="font-mono font-bold text-emerald-700">+{formatAmount(metrics.cashInTotal)}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>(-) Cash Out / Petty Cash Expenses:</span>
                      <span className="font-mono font-bold text-rose-600">-{formatAmount(metrics.cashOutTotal)}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>(-) Safe Drops to Vault:</span>
                      <span className="font-mono font-bold text-rose-600">-{formatAmount(metrics.safeDropsTotal)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-2 border-t border-gray-200">
                      <span>Expected Cash in Drawer:</span>
                      <span className="font-mono text-indigo-700 text-base">{formatAmount(metrics.expectedDrawerCash)}</span>
                    </div>
                  </div>

                  {/* Right: Actual Physical Count Input & Actions */}
                  <div className="space-y-3 flex flex-col justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Actual Physical Cash Counted in Till ({currencySymbol}):
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            value={reconciledCash}
                            onChange={(e) => setReconciledCash(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="0.00"
                            className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-slate-950 focus:bg-white focus:outline-hidden"
                            id="input-actual-cash-count"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setReconciledCash(parseFloat(metrics.expectedDrawerCash.toFixed(2)))}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all whitespace-nowrap"
                          title="Match expected drawer balance"
                        >
                          Match Exact
                        </button>
                      </div>
                    </div>

                    {/* Verdict Result Banner */}
                    {typeof reconciledCash === 'number' && reconciledCash >= 0 && (
                      <div className={`p-3.5 rounded-2xl text-xs font-semibold animate-in fade-in duration-200 ${
                        Math.abs(metrics.variance) < 0.01
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                          : metrics.variance < 0
                          ? 'bg-rose-50 border border-rose-200 text-rose-900'
                          : 'bg-amber-50 border border-amber-200 text-amber-900'
                      }`} id="reconciliation-verdict-banner">
                        <div className="flex items-start gap-2.5">
                          {Math.abs(metrics.variance) < 0.01 ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                          )}
                          <div className="flex-1 space-y-0.5">
                            {Math.abs(metrics.variance) < 0.01 ? (
                              <div>
                                <span className="font-extrabold text-emerald-950 text-xs block">DRAWER BALANCED PERFECTLY (100% MATCH)</span>
                                <span className="text-[11px] text-emerald-700 font-mono">Variance: {formatAmount(0)} • Physical cash precisely equals expected register total.</span>
                              </div>
                            ) : metrics.variance < 0 ? (
                              <div>
                                <span className="font-extrabold text-rose-950 text-xs block">CASH SHORTAGE: -{formatAmount(Math.abs(metrics.variance))}</span>
                                <span className="text-[11px] text-rose-700">Counted cash is lower than expected ledger balance. Select discrepancy reason below.</span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-extrabold text-amber-950 text-xs block">CASH OVERAGE: +{formatAmount(metrics.variance)}</span>
                                <span className="text-[11px] text-amber-800">Counted cash exceeds expected balance. Verify change slips or tender entries.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Discrepancy Reason Selector (Shown if variance exists) */}
                {typeof reconciledCash === 'number' && Math.abs(metrics.variance) >= 0.05 && (
                  <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      <span>Document Discrepancy / Variance Reason (Mandatory for Audit Compliance):</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        'Cashier Tender / Change Return Error',
                        'Unrecorded Petty Cash / Receipt Missing',
                        'Till Under-count / Miscounted Coin Rolls',
                        'Customer Change Dispute / Rounding',
                        'Mid-shift Safe Drop Timing Lag',
                        'Other / Unknown Discrepancy'
                      ].map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setVarianceReason(reason)}
                          className={`p-2 rounded-xl text-left text-xs font-semibold border transition-all ${
                            varianceReason === reason
                              ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                              : 'bg-white text-slate-700 border-amber-200/80 hover:bg-amber-100/50'
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={customVarianceNote}
                      onChange={(e) => setCustomVarianceNote(e.target.value)}
                      placeholder="Additional details regarding this discrepancy..."
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-600 focus:outline-hidden"
                    />
                  </div>
                )}

                {/* Supervisor Override & Authorization */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-600" />
                      <span>Manager / Supervisor Sign-off</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold">Security Level: EOD Audit</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Supervisor PIN (1234):</label>
                      <input
                        type="password"
                        maxLength={6}
                        value={supervisorPin}
                        onChange={(e) => {
                          setSupervisorPin(e.target.value);
                          if (e.target.value === '1234' || e.target.value.length >= 4) {
                            setSupervisorVerified(true);
                          }
                        }}
                        placeholder="••••"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={supervisorName}
                        onChange={(e) => setSupervisorName(e.target.value)}
                        placeholder="Supervisor Full Name"
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                      />
                      <span className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 ${
                        supervisorVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {supervisorVerified ? <Check className="w-3.5 h-3.5" /> : null}
                        {supervisorVerified ? 'Authorized' : 'Pending PIN'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cashier Shift Closeout Notes */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Cashier Shift Notes / Handoff Memo (Optional):
                  </label>
                  <textarea
                    rows={2}
                    value={cashierNotes}
                    onChange={(e) => setCashierNotes(e.target.value)}
                    placeholder="e.g. Verified float, morning rush handled smoothly, replaced thermal roll in receipt printer."
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-950 focus:bg-white focus:outline-hidden resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PHYSICAL CASH DENOMINATION COUNTER & COIN ROLLS */}
          {activeTab === 'denominations' && (
            <div className="space-y-4" id="shift-tab-denominations-content">
              <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-150 shadow-xs space-y-5">
                
                {/* Header with totals */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-150 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-500" /> 
                      <span>Cash Denomination & Coin Roll Counter</span>
                    </h3>
                    <p className="text-xs text-gray-500">Count physical bills, loose coins, and bank rolls to calculate drawer total</p>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-gray-150 self-start sm:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Counted</span>
                      <span className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                        {formatAmount(totalFromDenominations)}
                      </span>
                    </div>
                    <button
                      onClick={handleResetDenominations}
                      className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-rose-600 font-semibold bg-white border border-gray-200 rounded-xl hover:bg-rose-50 transition-all"
                      title="Clear all counts"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Sub-totals summary pills */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs">
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-150 rounded-xl">
                    <span className="text-[10px] text-emerald-800 font-bold block uppercase">Paper Bills</span>
                    <span className="font-mono font-bold text-emerald-950 text-sm">{formatAmount(billsTotal)}</span>
                  </div>
                  <div className="p-2.5 bg-amber-50/70 border border-amber-150 rounded-xl">
                    <span className="text-[10px] text-amber-800 font-bold block uppercase">Loose Coins</span>
                    <span className="font-mono font-bold text-amber-950 text-sm">{formatAmount(coinsTotal)}</span>
                  </div>
                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-150 rounded-xl">
                    <span className="text-[10px] text-indigo-800 font-bold block uppercase">Coin Rolls</span>
                    <span className="font-mono font-bold text-indigo-950 text-sm">{formatAmount(rollsTotal)}</span>
                  </div>
                </div>

                {/* Section 1: Paper Bills Grid */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Paper Bills</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {[
                      { label: '$100 Bills', key: 'hundreds' as const, val: 100 },
                      { label: '$50 Bills', key: 'fifties' as const, val: 50 },
                      { label: '$20 Bills', key: 'twenties' as const, val: 20 },
                      { label: '$10 Bills', key: 'tens' as const, val: 10 },
                      { label: '$5 Bills', key: 'fives' as const, val: 5 },
                      { label: '$2 Bills', key: 'twos' as const, val: 2 },
                      { label: '$1 Bills', key: 'singles' as const, val: 1 }
                    ].map(b => (
                      <div key={b.key} className="p-2.5 bg-slate-50 rounded-2xl border border-gray-150 flex items-center justify-between text-xs hover:border-gray-300 transition-all">
                        <div>
                          <span className="font-bold text-slate-900 block">{b.label}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Subtotal: {formatAmount(denominations[b.key] * b.val)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => incrementDenom(b.key, -1)}
                            className="w-7 h-7 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center font-bold text-slate-600"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={denominations[b.key] || ''}
                            onChange={(e) => setDenominations({ ...denominations, [b.key]: Math.max(0, parseInt(e.target.value) || 0) })}
                            placeholder="0"
                            className="w-12 py-1 bg-white border border-gray-200 rounded-lg text-center font-mono font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => incrementDenom(b.key, 1)}
                            className="w-7 h-7 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center font-bold text-slate-600"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => incrementDenom(b.key, 5)}
                            className="px-1.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold"
                            title="Add 5 bills"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 2: Standard Bank Coin Rolls */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Standard Bank Coin Rolls</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[
                      { label: '$10 Quarter Roll (40 pcs)', key: 'rollQuarters' as const, val: 10.00 },
                      { label: '$5 Dime Roll (50 pcs)', key: 'rollDimes' as const, val: 5.00 },
                      { label: '$2 Nickel Roll (40 pcs)', key: 'rollNickels' as const, val: 2.00 },
                      { label: '50¢ Penny Roll (50 pcs)', key: 'rollPennies' as const, val: 0.50 }
                    ].map(r => (
                      <div key={r.key} className="p-2.5 bg-indigo-50/40 rounded-2xl border border-indigo-150 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block text-[11px]">{r.label}</span>
                          <span className="text-[10px] text-indigo-700 font-mono">
                            {formatAmount(denominations[r.key] * r.val)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => incrementDenom(r.key, -1)}
                            className="w-6 h-6 bg-white hover:bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={denominations[r.key] || ''}
                            onChange={(e) => setDenominations({ ...denominations, [r.key]: Math.max(0, parseInt(e.target.value) || 0) })}
                            placeholder="0"
                            className="w-10 py-1 bg-white border border-gray-200 rounded-md text-center font-mono font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => incrementDenom(r.key, 1)}
                            className="w-6 h-6 bg-white hover:bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Loose Coins */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Loose Coins</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { label: 'Half-Dollar (50¢)', key: 'halves' as const, val: 0.50 },
                      { label: 'Quarters (25¢)', key: 'quarters' as const, val: 0.25 },
                      { label: 'Dimes (10¢)', key: 'dimes' as const, val: 0.10 },
                      { label: 'Nickels (5¢)', key: 'nickels' as const, val: 0.05 },
                      { label: 'Pennies (1¢)', key: 'pennies' as const, val: 0.01 }
                    ].map(c => (
                      <div key={c.key} className="p-2 bg-slate-50 rounded-xl border border-gray-150 flex flex-col justify-between text-xs space-y-1">
                        <span className="font-semibold text-slate-700 text-[11px] truncate">{c.label}</span>
                        <div className="flex items-center gap-1 justify-between">
                          <input
                            type="number"
                            min="0"
                            value={denominations[c.key] || ''}
                            onChange={(e) => setDenominations({ ...denominations, [c.key]: Math.max(0, parseInt(e.target.value) || 0) })}
                            placeholder="0"
                            className="w-full py-1 px-1 bg-white border border-gray-200 rounded-lg text-center font-mono font-bold text-xs"
                          />
                        </div>
                        <span className="text-[9px] text-gray-400 font-mono text-right">
                          {formatAmount(denominations[c.key] * c.val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-gray-150">
                  <div className="text-xs text-gray-500 text-center sm:text-left">
                    <span>Calculated Physical Count: </span>
                    <strong className="text-slate-900 font-mono text-sm">{formatAmount(totalFromDenominations)}</strong>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleApplyDenominations}
                    disabled={totalFromDenominations === 0}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Apply Count to Reconciliation</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CASH MOVEMENTS (PAID OUTS / SAFE DROPS / ADD FLOAT) */}
          {activeTab === 'movements' && (
            <div className="space-y-4" id="shift-tab-movements-content">
              <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-150 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-150 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Vault className="w-4 h-4 text-indigo-600" />
                      <span>Shift Cash In, Paid-Outs & Safe Drops</span>
                    </h3>
                    <p className="text-xs text-gray-500">Track mid-shift cash injections, petty cash withdrawals, and safe drops</p>
                  </div>

                  <button
                    onClick={() => setShowAddMovementModal(true)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition-all"
                    id="btn-add-cash-movement"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record Cash Movement</span>
                  </button>
                </div>

                {/* Movement Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      <span>Total Cash In (Add Float)</span>
                    </div>
                    <span className="text-lg font-black font-mono text-emerald-950 block mt-1">
                      +{formatAmount(metrics.cashInTotal)}
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                      <ArrowDownRight className="w-4 h-4 text-rose-600" />
                      <span>Total Paid Out (Petty Cash)</span>
                    </div>
                    <span className="text-lg font-black font-mono text-rose-950 block mt-1">
                      -{formatAmount(metrics.cashOutTotal)}
                    </span>
                  </div>

                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
                    <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs">
                      <Vault className="w-4 h-4 text-indigo-600" />
                      <span>Total Safe Drops to Vault</span>
                    </div>
                    <span className="text-lg font-black font-mono text-indigo-950 block mt-1">
                      -{formatAmount(metrics.safeDropsTotal)}
                    </span>
                  </div>
                </div>

                {/* Movement Table */}
                <div className="overflow-x-auto rounded-2xl border border-gray-150">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-150 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Movement ID</th>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Reason / Memo</th>
                        <th className="py-2.5 px-3">Staff</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {cashMovements.length > 0 ? (
                        cashMovements.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/60 font-sans">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{m.id}</td>
                            <td className="py-2.5 px-3 text-gray-500 font-mono">{m.time}</td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                m.type === 'cash_in' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : m.type === 'cash_out' 
                                  ? 'bg-rose-100 text-rose-800' 
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {m.type === 'cash_in' ? 'Cash In (+)' : m.type === 'cash_out' ? 'Cash Out (-)' : 'Safe Drop (-)'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{m.category}</td>
                            <td className="py-2.5 px-3 text-gray-500 text-xs">{m.reason}</td>
                            <td className="py-2.5 px-3 text-gray-600">{m.staffName}</td>
                            <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                              m.type === 'cash_in' ? 'text-emerald-700' : 'text-rose-700'
                            }`}>
                              {m.type === 'cash_in' ? `+${formatAmount(m.amount)}` : `-${formatAmount(m.amount)}`}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                            No cash movements or paid-outs recorded during this shift.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SALES TRANSACTION LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-4" id="shift-tab-ledger-content">
              <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-150 shadow-xs space-y-4">
                
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Shift Register Sales Ledger</h3>
                    <p className="text-xs text-gray-500">All {shiftTransactions.length} customer sales processed during this shift</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Search input */}
                    <div className="relative flex-1 sm:w-48">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={ledgerSearch}
                        onChange={(e) => setLedgerSearch(e.target.value)}
                        placeholder="Search ID, customer..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                      />
                    </div>

                    {/* Payment filter dropdown */}
                    <select
                      value={ledgerPaymentFilter}
                      onChange={(e) => setLedgerPaymentFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
                    >
                      <option value="All">All Channels</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit/Debit Card">Credit/Debit Card</option>
                      <option value="Digital Wallet">Digital Wallet</option>
                    </select>
                  </div>
                </div>

                {/* Ledger Table */}
                <div className="overflow-x-auto max-h-[360px] rounded-2xl border border-gray-150">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-150 uppercase text-[10px] sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Payment Method</th>
                        <th className="py-2.5 px-3 text-right">Items</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {filteredLedger.length > 0 ? (
                        filteredLedger.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 font-sans">
                            <td className="py-2 px-3 font-mono font-semibold text-slate-900">{tx.id}</td>
                            <td className="py-2 px-3 text-gray-500 font-mono text-xs">{tx.time}</td>
                            <td className="py-2 px-3 text-slate-700 font-medium">{tx.customerName || 'Walk-in Guest'}</td>
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                tx.paymentMethod === 'Cash'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : tx.paymentMethod === 'Credit/Debit Card'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {tx.paymentMethod}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right text-gray-500 font-mono">{tx.itemsCount}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">{formatAmount(tx.total)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                            No transactions matched search filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PAST FINALIZED Z-REPORTS ARCHIVE */}
          {activeTab === 'history' && (
            <div className="space-y-4" id="shift-tab-history-content">
              <div className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-150 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Past Finalized End-of-Day Z-Reports Archive</span>
                  </h3>
                  <p className="text-xs text-gray-500">Review historical closeout summaries, float reconciliations, and variance records</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {HISTORICAL_SHIFT_REPORTS.map((rep) => (
                    <div 
                      key={rep.reportId}
                      className="p-4 rounded-2xl border border-gray-150 bg-slate-50/60 hover:bg-slate-100/70 transition-all space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-xs">{rep.reportId}</span>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                              Balanced
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {new Date(rep.timestamp).toLocaleDateString()} • Operator: {rep.staffName}
                          </span>
                        </div>

                        <span className="text-sm font-black font-mono text-slate-900">
                          {formatAmount(rep.totalSales)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] bg-white p-2 rounded-xl border border-gray-150">
                        <div>
                          <span className="text-gray-400 block">Cash:</span>
                          <span className="font-bold text-slate-800">{formatAmount(rep.cashSales)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Card:</span>
                          <span className="font-bold text-slate-800">{formatAmount(rep.cardSales)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Variance:</span>
                          <span className="font-bold text-emerald-600">{formatAmount(rep.variance)}</span>
                        </div>
                      </div>

                      {rep.notes && (
                        <p className="text-[11px] text-gray-600 italic">"{rep.notes}"</p>
                      )}

                      <div className="flex justify-end gap-2 pt-1 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setSelectedHistoricalReport(rep);
                            setShowPrintSlip(true);
                          }}
                          className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-3xs"
                        >
                          <Printer className="w-3 h-3" /> View & Print Slip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER CONTROLS */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-gray-150 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white shrink-0" id="shift-modal-footer">
          <div className="text-xs text-gray-500 w-full sm:w-auto flex items-center gap-2">
            <span>Reconciliation Status: </span>
            {typeof reconciledCash === 'number' && reconciledCash >= 0 ? (
              <span className={`font-bold inline-flex items-center gap-1 ${
                Math.abs(metrics.variance) < 0.01 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {Math.abs(metrics.variance) < 0.01 ? '✓ Balanced' : `⚠ Variance: ${formatAmount(metrics.variance)}`}
              </span>
            ) : (
              <span className="text-amber-600 font-semibold">Pending physical count</span>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Close Window
            </button>

            <button
              onClick={handleCompleteCloseout}
              disabled={isFinalizing}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
              id="btn-complete-shift-closeout"
            >
              {isFinalizing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Recording EOD Closeout...
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-indigo-300" />
                  <span>{readingMode === 'Z_READING' ? 'Finalize EOD Closeout' : 'Save X-Reading Audit'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* RECORD CASH MOVEMENT (PAID-OUT / SAFE DROP) SUB-MODAL */}
      {showAddMovementModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <form onSubmit={handleAddMovement} className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-gray-150">
            <div className="flex justify-between items-center border-b border-gray-150 pb-3">
              <div className="flex items-center gap-2">
                <Vault className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Record Cash Drawer Movement</h3>
              </div>
              <button type="button" onClick={() => setShowAddMovementModal(false)} className="text-gray-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Movement Type:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewMovementType('cash_out');
                      setNewMovementCategory('Petty Cash Expense');
                    }}
                    className={`py-2 rounded-xl font-bold text-center border transition-all ${
                      newMovementType === 'cash_out' ? 'bg-rose-600 text-white border-rose-700' : 'bg-slate-50 border-gray-200 text-slate-700'
                    }`}
                  >
                    Paid Out (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewMovementType('cash_in');
                      setNewMovementCategory('Float Top-up');
                    }}
                    className={`py-2 rounded-xl font-bold text-center border transition-all ${
                      newMovementType === 'cash_in' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 border-gray-200 text-slate-700'
                    }`}
                  >
                    Cash In (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewMovementType('safe_drop');
                      setNewMovementCategory('Safe Deposit Drop');
                    }}
                    className={`py-2 rounded-xl font-bold text-center border transition-all ${
                      newMovementType === 'safe_drop' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 border-gray-200 text-slate-700'
                    }`}
                  >
                    Safe Drop (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount ({currencySymbol}):</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={newMovementAmount}
                  onChange={(e) => setNewMovementAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category:</label>
                <input
                  type="text"
                  value={newMovementCategory}
                  onChange={(e) => setNewMovementCategory(e.target.value)}
                  placeholder="e.g. Store supplies, change replenishment, mid-day safe drop"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason / Description:</label>
                <input
                  type="text"
                  value={newMovementReason}
                  onChange={(e) => setNewMovementReason(e.target.value)}
                  placeholder="e.g. Purchased receipt thermal rolls & cleaning supplies"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-150">
              <button
                type="button"
                onClick={() => setShowAddMovementModal(false)}
                className="w-1/2 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Save Movement
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EMAIL EOD REPORT SUB-MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-150">
          <form onSubmit={handleSendEmailReport} className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-gray-150">
            <div className="flex justify-between items-center border-b border-gray-150 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Email Shift Reconciliation Report</h3>
              </div>
              <button type="button" onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Recipient Email Address:</label>
                <input
                  type="email"
                  required
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="manager@store.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-semibold"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-1 text-[11px] text-gray-600">
                <span className="font-bold text-slate-800 block">Report Attachment Preview:</span>
                <div>Subject: <strong>[EOD REPORT] {terminalId} - {formatAmount(metrics.totalSales)}</strong></div>
                <div>Sales: <strong>{formatAmount(metrics.totalSales)}</strong> • Variance: <strong>{formatAmount(metrics.variance)}</strong></div>
                <div>Operator: <strong>{activeStaffName}</strong></div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-150">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="w-1/2 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={emailStatus === 'sending'}
                className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
              >
                {emailStatus === 'sending' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending...
                  </>
                ) : emailStatus === 'sent' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Dispatched!
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Send Report
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRINTABLE THERMAL SLIP MODAL (80mm Thermal POS slip format) */}
      {showPrintSlip && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-60 overflow-y-auto" id="print-slip-backdrop">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 border border-gray-200 font-mono text-xs max-h-[92vh] overflow-y-auto" id="print-slip-card">
            
            {/* Store Branding Header */}
            <div className="text-center border-b border-dashed border-gray-300 pb-3 space-y-1">
              <h2 className="text-base font-black text-slate-900 tracking-wider">NEXUS ENTERPRISE POS</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                {selectedHistoricalReport ? 'HISTORICAL Z-REPORT' : readingMode === 'Z_READING' ? 'END-OF-DAY Z-REPORT' : 'MID-SHIFT X-READING SLIP'}
              </p>
              <p className="text-[10px] text-gray-400">Terminal: {terminalId}</p>
              <p className="text-[10px] text-gray-400">Operator: {selectedHistoricalReport?.staffName || activeStaffName}</p>
              <p className="text-[10px] text-gray-400">Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            </div>

            {/* Sales Summary */}
            <div className="space-y-1 border-b border-dashed border-gray-300 pb-2.5">
              <div className="flex justify-between"><span>Gross Sales:</span> <span>{formatAmount(selectedHistoricalReport?.grossSales || metrics.grossSales)}</span></div>
              <div className="flex justify-between"><span>Discounts:</span> <span>-{formatAmount(selectedHistoricalReport?.totalDiscounts || metrics.totalDiscounts)}</span></div>
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>Net Sales:</span> 
                <span>{formatAmount(selectedHistoricalReport?.totalSales || metrics.totalSales)}</span>
              </div>
              <div className="flex justify-between text-gray-500"><span>Tax Collected:</span> <span>{formatAmount(selectedHistoricalReport?.totalTax || metrics.totalTax)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Transactions:</span> <span>{selectedHistoricalReport?.totalTransactions || metrics.totalTransactions}</span></div>
            </div>

            {/* Payment Method Distribution */}
            <div className="space-y-1 border-b border-dashed border-gray-300 pb-2.5">
              <span className="font-bold block uppercase text-[10px] text-gray-400 tracking-wider">Revenue By Channel</span>
              <div className="flex justify-between">
                <span>Cash Sales:</span> 
                <span>{formatAmount(selectedHistoricalReport?.cashSales || metrics.cashTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Credit/Debit Cards:</span> 
                <span>{formatAmount(selectedHistoricalReport?.cardSales || metrics.cardTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Digital Wallet (NFC):</span> 
                <span>{formatAmount(selectedHistoricalReport?.digitalWalletSales || metrics.digitalTotal)}</span>
              </div>
            </div>

            {/* Drawer Cash Reconciliation */}
            <div className="space-y-1 border-b border-dashed border-gray-300 pb-2.5">
              <span className="font-bold block uppercase text-[10px] text-gray-400 tracking-wider">Drawer Balancing</span>
              <div className="flex justify-between">
                <span>Starting Float:</span> 
                <span>{formatAmount(selectedHistoricalReport?.openingFloat || shiftStartCash)}</span>
              </div>
              <div className="flex justify-between">
                <span>(+) Cash In:</span> 
                <span>+{formatAmount(selectedHistoricalReport?.cashInTotal || metrics.cashInTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>(-) Cash Out / Petty:</span> 
                <span>-{formatAmount(selectedHistoricalReport?.cashOutTotal || metrics.cashOutTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>(-) Safe Drops:</span> 
                <span>-{formatAmount(selectedHistoricalReport?.safeDropsTotal || metrics.safeDropsTotal)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
                <span>Expected Cash:</span> 
                <span>{formatAmount(selectedHistoricalReport?.expectedDrawerCash || metrics.expectedDrawerCash)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Actual Counted:</span> 
                <span>{formatAmount(selectedHistoricalReport?.actualDrawerCash || metrics.actualCash)}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-0.5">
                <span>Variance:</span> 
                <span className={Math.abs(selectedHistoricalReport?.variance || metrics.variance) < 0.01 ? 'text-emerald-700' : 'text-rose-700'}>
                  {formatAmount(selectedHistoricalReport?.variance || metrics.variance)}
                </span>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-1 text-[10px] text-gray-400 space-y-3">
              <div className="border-t border-gray-300 pt-2 flex justify-between">
                <span>Cashier Sign: __________________</span>
              </div>
              <div className="flex justify-between">
                <span>Manager Sign: __________________</span>
              </div>
            </div>

            {/* Print Slip Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print?.()}
                className="w-1/2 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Print / Save PDF
              </button>
              <button
                onClick={() => {
                  setShowPrintSlip(false);
                  setSelectedHistoricalReport(null);
                }}
                className="w-1/2 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
