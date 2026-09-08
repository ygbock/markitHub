import React, { useState, useRef } from 'react';
import { Customer } from '../types';
import { 
  Upload, Download, FileText, CheckCircle2, AlertTriangle, 
  X, HelpCircle, Layers, Users, Sparkles, Check
} from 'lucide-react';

interface CustomerImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onImportCustomers: (imported: Customer[]) => void;
}

export default function CustomerImportExportModal({
  isOpen,
  onClose,
  customers,
  onImportCustomers
}: CustomerImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [csvText, setCsvText] = useState('');
  const [parsedCustomers, setParsedCustomers] = useState<Customer[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const templateContent = [
      'Name,Email,Phone,Segment,LoyaltyPoints,Tier,Address,City,State,Zip,Tags,Notes',
      '"Amanda Vance","amanda.v@nexus.io","+1 (555) 123-4567","VIP",350,"Gold","742 Evergreen Terrace","Springfield","OR","97477","VIP Client;Wholesale","Prefers direct courier deliveries"',
      '"Liam Gallagher","liam.g@cloudmail.com","+1 (555) 987-6543","Regular",120,"Silver","100 North Michigan Ave","Chicago","IL","60601","Tech Enthusiast","In-store pickup preferred"',
      '"Chloe Bennett","chloe.b@startup.org","+1 (555) 456-7890","New",50,"Bronze","500 King Street","Seattle","WA","98104","Early Adopter","Signed up via summer expo"'
    ].join('\n');

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'nexus_crm_customer_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export current customers to CSV
  const handleExportCSV = () => {
    const headers = ['ID,Name,Email,Phone,Segment,LoyaltyPoints,Tier,Address,City,State,Zip,MarketingOptIn,OrdersCount,Tags,Notes,CreatedAt'];
    const rows = customers.map(c => [
      `"${c.id}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${c.segment || 'Regular'}"`,
      c.loyaltyPoints || 0,
      `"${c.loyaltyTier || 'Bronze'}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${(c.city || '').replace(/"/g, '""')}"`,
      `"${(c.state || '').replace(/"/g, '""')}"`,
      `"${(c.zip || '').replace(/"/g, '""')}"`,
      c.marketingOptIn !== false ? 'Yes' : 'No',
      c.purchaseHistoryIds?.length || 0,
      `"${(c.tags || []).join('; ')}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
      `"${c.createdAt || new Date().toISOString()}"`
    ].join(','));

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nexus_crm_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parse CSV string into Customers
  const parseCSV = (content: string) => {
    try {
      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        setParseErrors(['CSV appears to be empty or contains only the header row.']);
        setParsedCustomers([]);
        return;
      }

      const errors: string[] = [];
      const parsedList: Customer[] = [];

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        // Simple regex parser handling quotes
        const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
        const matches: string[] = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
          if (match.index === regex.lastIndex) regex.lastIndex++;
          let val = match[1] || '';
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1).replace(/""/g, '"');
          }
          matches.push(val.trim());
          if (matches.length >= 12) break; // Maximum expected columns
        }

        if (matches.length < 2 || !matches[0] || !matches[1]) {
          errors.push(`Row ${i + 1}: Missing Name or Email address.`);
          continue;
        }

        const name = matches[0];
        const email = matches[1];
        const phone = matches[2] || '+1 (555) 000-0000';
        const rawSeg = matches[3] || 'New';
        const segment: 'VIP' | 'Regular' | 'New' | 'Inactive' = 
          ['VIP', 'Regular', 'New', 'Inactive'].includes(rawSeg) ? (rawSeg as any) : 'New';
        const points = parseInt(matches[4]) || 0;
        const rawTier = matches[5] || 'Bronze';
        const tier = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].includes(rawTier) ? (rawTier as any) : 'Bronze';
        const address = matches[6] || '';
        const city = matches[7] || '';
        const state = matches[8] || '';
        const zip = matches[9] || '';
        const rawTags = matches[10] ? matches[10].split(';').map(t => t.trim()).filter(Boolean) : [];
        const notes = matches[11] || '';

        parsedList.push({
          id: `cust-imp-${Date.now()}-${i}`,
          name,
          email,
          phone,
          segment,
          loyaltyPoints: points,
          loyaltyTier: tier,
          address,
          city,
          state,
          zip,
          tags: rawTags,
          notes,
          marketingOptIn: true,
          purchaseHistoryIds: [],
          createdAt: new Date().toISOString()
        });
      }

      setParseErrors(errors);
      setParsedCustomers(parsedList);
    } catch (err: any) {
      setParseErrors([`Failed to parse CSV: ${err.message || 'Formatting error'}`]);
      setParsedCustomers([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (parsedCustomers.length === 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      onImportCustomers(parsedCustomers);
      setIsProcessing(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto"
        id="customer-import-export-modal"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">CRM Data Hub & CSV Migration</h2>
              <p className="text-xs text-slate-400">Bulk import external customer spreadsheets or export telemetry records</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" /> Bulk Import Customers (CSV)
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4" /> Export Contacts ({customers.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 text-xs text-slate-700 bg-slate-50/40">
          
          {/* IMPORT TAB */}
          {activeTab === 'import' && (
            <div className="space-y-5 animate-in fade-in">
              {/* Template Download Box */}
              <div className="bg-indigo-50/50 border border-indigo-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> Standard CRM CSV Template
                  </span>
                  <p className="text-[11px] text-indigo-900/70">
                    Use our standardized CSV template with pre-mapped columns (Name, Email, Phone, Segment, LoyaltyPoints, Tier, Address, Tags).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download Template (.csv)
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="space-y-3">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/20 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2"
                >
                  <Upload className="w-8 h-8 text-indigo-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">
                    Click to browse or drop your .csv spreadsheet here
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Supports UTF-8 CSV exports from Shopify, Square, WooCommerce, or Excel.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Paste Area */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Or Paste CSV Data Directly:
                  </label>
                  <textarea
                    rows={4}
                    value={csvText}
                    onChange={(e) => {
                      setCsvText(e.target.value);
                      parseCSV(e.target.value);
                    }}
                    placeholder={'Name,Email,Phone,Segment,LoyaltyPoints\n"Jane Doe","jane@domain.com","+1 555-0192","VIP",250'}
                    className="w-full p-3 font-mono text-[11px] bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Errors Display */}
              {parseErrors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl space-y-1 text-rose-800">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    CSV Parser Warnings ({parseErrors.length})
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 max-h-24 overflow-y-auto">
                    {parseErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedCustomers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 
                      Ready to Provision: {parsedCustomers.length} valid customer profiles
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold sticky top-0">
                        <tr>
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Email</th>
                          <th className="px-4 py-2">Phone</th>
                          <th className="px-4 py-2">Segment</th>
                          <th className="px-4 py-2">Loyalty</th>
                          <th className="px-4 py-2">Tags</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {parsedCustomers.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 font-bold text-slate-900">{c.name}</td>
                            <td className="px-4 py-2 text-slate-600">{c.email}</td>
                            <td className="px-4 py-2 text-slate-500">{c.phone}</td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                                {c.segment}
                              </span>
                            </td>
                            <td className="px-4 py-2 font-mono font-bold">{c.loyaltyPoints} pts</td>
                            <td className="px-4 py-2 text-[10px] text-slate-500">
                              {(c.tags || []).join(', ') || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EXPORT TAB */}
          {activeTab === 'export' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-center">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
                  <Users className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Export Customer CRM Database</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Export all {customers.length} registered contacts, segment categorizations, loyalty balances, and past transaction records into standard UTF-8 CSV.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Contacts</span>
                    <span className="text-base font-black text-slate-900">{customers.length}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">VIP Contacts</span>
                    <span className="text-base font-black text-amber-600">
                      {customers.filter(c => c.segment === 'VIP').length}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Subscribed</span>
                    <span className="text-base font-black text-emerald-600">
                      {customers.filter(c => c.marketingOptIn !== false).length}
                    </span>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    onClick={handleExportCSV}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all shadow-md inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download Complete CSV Directory
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer for Import */}
        {activeTab === 'import' && (
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-500">
              {parsedCustomers.length > 0 
                ? `Ready to inject ${parsedCustomers.length} customers` 
                : 'Select or paste a CSV file to preview'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedCustomers.length === 0 || isProcessing}
                onClick={handleConfirmImport}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> {isProcessing ? 'Importing...' : `Import ${parsedCustomers.length} Records`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
