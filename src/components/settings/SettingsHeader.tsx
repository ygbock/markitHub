import React from 'react';
import { Sliders, Save, RotateCcw, Download, Upload, CheckCircle2 } from 'lucide-react';
import { StaffMember } from '../../types';

interface SettingsHeaderProps {
  onSave: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetPrompt: () => void;
  isSavedAlert: boolean;
  onCloseAlert: () => void;
  activeStaff: StaffMember;
  activeSectionTitle: string;
}

export default function SettingsHeader({
  onSave,
  onExport,
  onImport,
  onResetPrompt,
  isSavedAlert,
  onCloseAlert,
  activeStaff,
  activeSectionTitle
}: SettingsHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Title & Info */}
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
              <Sliders className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                  System Settings
                </h2>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] sm:text-xs font-bold font-mono">
                  v3.8 Enterprise
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Global configuration for registers, taxes, thermal slips and fiscal rules.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onExport}
                className="px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Export JSON Configuration"
                id="settings-export-btn"
              >
                <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="inline text-xs">Export</span>
              </button>

              <label 
                className="px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Import JSON Configuration"
                id="settings-import-label"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="inline text-xs">Import</span>
                <input type="file" accept=".json" onChange={onImport} className="hidden" />
              </label>

              <button
                type="button"
                onClick={onResetPrompt}
                className="px-2.5 sm:px-3 py-2 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Reset to factory presets"
                id="settings-reset-btn"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="hidden xs:inline sm:inline text-xs">Reset</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onSave}
              className="px-4 py-2 sm:py-2.5 bg-slate-900 hover:bg-indigo-600 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-slate-900/10 transition-all cursor-pointer ml-auto sm:ml-0"
              id="settings-save-all-btn"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cloud Sync Success Banner */}
      {isSavedAlert && (
        <div className="bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-md flex items-center justify-between text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            <span>Configuration parameters synchronized to Cloud Firestore & Local Storage!</span>
          </div>
          <button onClick={onCloseAlert} className="text-white/80 hover:text-white p-1 cursor-pointer">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
