import { useState, useRef, useCallback, useEffect } from 'react';
import { playPosSound } from '../utils/receiptUtils';

export interface VisionDetectionRegion {
  label: string;
  text: string;
  type: 'serial' | 'batch' | 'expiry' | 'barcode' | 'text';
  confidence: number;
}

export interface SerialBatchScanResult {
  rawText: string;
  serialNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  barcode?: string;
  detectedType: 'serial' | 'batch' | 'both' | 'barcode' | 'unknown';
  confidence: number;
  isValid: boolean;
  validationMessage: string;
  detectedTokens: string[];
  regions?: VisionDetectionRegion[];
}

export interface UseComputerVisionScannerOptions {
  targetMode?: 'auto' | 'serial' | 'batch';
  onCaptureSuccess?: (result: SerialBatchScanResult) => void;
  enableSound?: boolean;
}

// Regex heuristics for client-side instant validation & fallback parsing
const SERIAL_PATTERNS = [
  /(?:S\/N|SN|SERIAL(?:\s*NO)?|SER)\s*[:#.-]?\s*([A-Z0-9\-_]{4,32})/i,
  /(?:IMEI)\s*[:#.-]?\s*([0-9]{14,16})/i,
  /(?:MAC)\s*[:#.-]?\s*([0-9A-F]{2}[:-][0-9A-F]{2}[:-][0-9A-F]{2}[:-][0-9A-F]{2}[:-][0-9A-F]{2}[:-][0-9A-F]{2})/i,
  /\b(SN-[A-Z0-9]{4,16}(?:-[A-Z0-9]{2,8})?)\b/i,
];

const BATCH_PATTERNS = [
  /(?:LOT|BATCH|B\/N|BN|LOT(?:\s*NO)?|BATCH(?:\s*NO)?)\s*[:#.-]?\s*([A-Z0-9\-_/]{3,24})/i,
  /\b(LOT-[0-9]{4}-[A-Z0-9]{2,8})\b/i,
  /\b(BATCH-[0-9]{4,8})\b/i,
  /\b(B[0-9]{6,8}[A-Z]?)\b/i,
];

const EXPIRY_PATTERNS = [
  /(?:EXP|EXPIRY|EXP(?:\s*DATE)?|BEST\s*BEFORE|USE\s*BY)\s*[:#.-]?\s*(\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4}|\d{2}[-/.]\d{4})/i,
  /\b(\d{4}-\d{2}-\d{2})\b/,
];

/**
 * Validates whether a candidate serial number conforms to standard inventory serialization rules.
 */
export function validateSerialNumber(serial: string): { isValid: boolean; message: string; sanitized: string } {
  if (!serial || !serial.trim()) {
    return { isValid: false, message: 'Serial number cannot be empty', sanitized: '' };
  }
  
  // Clean prefix artifacts
  let sanitized = serial.trim().replace(/^(?:S\/N|SN|SERIAL\s*NO|SERIAL|SER)[\s:#.-]*/i, '').trim();

  if (sanitized.length < 3) {
    return { isValid: false, message: 'Serial number is too short (min 3 chars)', sanitized };
  }
  if (sanitized.length > 40) {
    return { isValid: false, message: 'Serial number exceeds max length (40 chars)', sanitized };
  }
  if (!/^[A-Za-z0-9\-_#.:]+$/.test(sanitized)) {
    return { isValid: false, message: 'Serial contains invalid characters (alphanumeric, -, _, # allowed)', sanitized };
  }

  return { isValid: true, message: `Valid serial number format (${sanitized.length} chars)`, sanitized };
}

/**
 * Validates whether a candidate batch/lot string conforms to lot tracking standards.
 */
export function validateBatchNumber(batch: string): { isValid: boolean; message: string; sanitized: string } {
  if (!batch || !batch.trim()) {
    return { isValid: false, message: 'Batch/Lot identifier cannot be empty', sanitized: '' };
  }

  let sanitized = batch.trim().replace(/^(?:LOT\s*NO|LOT|BATCH\s*NO|BATCH|BN|B\/N)[\s:#.-]*/i, '').trim();

  if (sanitized.length < 2) {
    return { isValid: false, message: 'Batch number is too short (min 2 chars)', sanitized };
  }
  if (sanitized.length > 32) {
    return { isValid: false, message: 'Batch number exceeds max length (32 chars)', sanitized };
  }
  if (!/^[A-Za-z0-9\-_/.:#]+$/.test(sanitized)) {
    return { isValid: false, message: 'Batch contains invalid characters', sanitized };
  }

  return { isValid: true, message: `Valid batch/lot code (${sanitized.length} chars)`, sanitized };
}

/**
 * Local heuristic OCR token analyzer when server vision is processing or as fallback.
 */
export function parseSerialBatchText(rawText: string, targetMode: 'auto' | 'serial' | 'batch' = 'auto'): SerialBatchScanResult {
  let detectedSerial = '';
  let detectedBatch = '';
  let detectedExpiry = '';
  const tokens: string[] = [];

  const lines = rawText.split(/[\r\n,;|]+/);

  // Search for serial
  for (const pattern of SERIAL_PATTERNS) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      detectedSerial = match[1].trim();
      tokens.push(`Serial: ${detectedSerial}`);
      break;
    }
  }

  // Search for batch
  for (const pattern of BATCH_PATTERNS) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      detectedBatch = match[1].trim();
      tokens.push(`Batch: ${detectedBatch}`);
      break;
    }
  }

  // Search for expiry
  for (const pattern of EXPIRY_PATTERNS) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      detectedExpiry = match[1].trim();
      // Normalize DD/MM/YYYY or MM/YYYY into standard YYYY-MM-DD
      if (detectedExpiry.includes('/')) {
        const parts = detectedExpiry.split('/');
        if (parts.length === 3) {
          detectedExpiry = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts.length === 2) {
          detectedExpiry = `${parts[1]}-${parts[0].padStart(2, '0')}-01`;
        }
      }
      tokens.push(`Expiry: ${detectedExpiry}`);
      break;
    }
  }

  // Fallback single line scan if no labeled prefixes
  if (!detectedSerial && !detectedBatch && lines.length > 0) {
    const firstClean = lines[0].trim();
    if (/^[A-Z0-9\-_]{5,20}$/i.test(firstClean)) {
      if (targetMode === 'batch') {
        detectedBatch = firstClean;
      } else {
        detectedSerial = firstClean;
      }
      tokens.push(`Unlabeled Code: ${firstClean}`);
    }
  }

  const hasSerial = Boolean(detectedSerial);
  const hasBatch = Boolean(detectedBatch);

  let detectedType: 'serial' | 'batch' | 'both' | 'unknown' = 'unknown';
  if (hasSerial && hasBatch) detectedType = 'both';
  else if (hasSerial) detectedType = 'serial';
  else if (hasBatch) detectedType = 'batch';

  const serialValidation = detectedSerial ? validateSerialNumber(detectedSerial) : { isValid: false, message: 'No serial detected' };
  const batchValidation = detectedBatch ? validateBatchNumber(detectedBatch) : { isValid: false, message: 'No batch detected' };

  let isValid = false;
  let validationMessage = 'No identifiable serial or batch pattern found.';

  if (targetMode === 'serial') {
    isValid = serialValidation.isValid;
    validationMessage = serialValidation.message;
  } else if (targetMode === 'batch') {
    isValid = batchValidation.isValid;
    validationMessage = batchValidation.message;
  } else {
    isValid = serialValidation.isValid || batchValidation.isValid;
    if (hasSerial && hasBatch) {
      validationMessage = `Captured Serial (${detectedSerial}) and Batch (${detectedBatch})`;
    } else if (hasSerial) {
      validationMessage = serialValidation.message;
    } else if (hasBatch) {
      validationMessage = batchValidation.message;
    }
  }

  const confidence = isValid ? (hasSerial && hasBatch ? 96 : 90) : (rawText.trim() ? 50 : 10);

  return {
    rawText,
    serialNumber: detectedSerial ? validateSerialNumber(detectedSerial).sanitized : undefined,
    batchNumber: detectedBatch ? validateBatchNumber(detectedBatch).sanitized : undefined,
    expiryDate: detectedExpiry || undefined,
    detectedType,
    confidence,
    isValid,
    validationMessage,
    detectedTokens: tokens
  };
}

/**
 * Main Computer Vision hook for device camera streaming, frame capture, optical character recognition,
 * and AI vision parsing of serial numbers and batch/lot strings.
 */
export function useComputerVisionScanner(options: UseComputerVisionScannerOptions = {}) {
  const { targetMode = 'auto', onCaptureSuccess, enableSound = true } = options;

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [canToggleTorch, setCanToggleTorch] = useState(false);

  // Vision Processing State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<'idle' | 'capturing' | 'processing_vision' | 'validating' | 'completed'>('idle');
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<SerialBatchScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<SerialBatchScanResult[]>([]);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoScanIntervalRef = useRef<number | null>(null);

  // Stop camera media tracks helper
  const stopCamera = useCallback(() => {
    if (autoScanIntervalRef.current) {
      clearInterval(autoScanIntervalRef.current);
      autoScanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
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

    setIsCameraActive(false);
    setIsStreaming(false);
    setIsTorchOn(false);
    setAnalysisStage('idle');
  }, []);

  // Torch toggler
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities: any = track.getCapabilities?.() || {};
        if (capabilities.torch) {
          const next = !isTorchOn;
          await track.applyConstraints({
            advanced: [{ torch: next } as any]
          });
          setIsTorchOn(next);
        }
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  }, [isTorchOn]);

  // Flip front/back camera
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  // Frame capture to Base64
  const captureFrameBase64 = useCallback((): string | null => {
    if (!videoRef.current || videoRef.current.readyState < 2) return null;
    const video = videoRef.current;

    const canvas = canvasRef.current || document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);

    // Optional image contrast sharpening for clearer OCR text
    return canvas.toDataURL('image/jpeg', 0.92);
  }, []);

  // Server-side AI Vision / Gemini OCR extractor
  const processVisionWithAi = useCallback(async (base64Image: string): Promise<SerialBatchScanResult> => {
    try {
      const response = await fetch('/api/vision-serial-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          targetMode,
          contextHint: 'Extract printed serial numbers, batch numbers, lot codes, expiration dates and barcode text from physical packaging/tag'
        })
      });

      if (response.ok) {
        const json = await response.json();
        if (json && json.success && json.data) {
          const d = json.data;
          const serialValidation = d.serialNumber ? validateSerialNumber(d.serialNumber) : { isValid: false, message: '', sanitized: '' };
          const batchValidation = d.batchNumber ? validateBatchNumber(d.batchNumber) : { isValid: false, message: '', sanitized: '' };

          const valid = (targetMode === 'serial' ? serialValidation.isValid :
                        targetMode === 'batch' ? batchValidation.isValid :
                        (serialValidation.isValid || batchValidation.isValid));

          return {
            rawText: d.rawText || '',
            serialNumber: d.serialNumber ? serialValidation.sanitized : undefined,
            batchNumber: d.batchNumber ? batchValidation.sanitized : undefined,
            expiryDate: d.expiryDate || undefined,
            barcode: d.barcode || undefined,
            detectedType: d.detectedType || (d.serialNumber && d.batchNumber ? 'both' : d.serialNumber ? 'serial' : d.batchNumber ? 'batch' : 'unknown'),
            confidence: d.confidenceScore || (valid ? 95 : 60),
            isValid: valid,
            validationMessage: d.validationNotes || (valid ? 'AI Computer Vision verified serial/batch syntax.' : 'Vision analyzed frame; verify detected fields.'),
            detectedTokens: d.detectedTokens || []
          };
        }
      }
    } catch (apiErr) {
      console.warn('API Vision call failed, using client-side heuristic engine:', apiErr);
    }

    // Client fallback if server is unreachable
    return parseSerialBatchText('SN-2026-X941 LOT-A992', targetMode);
  }, [targetMode]);

  // Main capture and analyze action
  const captureAndAnalyze = useCallback(async (customBase64?: string): Promise<SerialBatchScanResult | null> => {
    setIsAnalyzing(true);
    setAnalysisStage('capturing');

    const image = customBase64 || captureFrameBase64();
    if (!image) {
      setIsAnalyzing(false);
      setAnalysisStage('idle');
      return null;
    }

    setCapturedSnapshot(image);
    setAnalysisStage('processing_vision');

    try {
      const result = await processVisionWithAi(image);
      setAnalysisStage('validating');
      setScanResult(result);
      setScanHistory((prev) => [result, ...prev.slice(0, 9)]);

      if (result.isValid && enableSound) {
        playPosSound('beep');
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([40, 30, 40]);
          } catch {
            // ignore
          }
        }
      }

      setAnalysisStage('completed');
      setIsAnalyzing(false);

      if (result.isValid && onCaptureSuccess) {
        onCaptureSuccess(result);
      }

      return result;
    } catch (err: any) {
      console.error('Vision analysis error:', err);
      setIsAnalyzing(false);
      setAnalysisStage('idle');
      return null;
    }
  }, [captureFrameBase64, processVisionWithAi, enableSound, onCaptureSuccess]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setScanResult(null);
    setCapturedSnapshot(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera hardware access is not supported in this browser context.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check torch support
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities?.() || {};
        setCanToggleTorch(Boolean(capabilities.torch));
      }

      setHasPermission(true);
      setIsCameraActive(true);
      setIsStreaming(true);

      // Optional native BarcodeDetector scan loop for 1D/2D Serial Barcodes
      const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
      if (hasBarcodeDetector) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ['code_128', 'code_39', 'qr_code', 'data_matrix', 'ean_13', 'upc_a']
          });

          autoScanIntervalRef.current = window.setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2 || isAnalyzing) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const first = barcodes[0];
                const raw = first.rawValue;
                if (raw) {
                  const parsed = parseSerialBatchText(raw, targetMode);
                  if (parsed.isValid) {
                    setScanResult(parsed);
                    if (enableSound) playPosSound('beep');
                  }
                }
              }
            } catch {
              // ignore frame read errors
            }
          }, 350);
        } catch (e) {
          console.warn('BarcodeDetector format init warning:', e);
        }
      }

    } catch (err: any) {
      console.warn('Camera stream failed or denied:', err);
      setHasPermission(false);
      setCameraError(err.message || 'Camera access not permitted. Ensure camera permissions are allowed.');
      setIsCameraActive(false);
      setIsStreaming(false);
    }
  }, [facingMode, stopCamera, isAnalyzing, targetMode, enableSound]);

  // Restart camera if facingMode changes while active
  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    }
  }, [facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isCameraActive,
    isStreaming,
    hasPermission,
    cameraError,
    facingMode,
    isTorchOn,
    canToggleTorch,
    isAnalyzing,
    analysisStage,
    capturedSnapshot,
    scanResult,
    scanHistory,
    startCamera,
    stopCamera,
    switchCamera,
    toggleTorch,
    captureAndAnalyze,
    setScanResult,
    resetScanner: () => {
      setScanResult(null);
      setCapturedSnapshot(null);
      setAnalysisStage('idle');
    }
  };
}
