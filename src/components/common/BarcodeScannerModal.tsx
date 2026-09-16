import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setErrorMsg('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setErrorMsg('Câmera não suportada neste navegador.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Check if BarcodeDetector API exists (Modern Chromium & Android Chrome)
        const hasBarcodeDetector = 'BarcodeDetector' in window;
        if (hasBarcodeDetector) {
          try {
            const BarcodeDetectorClass = (window as unknown as { BarcodeDetector: any }).BarcodeDetector;
            const barcodeDetector = new BarcodeDetectorClass({
              formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
            });

            const scanFrame = async () => {
              if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                try {
                  const barcodes = await barcodeDetector.detect(videoRef.current);
                  if (barcodes.length > 0 && barcodes[0].rawValue) {
                    onScan(barcodes[0].rawValue);
                    onClose();
                    return;
                  }
                } catch {
                  // frame detection error
                }
              }
              animationFrameRef.current = requestAnimationFrame(scanFrame);
            };

            animationFrameRef.current = requestAnimationFrame(scanFrame);
          } catch (e) {
            console.warn('BarcodeDetector initialization error:', e);
          }
        }
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setHasCamera(false);
      setErrorMsg('Não foi possível acessar a câmera. Verifique as permissões de vídeo do dispositivo.');
    }
  };

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 font-semibold text-lg text-white">
            <Camera className="w-5 h-5 text-blue-400" />
            <span>Leitor de Código de Barras</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Area */}
        <div className="relative w-full h-64 bg-black flex items-center justify-center overflow-hidden">
          {hasCamera ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Laser Line & Frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-4/5 h-36 border-2 border-blue-500 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
                  <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse" />
                </div>
              </div>
              <p className="absolute bottom-2 text-xs text-white/80 bg-black/60 px-3 py-1 rounded-full">
                Aponte o código de barras para o centro
              </p>
            </>
          ) : (
            <div className="p-6 text-center text-slate-400 flex flex-col items-center">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
              <p className="text-sm font-medium text-slate-300 mb-1">Câmera Indisponível</p>
              <p className="text-xs text-slate-500">{errorMsg || 'Câmera não detectada.'}</p>
            </div>
          )}
        </div>

        {/* Manual Barcode Input Fallback */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/90">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <label className="block text-xs font-medium text-slate-400">
              Ou digite o código de barras manualmente:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                placeholder="Ex: 7891000100101"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition"
              >
                Adicionar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
