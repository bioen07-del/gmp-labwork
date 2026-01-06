import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

type ReportType = 'bank_passport' | 'container_list' | 'qc_summary' | 'inventory';

const reportTypes: { type: ReportType; label: string; description: string }[] = [
  { type: 'bank_passport', label: 'Паспорт банка', description: 'Генерация паспорта для выбранного банка клеток' },
  { type: 'container_list', label: 'Список контейнеров', description: 'Реестр всех активных контейнеров' },
  { type: 'qc_summary', label: 'Сводка QC', description: 'Результаты контроля качества за период' },
  { type: 'inventory', label: 'Инвентаризация', description: 'Остатки реагентов и расходников' },
];

export function ReportsPage() {
  const [loading, setLoading] = useState<ReportType | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const generateReport = async (type: ReportType) => {
    setLoading(type);
    setMessage(null);

    try {
      const doc = new jsPDF();
      const now = format(new Date(), 'dd.MM.yyyy HH:mm');

      switch (type) {
        case 'bank_passport': {
          const { data: banks } = await supabase.from('bank_batches').select('*').limit(10);
          doc.setFontSize(18);
          doc.text('REESTR BANKOV KLETOK', 105, 20, { align: 'center' });
          doc.setFontSize(10);
          doc.text(`Data: ${now}`, 20, 35);
          
          let y = 50;
          (banks || []).forEach((bank, idx) => {
            doc.text(`${idx + 1}. ${bank.bank_code} - ${bank.bank_type} - ${bank.status}`, 20, y);
            y += 8;
          });
          doc.save('banks_report.pdf');
          setMessage('Отчет по банкам сгенерирован');
          break;
        }

        case 'container_list': {
          const { data: containers } = await supabase.from('containers').select('*').eq('archived', false).limit(50);
          doc.setFontSize(18);
          doc.text('SPISOK KONTEYNEROV', 105, 20, { align: 'center' });
          doc.setFontSize(10);
          doc.text(`Data: ${now}`, 20, 35);
          doc.text(`Vsego: ${containers?.length || 0}`, 20, 42);
          
          let y = 55;
          (containers || []).forEach((c, idx) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(`${idx + 1}. ${c.container_code} - ${c.status}`, 20, y);
            y += 6;
          });
          doc.save('containers_report.pdf');
          setMessage('Отчет по контейнерам сгенерирован');
          break;
        }

        case 'qc_summary': {
          const { data: results } = await supabase.from('qc_results').select('*, test_definition:qc_test_definitions(*)').limit(30);
          doc.setFontSize(18);
          doc.text('SVODKA QC', 105, 20, { align: 'center' });
          doc.setFontSize(10);
          doc.text(`Data: ${now}`, 20, 35);
          
          const passed = results?.filter(r => r.status === 'Pass').length || 0;
          const failed = results?.filter(r => r.status === 'Fail').length || 0;
          doc.text(`Projdeno: ${passed}, Ne projdeno: ${failed}`, 20, 45);
          
          let y = 60;
          (results || []).forEach((r, idx) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(`${idx + 1}. ${r.test_definition?.code || 'Test'}: ${r.status === 'Pass' ? 'Projden' : r.status === 'Fail' ? 'Ne projden' : 'Ozhidaet'}`, 20, y);
            y += 6;
          });
          doc.save('qc_report.pdf');
          setMessage('Отчет QC сгенерирован');
          break;
        }

        case 'inventory': {
          const { data: reagents } = await supabase.from('reagent_batches').select('*, reagent_definition:reagent_definitions(*)').limit(30);
          doc.setFontSize(18);
          doc.text('INVENTARIZACIYA', 105, 20, { align: 'center' });
          doc.setFontSize(10);
          doc.text(`Data: ${now}`, 20, 35);
          
          let y = 50;
          doc.text('Reagenty:', 20, y); y += 8;
          (reagents || []).forEach((r, idx) => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(`${idx + 1}. ${r.reagent_definition?.name_ru || r.batch_code}: ${r.qty_on_hand} ${r.unit}`, 25, y);
            y += 6;
          });
          doc.save('inventory_report.pdf');
          setMessage('Отчет инвентаризации сгенерирован');
          break;
        }
      }
    } catch (err) {
      setMessage('Ошибка генерации отчета');
    }

    setLoading(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Отчеты</h1>

      {message && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map(report => (
          <div
            key={report.type}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <FileText size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 dark:text-white">{report.label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{report.description}</p>
                <button
                  onClick={() => generateReport(report.type)}
                  disabled={loading !== null}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {loading === report.type ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Download size={16} />
                  )}
                  Скачать PDF
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
