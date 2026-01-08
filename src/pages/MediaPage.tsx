import React, { useEffect, useState } from 'react';
import { supabase, MediaDefinition } from '@/lib/supabase';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { LabelPrinter } from '@/components/LabelPrinter';
import { Printer, Plus, Beaker, FlaskConical } from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';

interface MediaBatch {
  id: number;
  batch_code: string;
  definition_id: number | null;
  prepared_by: string | null;
  prepared_at: string;
  expiry_at: string;
  status: string;
  qty_prepared: number;
  unit: string;
  notes: string | null;
  archived: boolean;
  definition?: MediaDefinition;
}

const statuses = [
  { value: 'Активна', label: 'Активна' },
  { value: 'Истекла', label: 'Истекла' },
  { value: 'Карантин', label: 'Карантин' },
  { value: 'Заблокирована', label: 'Заблокирована' },
  { value: 'Израсходована', label: 'Израсходована' },
];

const statusColors: Record<string, string> = {
  'Активна': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Истекла': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'Карантин': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Заблокирована': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'Израсходована': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export function MediaPage() {
  const [batches, setBatches] = useState<MediaBatch[]>([]);
  const [definitions, setDefinitions] = useState<MediaDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'batches' | 'definitions'>('batches');
  
  // Batch modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<MediaBatch | null>(null);
  const [batchForm, setBatchForm] = useState({
    batch_code: '', definition_id: '', expiry_at: '', status: 'Активна', qty_prepared: '', unit: 'мл', notes: ''
  });
  
  // Definition modal
  const [defModalOpen, setDefModalOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<MediaDefinition | null>(null);
  const [defForm, setDefForm] = useState({
    code: '', name_ru: '', base_media: '', storage_temp: '', shelf_life_days: '', notes: ''
  });
  
  // Label printer
  const [labelOpen, setLabelOpen] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const [batchRes, defRes] = await Promise.all([
      supabase.from('media_batches').select('*, definition:media_definitions(*)').order('expiry_at', { ascending: true }),
      supabase.from('media_definitions').select('*').eq('archived', false).order('code'),
    ]);
    
    if (batchRes.error) setError(batchRes.error.message);
    else setBatches((batchRes.data || []).filter(b => !b.archived));
    
    setDefinitions(defRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // === BATCH HANDLERS ===
  const openAddBatch = () => {
    setEditingBatch(null);
    const code = `MED-${format(new Date(), 'yyyyMMdd')}-${String(batches.length + 1).padStart(3, '0')}`;
    setBatchForm({ batch_code: code, definition_id: '', expiry_at: '', status: 'Активна', qty_prepared: '', unit: 'мл', notes: '' });
    setBatchModalOpen(true);
  };

  const openEditBatch = (item: MediaBatch) => {
    setEditingBatch(item);
    setBatchForm({
      batch_code: item.batch_code,
      definition_id: item.definition_id?.toString() || '',
      expiry_at: item.expiry_at?.split('T')[0] || '',
      status: item.status,
      qty_prepared: item.qty_prepared?.toString() || '',
      unit: item.unit || 'мл',
      notes: item.notes || '',
    });
    setBatchModalOpen(true);
  };

  const handleSaveBatch = async () => {
    const payload = {
      batch_code: batchForm.batch_code,
      definition_id: batchForm.definition_id ? parseInt(batchForm.definition_id) : null,
      expiry_at: batchForm.expiry_at,
      status: batchForm.status,
      qty_prepared: batchForm.qty_prepared ? parseFloat(batchForm.qty_prepared) : 0,
      unit: batchForm.unit,
      notes: batchForm.notes || null,
      prepared_at: new Date().toISOString(),
    };

    if (editingBatch) {
      await supabase.from('media_batches').update(payload).eq('id', editingBatch.id);
    } else {
      await supabase.from('media_batches').insert(payload);
    }
    setBatchModalOpen(false);
    load();
  };

  const handleArchiveBatch = async (item: MediaBatch) => {
    await supabase.from('media_batches').update({ archived: true }).eq('id', item.id);
    load();
  };

  // === DEFINITION HANDLERS ===
  const openAddDef = () => {
    setEditingDef(null);
    setDefForm({ code: '', name_ru: '', base_media: '', storage_temp: '', shelf_life_days: '', notes: '' });
    setDefModalOpen(true);
  };

  const openEditDef = (item: MediaDefinition) => {
    setEditingDef(item);
    setDefForm({
      code: item.code,
      name_ru: item.name_ru,
      base_media: item.base_media || '',
      storage_temp: item.storage_temp || '',
      shelf_life_days: item.shelf_life_days?.toString() || '',
      notes: item.notes || '',
    });
    setDefModalOpen(true);
  };

  const handleSaveDef = async () => {
    const payload = {
      code: defForm.code,
      name_ru: defForm.name_ru,
      base_media: defForm.base_media || null,
      storage_temp: defForm.storage_temp || null,
      shelf_life_days: defForm.shelf_life_days ? parseInt(defForm.shelf_life_days) : null,
      notes: defForm.notes || null,
    };

    if (editingDef) {
      await supabase.from('media_definitions').update(payload).eq('id', editingDef.id);
    } else {
      await supabase.from('media_definitions').insert(payload);
    }
    setDefModalOpen(false);
    load();
  };

  const handleArchiveDef = async (item: MediaDefinition) => {
    await supabase.from('media_definitions').update({ archived: true }).eq('id', item.id);
    load();
  };

  // === PRINT ===
  const printLabel = (batch: MediaBatch) => {
    setLabelData({
      code: batch.batch_code,
      type: batch.definition?.name_ru || 'Среда',
      date: batch.expiry_at ? format(parseISO(batch.expiry_at), 'dd.MM.yyyy') : '',
      info: `${batch.qty_prepared} ${batch.unit}`,
    });
    setLabelOpen(true);
  };

  const isExpiringSoon = (date: string) => {
    const expiry = parseISO(date);
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return isBefore(expiry, weekLater);
  };

  const batchColumns = [
    { key: 'batch_code', label: 'Код партии' },
    { key: 'definition', label: 'Среда', render: (b: MediaBatch) => b.definition?.name_ru || '-' },
    { key: 'status', label: 'Статус', render: (b: MediaBatch) => (
      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[b.status] || ''}`}>{b.status}</span>
    )},
    { key: 'qty_prepared', label: 'Кол-во', render: (b: MediaBatch) => `${b.qty_prepared} ${b.unit}` },
    { key: 'expiry_at', label: 'Годен до', render: (b: MediaBatch) => {
      const formatted = b.expiry_at ? format(parseISO(b.expiry_at), 'dd.MM.yyyy') : '-';
      const expiring = b.expiry_at && isExpiringSoon(b.expiry_at);
      return <span className={expiring ? 'text-red-600 font-bold' : ''}>{formatted}</span>;
    }},
    { key: 'print', label: '', render: (b: MediaBatch) => (
      <button onClick={(e) => { e.stopPropagation(); printLabel(b); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
        <Printer size={16} className="text-blue-600" />
      </button>
    )},
  ];

  const defColumns = [
    { key: 'code', label: 'Код' },
    { key: 'name_ru', label: 'Название' },
    { key: 'base_media', label: 'Базовая среда', render: (d: MediaDefinition) => d.base_media || '-' },
    { key: 'storage_temp', label: 'Хранение', render: (d: MediaDefinition) => d.storage_temp || '-' },
    { key: 'shelf_life_days', label: 'Срок (дней)', render: (d: MediaDefinition) => d.shelf_life_days ?? '-' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Beaker className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Среды</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'batches', label: 'Партии', icon: FlaskConical },
          { key: 'definitions', label: 'Справочник сред', icon: Beaker },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 pb-2 px-1 border-b-2 transition ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'batches' && (
        <DataTable
          title="Партии сред (FEFO)"
          data={batches}
          loading={loading}
          error={error}
          columns={batchColumns}
          searchKeys={['batch_code']}
          onAdd={openAddBatch}
          onEdit={openEditBatch}
          onArchive={handleArchiveBatch}
          canEdit={true}
        />
      )}

      {activeTab === 'definitions' && (
        <DataTable
          title="Справочник сред"
          data={definitions}
          loading={loading}
          error={error}
          columns={defColumns}
          searchKeys={['code', 'name_ru']}
          onAdd={openAddDef}
          onEdit={openEditDef}
          onArchive={handleArchiveDef}
          canEdit={true}
        />
      )}

      {/* Batch Modal */}
      <Modal isOpen={batchModalOpen} onClose={() => setBatchModalOpen(false)} title={editingBatch ? 'Редактировать партию' : 'Новая партия'}>
        <div className="space-y-4">
          <FormField label="Код партии" required>
            <Input value={batchForm.batch_code} onChange={e => setBatchForm({ ...batchForm, batch_code: e.target.value })} />
          </FormField>
          <FormField label="Среда">
            <Select value={batchForm.definition_id} onChange={e => setBatchForm({ ...batchForm, definition_id: e.target.value })}>
              <option value="">-- Выберите --</option>
              {definitions.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name_ru}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Количество">
              <Input type="number" value={batchForm.qty_prepared} onChange={e => setBatchForm({ ...batchForm, qty_prepared: e.target.value })} />
            </FormField>
            <FormField label="Ед. изм.">
              <Select value={batchForm.unit} onChange={e => setBatchForm({ ...batchForm, unit: e.target.value })}>
                <option value="мл">мл</option>
                <option value="л">л</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Годен до" required>
            <Input type="date" value={batchForm.expiry_at} onChange={e => setBatchForm({ ...batchForm, expiry_at: e.target.value })} />
          </FormField>
          <FormField label="Статус">
            <Select value={batchForm.status} onChange={e => setBatchForm({ ...batchForm, status: e.target.value })}>
              {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Примечания">
            <textarea 
              value={batchForm.notes} 
              onChange={e => setBatchForm({ ...batchForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
            />
          </FormField>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setBatchModalOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveBatch}>Сохранить</Button>
          </div>
        </div>
      </Modal>

      {/* Definition Modal */}
      <Modal isOpen={defModalOpen} onClose={() => setDefModalOpen(false)} title={editingDef ? 'Редактировать среду' : 'Новая среда'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Код" required>
              <Input value={defForm.code} onChange={e => setDefForm({ ...defForm, code: e.target.value })} placeholder="DMEM-F12" />
            </FormField>
            <FormField label="Название" required>
              <Input value={defForm.name_ru} onChange={e => setDefForm({ ...defForm, name_ru: e.target.value })} placeholder="DMEM/F-12" />
            </FormField>
          </div>
          <FormField label="Базовая среда">
            <Input value={defForm.base_media} onChange={e => setDefForm({ ...defForm, base_media: e.target.value })} placeholder="DMEM" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Условия хранения">
              <Input value={defForm.storage_temp} onChange={e => setDefForm({ ...defForm, storage_temp: e.target.value })} placeholder="+2...+8°C" />
            </FormField>
            <FormField label="Срок годности (дней)">
              <Input type="number" value={defForm.shelf_life_days} onChange={e => setDefForm({ ...defForm, shelf_life_days: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Примечания">
            <textarea 
              value={defForm.notes} 
              onChange={e => setDefForm({ ...defForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
            />
          </FormField>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setDefModalOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveDef}>Сохранить</Button>
          </div>
        </div>
      </Modal>

      {/* Label Printer */}
      <LabelPrinter
        isOpen={labelOpen}
        onClose={() => setLabelOpen(false)}
        labelType="container"
        data={labelData || { code: '' }}
      />
    </div>
  );
}
