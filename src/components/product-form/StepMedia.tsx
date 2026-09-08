import React, { useState, useRef } from 'react';
import { ProductVariant } from '../../types';
import { Image as ImageIcon, Upload, Trash2, Star, ArrowLeft, ArrowRight, Sparkles, Layers, Check } from 'lucide-react';

interface StepMediaProps {
  imageUrl: string;
  setImageUrl: (val: string) => void;
  images: string[];
  setImages: (val: string[]) => void;
  variants: ProductVariant[];
  setVariants: (val: ProductVariant[]) => void;
}

const PRESET_IMAGE_TEMPLATES = [
  { name: 'Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600' },
  { name: 'Smartwatch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600' },
  { name: 'Footwear', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600' },
  { name: 'Apparel', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600' },
  { name: 'Coffee / Mug', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600' },
  { name: 'Desk / Tech', url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=600' },
  { name: 'Backpack', url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600' },
  { name: 'Skincare', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=600' }
];

export default function StepMedia({
  imageUrl,
  setImageUrl,
  images,
  setImages,
  variants,
  setVariants
}: StepMediaProps) {
  const [newUrlInput, setNewUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle local file upload (converts to Data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          if (!imageUrl) setImageUrl(result);
          setImages([...images, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddUrl = () => {
    if (!newUrlInput.trim()) return;
    const url = newUrlInput.trim();
    if (!imageUrl) setImageUrl(url);
    if (!images.includes(url)) setImages([...images, url]);
    setNewUrlInput('');
  };

  const handleSetPrimary = (url: string) => {
    setImageUrl(url);
  };

  const handleRemoveImage = (url: string) => {
    const updated = images.filter((img) => img !== url);
    setImages(updated);
    if (imageUrl === url) {
      setImageUrl(updated[0] || '');
    }
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setImages(updated);
  };

  const handleAssignVariantImage = (variantSku: string, url: string) => {
    setVariants(
      variants.map((v) => (v.sku === variantSku ? { ...v, imageUrl: url } : v))
    );
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
          5
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Media & Photography Assets</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload multiple gallery images, assign primary product shots, and map imagery to variant SKUs.
          </p>
        </div>
      </div>

      {/* Primary & Gallery Management */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main Image Preview Box */}
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider self-start">
            Primary Display Image
          </span>
          <div className="w-full aspect-square bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center relative group">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Primary Product"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="p-4 text-slate-400 flex flex-col items-center">
                <ImageIcon className="w-10 h-10 stroke-1 mb-2" />
                <span className="text-xs font-semibold">No Image Selected</span>
              </div>
            )}
            {imageUrl && (
              <span className="absolute top-2 left-2 px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-bold shadow-xs flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-white" /> Primary
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">This image appears first in POS grids and storefront search results.</p>
        </div>

        {/* Upload & Gallery Manager */}
        <div className="md:col-span-2 space-y-4">
          {/* File Upload Drop Area & URL Add */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Add Media Assets
            </h4>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* File Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 px-4 bg-indigo-50 hover:bg-indigo-100 border border-dashed border-indigo-300 rounded-xl text-xs font-bold text-indigo-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Upload className="w-4 h-4" />
                Upload File from Computer
              </button>

              {/* URL Input */}
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={newUrlInput}
                  onChange={(e) => setNewUrlInput(e.target.value)}
                  placeholder="Or paste image URL..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <button
                  type="button"
                  onClick={handleAddUrl}
                  className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Add URL
                </button>
              </div>
            </div>

            {/* Unsplash Preset Presets */}
            <div className="pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Or Select Preset Unsplash Photography Template:
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_IMAGE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => {
                      if (!imageUrl) setImageUrl(tmpl.url);
                      if (!images.includes(tmpl.url)) setImages([...images, tmpl.url]);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-[10px] font-semibold text-slate-700 hover:text-indigo-900 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <img src={tmpl.url} alt="" className="w-3.5 h-3.5 rounded object-cover" />
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Gallery Thumbnails List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Gallery Media ({images.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">Reorder or set primary</span>
            </h4>

            {images.length === 0 ? (
              <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs">No gallery images added yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img, idx) => {
                  const isPrimary = imageUrl === img;
                  return (
                    <div
                      key={idx}
                      className={`relative bg-slate-50 border rounded-xl overflow-hidden p-1 group space-y-1.5 ${
                        isPrimary ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden relative">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        {isPrimary && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-bold">
                            Primary
                          </span>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-between text-[10px] px-1 pb-1">
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(img)}
                          className={`font-bold transition-colors ${
                            isPrimary ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'
                          }`}
                        >
                          {isPrimary ? '★ Primary' : 'Set Primary'}
                        </button>

                        <div className="flex items-center gap-1">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'left')}
                              className="text-slate-400 hover:text-slate-700"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                          )}
                          {idx < images.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'right')}
                              className="text-slate-400 hover:text-slate-700"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(img)}
                            className="text-slate-400 hover:text-rose-600 ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Images to Product Variants */}
      {variants.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Assign Images to Each Variant
          </h4>
          <p className="text-xs text-slate-500">
            Assign unique images to individual variants. The display image will update dynamically when a cashier or buyer picks a variant.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {variants.map((v) => {
              const labelParts = [v.size, v.color, v.model].filter(Boolean);
              const title = labelParts.length > 0 ? labelParts.join(' / ') : v.sku;
              const activeVarImg = v.imageUrl || imageUrl;

              return (
                <div key={v.sku} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                      {activeVarImg ? (
                        <img src={activeVarImg} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-slate-400">No img</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 truncate">{title}</div>
                      <div className="font-mono text-[10px] text-slate-400 truncate">{v.sku}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <select
                      value={v.imageUrl || ''}
                      onChange={(e) => handleAssignVariantImage(v.sku, e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer"
                    >
                      <option value="">-- Use Main Product Image --</option>
                      {images.map((img, i) => (
                        <option key={i} value={img}>
                          Gallery Image #{i + 1}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        const customUrl = prompt(`Enter custom image URL for variant "${title}":`, v.imageUrl || '');
                        if (customUrl !== null) {
                          handleAssignVariantImage(v.sku, customUrl);
                          if (customUrl && !images.includes(customUrl)) {
                            setImages([...images, customUrl]);
                          }
                        }
                      }}
                      className="w-full text-center py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
                    >
                      + Enter Custom Image URL
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
