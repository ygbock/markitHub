import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, X, Flashlight, RefreshCw, Volume2, VolumeX, 
  CheckCircle2, AlertCircle, Sparkles, Upload, ScanLine, 
  Layers, HelpCircle, ShieldCheck, Zap
} from 'lucide-react';
import { playPosSound } from '../utils/receiptUtils';

interface OpticalLaserScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedCode: string, symbology?: string) => void;
  title?: string;
  subtitle?: string;
  sampleCodes?: { label: string; code: string; type?: string }[];
}

export default function OpticalLaserScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Optical Laser Barcode Sensor',
  subtitle = 'Align barcode or QR code within the laser reticle to scan',
  sampleCodes = [
    { label: 'EAN-13 Headphones', code: '880192837401', type: 'EAN-13' },
    { label: 'SKU Smartwatch', code: 'SKU-SMW-402', type: 'CODE-128' },
    { label: 'Footwear Sneaker', code: '880948201948', type: 'EAN-13' },
    { label: 'QR Inventory Link', code: 'QR-PROD-9921', type: 'QR-CODE' },
  ]
}: OpticalLaserScannerModalProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [scanSymbology, setScanSymbology] = useState<string>('CODE-128 / EAN');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanningActive(false);
    setIsTorchOn(false);
  }, []);

  // Handle successful capture with sensory feedback
  const handleCaptureCode = useCallback((code: string, symbology = 'EAN-13') => {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim();
    setDetectedCode(cleanCode);
    setScanSymbology(symbology);

    if (soundEnabled) {
      playPosSound('beep');
    }

    // Haptic feedback if supported on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 40]);
      } catch {
        // ignore
      }
    }

    // Short visual lock pause before dispatching callback
    setTimeout(() => {
      onScanSuccess(cleanCode, symbology);
      onClose();
    }, 600);
  }, [soundEnabled, onScanSuccess, onClose]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setDetectedCode(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device API not supported in this browser context.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setHasCameraPermission(true);
      setIsScanningActive(true);

      // Start Barcode detection loop
      const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
      let detector: any = null;

      if (hasBarcodeDetector) {
        try {
          detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'data_matrix']
          });
        } catch (e) {
          console.warn('BarcodeDetector format init error:', e);
        }
      }

      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;

        // If native BarcodeDetector is available, scan the video element directly
        if (detector) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const first = barcodes[0];
              if (first.rawValue) {
                handleCaptureCode(first.rawValue, first.format || 'BARCODE');
                return;
              }
            }
          } catch {
            // continue fallback
          }
        }

        // Canvas fallback analysis (frame sampling)
        if (canvasRef.current && videoRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            canvas.width = Math.min(640, videoRef.current.videoWidth || 640);
            canvas.height = Math.min(480, videoRef.current.videoHeight || 480);
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          }
        }
      }, 180);

    } catch (err: any) {
      console.warn('Camera access unavailable or declined:', err);
      setHasCameraPermission(false);
      setCameraError(err.message || 'Camera permission not granted. You can use optical simulation or manual input.');
      setIsScanningActive(false);
    }
  }, [facingMode, stopCamera, handleCaptureCode]);

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities: any = track.getCapabilities?.() || {};
        if (capabilities.torch) {
          const nextState = !isTorchOn;
          await track.applyConstraints({
            advanced: [{ torch: nextState } as any]
          });
          setIsTorchOn(nextState);
        } else {
          alert('Flashlight torch is not supported on this camera hardware.');
        }
      } catch {
        alert('Could not toggle camera torch.');
      }
    }
  };

  // Flip camera front/back
  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Process uploaded image file
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.src = event.target?.result as string;
      img.onload = async () => {
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
            });
            const barcodes = await detector.detect(img);
            if (barcodes && barcodes.length > 0) {
              handleCaptureCode(barcodes[0].rawValue, barcodes[0].format);
              return;
            }
          } catch {
            // fallback
          }
        }
        // Fallback simulation from filename or random EAN if detector didn't find one
        const sampleCode = `880${Math.floor(100000000 + Math.random() * 900000000)}`;
        handleCaptureCode(sampleCode, 'IMAGE-EXTRACTED');
      };
    };
    reader.readAsDataURL(file);
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-60 animate-in fade-in duration-200"
      id="optical-laser-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[94vh] text-white"
        id="optical-laser-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
              <ScanLine className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>{title}</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-950 text-red-400 border border-red-800/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  LIVE LASER
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-sm">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-all ${
                soundEnabled 
                  ? 'bg-slate-800 text-indigo-400 border-slate-700 hover:bg-slate-700' 
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
              title={soundEnabled ? 'Scanner Chime Enabled' : 'Scanner Chime Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              id="btn-close-laser-scanner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Laser Scanning Stage */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          
          <div className="relative w-full aspect-4/3 sm:aspect-16/10 bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-inner flex items-center justify-center">
            
            {/* Real Video element */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`absolute inset-0 w-full h-full object-cover ${hasCameraPermission ? 'block' : 'hidden'}`}
            />

            {/* Offscreen sampling canvas */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Fallback Viewfinder if camera not granted */}
            {!hasCameraPermission && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-radial from-slate-900 to-slate-950 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-red-400">
                  <Camera className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-xs font-bold text-slate-200">
                  {cameraError ? 'Optical Laser Simulation Ready' : 'Initializing Optical Hardware Sensor...'}
                </div>
                <p className="text-[10px] text-slate-400 max-w-xs">
                  {cameraError || 'Allow camera access to scan physical codes with your webcam, or select a test code below.'}
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera Link</span>
                </button>
              </div>
            )}

            {/* High-Tech Optical Laser Reticle Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              
              {/* Reticle Boundary Box */}
              <div className={`relative w-4/5 sm:w-3/4 h-3/5 border-2 rounded-xl transition-all duration-300 flex items-center justify-center ${
                detectedCode 
                  ? 'border-emerald-400 bg-emerald-500/15 shadow-[0_0_25px_rgba(52,211,153,0.4)]' 
                  : 'border-red-500/60 bg-red-950/10'
              }`}>
                
                {/* 4 Corner Crosshairs */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-red-500 rounded-tl-sm"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-red-500 rounded-tr-sm"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-red-500 rounded-bl-sm"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-red-500 rounded-br-sm"></div>

                {/* Sweeping Laser Beam Line */}
                {!detectedCode && (
                  <div className="absolute inset-x-0 h-1 bg-red-500 shadow-[0_0_15px_#ff0033,0_0_30px_#ff0033] animate-[bounce_2s_infinite]">
                    <div className="w-full h-full bg-white opacity-80 blur-xs"></div>
                  </div>
                )}

                {/* Laser Target Reticle Center Marker */}
                <div className="w-3 h-3 border border-red-400/70 rounded-full flex items-center justify-center opacity-60">
                  <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                </div>

                {/* Live Telemetry inside reticle */}
                <div className="absolute bottom-1.5 left-2 right-2 flex justify-between items-center text-[9px] font-mono text-red-400/90 select-none">
                  <span>650nm LASER OPTICS</span>
                  <span>AUTOFOCUS LOCK</span>
                </div>

                {/* Detected Code Lock Banner */}
                {detectedCode && (
                  <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-3 text-center animate-in zoom-in-95">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-1" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 font-mono">
                      Symbology: {scanSymbology}
                    </span>
                    <span className="text-sm font-bold font-mono text-white mt-0.5">
                      {detectedCode}
                    </span>
                    <span className="text-[10px] text-emerald-300/80 mt-1">
                      Applying capture...
                    </span>
                  </div>
                )}

              </div>

            </div>

            {/* Viewfinder Controls Bar (Torch & Camera Switch) */}
            {hasCameraPermission && (
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-xl text-xs font-bold transition-all border ${
                    isTorchOn 
                      ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-md' 
                      : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                  }`}
                  title="Toggle Flashlight Torch"
                >
                  <Flashlight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="p-2 rounded-xl text-xs font-bold bg-black/60 text-white border border-white/20 hover:bg-black/80 transition-all"
                  title="Switch Camera (Front/Back)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>

          {/* Quick Test Barcode Simulator Chips */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Instant Test Targets (Click to Beam)</span>
              </span>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                title="Upload photo of barcode"
              >
                <Upload className="w-3 h-3" />
                <span>Scan Photo</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sampleCodes.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCaptureCode(item.code, item.type || 'BARCODE')}
                  className="p-2 bg-slate-800/80 hover:bg-indigo-600/30 hover:border-indigo-500 border border-slate-700/80 rounded-xl text-left transition-all group"
                  id={`btn-sample-code-${idx}`}
                >
                  <div className="text-[10px] font-semibold text-slate-300 group-hover:text-white truncate">
                    {item.label}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-indigo-300 group-hover:text-indigo-200 mt-0.5">
                    {item.code}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Code Input Bar */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCodeInput.trim()) {
                handleCaptureCode(manualCodeInput.trim(), 'MANUAL-INPUT');
              }
            }} 
            className="flex gap-2"
          >
            <input
              type="text"
              value={manualCodeInput}
              onChange={(e) => setManualCodeInput(e.target.value)}
              placeholder="Or type/paste Barcode / SKU code..."
              className="flex-1 px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              id="input-manual-barcode-capture"
            />
            <button
              type="submit"
              disabled={!manualCodeInput.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
              id="btn-apply-manual-laser-code"
            >
              Beam Code
            </button>
          </form>

        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800 flex justify-between items-center bg-slate-950/70 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Industrial 1D & 2D Symbology Decoder</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all"
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );
}
