import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, SwitchCamera } from 'lucide-react';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCamera, setCurrentCamera] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      Html5Qrcode.getCameras()
        .then(devices => {
          if (devices.length > 0) {
            setCameras(devices);
            startScanner(devices[0].id);
          } else {
            setError('Камеры не найдены');
          }
        })
        .catch(err => setError('Нет доступа к камере: ' + err.message));
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async (cameraId: string) => {
    try {
      stopScanner();
      scannerRef.current = new Html5Qrcode('scanner-container');
      await scannerRef.current.start(
        cameraId,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
          onClose();
        },
        () => {}
      );
      setError(null);
    } catch (err: any) {
      setError('Ошибка запуска камеры: ' + err.message);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
  };

  const switchCamera = () => {
    const nextIdx = (currentCamera + 1) % cameras.length;
    setCurrentCamera(nextIdx);
    startScanner(cameras[nextIdx].id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Camera size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Сканер штрих-кодов</h2>
          </div>
          <button onClick={() => { stopScanner(); onClose(); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          <div
            id="scanner-container"
            ref={containerRef}
            className="w-full aspect-square bg-black rounded overflow-hidden"
          />

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Наведите камеру на штрих-код
            </span>
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
              >
                <SwitchCamera size={16} />
                Сменить камеру
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
