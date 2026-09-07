import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, Upload, AlertCircle, CheckCircle2, SwitchCamera, Image as ImageIcon } from 'lucide-react';
import { extractPublicKeyFromText } from '../lib/crypto';
import { playDecryptSound } from '../lib/sounds';

interface QRScannerProps {
  onScanSuccess: (publicKeyHex: string) => void;
  myPublicKeyHex?: string;
  className?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  myPublicKeyHex,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Check if multiple camera devices exist
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      }).catch(() => {});
    }
  }, []);

  // Process a raw scanned string
  const handleDecodedString = useCallback((decodedText: string): boolean => {
    const key = extractPublicKeyFromText(decodedText);
    if (!key) {
      setFeedbackMessage('QR code found, but no 64-character public key detected.');
      return false;
    }

    if (myPublicKeyHex && key.toLowerCase() === myPublicKeyHex.toLowerCase()) {
      setFeedbackMessage('This is your own key. Scan a peer’s QR code.');
      return false;
    }

    playDecryptSound();
    stopCamera();
    onScanSuccess(key);
    return true;
  }, [myPublicKeyHex, onScanSuccess, stopCamera]);

  // Start Camera Stream
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);
    setFeedbackMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser or environment. You can upload a QR image below.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback with basic video constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser or upload a QR image.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can upload a QR screenshot below.');
      } else {
        setCameraError(`Camera initialization failed (${err.message || 'unknown error'}). You can upload a QR screenshot below.`);
      }
    }
  }, [stopCamera]);

  // Continuous frame analysis loop
  useEffect(() => {
    if (!cameraActive) return;

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        animFrameIdRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data) {
            const success = handleDecodedString(code.data);
            if (success) {
              return; // Successfully scanned, frame loop stops
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [cameraActive, handleDecodedString]);

  // Auto-start camera when mounted
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [facingMode, startCamera, stopCamera]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle image file upload for QR decoding
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);
    setFeedbackMessage(null);

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image file.'));
        img.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        throw new Error('Canvas context unavailable');
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code && code.data) {
        const success = handleDecodedString(code.data);
        if (!success) {
          setFeedbackMessage('QR code found in image, but it does not contain a valid contact key.');
        }
      } else {
        setFeedbackMessage('No QR code detected in this image. Please ensure the QR code is clearly visible and try again.');
      }
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to process image file.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Viewport & Scanning Overlay */}
      <div className="relative w-full max-w-[340px] aspect-square rounded-2xl overflow-hidden bg-[#0C0C0E] border border-[#27272A] shadow-inner flex items-center justify-center">
        {/* Live video feed */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          playsInline
          muted
          autoPlay
        />

        {/* Camera Inactive / Error Fallback Screen */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#0C0C0E]/90 backdrop-blur-sm z-10">
            {cameraError ? (
              <>
                <div className="w-10 h-10 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-xs">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
                  <Camera className="w-5 h-5" />
                </div>
                <p className="text-xs text-[#71717A]">Accessing camera stream...</p>
              </>
            )}
          </div>
        )}

        {/* Cyberpunk Optical Reticle Overlay */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
            {/* Darkened vignette around scanning zone */}
            <div className="relative w-56 h-56 rounded-xl border border-indigo-500/30">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-indigo-400" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-indigo-400" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-indigo-400" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-indigo-400" />

              {/* Animated Laser Scan Line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-scan-line" />
            </div>

            {/* Helper Tag */}
            <div className="absolute bottom-3 py-1 px-3 rounded-full bg-black/70 backdrop-blur-md border border-[#27272A] text-[11px] text-[#A1A1AA] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Align peer QR code within frame</span>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Feedback notification */}
      {feedbackMessage && (
        <div className="flex items-center gap-2 p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300 max-w-[340px] w-full">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="leading-snug">{feedbackMessage}</span>
        </div>
      )}

      {/* Scanner Action Controls */}
      <div className="flex items-center gap-2 w-full max-w-[340px] justify-between">
        {/* Switch Camera if multiple cameras available */}
        {hasMultipleCameras && cameraActive ? (
          <button
            type="button"
            onClick={toggleFacingMode}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#18181B] border border-[#27272A] hover:border-indigo-500/40 rounded-xl text-xs text-[#A1A1AA] hover:text-white transition-all cursor-pointer"
          >
            <SwitchCamera className="w-3.5 h-3.5 text-indigo-400" />
            <span>Switch Camera</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startCamera(facingMode)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#18181B] border border-[#27272A] hover:border-indigo-500/40 rounded-xl text-xs text-[#A1A1AA] hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Restart Cam</span>
          </button>
        )}

        {/* Upload QR Screenshot / Photo fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingFile}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#18181B] border border-[#27272A] hover:border-indigo-500/40 rounded-xl text-xs text-[#A1A1AA] hover:text-white transition-all cursor-pointer disabled:opacity-50"
        >
          {isProcessingFile ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          ) : (
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
          )}
          <span>{isProcessingFile ? 'Decoding...' : 'Upload QR Image'}</span>
        </button>
      </div>
    </div>
  );
};
