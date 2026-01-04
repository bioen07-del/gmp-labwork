import React, { useEffect, useState } from 'react';
import { supabase, Deviation, DeviationReason, Container, BankBatch } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { AlertTriangle, Link2 } from 'lucide-react';

const statuses = ['Open', 'UnderReview', 'Closed'];
const severities = ['Minor', 'Major', 'Critical'];
const statusColors: Record<string, string> = {
  Open: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  UnderReview: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Closed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};
const severityColors: Record<string, string> = {
  Minor: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Major: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function DeviationsPage() {
  const { canEdit, user } = useAuth();
  const [data, setData] = useState<Deviation[]>([]);
  const [reasons, setReasons] = useState<DeviationReason[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [banks, setBanks] = useState<BankBatch[]>([]);
  const [links, setLinks] = useState<Record<number, {type: string, id: number}[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deviation | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<{type: string, id: number}[]>([]);
  const [form, setForm] = useState({
    deviation_code: '', reason_id: '', description: '', status: 'Open', severity: 'Minor', disposition: ''
  });

  const load = async () => {
    setLoading(true);
    const [devs, rsn, cont, bnk, lnk] = await Promise.all([
      supabase.from('deviations').select('*, reason:deviation_reasons(*)').order('id', { ascending: false }),
      supabase.from('deviation_reasons').select('*'),
      supabase.from('containers').select('*').eq('archived', false),
      supabase.from('bank_batches').select('*'),
      supabase.from('deviation_links').select('*')
    ]);
    if (devs.error) setError(devs.error.message);
    else setData(devs.data || []);
    setReasons(rsn.data || []);
    setContainers(cont.data || []);
    setBanks(bnk.data || []);
    
    const linkMap: Record<number, {type: string, id: number}[]> = {};
    (lnk.data || []).forEach(l => {
      if (!linkMap[l.deviation_id]) linkMap[l.deviation_id] = [];
      linkMap[l.deviation_id].push({ type: l.entity_type, id: l.entity_id });
    });
    setLinks(linkMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setSelectedLinks([]);
    setForm({ deviation_code: '', reason_id: '', description: '', status: 'Open', severity: 'Minor', disposition: '' });
    setModalOpen(true);
  };

  const openEdit = (item: Deviation) => {
    setEditing(item);
    setSelectedLinks(links[item.id] || []);
    setForm({
      deviation_code: item.deviation_code,
      reason_id: item.reason_id?.toString() || '',
      description: item.description || '',
      status: item.status,
      severity: item.severity,
      disposition: item.disposition || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      deviation_code: form.deviation_code,
      reason_id: form.reason_id ? parseInt(form.reason_id) : null,
      description: form.description || null,
      status: form.status,
      severity: form.severity,
      disposition: form.disposition || null,
      closed_at: form.status === 'Closed' ? new Date().toISOString() : null,
      closed_by: form.status === 'Closed' ? user?.id : null
    };

    if (editing) {
      await supabase.from('deviations').update(payload).eq('id', editing.id);
      await supabase.from('deviation_links').delete().eq('deviation_id', editing.id);
      if (selectedLinks.length > 0) {
        const linkRows = selectedLinks.map(l => ({ deviation_id: editing.id, entity_type: l.type, entity_id: l.id }));
        await supabase.from('deviation_links').insert(linkRows);
      }
    } else {
      const { data: newDev } = await supabase.from('deviations').insert(payload).select().single();
      if (newDev && selectedLinks.length > 0) {
        const linkRows = selectedLinks.map(l => ({ deviation_id: newDev.id, entity_type: l.type, entity_id: l.id }));
        await supabase.from('deviation_links').insert(linkRows);
      }
    }
    setModalOpen(false);
    load();
  };

  const handleArchive = async (item: Deviation) => {
    const newStatus = item.status === 'Closed' ? 'Open' : 'Closed';
    await supabase.from('deviations').update({ 
      status: newStatus,
      closed_at: newStatus === 'Closed' ? new Date().toISOString() : null,
      closed_by: newStatus === 'Closed' ? user?.id : null
    }).eq('id', item.id);
    load();
  };

  const addLink = (type: string, id: number) => {
    if (!selectedLinks.find(l => l.type === type && l.id === id)) {
      setSelectedLinks([...selectedLinks, { type, id }]);
    }
  };

  const removeLink = (type: string, id: number) => {
    setSelectedLinks(selectedLinks.filter(l => !(l.type === type && l.id === id)));
  };

  const getLinkLabel = (type: string, id: number) => {
    if (type === 'container') return containers.find(c => c.id === id)?.container_code || `Container #${id}`;
    if (type === 'bank_batch') return banks.find(b => b.id === id)?.bank_code || `Bank #${id}`;
    return `${type} #${id}`;
  };

  const columns = [
    { key: 'deviation_code', label: 'Код' },
    { key: 'reason', label: 'Причина', render: (d: Deviation) => d.reason?.name_ru || '-' },
    { key: 'severity', label: 'Критичность', render: (d: Deviation) => <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors[d.severity]}`}>{d.severity}</span> },
    { key: 'status', label: 'Статус', render: (d: Deviation) => <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[d.status]}`}>{d.status}</span> },
    { key: 'links', label: 'Связи', render: (d: Deviation) => {
      const devLinks = links[d.id] || [];
      return devLinks.length > 0 ? <span className="flex items-center gap-1"><Link2 size={14} /> {devLinks.length}</span> : '-';
    }},
    { key: 'created_at', label: 'Создано', render: (d: Deviation) => new Date(d.created_at).toLocaleDateString('ru-RU') },
  ];

  return (
    <>
      <DataTable
        title="Отклонения"
        data={data}
        loading={loading}
        error={error}
        columns={columns}
        searchKeys={['deviation_code', 'description']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
        canEdit={canEdit()}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактирование отклонения' : 'Новое отклонение'}>
        <FormField label="Код отклонения" required>
          <Input value={form.deviation_code} onChange={e => setForm({ ...form, deviation_code: e.target.value })} placeholder="DEV-001" />
        </FormField>
        <FormField label="Причина">
          <Select value={form.reason_id} onChange={e => setForm({ ...form, reason_id: e.target.value })}>
            <option value="">-- Выберите --</option>
            {reasons.map(r => <option key={r.id} value={r.id}>{r.code} - {r.name_ru}</option>)}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Критичность" required>
            <Select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
              {severities.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Статус" required>
            <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Описание">
          <textarea 
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={3}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </FormField>
        <FormField label="Решение QP (disposition)">
          <textarea 
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={2}
            value={form.disposition}
            onChange={e => setForm({ ...form, disposition: e.target.value })}
          />
        </FormField>

        <FormField label="Связанные объекты">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select className="flex-1" onChange={e => { if (e.target.value) addLink('container', parseInt(e.target.value)); e.target.value = ''; }}>
                <option value="">+ Контейнер</option>
                {containers.map(c => <option key={c.id} value={c.id}>{c.container_code}</option>)}
              </Select>
              <Select className="flex-1" onChange={e => { if (e.target.value) addLink('bank_batch', parseInt(e.target.value)); e.target.value = ''; }}>
                <option value="">+ Банк</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.bank_code}</option>)}
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedLinks.map((l, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                  {getLinkLabel(l.type, l.id)}
                  <button onClick={() => removeLink(l.type, l.id)} className="text-red-500 hover:text-red-700">x</button>
                </span>
              ))}
            </div>
          </div>
        </FormField>

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </div>
      </Modal>
    </>
  );
}
