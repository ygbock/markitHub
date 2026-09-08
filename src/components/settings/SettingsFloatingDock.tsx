import React from 'react';
import { Save, Eye, ChevronUp, Sliders } from 'lucide-react';
import { SettingsSection, SECTIONS } from './SettingsNav';

interface SettingsFloatingDockProps {
  activeSection: SettingsSection;
  onOpenSectionPicker: () => void;
  onOpenPreview: () => void;
  onSave: () => void;
}

export default function SettingsFloatingDock({
  activeSection,
  onOpenSectionPicker,
  onOpenPreview,
  onSave
}: SettingsFloatingDockProps) {
  const activeItem = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];
  const ActiveIcon = activeItem.icon;

  return (
    <div className="fixed bottom-3 inset-x-3 z-40 lg:hidden max-w-md mx-auto animate-in slide-in-from-bottom-3 duration-200">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-2 sm:p-2.5 shadow-2xl border border-white/10 flex items-center justify-between gap-2">
        
        {/* Section Quick Switcher */}
        <button
          type="button"
          onClick={onOpenSectionPicker}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-left min-w-0 flex-1 transition-all cursor-pointer"
        >
          <ActiveIcon className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-black truncate">{activeItem.label}</div>
            <div className="text-[9px] text-gray-400 font-mono truncate">{activeItem.category}</div>
          </div>
          <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenPreview}
            className="p-2 sm:px-3 sm:py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="Live Template Preview"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Preview</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            className="px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>

      </div>
    </div>
  );
}
