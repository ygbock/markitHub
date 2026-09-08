import { LedgerAccount, LedgerJournalEntry, LedgerLineItem, Order, PaymentConfirmationResult, PaymentSession } from '../types';

// ============================================================================
// STANDARD FINTECH CHART OF ACCOUNTS
// ============================================================================

export const STANDARD_CHART_OF_ACCOUNTS: LedgerAccount[] = [
  { code: '1010', name: 'Cash on Hand (Physical Register)', type: 'Asset', balance: 45000, description: 'Physical cash in drawer or cash-on-delivery' },
  { code: '1020', name: 'Operating Bank Account (SLCB)', type: 'Asset', balance: 185000, description: 'Primary commercial bank account for wires and clearing' },
  { code: '1024', name: 'Monime Clearing & Settlement Escrow', type: 'Asset', balance: 58000, description: 'Unified multi-channel clearing account for Monime API payments' },
  { code: '1030', name: 'Orange Money Settlement Escrow', type: 'Asset', balance: 62400, description: 'Direct carrier settlement wallet for Orange Money' },
  { code: '1040', name: 'Stripe Clearing Account', type: 'Asset', balance: 34200, description: 'Merchant credit card clearing and holding account' },
  { code: '1050', name: 'Afrimoney Settlement Account', type: 'Asset', balance: 41800, description: 'Africell mobile money settlement ledger balance' },
  { code: '1060', name: 'BNPL Clearing Account (Klarna)', type: 'Asset', balance: 12000, description: 'Accounts receivable from buy-now-pay-later rails' },
  { code: '1080', name: 'Merchandise Inventory Asset', type: 'Asset', balance: 350000, description: 'Asset valuation of on-hand inventory goods' },
  { code: '2020', name: 'Sales Tax / VAT Payable', type: 'Liability', balance: 18400, description: 'Collected sales tax owed to revenue authority' },
  { code: '4010', name: 'E-Commerce Sales Revenue', type: 'Revenue', balance: 284000, description: 'Gross revenue recognized from online storefront checkout' },
  { code: '4020', name: 'POS In-Store Sales Revenue', type: 'Revenue', balance: 412000, description: 'Gross revenue recognized from physical terminal POS sales' },
  { code: '5010', name: 'Cost of Goods Sold (COGS)', type: 'Expense', balance: 198000, description: 'Direct acquisition cost of inventory items sold' },
  { code: '5030', name: 'Payment Gateway Merchant Fees', type: 'Expense', balance: 5400, description: 'Third-party payment processor transaction commissions' },
];

const LOCAL_STORAGE_LEDGER_KEY = 'nexus_fintech_ledger_entries_v1';

/**
 * Helper to get in-memory or persisted ledger journal entries
 */
export function getLedgerJournalEntries(): LedgerJournalEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LEDGER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[LedgerService] Failed to load journal from storage:', err);
  }
  return [];
}

/**
 * Save journal entry to local ledger storage
 */
export function saveLedgerJournalEntry(entry: LedgerJournalEntry): void {
  try {
    const existing = getLedgerJournalEntries();
    const updated = [entry, ...existing.filter(e => e.id !== entry.id)].slice(0, 500);
    localStorage.setItem(LOCAL_STORAGE_LEDGER_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[LedgerService] Failed to persist journal entry:', err);
  }
}

/**
 * Resolves settlement asset account based on gateway provider
 */
export function resolveSettlementAccount(provider: string, customAccount?: string): { code: string; name: string } {
  if (customAccount && customAccount.trim()) {
    const match = customAccount.match(/^(\d{4})\s*-\s*(.+)$/);
    if (match) {
      return { code: match[1], name: match[2] };
    }
  }

  switch (provider.toLowerCase()) {
    case 'monime':
      return { code: '1024', name: 'Monime Clearing & Settlement Escrow' };
    case 'orange_money':
      return { code: '1030', name: 'Orange Money Settlement Escrow' };
    case 'afrimoney':
      return { code: '1050', name: 'Afrimoney Settlement Account' };
    case 'stripe':
    case 'card':
      return { code: '1040', name: 'Stripe Clearing Account' };
    case 'bank_wire':
    case 'bank_transfer':
      return { code: '1020', name: 'Operating Bank Account (SLCB)' };
    case 'bnpl_klarna':
      return { code: '1060', name: 'BNPL Clearing Account (Klarna)' };
    case 'cash_on_delivery':
    case 'cash':
    default:
      return { code: '1010', name: 'Cash on Hand (Physical Register)' };
  }
}

export interface RecordOrderLedgerParams {
  order: Order;
  paymentSession?: PaymentSession | null;
  paymentResult: Partial<PaymentConfirmationResult>;
  channel?: 'Online Storefront' | 'In-Store POS' | string;
  performer?: string;
}

/**
 * Ledger Service
 * Writes an immutable, balanced double-entry financial ledger record upon payment settlement
 */
export class LedgerService {
  /**
   * Records a full balanced double-entry transaction for a completed order
   */
  static recordOrderTransaction(params: RecordOrderLedgerParams): LedgerJournalEntry {
    const {
      order,
      paymentSession,
      paymentResult,
      channel = 'Online Storefront',
      performer = 'Fintech Ledger Daemon'
    } = params;

    const totalAmount = Number(order.grandTotal ?? order.total ?? 0);
    const taxAmount = Number(order.tax ?? 0);
    const netRevenue = Math.max(0, totalAmount - taxAmount);
    
    // Estimate Cost of Goods Sold from items
    const estimatedCogs = (order.items || []).reduce((sum, item) => {
      const itemCost = Number(item.cost || (item.price * 0.65));
      return sum + (itemCost * item.quantity);
    }, 0);

    const provider = paymentResult.provider || (paymentSession?.availableGateways?.[0]?.provider) || 'stripe';
    const settlementAccount = resolveSettlementAccount(provider);

    const lines: LedgerLineItem[] = [];

    // 1. DEBIT: Asset Account (Settlement / Cash / Bank)
    lines.push({
      accountId: `acc-${settlementAccount.code}`,
      accountCode: settlementAccount.code,
      accountName: settlementAccount.name,
      type: 'Debit',
      amount: Number(totalAmount.toFixed(2)),
      memo: `Settlement collection for Order #${order.orderNumber || order.id} via ${provider.toUpperCase()}`
    });

    // 2. CREDIT: Revenue Account (E-Commerce Sales or POS Sales)
    const revenueAccountCode = channel === 'In-Store POS' ? '4020' : '4010';
    const revenueAccountName = channel === 'In-Store POS' ? 'POS In-Store Sales Revenue' : 'E-Commerce Sales Revenue';
    lines.push({
      accountId: `acc-${revenueAccountCode}`,
      accountCode: revenueAccountCode,
      accountName: revenueAccountName,
      type: 'Credit',
      amount: Number(netRevenue.toFixed(2)),
      memo: `Gross revenue recognition for Order #${order.orderNumber || order.id}`
    });

    // 3. CREDIT: Tax Liability (Sales Tax / VAT Payable) if tax > 0
    if (taxAmount > 0) {
      lines.push({
        accountId: 'acc-2020',
        accountCode: '2020',
        accountName: 'Sales Tax / VAT Payable',
        type: 'Credit',
        amount: Number(taxAmount.toFixed(2)),
        memo: `Output sales tax collected on Order #${order.orderNumber || order.id}`
      });
    }

    // 4. INVENTORY & COGS DOUBLE-ENTRY (Debit COGS Expense, Credit Merchandise Inventory Asset)
    if (estimatedCogs > 0) {
      lines.push({
        accountId: 'acc-5010',
        accountCode: '5010',
        accountName: 'Cost of Goods Sold (COGS)',
        type: 'Debit',
        amount: Number(estimatedCogs.toFixed(2)),
        memo: `COGS expense recognition for Order #${order.orderNumber || order.id}`
      });

      lines.push({
        accountId: 'acc-1080',
        accountCode: '1080',
        accountName: 'Merchandise Inventory Asset',
        type: 'Credit',
        amount: Number(estimatedCogs.toFixed(2)),
        memo: `Inventory asset depletion for Order #${order.orderNumber || order.id}`
      });
    }

    const totalDebit = lines.filter(l => l.type === 'Debit').reduce((sum, l) => sum + l.amount, 0);
    const totalCredit = lines.filter(l => l.type === 'Credit').reduce((sum, l) => sum + l.amount, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    const entryNumber = `JRN-${Date.now().toString().slice(-6)}`;
    const journalEntry: LedgerJournalEntry = {
      id: `ledger-entry-${Date.now()}`,
      entryNumber,
      date: new Date().toISOString(),
      sourceDocument: channel === 'In-Store POS' ? 'POS Receipt' : 'E-Commerce Order',
      referenceId: order.orderNumber || order.id,
      description: `Payment & Settlement verification for Order #${order.orderNumber || order.id} (${paymentResult.transactionId || 'TXN-DIRECT'})`,
      lines,
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      isBalanced,
      createdBy: performer,
      createdAt: new Date().toISOString()
    };

    saveLedgerJournalEntry(journalEntry);
    console.info(`[Ledger] Double-Entry Journal ${journalEntry.entryNumber} posted. Balanced: ${isBalanced}, Total: ${journalEntry.totalDebit}`);

    return journalEntry;
  }

  /**
   * Helper to quickly record payment for an existing account order settlement
   */
  static async recordOrderPayment(params: {
    orderId: string;
    orderNumber: string;
    amount: number;
    currency: string;
    provider: string;
    transactionId: string;
    customerName?: string;
    channel?: string;
  }): Promise<LedgerJournalEntry> {
    const settlementAccount = resolveSettlementAccount(params.provider);
    const revenueAccountCode = params.channel === 'In-Store POS' ? '4020' : '4010';
    const revenueAccountName = params.channel === 'In-Store POS' ? 'POS In-Store Sales Revenue' : 'E-Commerce Sales Revenue';

    const lines: LedgerLineItem[] = [
      {
        accountId: `acc-${settlementAccount.code}`,
        accountCode: settlementAccount.code,
        accountName: settlementAccount.name,
        type: 'Debit',
        amount: Number(params.amount.toFixed(2)),
        memo: `Settlement collection for Order #${params.orderNumber} via ${params.provider.toUpperCase()} (${params.transactionId})`
      },
      {
        accountId: `acc-${revenueAccountCode}`,
        accountCode: revenueAccountCode,
        accountName: revenueAccountName,
        type: 'Credit',
        amount: Number(params.amount.toFixed(2)),
        memo: `Revenue settlement for Order #${params.orderNumber}`
      }
    ];

    const entryNumber = `JRN-${Date.now().toString().slice(-6)}`;
    const journalEntry: LedgerJournalEntry = {
      id: `ledger-entry-${Date.now()}`,
      entryNumber,
      date: new Date().toISOString(),
      sourceDocument: 'Payment Receipt Settlement',
      referenceId: params.orderNumber || params.orderId,
      description: `Account Order Payment Settlement for #${params.orderNumber} via ${params.provider.toUpperCase()} (${params.transactionId})`,
      lines,
      totalDebit: Number(params.amount.toFixed(2)),
      totalCredit: Number(params.amount.toFixed(2)),
      isBalanced: true,
      createdBy: 'Customer Account Portal',
      createdAt: new Date().toISOString()
    };

    saveLedgerJournalEntry(journalEntry);
    console.info(`[Ledger] Account Order Payment Journal ${journalEntry.entryNumber} saved.`);
    return journalEntry;
  }
}
