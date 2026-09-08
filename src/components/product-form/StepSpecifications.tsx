import React, { useState } from 'react';
import { Plus, Trash2, Sliders, Sparkles, Check, Info } from 'lucide-react';

interface SpecificationRow {
  id: string;
  key: string;
  value: string;
}

interface StepSpecificationsProps {
  specifications: Record<string, string>;
  setSpecifications: (val: Record<string, string>) => void;
}

const SPEC_TEMPLATES = [
  {
    category: 'Electronics & Tech',
    specs: [
      { key: 'Weight', value: '250g' },
      { key: 'Connectivity', value: 'Bluetooth 5.3 & USB-C' },
      { key: 'Battery Life', value: 'Up to 30 Hours' },
      { key: 'Warranty', value: '1 Year Manufacturer' }
    ]
  },
  {
    category: 'Apparel & Footwear',
    specs: [
      { key: 'Material', value: '100% Organic Cotton' },
      { key: 'Fit Type', value: 'Regular Fit' },
      { key: 'Care Instructions', value: 'Machine wash cold' },
      { key: 'Country of Origin', value: 'Vietnam' }
    ]
  },
  {
    category: 'Food & Perishables',
    specs: [
      { key: 'Net Weight', value: '500g' },
      { key: 'Dietary Info', value: 'Gluten-Free, Vegan' },
      { key: 'Storage Temp', value: 'Keep refrigerated below 4°C' },
      { key: 'Allergens', value: 'Contains Soy' }
    ]
  }
];

export default function StepSpecifications({
  specifications,
  setSpecifications
}: StepSpecificationsProps) {
  // Convert specifications object to array rows for editing
  const [rows, setRows] = useState<SpecificationRow[]>(() => {
    const keys = Object.keys(specifications || {});
    if (keys.length === 0) {
      return [
        { id: '1', key: 'Weight', value: '' },
        { id: '2', key: 'Dimensions', value: '' }
      ];
    }
    return keys.map((k, idx) => ({
      id: `${idx}-${Date.now()}`,
      key: k,
      value: specifications[k]
    }));
  });

  const updateParentState = (updatedRows: SpecificationRow[]) => {
    const obj: Record<string, string> = {};
    updatedRows.forEach((r) => {
      if (r.key.trim()) {
        obj[r.key.trim()] = r.value;
      }
    });
    setSpecifications(obj);
  };

  const handleRowChange = (id: string, field: 'key' | 'value', val: string) => {
    const updated = rows.map((r) => (r.id === id ? { ...r, [field]: val } : r));
    setRows(updated);
    updateParentState(updated);
  };

  const handleAddRow = () => {
    const newRow = { id: `${Date.now()}`, key: '', value: '' };
    const updated = [...rows, newRow];
    setRows(updated);
    updateParentState(updated);
  };

  const handleRemoveRow = (id: string) => {
    const updated = rows.filter((r) => r.id !== id);
    setRows(updated);
    updateParentState(updated);
  };

  const handleLoadTemplate = (specs: { key: string; value: string }[]) => {
    const templateRows = specs.map((s, idx) => ({
      id: `${idx}-${Date.now()}`,
      key: s.key,
      value: s.value
    }));
    setRows(templateRows);
    updateParentState(templateRows);
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
          6
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Technical Specifications & Attributes</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Provide detailed specifications (weight, dimensions, power rating, care instructions, origin).
          </p>
        </div>
      </div>

      {/* Industry Preset Templates Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Quick Specification Preset Templates
          </span>
          <span className="text-[10px] text-slate-400">Click to pre-fill standard attributes</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {SPEC_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.category}
              type="button"
              onClick={() => handleLoadTemplate(tmpl.specs)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-900 transition-all cursor-pointer"
            >
              + {tmpl.category}
            </button>
          ))}
        </div>
      </div>

      {/* Key-Value Pair Specification Rows */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Product Attributes Table ({rows.length})
          </h4>
          <button
            type="button"
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Attribute Row
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs font-semibold">No custom specifications added.</p>
            <p className="text-[11px] mt-0.5">Click 'Add Attribute Row' or select a preset template above.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 p-2.5 sm:p-0 bg-slate-50/70 sm:bg-transparent rounded-xl border sm:border-0 border-slate-200/80">
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={r.key}
                    onChange={(e) => handleRowChange(r.id, 'key', e.target.value)}
                    placeholder="Attribute Name (e.g. Weight)..."
                    className="flex-1 px-3 py-2 bg-white sm:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <span className="hidden sm:inline text-slate-300 text-sm font-bold">:</span>
                </div>
                
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={r.value}
                    onChange={(e) => handleRowChange(r.id, 'value', e.target.value)}
                    placeholder="Value (e.g. 500g, Aluminum, 2 Years)..."
                    className="flex-1 px-3 py-2 bg-white sm:bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(r.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-xl hover:bg-rose-50 cursor-pointer shrink-0"
                    title="Remove attribute row"
                    aria-label="Remove attribute row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
