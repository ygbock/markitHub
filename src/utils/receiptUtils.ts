import { Order, SystemSettings } from '../types';
import { generateBarcodeSvg, generateQrCodeSvg } from './barcodeGenerator';

export interface ReceiptBusinessInfo {
  name: string;
  tagline: string;
  address: string;
  cityStateZip: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  returnPolicy: string;
}

export const DEFAULT_BUSINESS_INFO: ReceiptBusinessInfo = {
  name: 'NEXUS ENTERPRISE COMMERCE',
  tagline: 'Point-of-Sale Terminal & Retail Register',
  address: '450 Market Street, Suite 800',
  cityStateZip: 'San Francisco, CA 94105',
  phone: '+1 (800) 555-NEXUS',
  email: 'support@nexuscommerce.io',
  website: 'www.nexuspos.io',
  taxId: 'VAT-US-88492019-TX',
  returnPolicy: 'Items may be exchanged or returned with valid receipt within 30 days of purchase in original packaging.'
};

export function getBusinessInfoFromSettings(settings?: SystemSettings | null): ReceiptBusinessInfo {
  if (!settings || !settings.business) return DEFAULT_BUSINESS_INFO;
  return {
    name: settings.business.companyName || DEFAULT_BUSINESS_INFO.name,
    tagline: settings.business.tagline || DEFAULT_BUSINESS_INFO.tagline,
    address: settings.business.address || DEFAULT_BUSINESS_INFO.address,
    cityStateZip: `${settings.business.city || 'Freetown'}, ${settings.business.state || 'Western Area'} ${settings.business.postalCode || ''}`.trim(),
    phone: settings.business.phone || DEFAULT_BUSINESS_INFO.phone,
    email: settings.business.email || DEFAULT_BUSINESS_INFO.email,
    website: settings.business.website || DEFAULT_BUSINESS_INFO.website,
    taxId: settings.business.taxId || DEFAULT_BUSINESS_INFO.taxId,
    returnPolicy: settings.receipt?.returnPolicy || DEFAULT_BUSINESS_INFO.returnPolicy
  };
}

/**
 * Synthesize POS audio effects using browser Web Audio API
 */
export function playPosSound(type: 'beep' | 'success' | 'error' | 'hold') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'beep') {
      // Crisp barcode scanner chirp
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      // Pleasant two-tone checkout chime
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc1.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc2.frequency.setValueAtTime(1046.50, now + 0.2); // C6

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.2);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } else if (type === 'error') {
      // Low dual-tone alert
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'hold') {
      // Soft tab hold pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch {
    // Graceful fallback if audio context blocked by browser autoplay policy
  }
}

/**
 * Generate formatted plain text receipt
 */
export function generateReceiptPlainText(
  order: Order,
  currencyFormatter: (amt: number) => string,
  cashierName: string,
  businessInfo = DEFAULT_BUSINESS_INFO
): string {
  const line = '------------------------------------------';
  const doubleLine = '==========================================';
  const orderDate = new Date(order.date).toLocaleString();

  let text = `
${businessInfo.name}
${businessInfo.tagline}
${businessInfo.address}
${businessInfo.cityStateZip}
Tel: ${businessInfo.phone} | Tax ID: ${businessInfo.taxId}
${doubleLine}
RECEIPT / SALES INVOICE
Order #: ${order.id}
Date   : ${orderDate}
Cashier: ${cashierName}
Channel: ${order.channel}
${order.customerName ? `Customer: ${order.customerName}` : 'Customer: Walk-in Guest'}
${order.customerEmail ? `Email   : ${order.customerEmail}` : ''}
${line}
ITEM                          QTY   TOTAL
${line}
`;

  order.items.forEach((item) => {
    const name = item.productName.padEnd(25).slice(0, 25);
    const qty = String(item.quantity).padStart(3);
    const itemTotal = currencyFormatter(item.price * item.quantity).padStart(12);
    text += `${name} ${qty} ${itemTotal}\n`;
    if (item.variantSku) {
      text += `  [SKU: ${item.variantSku}]\n`;
    }
  });

  text += `${line}
Subtotal:              ${currencyFormatter(order.subtotal).padStart(19)}
Sales Tax (8.5%):      ${currencyFormatter(order.tax).padStart(19)}
`;

  if (order.discount > 0) {
    text += `Discount / Promo:     -${currencyFormatter(order.discount).padStart(18)}\n`;
  }

  text += `${doubleLine}
TOTAL PAID:            ${currencyFormatter(order.total).padStart(19)}
${doubleLine}
Payment Method: ${order.paymentMethod}
`;

  if (order.paymentMethod === 'Cash' && typeof order.cashTendered === 'number') {
    text += `Cash Tendered:         ${currencyFormatter(order.cashTendered).padStart(19)}\n`;
    text += `Change Returned:       ${currencyFormatter(order.cashChange || 0).padStart(19)}\n`;
  }

  if (order.loyaltyPointsEarned) {
    text += `Loyalty Points Earned: +${order.loyaltyPointsEarned} pts\n`;
  }

  if (order.receiptSentToEmail) {
    text += `E-Receipt Sent to: ${order.receiptSentToEmail}\n`;
  }

  text += `
${line}
RETURN POLICY:
${businessInfo.returnPolicy}
${line}
      THANK YOU FOR YOUR BUSINESS!
      VISIT US AGAIN SOON
`;

  return text.trim();
}

/**
 * Generate fully standalone HTML receipt with embedded styles and barcode
 */
export function generateReceiptHtml(
  order: Order,
  currencyFormatter: (amt: number) => string,
  cashierName: string,
  businessInfo = DEFAULT_BUSINESS_INFO
): string {
  const orderDate = new Date(order.date).toLocaleString();

  const itemsRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 6px 0; text-align: left; vertical-align: top;">
          <div style="font-weight: 600; color: #1e293b;">${item.productName}</div>
          <div style="font-size: 11px; color: #64748b; font-family: monospace;">
            ${item.variantSku ? `SKU: ${item.variantSku} | ` : ''}Unit: ${currencyFormatter(item.price)}
          </div>
        </td>
        <td style="padding: 6px 4px; text-align: center; vertical-align: top; font-family: monospace; font-weight: bold;">
          ${item.quantity}
        </td>
        <td style="padding: 6px 0; text-align: right; vertical-align: top; font-family: monospace; font-weight: 700; color: #0f172a;">
          ${currencyFormatter(item.price * item.quantity)}
        </td>
      </tr>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${order.id}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 4mm;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
      .receipt-container {
        box-shadow: none !important;
        border: none !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      margin: 0;
      padding: 20px 10px;
      display: flex;
      justify-content: center;
    }
    .receipt-container {
      width: 100%;
      max-width: 360px;
      background: #ffffff;
      padding: 24px 20px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      box-sizing: border-box;
      border: 1px solid #e2e8f0;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .header {
      border-bottom: 2px dashed #cbd5e1;
      padding-bottom: 14px;
      margin-bottom: 14px;
    }
    .store-name {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .store-tagline {
      font-size: 11px;
      color: #64748b;
      margin: 0 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .store-meta {
      font-size: 11px;
      color: #475569;
      line-height: 1.4;
      margin: 0;
    }
    .meta-table {
      width: 100%;
      font-size: 11px;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .meta-table td {
      padding: 2px 0;
      color: #475569;
    }
    .meta-table td.val {
      font-weight: 600;
      color: #0f172a;
      text-align: right;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 12px;
    }
    .items-table th {
      border-bottom: 1px solid #0f172a;
      padding: 6px 0;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
    }
    .totals-table {
      width: 100%;
      border-top: 1px dashed #cbd5e1;
      border-bottom: 2px dashed #cbd5e1;
      padding: 12px 0;
      margin: 12px 0;
      font-size: 12px;
    }
    .totals-table td {
      padding: 3px 0;
    }
    .grand-total {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .payment-badge {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      font-size: 11px;
      margin-bottom: 14px;
    }
    .barcode-box {
      text-align: center;
      margin: 14px 0;
      padding-top: 8px;
    }
    .barcode-svg {
      max-width: 220px;
      height: 48px;
      margin: 0 auto;
      display: block;
    }
    .footer-policy {
      font-size: 10px;
      color: #64748b;
      line-height: 1.4;
      text-align: center;
      margin-top: 12px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 12px;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header text-center">
      <div style="width: 36px; height: 36px; background: #0f172a; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px auto; font-weight: 900; font-size: 18px;">N</div>
      <h1 class="store-name">${businessInfo.name}</h1>
      <p class="store-tagline">${businessInfo.tagline}</p>
      <p class="store-meta">${businessInfo.address}<br>${businessInfo.cityStateZip}</p>
      <p class="store-meta">Tel: ${businessInfo.phone} | Tax ID: ${businessInfo.taxId}</p>
    </div>

    <table class="meta-table">
      <tr>
        <td>Order Ref:</td>
        <td class="val" style="font-family: monospace;">${order.id}</td>
      </tr>
      <tr>
        <td>Date & Time:</td>
        <td class="val">${orderDate}</td>
      </tr>
      <tr>
        <td>Terminal Cashier:</td>
        <td class="val">${cashierName}</td>
      </tr>
      <tr>
        <td>Sales Channel:</td>
        <td class="val">${order.channel}</td>
      </tr>
      <tr>
        <td>Customer:</td>
        <td class="val">${order.customerName || 'Walk-in Guest'}</td>
      </tr>
      ${order.customerEmail ? `<tr><td>Customer Email:</td><td class="val">${order.customerEmail}</td></tr>` : ''}
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align: left;">Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <table class="totals-table">
      <tr>
        <td style="color: #64748b;">Subtotal:</td>
        <td class="text-right" style="font-family: monospace; font-weight: 600;">${currencyFormatter(order.subtotal)}</td>
      </tr>
      <tr>
        <td style="color: #64748b;">Sales Tax (8.5%):</td>
        <td class="text-right" style="font-family: monospace; font-weight: 600;">${currencyFormatter(order.tax)}</td>
      </tr>
      ${
        order.discount > 0
          ? `<tr>
              <td style="color: #059669; font-weight: 600;">Discount / Promo:</td>
              <td class="text-right" style="font-family: monospace; font-weight: 700; color: #059669;">-${currencyFormatter(order.discount)}</td>
            </tr>`
          : ''
      }
      <tr style="border-top: 1px solid #e2e8f0;">
        <td class="grand-total" style="padding-top: 8px;">TOTAL DUE:</td>
        <td class="text-right grand-total" style="padding-top: 8px; font-family: monospace;">${currencyFormatter(order.total)}</td>
      </tr>
    </table>

    <div class="payment-badge">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #64748b;">Payment Method:</span>
        <span style="font-weight: 700; color: #0f172a;">${order.paymentMethod}</span>
      </div>
      ${
        order.paymentMethod === 'Cash' && typeof order.cashTendered === 'number'
          ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #64748b;">Cash Tendered:</span>
          <span style="font-family: monospace; font-weight: 600;">${currencyFormatter(order.cashTendered)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #059669; font-weight: 600;">Change Returned:</span>
          <span style="font-family: monospace; font-weight: 700; color: #059669;">${currencyFormatter(order.cashChange || 0)}</span>
        </div>`
          : ''
      }
      ${
        order.loyaltyPointsEarned
          ? `
        <div style="display: flex; justify-content: space-between; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1; color: #4338ca; font-weight: 600;">
          <span>Loyalty Points Earned:</span>
          <span>+${order.loyaltyPointsEarned} pts</span>
        </div>`
          : ''
      }
      ${
        order.receiptSentToEmail
          ? `
        <div style="display: flex; justify-content: space-between; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1; color: #059669; font-size: 10px;">
          <span>Email Status:</span>
          <span>Sent to ${order.receiptSentToEmail}</span>
        </div>`
          : ''
      }
    </div>

    <!-- Barcode and QR Code for POS Terminal -->
    <div class="barcode-box">
      <div style="max-width: 240px; margin: 0 auto 8px auto;">
        ${generateBarcodeSvg(order.id, { width: 240, height: 48, showText: true })}
      </div>
      <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 8px;">
        <div style="width: 72px; height: 72px;">
          ${generateQrCodeSvg(order.id, { size: 72 })}
        </div>
        <div style="text-align: left; font-size: 9px; color: #64748b; line-height: 1.3;">
          <div style="font-weight: 700; color: #0f172a;">SCAN TO VERIFY</div>
          <div>Ref: ${order.id}</div>
          <div>Status: ${order.status}</div>
        </div>
      </div>
    </div>

    <div class="footer-policy">
      <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">RETURN & EXCHANGE POLICY</div>
      ${businessInfo.returnPolicy}
      <div style="margin-top: 8px; font-weight: 600; color: #0f172a;">THANK YOU FOR YOUR PURCHASE!</div>
      <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">${businessInfo.website}</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Print the receipt seamlessly via an isolated hidden iframe
 */
export function printReceiptViaIframe(
  order: Order,
  currencyFormatter: (amt: number) => string,
  cashierName: string,
  businessInfo = DEFAULT_BUSINESS_INFO
) {
  const html = generateReceiptHtml(order, currencyFormatter, cashierName, businessInfo);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback: window.print
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }
  }, 300);
}

/**
 * Trigger download of styled HTML receipt file
 */
export function downloadReceiptHtml(
  order: Order,
  currencyFormatter: (amt: number) => string,
  cashierName: string,
  businessInfo = DEFAULT_BUSINESS_INFO
) {
  const htmlContent = generateReceiptHtml(order, currencyFormatter, cashierName, businessInfo);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Receipt-${order.id}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger download of formatted Plain Text receipt file
 */
export function downloadReceiptText(
  order: Order,
  currencyFormatter: (amt: number) => string,
  cashierName: string,
  businessInfo = DEFAULT_BUSINESS_INFO
) {
  const textContent = generateReceiptPlainText(order, currencyFormatter, cashierName, businessInfo);
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Receipt-${order.id}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy formatted receipt text to user clipboard
 */
export async function copyReceiptToClipboard(
  order: Order,
  currencyFormatter: (amt: number) => string,
  cashierName: string,
  businessInfo = DEFAULT_BUSINESS_INFO
): Promise<boolean> {
  const text = generateReceiptPlainText(order, currencyFormatter, cashierName, businessInfo);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch {
    return false;
  }
}

/**
 * Web Share API or sharing helpers
 */
export async function shareReceipt(
  order: Order,
  currencyFormatter: (amt: number) => string,
  cashierName: string,
  businessInfo = DEFAULT_BUSINESS_INFO
): Promise<{ success: boolean; method: 'native' | 'fallback' }> {
  const text = generateReceiptPlainText(order, currencyFormatter, cashierName, businessInfo);
  const title = `Receipt for Order ${order.id} - ${businessInfo.name}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
      });
      return { success: true, method: 'native' };
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        // User cancelled is not an error
        return { success: false, method: 'native' };
      }
    }
  }

  // Fallback to clipboard copy
  const copied = await copyReceiptToClipboard(order, currencyFormatter, cashierName, businessInfo);
  return { success: copied, method: 'fallback' };
}

/**
 * Automated / On-demand Receipt Email Dispatch Simulator with real delivery receipt logging
 */
export async function dispatchReceiptEmail(
  order: Order,
  targetEmail: string,
  currencyFormatter: (amt: number) => string,
  cashierName: string
): Promise<{
  success: boolean;
  messageId: string;
  timestamp: string;
  recipient: string;
}> {
  // Simulate network delivery with slight realistic latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  const messageId = `msg-rcpt-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const timestamp = new Date().toISOString();

  console.log(`[Receipt Email Dispatch] Sent receipt for order ${order.id} to ${targetEmail} (ID: ${messageId})`);

  return {
    success: true,
    messageId,
    timestamp,
    recipient: targetEmail,
  };
}
