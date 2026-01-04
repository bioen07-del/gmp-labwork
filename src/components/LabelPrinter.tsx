import React, { useRef, useEffect, useState } from 'react';
// @ts-ignore
import bwipjs from 'bwip-js';
import { X, Printer } from 'lucide-react';

type LabelType = 'container' | 'cryovial' | 'release';

interface LabelData {
  code: string;
  type?: string;
  date?: string;
  info?: string;
  passage?: number;
  cells?: string;
  volume?: string;
}

interface LabelPrinterProps {
  isOpen: boolean;
  onClose: () => void;
  labelType: LabelType;
  data: LabelData;
}

const labelConfig: Record<LabelType, { title: string; width: number; height: number }> = {
  container: { title: 'Этикетка контейнера', width: 50, height: 25 },
  cryovial: { title: 'Этикетка криовиалы', width: 25, height: 10 },
  release: { title: 'Этикетка выдачи', width: 70, height: 35 },
};

export function LabelPrinter({ isOpen, onClose, labelType, data }: LabelPrinterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && canvasRef.current && data.code) {
      try {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: 'datamatrix',
          text: data.code,
          scale: 3,
          height: 10,
          width: 10,
          includetext: false,
        });
        setError(null);
      } catch (e: any) {
        setError(e.message);
      }
    }
  }, [isOpen, data.code]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const config = labelConfig[labelType];

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-label, .print-label * { visibility: visible; }
          .print-label { 
            position: absolute; left: 0; top: 0; 
            width: ${config.width}mm; height: ${config.height}mm;
            padding: 2mm; box-sizing: border-box;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
          <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{config.title}</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="p-4">
            {/* Preview */}
            <div className="print-label border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 mb-4 bg-white">
              <div className="flex gap-3">
                <canvas ref={canvasRef} className="flex-shrink-0" />
                <div className="flex-1 text-xs text-gray-800">
                  <div className="font-bold text-sm mb-1">{data.code}</div>
                  {data.type && <div>Тип: {data.type}</div>}
                  {data.passage !== undefined && <div>P{data.passage}</div>}
                  {data.cells && <div>{data.cells}</div>}
                  {data.volume && <div>V: {data.volume}</div>}
                  {data.date && <div>{data.date}</div>}
                  {data.info && <div className="text-gray-600">{data.info}</div>}
                </div>
              </div>
            </div>

            {error && <div className="text-red-500 text-sm mb-4">Ошибка: {error}</div>}

            <div className="flex gap-2 justify-end no-print">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                Отмена
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Printer size={18} />
                Печать
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
