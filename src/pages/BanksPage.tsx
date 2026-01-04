import React, { useEffect, useState } from 'react';
import { supabase, BankBatch, ContainerType, Container, QcResult } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { LabelPrinter } from '@/components/LabelPrinter';
import { FileText, Plus, X, CheckCircle, XCircle, Clock, Printer } from 'lucide-react';
import jsPDF from 'jspdf';

const bankTypes = ['MCB', 'WCB'];
const statuses = ['Quarantine', 'OnReview', 'Released', 'Hold', 'Blocked', 'Depleted'];
const statusColors: Record<string, string> = {
  Quarantine: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  OnReview: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Released: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Hold: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Depleted: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export function BanksPage() {
  const { canEdit } = useAuth();
  const [data, setData] = useState<BankBatch[]>([]);
  const [containerTypes, setContainerTypes] = useState<ContainerType[]>([]);
  const [frozenContainers, setFrozenContainers] = useState<Container[]>([]);
  const [qcResults, setQcResults] = useState<Record<number, QcResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankBatch | null>(null);
  const [selectedContainers, setSelectedContainers] = useState<number[]>([]);
  const [form, setForm] = useState({
    bank_code: '', bank_type: 'MCB', status: 'Quarantine', passage_at_freeze: '',
    vial_type_id: '', cells_per_vial: '', source_bank_id: ''
  });
  const [mcbBanks, setMcbBanks] = useState<BankBatch[]>([]);
  const [labelOpen, setLabelOpen] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);

  const printVialLabel = (bank: BankBatch) => {
    setLabelData({
      code: bank.bank_code,
      type: bank.bank_type,
      passage: bank.passage_at_freeze ?? undefined,
      cells: bank.cells_per_vial ? bank.cells_per_vial.toExponential(2) : undefined,
    });
    setLabelOpen(true);
  };

  const load = async () => {
    setLoading(true);
    const [banks, types, containers] = await Promise.all([
      supabase.from('bank_batches').select('*, vial_type:container_types(*)').order('id', { ascending: false }),
      supabase.from('container_types').select('*').eq('archived', false),
      supabase.from('containers').select('*').eq('status', 'Frozen').eq('archived', false)
    ]);
    if (banks.error) setError(banks.error.message);
    else {
      setData(banks.data || []);
      setMcbBanks((banks.data || []).filter(b => b.bank_type === 'MCB' && b.status === 'Released'));
      // Load QC results for each bank
      const qcMap: Record<number, QcResult[]> = {};
      for (const bank of banks.data || []) {
        const { data: qc } = await supabase.from('qc_results')
          .select('*, test_definition:qc_test_definitions(*)')
          .eq('entity_type', 'bank_batch')
          .eq('entity_id', bank.id);
        qcMap[bank.id] = qc || [];
      }
      setQcResults(qcMap);
    }
    setContainerTypes(types.data || []);
    setFrozenContainers(containers.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setSelectedContainers([]);
    setForm({ bank_code: '', bank_type: 'MCB', status: 'Quarantine', passage_at_freeze: '', vial_type_id: '', cells_per_vial: '', source_bank_id: '' });
    setModalOpen(true);
  };

  const openEdit = (item: BankBatch) => {
    setEditing(item);
    setForm({
      bank_code: item.bank_code,
      bank_type: item.bank_type,
      status: item.status,
      passage_at_freeze: item.passage_at_freeze?.toString() || '',
      vial_type_id: item.vial_type_id?.toString() || '',
      cells_per_vial: item.cells_per_vial?.toString() || '',
      source_bank_id: (item as any).source_bank_id?.toString() || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      bank_code: form.bank_code,
      bank_type: form.bank_type,
      status: form.status,
      passage_at_freeze: form.passage_at_freeze ? parseInt(form.passage_at_freeze) : null,
      vial_type_id: form.vial_type_id ? parseInt(form.vial_type_id) : null,
      cells_per_vial: form.cells_per_vial ? parseFloat(form.cells_per_vial) : null,
      source_bank_id: form.source_bank_id ? parseInt(form.source_bank_id) : null,
      qty_created: selectedContainers.length,
      qty_available: selectedContainers.length
    };
    
    if (editing) {
      await supabase.from('bank_batches').update(payload).eq('id', editing.id);
    } else {
      const { data: newBank } = await supabase.from('bank_batches').insert(payload).select().single();
      if (newBank && selectedContainers.length > 0) {
        const vials = selectedContainers.map(cid => ({ bank_batch_id: newBank.id, container_id: cid }));
        await supabase.from('bank_vials').insert(vials);
      }
    }
    setModalOpen(false);
    load();
  };

  const handleArchive = async (item: BankBatch) => {
    const newStatus = item.status === 'Depleted' ? 'Quarantine' : 'Depleted';
    await supabase.from('bank_batches').update({ status: newStatus }).eq('id', item.id);
    load();
  };

  const generatePDF = (bank: BankBatch) => {
    const doc = new jsPDF();
    const qc = qcResults[bank.id] || [];
    
    doc.setFontSize(18);
    doc.text('PASPORT BANKA KLETOK', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Kod banka: ${bank.bank_code}`, 20, 40);
    doc.text(`Tip: ${bank.bank_type}`, 20, 50);
    doc.text(`Status: ${bank.status}`, 20, 60);
    doc.text(`Passazh pri zamorozke: ${bank.passage_at_freeze || '-'}`, 20, 70);
    doc.text(`Tip vialy: ${bank.vial_type?.code || '-'}`, 20, 80);
    doc.text(`Kletok na vialu: ${bank.cells_per_vial?.toExponential(2) || '-'}`, 20, 90);
    doc.text(`Sozdano vial: ${bank.qty_created}`, 20, 100);
    doc.text(`Dostupno: ${bank.qty_available}`, 20, 110);
    
    doc.text('Rezultaty QC:', 20, 130);
    let y = 140;
    if (qc.length === 0) {
      doc.text('Net rezultatov QC', 30, y);
    } else {
      qc.forEach(r => {
        const status = r.status === 'Pass' ? '[PASS]' : r.status === 'Fail' ? '[FAIL]' : '[PENDING]';
        doc.text(`${r.test_definition?.code || 'Test'}: ${status} ${r.numeric_value ? `(${r.numeric_value})` : ''}`, 30, y);
        y += 10;
      });
    }
    
    doc.text(`Data generacii: ${new Date().toLocaleDateString('ru-RU')}`, 20, 270);
    doc.save(`bank_${bank.bank_code}.pdf`);
  };

  const toggleContainer = (id: number) => {
    setSelectedContainers(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const getQcStatus = (bankId: number) => {
    const results = qcResults[bankId] || [];
    if (results.length === 0) return 'none';
    if (results.some(r => r.status === 'Fail')) return 'fail';
    if (results.some(r => r.status === 'Pending')) return 'pending';
    return 'pass';
  };

  const columns = [
    { key: 'bank_code', label: 'Код банка' },
    { key: 'bank_type', label: 'Тип' },
    { key: 'status', label: 'Статус', render: (b: BankBatch) => <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[b.status]}`}>{b.status}</span> },
    { key: 'passage_at_freeze', label: 'Пассаж', render: (b: BankBatch) => b.passage_at_freeze ?? '-' },
    { key: 'qty_available', label: 'Доступно', render: (b: BankBatch) => `${b.qty_available}/${b.qty_created}` },
    { key: 'qc', label: 'QC', render: (b: BankBatch) => {
      const status = getQcStatus(b.id);
      if (status === 'pass') return <CheckCircle size={18} className="text-green-600" />;
      if (status === 'fail') return <XCircle size={18} className="text-red-600" />;
      if (status === 'pending') return <Clock size={18} className="text-yellow-600" />;
      return <span className="text-gray-400">-</span>;
    }},
    { key: 'pdf', label: '', render: (b: BankBatch) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); printVialLabel(b); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Печать этикетки">
          <Printer size={16} className="text-green-600" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); generatePDF(b); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Скачать паспорт">
          <FileText size={16} className="text-blue-600" />
        </button>
      </div>
    )},
  ];

  return (
    <>
      <DataTable
        title="Банки клеток (MCB/WCB)"
        data={data}
        loading={loading}
        error={error}
        columns={columns}
        searchKeys={['bank_code']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
        canEdit={canEdit()}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактирование банка' : 'Создание банка'}>
        <FormField label="Код банка" required>
          <Input value={form.bank_code} onChange={e => setForm({ ...form, bank_code: e.target.value })} placeholder="MCB-001" />
        </FormField>
        <FormField label="Тип банка" required>
          <Select value={form.bank_type} onChange={e => setForm({ ...form, bank_type: e.target.value })}>
            {bankTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormField>
        <FormField label="Статус" required>
          <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        <FormField label="Пассаж при заморозке">
          <Input type="number" value={form.passage_at_freeze} onChange={e => setForm({ ...form, passage_at_freeze: e.target.value })} />
        </FormField>
        <FormField label="Тип виалы">
          <Select value={form.vial_type_id} onChange={e => setForm({ ...form, vial_type_id: e.target.value })}>
            <option value="">-- Выберите --</option>
            {containerTypes.filter(t => t.category === 'tube').map(t => <option key={t.id} value={t.id}>{t.code}</option>)}
          </Select>
        </FormField>
        <FormField label="Клеток на виалу">
          <Input type="number" value={form.cells_per_vial} onChange={e => setForm({ ...form, cells_per_vial: e.target.value })} />
        </FormField>

        {form.bank_type === 'WCB' && (
          <FormField label="Исходный MCB банк">
            <Select value={form.source_bank_id} onChange={e => setForm({ ...form, source_bank_id: e.target.value })}>
              <option value="">-- Выберите MCB --</option>
              {mcbBanks.map(b => <option key={b.id} value={b.id}>{b.bank_code}</option>)}
            </Select>
          </FormField>
        )}

        {!editing && (
          <FormField label="Выберите замороженные контейнеры">
            <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded p-2">
              {frozenContainers.length === 0 ? (
                <div className="text-gray-500 text-sm">Нет замороженных контейнеров</div>
              ) : frozenContainers.map(c => (
                <label key={c.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={selectedContainers.includes(c.id)} onChange={() => toggleContainer(c.id)} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{c.container_code}</span>
                </label>
              ))}
            </div>
            <div className="text-sm text-gray-500 mt-1">Выбрано: {selectedContainers.length}</div>
          </FormField>
        )}

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </div>
      </Modal>

      {/* Label Printer */}
      <LabelPrinter
        isOpen={labelOpen}
        onClose={() => setLabelOpen(false)}
        labelType="cryovial"
        data={labelData || { code: '' }}
      />
    </>
  );
}
