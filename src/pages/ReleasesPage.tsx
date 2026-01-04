import React, { useEffect, useState } from 'react';
import { supabase, Release, Container, QcResult } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const releaseTypes = ['FROZEN', 'FRESH'];
const statuses = ['Draft', 'OnReview', 'Released', 'Rejected'];
const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  OnReview: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Released: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function ReleasesPage() {
  const { canEdit, user } = useAuth();
  const [data, setData] = useState<Release[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [qcResults, setQcResults] = useState<Record<number, QcResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Release | null>(null);
  const [selectedContainers, setSelectedContainers] = useState<number[]>([]);
  const [form, setForm] = useState({
    release_code: '', release_type: 'FROZEN', customer_name: '', status: 'Draft',
    conc_cells_ml: '', volume_ml: '', total_cells: '', viability_percent: '', passage_at_release: ''
  });

  const load = async () => {
    setLoading(true);
    const [releases, cont] = await Promise.all([
      supabase.from('releases').select('*').order('id', { ascending: false }),
      supabase.from('containers').select('*').in('status', ['Active', 'Frozen', 'Released']).eq('archived', false)
    ]);
    if (releases.error) setError(releases.error.message);
    else {
      setData(releases.data || []);
      const qcMap: Record<number, QcResult[]> = {};
      for (const rel of releases.data || []) {
        const { data: qc } = await supabase.from('qc_results')
          .select('*, test_definition:qc_test_definitions(*)')
          .eq('entity_type', 'release')
          .eq('entity_id', rel.id);
        qcMap[rel.id] = qc || [];
      }
      setQcResults(qcMap);
    }
    setContainers(cont.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setSelectedContainers([]);
    setForm({ release_code: '', release_type: 'FROZEN', customer_name: '', status: 'Draft', conc_cells_ml: '', volume_ml: '', total_cells: '', viability_percent: '', passage_at_release: '' });
    setModalOpen(true);
  };

  const openEdit = (item: Release) => {
    setEditing(item);
    setForm({
      release_code: item.release_code,
      release_type: item.release_type,
      customer_name: item.customer_name || '',
      status: item.status,
      conc_cells_ml: item.conc_cells_ml?.toString() || '',
      volume_ml: item.volume_ml?.toString() || '',
      total_cells: item.total_cells?.toString() || '',
      viability_percent: item.viability_percent?.toString() || '',
      passage_at_release: item.passage_at_release?.toString() || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      release_code: form.release_code,
      release_type: form.release_type,
      customer_name: form.customer_name || null,
      status: form.status,
      conc_cells_ml: form.conc_cells_ml ? parseFloat(form.conc_cells_ml) : null,
      volume_ml: form.volume_ml ? parseFloat(form.volume_ml) : null,
      total_cells: form.total_cells ? parseFloat(form.total_cells) : null,
      viability_percent: form.viability_percent ? parseFloat(form.viability_percent) : null,
      passage_at_release: form.passage_at_release ? parseInt(form.passage_at_release) : null,
      released_by: form.status === 'Released' ? user?.id : null,
      released_at: form.status === 'Released' ? new Date().toISOString() : null
    };
    
    if (editing) {
      await supabase.from('releases').update(payload).eq('id', editing.id);
    } else {
      const { data: newRel } = await supabase.from('releases').insert(payload).select().single();
      if (newRel && selectedContainers.length > 0) {
        const items = selectedContainers.map(cid => ({ release_id: newRel.id, container_id: cid }));
        await supabase.from('release_items').insert(items);
      }
    }
    setModalOpen(false);
    load();
  };

  const handleArchive = async (item: Release) => {
    const newStatus = item.status === 'Rejected' ? 'Draft' : 'Rejected';
    await supabase.from('releases').update({ status: newStatus }).eq('id', item.id);
    load();
  };

  const toggleContainer = (id: number) => {
    setSelectedContainers(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const getQcStatus = (relId: number) => {
    const results = qcResults[relId] || [];
    if (results.length === 0) return 'none';
    if (results.some(r => r.status === 'Fail')) return 'fail';
    if (results.some(r => r.status === 'Pending')) return 'pending';
    return 'pass';
  };

  const columns = [
    { key: 'release_code', label: 'Код выдачи' },
    { key: 'release_type', label: 'Тип' },
    { key: 'customer_name', label: 'Заказчик', render: (r: Release) => r.customer_name || '-' },
    { key: 'status', label: 'Статус', render: (r: Release) => <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[r.status]}`}>{r.status}</span> },
    { key: 'viability_percent', label: 'Жизн. %', render: (r: Release) => r.viability_percent ? `${r.viability_percent}%` : '-' },
    { key: 'qc', label: 'QC', render: (r: Release) => {
      const status = getQcStatus(r.id);
      if (status === 'pass') return <CheckCircle size={18} className="text-green-600" />;
      if (status === 'fail') return <XCircle size={18} className="text-red-600" />;
      if (status === 'pending') return <Clock size={18} className="text-yellow-600" />;
      return <span className="text-gray-400">-</span>;
    }},
    { key: 'released_at', label: 'Дата выдачи', render: (r: Release) => r.released_at ? new Date(r.released_at).toLocaleDateString('ru-RU') : '-' },
  ];

  return (
    <>
      <DataTable
        title="Выдача продукта"
        data={data}
        loading={loading}
        error={error}
        columns={columns}
        searchKeys={['release_code', 'customer_name']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
        canEdit={canEdit()}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактирование выдачи' : 'Новая выдача'}>
        <FormField label="Код выдачи" required>
          <Input value={form.release_code} onChange={e => setForm({ ...form, release_code: e.target.value })} placeholder="REL-001" />
        </FormField>
        <FormField label="Тип выдачи" required>
          <Select value={form.release_type} onChange={e => setForm({ ...form, release_type: e.target.value })}>
            {releaseTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormField>
        <FormField label="Заказчик">
          <Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
        </FormField>
        <FormField label="Статус" required>
          <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Конц. клеток/мл">
            <Input type="number" value={form.conc_cells_ml} onChange={e => setForm({ ...form, conc_cells_ml: e.target.value })} />
          </FormField>
          <FormField label="Объем (мл)">
            <Input type="number" value={form.volume_ml} onChange={e => setForm({ ...form, volume_ml: e.target.value })} />
          </FormField>
          <FormField label="Всего клеток">
            <Input type="number" value={form.total_cells} onChange={e => setForm({ ...form, total_cells: e.target.value })} />
          </FormField>
          <FormField label="Жизнеспособность %">
            <Input type="number" min="0" max="100" value={form.viability_percent} onChange={e => setForm({ ...form, viability_percent: e.target.value })} />
          </FormField>
        </div>
        <FormField label="Пассаж при выдаче">
          <Input type="number" value={form.passage_at_release} onChange={e => setForm({ ...form, passage_at_release: e.target.value })} />
        </FormField>

        {!editing && (
          <FormField label="Контейнеры для выдачи">
            <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded p-2">
              {containers.length === 0 ? (
                <div className="text-gray-500 text-sm">Нет доступных контейнеров</div>
              ) : containers.map(c => (
                <label key={c.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={selectedContainers.includes(c.id)} onChange={() => toggleContainer(c.id)} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{c.container_code} ({c.status})</span>
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
    </>
  );
}
