import { useCallback, useEffect, useRef, useState } from "react";

export type FacingMode = "environment" | "user";

type CameraCapabilities = {
  torch: boolean;
  zoom: boolean;
  minZoom: number;
  maxZoom: number;
};

const DEFAULT_CAPABILITIES: CameraCapabilities = {
  torch: false,
  zoom: false,
  minZoom: 1,
  maxZoom: 1,
};

export function useCamera(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startRequestRef = useRef(0);

  const [isActive, setIsActive] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [capabilities, setCapabilities] = useState<CameraCapabilities>(DEFAULT_CAPABILITIES);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    startRequestRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsActive((prev) => (prev ? false : prev));
    setCapabilities(DEFAULT_CAPABILITIES);
    setZoom((prev) => (prev !== 1 ? 1 : prev));
  }, []);

  const attach = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;

    const stream = streamRef.current;
    if (node && stream && node.srcObject !== stream) {
      node.srcObject = stream;
      void node.play().catch(() => undefined);
    }
  }, []);

  const start = useCallback(
    async (requestedFacing: FacingMode = facingMode, deviceId?: string) => {
      if (!enabled) return false;

      const requestId = ++startRequestRef.current;
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not supported in this browser. Use Upload Photos instead.");
        return false;
      }

      // Stop the previous stream before requesting a new one.
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      try {
        const video: MediaTrackConstraints = deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            }
          : {
              facingMode: { ideal: requestedFacing },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            };

        let stream: MediaStream;

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video,
            audio: false,
          });
        } catch {
          // Safe fallback for browsers that reject ideal constraints.
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        // A newer start() call won the race.
        if (requestId !== startRequestRef.current || !enabled) {
          stream.getTracks().forEach((track) => track.stop());
          return false;
        }

        streamRef.current = stream;
        setFacingMode(requestedFacing);

        const track = stream.getVideoTracks()[0];
        const trackCapabilities = track.getCapabilities?.();

        const capabilitiesObj = trackCapabilities as Record<string, any> | undefined;
        const torch = Boolean(capabilitiesObj && "torch" in capabilitiesObj && capabilitiesObj.torch);
        const zoomMin =
          capabilitiesObj && "zoom" in capabilitiesObj
            ? Number(capabilitiesObj.zoom?.min ?? 1)
            : 1;
        const zoomMax =
          capabilitiesObj && "zoom" in capabilitiesObj
            ? Number(capabilitiesObj.zoom?.max ?? 1)
            : 1;

        setCapabilities({
          torch,
          zoom: zoomMax > zoomMin,
          minZoom: zoomMin,
          maxZoom: zoomMax,
        });
        setZoom(zoomMin);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }

        setIsActive(true);
        return true;
      } catch (cause) {
        setIsActive(false);

        const name = cause instanceof DOMException ? cause.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError("Camera permission was denied. Allow camera access or use Upload Photos.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError("No camera was found. Use Upload Photos instead.");
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          setError("The camera is busy or unavailable. Close other camera apps and retry.");
        } else {
          setError("Camera access failed. You can continue with Upload Photos.");
        }
        return false;
      }
    },
    [enabled, facingMode]
  );

  const applyTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !capabilities.torch) return false;

    const current = track.getSettings();
    const next = !Boolean((current as MediaTrackSettings & { torch?: boolean }).torch);

    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      return next;
    } catch {
      return false;
    }
  }, [capabilities.torch]);

  const applyZoom = useCallback(
    async (requestedZoom: number) => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track || !capabilities.zoom) return false;

      const next = Math.min(
        capabilities.maxZoom,
        Math.max(capabilities.minZoom, requestedZoom)
      );

      try {
        await track.applyConstraints({
          advanced: [{ zoom: next } as MediaTrackConstraintSet],
        });
        setZoom(next);
        return true;
      } catch {
        return false;
      }
    },
    [capabilities]
  );

  useEffect(() => {
    if (!enabled && (isActive || streamRef.current)) {
      stop();
    }
  }, [enabled, isActive, stop]);

  useEffect(() => stop, [stop]);

  return {
    videoRef,
    attach,
    streamRef,
    isActive,
    facingMode,
    setFacingMode,
    capabilities,
    zoom,
    error,
    start,
    stop,
    applyTorch,
    applyZoom,
  };
}
