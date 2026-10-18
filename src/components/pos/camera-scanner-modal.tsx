"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, AlertCircle, Scan, Volume2 } from "lucide-react";

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function CameraScannerModal({ isOpen, onClose, onScan }: CameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const scanningRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setErrorMessage(null);
    setLastScanned(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser or requires HTTPS.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanningRef.current = true;
        detectBarcodeLoop();
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Camera access permission was denied. Please allow camera permissions in your browser.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMessage("No camera detected on this device.");
      } else {
        setErrorMessage(err.message || "Failed to initialize device camera.");
      }
    }
  };

  const detectBarcodeLoop = async () => {
    // Check if browser supports native BarcodeDetector API
    if ("BarcodeDetector" in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });

        const scan = async () => {
          if (!scanningRef.current || !videoRef.current) return;
          try {
            if (videoRef.current.readyState >= 2) {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const rawVal = barcodes[0].rawValue;
                handleSuccessfulScan(rawVal);
                return;
              }
            }
          } catch {
            // Ignore frame detection failures and retry next frame
          }

          if (scanningRef.current) {
            requestAnimationFrame(scan);
          }
        };

        requestAnimationFrame(scan);
      } catch {
        // Fallback if formats fail
      }
    }
  };

  const handleSuccessfulScan = (code: string) => {
    setLastScanned(code);
    // Beep sound feedback
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch beep
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Audio context might be restricted
    }

    onScan(code);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleSuccessfulScan(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Camera className="h-4 w-4 text-blue-400" />
            <span>Camera Barcode Scanner</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-black h-72 flex items-center justify-center overflow-hidden">
          {errorMessage ? (
            <div className="p-6 text-center text-slate-300 space-y-3">
              <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
              <p className="text-xs">{errorMessage}</p>
              <p className="text-[11px] text-slate-400">
                You can use the manual input below to scan or search by barcode.
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Targeting Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-36 border-2 border-dashed border-blue-400/80 rounded-xl relative flex items-center justify-center">
                  <div className="w-full h-0.5 bg-red-500/80 animate-pulse" />
                  <div className="absolute -bottom-6 text-[10px] text-white/90 bg-black/60 px-2 py-0.5 rounded font-mono">
                    Align barcode inside frame
                  </div>
                </div>
              </div>

              {lastScanned && (
                <div className="absolute inset-0 bg-emerald-600/60 flex items-center justify-center animate-in fade-in">
                  <div className="bg-white px-4 py-2 rounded-xl text-slate-900 font-bold text-sm shadow-lg flex items-center gap-2">
                    <Scan className="h-4 w-4 text-emerald-600" />
                    <span>Scanned: {lastScanned}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Manual Fallback Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Or enter barcode manually..."
              className="flex-1 h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono"
            />
            <Button size="sm" type="submit" className="text-xs">
              Confirm
            </Button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Volume2 className="h-3.5 w-3.5 text-slate-400" /> Audio chime on scan
            </span>
            <button
              type="button"
              onClick={onClose}
              className="font-medium hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
