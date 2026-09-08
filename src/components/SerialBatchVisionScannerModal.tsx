import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, X, Flashlight, RefreshCw, Volume2, VolumeX, 
  CheckCircle2, AlertCircle, Sparkles, Upload, ScanLine, 
  Layers, HelpCircle, ShieldCheck, Zap, ArrowRight, 
  Check, Calendar, Tag, Box, Hash, Cpu, AlertTriangle, Play
} from 'lucide-react';
import { 
  useComputerVisionScanner, 
  SerialBatchScanResult, 
  validateSerialNumber, 
  validateBatchNumber 
} from '../hooks/useComputerVisionScanner';

interface SerialBatchVisionScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetMode?: 'auto' | 'serial' | 'batch';
  currentSerial?: string;
  currentBatch?: string;
  currentExpiry?: string;
  onApplyData: (data: {
    serialNumber?: string;
    batchNumber?: string;
    expiryDate?: string;
    enableSerialTracking?: boolean;
    enableBatchTracking?: boolean;
    enableExpiryTracking?: boolean;
  }) => void;
}

const SAMPLE_PRESETS = [
  {
    name: 'Electronics Serial & MAC Label',
    tag: 'Serial + Lot',
    serial: 'SN-99420-V2',
    batch: 'LOT-2026-X4',
    expiry: '2028-12-31',
    description: 'High-density industrial barcode sticker with unit S/N and manufacturing lot.',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=600'
  },
  {
    name: 'Pharmaceutical / Perishable Batch Tag',
    tag: 'Batch + Expiry',
    serial: 'SN-PHARM-8821',
    batch: 'LOT-2026-B89',
    expiry: '2027-06-30',
    description: 'Sterile medical/pharma batch code with FEFO expiration date stamp.',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600'
  },
  {
    name: 'Heavy Equipment Asset Plate',
    tag: 'Serial Only',
    serial: 'EQ-8841-CAT9',
    batch: 'LOT-2025-H1',
    expiry: '',
    description: 'Laser-etched metal asset tag for warranty tracking and serial verification.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600'
  }
];

export default function SerialBatchVisionScannerModal({
  isOpen,
  onClose,
  initialTargetMode = 'auto',
  currentSerial = '',
  currentBatch = '',
  currentExpiry = '',
  onApplyData
}: SerialBatchVisionScannerModalProps) {
  const [targetMode, setTargetMode] = useState<'auto' | 'serial' | 'batch'>(initialTargetMode);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'camera' | 'samples' | 'upload'>('camera');
  const [showAppliedToast, setShowAppliedToast] = useState(false);

  // Editable Candidate Values
  const [candidateSerial, setCandidateSerial] = useState(currentSerial);
  const [candidateBatch, setCandidateBatch] = useState(currentBatch);
  const [candidateExpiry, setCandidateExpiry] = useState(currentExpiry);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    videoRef,
    canvasRef,
    isCameraActive,
    cameraError,
    facingMode,
    isTorchOn,
    canToggleTorch,
    isAnalyzing,
    analysisStage,
    capturedSnapshot,
    scanResult,
    startCamera,
    stopCamera,
    switchCamera,
    toggleTorch,
    captureAndAnalyze,
    setScanResult,
    resetScanner
  } = useComputerVisionScanner({
    targetMode,
    enableSound: soundEnabled
  });

  // Sync mode from props when opened
  useEffect(() => {
    if (isOpen) {
      setTargetMode(initialTargetMode);
      setCandidateSerial(currentSerial);
      setCandidateBatch(currentBatch);
      setCandidateExpiry(currentExpiry);
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, initialTargetMode]);

  // Sync candidates when scan result arrives
  useEffect(() => {
    if (scanResult) {
      if (scanResult.serialNumber) setCandidateSerial(scanResult.serialNumber);
      if (scanResult.batchNumber) setCandidateBatch(scanResult.batchNumber);
      if (scanResult.expiryDate) setCandidateExpiry(scanResult.expiryDate);
    }
  }, [scanResult]);

  if (!isOpen) return null;

  const serialValidation = candidateSerial ? validateSerialNumber(candidateSerial) : { isValid: false, message: 'No serial captured' };
  const batchValidation = candidateBatch ? validateBatchNumber(candidateBatch) : { isValid: false, message: 'No batch code captured' };

  const handleApplyToProduct = () => {
    const hasSerial = Boolean(candidateSerial && candidateSerial.trim());
    const hasBatch = Boolean(candidateBatch && candidateBatch.trim());
    const hasExpiry = Boolean(candidateExpiry && candidateExpiry.trim());

    onApplyData({
      serialNumber: candidateSerial.trim() || undefined,
      batchNumber: candidateBatch.trim() || undefined,
      expiryDate: candidateExpiry.trim() || undefined,
      enableSerialTracking: hasSerial,
      enableBatchTracking: hasBatch,
      enableExpiryTracking: hasExpiry
    });

    setShowAppliedToast(true);
    setTimeout(() => {
      setShowAppliedToast(false);
      onClose();
    }, 600);
  };

  const handleLoadSample = (sample: typeof SAMPLE_PRESETS[0]) => {
    setCandidateSerial(sample.serial);
    setCandidateBatch(sample.batch);
    if (sample.expiry) setCandidateExpiry(sample.expiry);

    setScanResult({
      rawText: `${sample.name} | S/N: ${sample.serial} | LOT: ${sample.batch} | EXP: ${sample.expiry}`,
      serialNumber: sample.serial,
      batchNumber: sample.batch,
      expiryDate: sample.expiry || undefined,
      detectedType: sample.serial && sample.batch ? 'both' : 'serial',
      confidence: 99,
      isValid: true,
      validationMessage: `Loaded verified sample: ${sample.name}`,
      detectedTokens: [`S/N: ${sample.serial}`, `LOT: ${sample.batch}`, sample.expiry ? `EXP: ${sample.expiry}` : ''].filter(Boolean)
    });
    setActiveTab('camera');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        await captureAndAnalyze(base64);
        setActiveTab('camera');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] text-white">
        
        {/* Hidden Canvas for Frame Processing */}
        <canvas ref={canvasRef} className="hidden" />
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*" 
          onChange={handleFileUpload} 
          className="hidden" 
        />

        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-700 border border-indigo-400/30 flex items-center justify-center text-white shadow-md">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Computer Vision: Serial & Batch Scanner
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-indigo-400" /> Vision AI
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Align device camera to capture, extract, and validate serial numbers and lot tags.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          {/* Target Mode */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setTargetMode('auto')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                targetMode === 'auto'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              Auto Detect (Both)
            </button>
            <button
              type="button"
              onClick={() => setTargetMode('serial')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                targetMode === 'serial'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Serial Number (S/N)
            </button>
            <button
              type="button"
              onClick={() => setTargetMode('batch')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                targetMode === 'batch'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              Batch / Lot
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'camera' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Camera
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('samples')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'samples' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Test Samples
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg font-bold text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" /> Upload File
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Camera Viewport / Sample View */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {activeTab === 'camera' ? (
              <div className="relative aspect-4/3 sm:aspect-16/10 bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center group">
                {/* Live Video Element */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />

                {/* Laser Reticle & HUD Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  {/* Targeting Laser Bar (animated scanning sweep) */}
                  <div className="absolute inset-x-8 top-1/2 h-0.5 bg-linear-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-pulse" />

                  {/* Reticle Target Bounding Box */}
                  <div className="relative w-full max-w-[280px] sm:max-w-[340px] aspect-3/2 border-2 border-indigo-400/70 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.25)] flex flex-col justify-between p-2">
                    {/* Reticle Corners */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-rose-500 rounded-tl-sm" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-rose-500 rounded-tr-sm" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-rose-500 rounded-bl-sm" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-rose-500 rounded-br-sm" />

                    {/* HUD Target Header */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-indigo-300 bg-slate-950/70 px-2 py-0.5 rounded-md self-center">
                      <span>CV RETICLE: {targetMode.toUpperCase()}</span>
                    </div>

                    {/* Reticle Center Guide */}
                    <div className="self-center text-center">
                      <p className="text-[11px] font-medium text-slate-300 bg-slate-950/80 px-3 py-1 rounded-full backdrop-blur-xs border border-slate-700/50">
                        {isAnalyzing 
                          ? 'Extracting OCR Tokens...' 
                          : targetMode === 'serial'
                          ? 'Frame Serial / S/N Barcode'
                          : targetMode === 'batch'
                          ? 'Frame Batch / Lot Label'
                          : 'Frame Tag (Serial + Batch)'}
                      </p>
                    </div>

                    {/* HUD Target Footer */}
                    <div className="text-[9px] font-mono text-indigo-400/80 text-center">
                      AUTOFOCUS ACTIVE • 60 FPS
                    </div>
                  </div>
                </div>

                {/* Analysis Stage Loader Overlay */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center animate-bounce">
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Computer Vision Processing</h4>
                      <p className="text-xs text-indigo-300 mt-0.5">
                        {analysisStage === 'capturing' ? 'Grabbing sharp video frame...' :
                         analysisStage === 'processing_vision' ? 'Transcribing OCR & barcodes with Gemini Vision...' :
                         'Validating serial & lot checksums...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Camera Error State */}
                {cameraError && !isCameraActive && (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Camera Access Required</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs">
                        {cameraError}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('samples')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Use Test Samples
                      </button>
                    </div>
                  </div>
                )}

                {/* Viewport Floating Controls */}
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                  <div className="flex items-center gap-1.5">
                    {canToggleTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                          isTorchOn 
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold' 
                            : 'bg-slate-950/70 text-slate-300 border-slate-700/60 hover:text-white'
                        }`}
                        title="Toggle Flashlight Torch"
                      >
                        <Flashlight className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={switchCamera}
                      className="p-2 rounded-xl bg-slate-950/70 text-slate-300 border border-slate-700/60 hover:text-white backdrop-blur-md transition-all cursor-pointer"
                      title="Flip Camera (Front/Back)"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Primary Trigger Capture & Analyze Button */}
                  <button
                    type="button"
                    onClick={() => captureAndAnalyze()}
                    disabled={isAnalyzing}
                    className="px-4 py-2 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg border border-indigo-400/40 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <ScanLine className="w-4 h-4 text-indigo-200" />
                    <span>Capture & Validate</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Test Presets Grid */
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Pre-Configured Industrial Sample Tags
                  </h4>
                  <span className="text-[10px] text-indigo-400 font-medium">Click to Load</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {SAMPLE_PRESETS.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleLoadSample(preset)}
                      className="p-3 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/60 rounded-xl transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                              {preset.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-950 text-indigo-300 text-[10px] font-mono border border-indigo-800">
                              {preset.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {preset.description}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-300">
                        <span>S/N: <strong className="text-white">{preset.serial}</strong></span>
                        <span>LOT: <strong className="text-white">{preset.batch}</strong></span>
                        {preset.expiry && <span>EXP: <strong className="text-amber-400">{preset.expiry}</strong></span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Camera Instructions & Symbologies */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Compatible with Code 128, QR, GS1-128, DataMatrix, and Laser-Engraved Plates.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Validation & Extracted Product Record Fields */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
            
            <div className="space-y-4">
              {/* Status Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    scanResult?.isValid ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-indigo-500 animate-pulse'
                  }`} />
                  <span className="text-xs font-bold text-slate-200">
                    {scanResult?.isValid ? 'Validated Record Data' : 'Live Capture & Formatter'}
                  </span>
                </div>
                {scanResult?.confidence && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Confidence: {scanResult.confidence}%
                  </span>
                )}
              </div>

              {/* Serial Number Input Card */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                    Unit Serial Number (S/N)
                  </label>
                  {candidateSerial && (
                    <span className={`text-[10px] font-bold ${
                      serialValidation.isValid ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {serialValidation.isValid ? '✓ Format Valid' : '⚠️ Review Format'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={candidateSerial}
                    onChange={(e) => setCandidateSerial(e.target.value)}
                    placeholder="e.g. SN-88421-V2"
                    className={`w-full px-3 py-2 bg-slate-900 border ${
                      candidateSerial && serialValidation.isValid 
                        ? 'border-emerald-500/60 focus:ring-emerald-500/30' 
                        : 'border-slate-700 focus:ring-indigo-500/30'
                    } rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:ring-2`}
                  />
                  {candidateSerial && (
                    <button
                      type="button"
                      onClick={() => setCandidateSerial('')}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  {candidateSerial ? serialValidation.message : 'Tracks individual warranty & serialization.'}
                </p>
              </div>

              {/* Batch / Lot Input Card */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-indigo-400" />
                    Batch / Lot Identifier
                  </label>
                  {candidateBatch && (
                    <span className={`text-[10px] font-bold ${
                      batchValidation.isValid ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {batchValidation.isValid ? '✓ Valid Lot Code' : '⚠️ Review'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={candidateBatch}
                    onChange={(e) => setCandidateBatch(e.target.value)}
                    placeholder="e.g. LOT-2026-X99"
                    className={`w-full px-3 py-2 bg-slate-900 border ${
                      candidateBatch && batchValidation.isValid 
                        ? 'border-emerald-500/60 focus:ring-emerald-500/30' 
                        : 'border-slate-700 focus:ring-indigo-500/30'
                    } rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:ring-2`}
                  />
                  {candidateBatch && (
                    <button
                      type="button"
                      onClick={() => setCandidateBatch('')}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  {candidateBatch ? batchValidation.message : 'Groups manufacturing batch for quality control.'}
                </p>
              </div>

              {/* Optional Expiry Date Input Card */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Lot Expiration Date (FEFO)
                </label>
                <input
                  type="date"
                  value={candidateExpiry}
                  onChange={(e) => setCandidateExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              {/* Detected OCR Tokens Chip Summary */}
              {scanResult?.detectedTokens && scanResult.detectedTokens.length > 0 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Extracted Vision Tokens:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {scanResult.detectedTokens.map((tok, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 text-[10px] font-mono">
                        {tok}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              {showAppliedToast && (
                <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2 justify-center animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Applied to Product Record!
                </div>
              )}

              <button
                type="button"
                onClick={handleApplyToProduct}
                disabled={!candidateSerial && !candidateBatch}
                className="w-full py-3 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Apply Values to Product Record</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
              >
                Cancel & Return
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
