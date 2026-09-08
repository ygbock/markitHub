import React, { useState } from 'react';
import { X, FolderTree, Plus, Trash2, Edit, Save, Tag } from 'lucide-react';
import { Category } from '../types';

export interface CategoryHierarchyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSaveCategory: (category: Category) => void | Promise<void>;
  onDeleteCategory: (categoryId: string) => void | Promise<void>;
}

export const CategoryHierarchyManagerModal: React.FC<CategoryHierarchyManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!newCategoryName.trim()) return;
    const newCat: Category = {
      id: crypto.randomUUID(),
      name: newCategoryName.trim(),
      parent_id: parentId || null,
      status: 'active',
    };
    await onSaveCategory(newCat);
    setNewCategoryName('');
    setParentId('');
  };

  const handleUpdate = async (category: Category) => {
    if (!editingName.trim()) return;
    await onSaveCategory({ ...category, name: editingName.trim() });
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Manage Categories</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="text-xs font-bold text-slate-700">Add New Category</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Category Name"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 p-2 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className="rounded-xl border border-slate-200 p-2 text-xs bg-white outline-none"
            >
              <option value="">No Parent (Root)</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCreate}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
          {categories.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No categories found.</p>
          ) : (
            categories.map(cat => {
              const parent = categories.find(c => c.id === cat.parent_id);
              const isEditing = editingId === cat.id;

              return (
                <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white">
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        className="flex-1 rounded-lg border border-indigo-300 p-1.5 text-xs outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdate(cat)}
                        className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs"
                      >
                        <Save className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-slate-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                        {parent && (
                          <span className="ml-2 text-[10px] text-slate-400">
                            (Parent: {parent.name})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditingName(cat.name);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(cat.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
