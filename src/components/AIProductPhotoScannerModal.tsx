import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  Check,
  ChevronRight,
  DollarSign,
  Image as ImageIcon,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import type { ExtractedProductInfo, Product, ProductPhotoAngle } from "../types";
import {
  extractProductFromMultiPhotos,
  mapExtractedDataToProduct,
} from "../services/aiPhotoExtractor";
import { useCurrency } from "../context/CurrencyContext";
import { useCamera } from "../hooks/useCamera";
import {
  MAX_IMAGES,
  fileToScannerPhoto,
  findBestProductMatch,
  validateExtractedData,
} from "../services/productScanner";
import {
  buildSavePlan,
  type SaveMode,
} from "../validation/scannerRules";

export const SIDE_PRESETS = [
  { id: "front", label: "Front", desc: "Title, brand and hero image" },
  { id: "back", label: "Back", desc: "Specifications and barcode" },
  { id: "left", label: "Left", desc: "Features, ports and controls" },
  { id: "right", label: "Right", desc: "Details, contents and warnings" },
  { id: "top", label: "Top", desc: "Branding and seals" },
  { id: "bottom", label: "Bottom", desc: "Certifications and origin" },
  { id: "macro_detail", label: "Close-up", desc: "Fine print or barcode" },
];

type Screen = "capture" | "review";
type Tab = "general" | "specs" | "features" | "pricing" | "photos";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
  onApplyToForm?: (
    extracted: ExtractedProductInfo,
    primaryImageUrl: string,
    allImages?: string[]
  ) => void;
  onDirectSaveProduct?: (product: Product) => void;
  onMergeProduct?: (product: Product) => void;
  /**
   * The caller/server should implement the actual privileged commit.
   * The scanner only prepares a validated save plan.
   */
  onCommit?: (plan: ReturnType<typeof buildSavePlan>) => Promise<void> | void;
}

export default function AIProductPhotoScannerModal({
  isOpen,
  onClose,
  products = [],
  onApplyToForm,
  onDirectSaveProduct,
  onMergeProduct,
  onCommit,
}: Props) {
  const { formatAmount } = useCurrency();
  const camera = useCamera(isOpen);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const scanAbortRef = useRef<AbortController | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [screen, setScreen] = useState<Screen>("capture");
  const [tab, setTab] = useState<Tab>("general");
  const [source, setSource] = useState<"camera" | "upload">("camera");
  const [photos, setPhotos] = useState<ProductPhotoAngle[]>([]);
  const [targetSide, setTargetSide] = useState("front");
  const [customSide, setCustomSide] = useState("");
  const [extracted, setExtracted] = useState<ExtractedProductInfo | null>(null);
  const [match, setMatch] = useState<{ product: Product; score: number; reason: string } | null>(null);
  const [saveMode, setSaveMode] = useState<SaveMode>("create_new");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [publishToStore, setPublishToStore] = useState(false);
  const [updatePricing, setUpdatePricing] = useState(true);
  const [replacePhotos, setReplacePhotos] = useState(false);
  const [replaceSpecifications, setReplaceSpecifications] = useState(false);
  const [marginPercent, setMarginPercent] = useState(40);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isFlash, setIsFlash] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const allSides = useMemo(() => {
    const custom = customSide.trim()
      ? [{ id: "custom", label: customSide.trim(), desc: "Custom capture angle" }]
      : [];
    return [...SIDE_PRESETS, ...custom];
  }, [customSide]);

  const sideLabel = useCallback(
    (side: string) => allSides.find((item) => item.id === side)?.label ?? "Custom",
    [allSides]
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  const cameraStop = camera.stop;
  const cameraStart = camera.start;
  const cameraFacingMode = camera.facingMode;

  const reset = useCallback(() => {
    scanAbortRef.current?.abort();
    scanAbortRef.current = null;
    cameraStop();

    setPhotos([]);
    setExtracted(null);
    setMatch(null);
    setScreen("capture");
    setTab("general");
    setTargetSide("front");
    setSelectedProductId("");
    setSaveMode("create_new");
    setError(null);
    setProgress(0);
    setScanMessage("");
  }, [cameraStop]);

  const wasOpenRef = useRef(isOpen);
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      reset();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, reset]);

  useEffect(() => {
    return () => {
      scanAbortRef.current?.abort();
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || source !== "camera" || screen !== "capture") {
      cameraStop();
      return;
    }

    void cameraStart(cameraFacingMode);
    return () => {
      cameraStop();
    };
  }, [isOpen, source, screen, cameraStart, cameraStop, cameraFacingMode]); // camera lifecycle intentionally follows workflow state

  const addPhoto = useCallback(
    (photo: ProductPhotoAngle) => {
      setPhotos((current) => {
        const existing = current.findIndex((item) => item.side === photo.side);
        if (existing < 0) {
          return current.length >= MAX_IMAGES
            ? current
            : [...current, photo];
        }
        const next = [...current];
        next[existing] = photo;
        return next;
      });

      const next = SIDE_PRESETS.find(
        (side) => side.id !== photo.side && !photos.some((item) => item.side === side.id)
      );
      if (next) setTargetSide(next.id);
    },
    [photos]
  );

  const capturePhoto = useCallback(() => {
    const video = camera.videoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setError("Camera is not ready. Please wait a moment and try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    const maxDimension = 2200;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Unable to capture the camera frame.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
    const base64 = dataUrl.split(",", 2)[1] ?? "";

    const photo = {
      id: `angle_${crypto.randomUUID?.() ?? Date.now()}`,
      side: targetSide,
      label: sideLabel(targetSide),
      dataUrl,
      base64,
      mimeType: "image/jpeg",
      fileName: `packaging_${targetSide}_${Date.now()}.jpg`,
      capturedAt: new Date().toISOString(),
    } as ProductPhotoAngle;

    addPhoto(photo);
    setIsFlash(true);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setIsFlash(false), 150);
    showToast(`${sideLabel(targetSide)} photo captured.`);
  }, [camera.videoRef, targetSide, sideLabel, addPhoto, showToast]);

  const processFiles = useCallback(
    async (input: FileList | File[]) => {
      setError(null);
      const files = Array.from(input).filter((file) => file.type.startsWith("image/"));

      if (!files.length) {
        setError("No supported image files were selected.");
        return;
      }

      if (photos.length + files.length > MAX_IMAGES) {
        setError(`You can use up to ${MAX_IMAGES} photos per scan.`);
        return;
      }

      try {
        const newPhotos: ProductPhotoAngle[] = [];
        for (let i = 0; i < files.length; i += 1) {
          const side = files.length === 1
            ? targetSide
            : SIDE_PRESETS[i]?.id ?? "macro_detail";
          newPhotos.push(
            await fileToScannerPhoto(files[i], side, sideLabel(side))
          );
        }

        setPhotos((current) => {
          const next = [...current];
          for (const photo of newPhotos) {
            const index = next.findIndex((item) => item.side === photo.side);
            if (index >= 0) next[index] = photo;
            else next.push(photo);
          }
          return next.slice(0, MAX_IMAGES);
        });

        showToast(`${newPhotos.length} photo${newPhotos.length === 1 ? "" : "s"} added.`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to process images.");
      }
    },
    [photos.length, targetSide, sideLabel, showToast]
  );

  const scan = useCallback(async () => {
    if (!photos.length || isScanning) return;

    const validation = extracted ? validateExtractedData(extracted) : null;
    void validation;

    camera.stop();
    scanAbortRef.current?.abort();
    const controller = new AbortController();
    scanAbortRef.current = controller;

    setIsScanning(true);
    setError(null);
    setProgress(10);
    setScanMessage("Preparing packaging photos…");

    try {
      setProgress(30);
      setScanMessage(`Analyzing ${photos.length} packaging angle${photos.length === 1 ? "" : "s"}…`);

      const result = await extractProductFromMultiPhotos(photos);

      if (controller.signal.aborted) return;

      setProgress(90);
      setScanMessage("Validating extracted catalog data…");

      if (!result.success || !result.data) {
        throw new Error(result.error || "AI extraction failed.");
      }

      const data = result.data;
      const dataValidation = validateExtractedData(data);
      if (!dataValidation.valid) {
        throw new Error(dataValidation.errors.join(" "));
      }

      const found = findBestProductMatch(data, products);
      setExtracted(data);
      setMatch(found);

      if (found && found.score >= 0.9) {
        setSaveMode("merge_existing");
        setSelectedProductId(found.product.id);
      } else {
        setSaveMode("create_new");
        setSelectedProductId("");
      }

      setProgress(100);
      setScanMessage("Extraction complete.");
      setScreen("review");
      setTab("general");
      showToast(
        found
          ? `Possible existing product found (${Math.round(found.score * 100)}%).`
          : "Product profile extracted successfully."
      );
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "Product scan failed.");
      setProgress(0);
    } finally {
      if (!controller.signal.aborted) setIsScanning(false);
    }
  }, [photos, isScanning, camera, extracted, products, showToast]);

  const updateExtracted = useCallback(
    <K extends keyof ExtractedProductInfo>(key: K, value: ExtractedProductInfo[K]) => {
      setExtracted((current) => (current ? { ...current, [key]: value } : current));
    },
    []
  );

  const save = useCallback(async () => {
    if (!extracted || isSaving) return;

    const validation = validateExtractedData(extracted);
    if (!validation.valid) {
      setError(validation.errors.join(" "));
      return;
    }

    if (saveMode === "merge_existing" && !selectedProduct) {
      setError("Select an existing product before merging.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const images = photos.map((photo) => photo.dataUrl).filter(Boolean);
      const plan = buildSavePlan(
        extracted,
        images,
        {
          saveMode,
          selectedProduct,
          publishToStore,
          updatePricing,
          replacePhotos,
          replaceSpecifications,
          marginPercent,
        },
        mapExtractedDataToProduct
      );

      if (onCommit) {
        await onCommit(plan);
      } else if (plan.product) {
        if (plan.kind === "merge") {
          onMergeProduct?.(plan.product);
        } else {
          onDirectSaveProduct?.(plan.product);
        }
      } else {
        throw new Error("No product could be prepared for saving.");
      }

      showToast(
        plan.kind === "merge"
          ? "Product changes prepared successfully."
          : "New catalog product prepared successfully."
      );
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save product.");
    } finally {
      setIsSaving(false);
    }
  }, [
    extracted,
    isSaving,
    saveMode,
    selectedProduct,
    photos,
    publishToStore,
    updatePricing,
    replacePhotos,
    replaceSpecifications,
    marginPercent,
    onCommit,
    onMergeProduct,
    onDirectSaveProduct,
    showToast,
    onClose,
  ]);

  const openWizard = useCallback(() => {
    if (!extracted || !onApplyToForm) return;
    const images = photos.map((photo) => photo.dataUrl).filter(Boolean);
    onApplyToForm(extracted, images[0] ?? "", images);
    onClose();
  }, [extracted, onApplyToForm, photos, onClose]);

  const removePhoto = useCallback((id: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }, []);

  const addCustomAngle = useCallback(() => {
    const value = customSide.trim();
    if (!value) return;
    setTargetSide("custom");
    showToast(`Custom angle "${value}" selected.`);
  }, [customSide, showToast]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-3"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void processFiles(event.dataTransfer.files);
      }}
    >
      <div className="flex h-full sm:h-[94vh] w-full max-w-7xl flex-col overflow-hidden bg-slate-50 sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-2xl">
        <header className="flex items-center justify-between gap-3 bg-slate-950 px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-black">AI Product Scanner</h2>
              <p className="truncate text-[11px] text-slate-400">
                Capture → Extract → Review → Commit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {toast && (
          <div className="flex items-center gap-2 bg-emerald-600 px-4 py-2 text-xs font-bold text-white">
            <Check className="h-4 w-4" />
            {toast}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 border-b border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
          {(["capture", "review"] as Screen[]).map((item, index) => (
            <button
              key={item}
              type="button"
              disabled={item === "review" && !extracted}
              onClick={() => setScreen(item)}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${
                screen === item
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {index + 1}. {item === "capture" ? "Capture" : "Review"}
            </button>
          ))}

          {screen === "capture" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setSource("camera");
                  setError(null);
                }}
                className={`rounded-xl px-3 py-2 text-xs font-bold ${
                  source === "camera" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                <Camera className="mr-1.5 inline h-3.5 w-3.5" />
                Camera
              </button>
              <button
                type="button"
                onClick={() => {
                  camera.stop();
                  setSource("upload");
                  fileInputRef.current?.click();
                }}
                className={`rounded-xl px-3 py-2 text-xs font-bold ${
                  source === "upload" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                <Upload className="mr-1.5 inline h-3.5 w-3.5" />
                Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  camera.stop();
                  nativeCameraInputRef.current?.click();
                }}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
              >
                Native Camera
              </button>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              if (event.target.files) void processFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              if (event.target.files) void processFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {screen === "capture" && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,.8fr)]">
              <section className="space-y-4">
                <div
                  className={`relative overflow-hidden rounded-3xl bg-slate-950 ${
                    dragging ? "ring-4 ring-indigo-400" : ""
                  }`}
                >
                  {source === "camera" ? (
                    <>
                      <video
                        ref={camera.attach}
                        autoPlay
                        playsInline
                        muted
                        className="aspect-video w-full object-cover"
                      />
                      {isFlash && (
                        <div className="pointer-events-none absolute inset-0 bg-white opacity-80" />
                      )}

                      {!camera.isActive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 p-6 text-center text-white">
                          <Camera className="h-10 w-10 text-slate-400" />
                          <p className="text-sm font-bold">Camera not active</p>
                          <button
                            type="button"
                            onClick={() => void camera.start(camera.facingMode)}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold"
                          >
                            Start Camera
                          </button>
                          {camera.error && (
                            <p className="max-w-sm text-xs text-slate-300">{camera.error}</p>
                          )}
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 bg-gradient-to-t from-slate-950/90 to-transparent p-4 pt-12">
                        <div className="flex items-center gap-1 rounded-xl bg-slate-900/80 p-1 text-white">
                          <button
                            type="button"
                            onClick={() => void camera.applyZoom(camera.zoom - 0.5)}
                            disabled={!camera.capabilities.zoom || camera.zoom <= camera.capabilities.minZoom}
                            className="rounded-lg p-2 disabled:opacity-30"
                            aria-label="Zoom out"
                          >
                            <ZoomOut className="h-4 w-4" />
                          </button>
                          <span className="min-w-10 text-center text-[11px] font-bold">
                            {camera.zoom.toFixed(1)}x
                          </span>
                          <button
                            type="button"
                            onClick={() => void camera.applyZoom(camera.zoom + 0.5)}
                            disabled={!camera.capabilities.zoom || camera.zoom >= camera.capabilities.maxZoom}
                            className="rounded-lg p-2 disabled:opacity-30"
                            aria-label="Zoom in"
                          >
                            <ZoomIn className="h-4 w-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={capturePhoto}
                          disabled={!camera.isActive || photos.length >= MAX_IMAGES}
                          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-indigo-600 text-white shadow-xl disabled:opacity-40"
                          aria-label={`Capture ${sideLabel(targetSide)}`}
                        >
                          <Camera className="h-6 w-6" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const next = camera.facingMode === "environment" ? "user" : "environment";
                            camera.setFacingMode(next);
                            void camera.start(next);
                          }}
                          className="rounded-xl bg-slate-900/80 p-3 text-white"
                          aria-label="Switch camera"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-video w-full flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-600 text-center text-white"
                    >
                      <Upload className="h-10 w-10 text-indigo-400" />
                      <div>
                        <p className="text-sm font-bold">Drop packaging photos here</p>
                        <p className="mt-1 text-xs text-slate-400">
                          PNG, JPG, WEBP or another browser-supported image format
                        </p>
                      </div>
                    </button>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Capture target
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {sideLabel(targetSide)}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      {photos.length}/{MAX_IMAGES}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {allSides.map((side) => {
                      const selected = side.id === targetSide;
                      const done = photos.some((photo) => photo.side === side.id);
                      return (
                        <button
                          key={side.id}
                          type="button"
                          onClick={() => setTargetSide(side.id)}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                            selected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : done
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {done && <Check className="mr-1 inline h-3 w-3" />}
                          {side.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      value={customSide}
                      onChange={(event) => setCustomSide(event.target.value)}
                      placeholder="Custom angle label"
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={addCustomAngle}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                    >
                      <Plus className="mr-1 inline h-3.5 w-3.5" />
                      Use
                    </button>
                  </div>
                </div>
              </section>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-sm font-black">Photos</h3>
                  </div>

                  <div className="space-y-2">
                    {photos.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
                        Capture or upload at least one photo.
                      </div>
                    )}

                    {photos.map((photo) => (
                      <div key={photo.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-2">
                        <img
                          src={photo.dataUrl}
                          alt={photo.label}
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-800">{photo.label}</p>
                          <p className="truncate text-[10px] text-slate-400">{photo.fileName}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                          aria-label={`Remove ${photo.label}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-indigo-950">
                    <ShieldCheck className="h-4 w-4" />
                    Safer workflow
                  </div>
                  <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-indigo-900">
                    <li>• AI does not set on-hand stock.</li>
                    <li>• Exact barcode/SKU matches can suggest a merge.</li>
                    <li>• Name-only matches require human review.</li>
                    <li>• New products start as Draft.</li>
                    <li>• Production commits should be authorized server-side.</li>
                  </ul>
                </section>

                <button
                  type="button"
                  onClick={() => void scan()}
                  disabled={!photos.length || isScanning}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-600/20 disabled:opacity-40"
                >
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                  {isScanning ? "Analyzing…" : "Analyze Photos"}
                </button>
              </aside>
            </div>
          )}

          {screen === "review" && extracted && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_360px]">
              <section className="min-w-0">
                <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">AI extraction</p>
                      <h3 className="mt-1 text-lg font-black text-slate-900">{extracted.name}</h3>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      {extracted.confidenceScore ?? 0}% confidence
                    </span>
                  </div>
                </div>

                <div className="mb-3 flex gap-2 overflow-x-auto">
                  {([
                    ["general", "Identity", Package],
                    ["specs", "Specifications", ShieldCheck],
                    ["features", "Features", Check],
                    ["pricing", "Pricing", DollarSign],
                    ["photos", "Photos", ImageIcon],
                  ] as const).map(([id, label, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
                        tab === id ? "bg-slate-900 text-white" : "bg-white text-slate-600"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {isScanning && (
                  <div className="mb-4 rounded-2xl bg-slate-950 p-6 text-white">
                    <RefreshCw className="mx-auto h-7 w-7 animate-spin text-indigo-400" />
                    <p className="mt-3 text-center text-sm font-bold">{scanMessage}</p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                {tab === "general" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([
                      ["name", "Product name"],
                      ["brand", "Brand"],
                      ["model", "Model"],
                      ["category", "Category"],
                      ["barcode", "Barcode"],
                      ["sku", "SKU"],
                      ["countryOfOrigin", "Country of origin"],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                        <input
                          value={String(extracted[key] ?? "")}
                          onChange={(event) => updateExtracted(key, event.target.value as never)}
                          className="mt-1 w-full rounded-lg bg-slate-50 px-2.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </label>
                    ))}
                    <label className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Description</span>
                      <textarea
                        rows={4}
                        value={extracted.description ?? ""}
                        onChange={(event) => updateExtracted("description", event.target.value)}
                        className="mt-1 w-full rounded-lg bg-slate-50 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>
                  </div>
                )}

                {tab === "specs" && (
                  <div className="space-y-2">
                    {Object.entries(extracted.specifications ?? {}).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-xl border border-slate-200 bg-white p-2">
                        <input
                          value={key}
                          readOnly
                          className="rounded-lg bg-slate-50 px-2 py-2 text-xs font-bold"
                        />
                        <input
                          value={value}
                          onChange={(event) =>
                            setExtracted((current) =>
                              current
                                ? {
                                    ...current,
                                    specifications: {
                                      ...(current.specifications ?? {}),
                                      [key]: event.target.value,
                                    },
                                  }
                                : current
                            )
                          }
                          className="rounded-lg bg-slate-50 px-2 py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setExtracted((current) => {
                              if (!current) return current;
                              const next = { ...(current.specifications ?? {}) };
                              delete next[key];
                              return { ...current, specifications: next };
                            })
                          }
                          className="rounded-lg p-2 text-rose-500"
                          aria-label={`Delete ${key}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "features" && (
                  <div className="space-y-2">
                    {(extracted.features ?? []).map((feature, index) => (
                      <div key={`${feature}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                        <Check className="mr-2 inline h-3.5 w-3.5 text-emerald-600" />
                        {feature}
                      </div>
                    ))}
                    {extracted.detectedTextRaw?.length ? (
                      <details className="rounded-xl border border-slate-200 bg-white p-3">
                        <summary className="cursor-pointer text-xs font-bold">Raw OCR text</summary>
                        <pre className="mt-2 whitespace-pre-wrap text-[10px] text-slate-500">
                          {extracted.detectedTextRaw.join("\n")}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                )}

                {tab === "pricing" && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="rounded-2xl border border-slate-200 bg-white p-4">
                      <span className="text-[10px] font-black uppercase text-slate-400">AI cost</span>
                      <p className="mt-2 text-lg font-black">
                        {formatAmount(extracted.suggestedCost ?? 0)}
                      </p>
                    </label>
                    <label className="rounded-2xl border border-slate-200 bg-white p-4">
                      <span className="text-[10px] font-black uppercase text-slate-400">AI retail</span>
                      <p className="mt-2 text-lg font-black">
                        {formatAmount(extracted.suggestedPrice ?? 0)}
                      </p>
                    </label>
                    <label className="rounded-2xl border border-slate-200 bg-white p-4">
                      <span className="text-[10px] font-black uppercase text-slate-400">Margin</span>
                      <input
                        type="number"
                        min={0}
                        max={99.9}
                        value={marginPercent}
                        onChange={(event) => setMarginPercent(Number(event.target.value))}
                        className="mt-2 w-full rounded-lg bg-slate-50 px-2 py-2 text-sm font-bold"
                      />
                    </label>
                    <label className="sm:col-span-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <input
                        type="checkbox"
                        checked={updatePricing}
                        onChange={(event) => setUpdatePricing(event.target.checked)}
                      />
                      <span className="text-xs font-bold">Apply pricing suggestions during commit</span>
                    </label>
                    <label className="sm:col-span-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <input
                        type="checkbox"
                        checked={publishToStore}
                        onChange={(event) => setPublishToStore(event.target.checked)}
                      />
                      <span className="text-xs font-bold">
                        Request storefront publication (server authorization required)
                      </span>
                    </label>
                  </div>
                )}

                {tab === "photos" && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <img src={photo.dataUrl} alt={photo.label} className="aspect-square w-full object-cover" />
                        <div className="p-2">
                          <p className="truncate text-xs font-bold">{photo.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-sm font-black">Catalog operation</h3>
                  </div>

                  {match && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
                      <p className="font-black text-amber-900">Possible existing product</p>
                      <p className="mt-1 text-amber-800">{match.product.name}</p>
                      <p className="mt-1 text-[10px] text-amber-700">
                        {match.reason} · {Math.round(match.score * 100)}% confidence
                      </p>
                    </div>
                  )}

                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={() => setSaveMode("create_new")}
                      className={`rounded-xl border p-3 text-left text-xs font-bold ${
                        saveMode === "create_new"
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200"
                      }`}
                    >
                      Create new product
                      <span className="mt-1 block text-[10px] font-normal text-slate-500">
                        Creates a Draft with zero on-hand stock.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveMode("merge_existing")}
                      className={`rounded-xl border p-3 text-left text-xs font-bold ${
                        saveMode === "merge_existing"
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200"
                      }`}
                    >
                      Merge into existing product
                      <span className="mt-1 block text-[10px] font-normal text-slate-500">
                        Never changes on-hand stock.
                      </span>
                    </button>
                  </div>

                  {saveMode === "merge_existing" && (
                    <select
                      value={selectedProductId}
                      onChange={(event) => setSelectedProductId(event.target.value)}
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                    >
                      <option value="">Select product…</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} — {product.sku} — {formatAmount(product.price)}
                        </option>
                      ))}
                    </select>
                  )}

                  {saveMode === "merge_existing" && selectedProduct && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded-lg bg-slate-50 p-2">Stock: <b>{selectedProduct.stock}</b></div>
                      <div className="rounded-lg bg-slate-50 p-2">SKU: <b>{selectedProduct.sku}</b></div>
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={replacePhotos} onChange={(e) => setReplacePhotos(e.target.checked)} />
                      Replace existing photos
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={replaceSpecifications} onChange={(e) => setReplaceSpecifications(e.target.checked)} />
                      Replace specifications
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-black text-amber-900">Before committing</p>
                  <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-amber-800">
                    <li>• Verify barcode and SKU.</li>
                    <li>• Verify cost and selling price.</li>
                    <li>• Confirm the merge target.</li>
                    <li>• Record stock through a receiving/adjustment workflow.</li>
                  </ul>
                </section>
              </aside>
            </div>
          )}
        </main>

        <footer className="flex flex-col gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700"
          >
            Cancel
          </button>

          <div className="flex flex-col gap-2 sm:flex-row">
            {screen === "review" && onApplyToForm && (
              <button
                type="button"
                onClick={openWizard}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-800"
              >
                Open in Product Wizard
                <ChevronRight className="ml-1 inline h-3.5 w-3.5" />
              </button>
            )}

            {screen === "capture" && photos.length > 0 && (
              <button
                type="button"
                onClick={() => void scan()}
                disabled={isScanning}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-40"
              >
                Analyze Photos
              </button>
            )}

            {screen === "review" && (
              <button
                type="button"
                onClick={() => void save()}
                disabled={isSaving || !extracted}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white disabled:opacity-40"
              >
                {isSaving ? "Preparing…" : saveMode === "merge_existing" ? "Confirm Merge" : "Create Draft"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
