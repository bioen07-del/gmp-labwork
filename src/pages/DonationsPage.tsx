import React, { useEffect, useState } from 'react';
import { supabase, Donation, Donor } from '@/lib/supabase';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';

const materialTypes = ['blood', 'bone_marrow', 'cord_blood', 'tissue', 'other'];
const conditions = ['good', 'acceptable', 'poor'];

export function DonationsPage() {
  const [data, setData] = useState<Donation[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Donation | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    donor_id: '', donation_datetime: '', material_type: 'blood',
    received_condition: 'good', transport_temperature_c: '', notes: ''
  });

  const load = async () => {
    setLoading(true);
    const [don, dnr] = await Promise.all([
      supabase.from('donations').select('*, donor:donors(*)').order('id', { ascending: false }),
      supabase.from('donors').select('*').eq('archived', false)
    ]);
    if (don.error) setError(don.error.message);
    else setData(don.data || []);
    setDonors(dnr.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setGeneratedCode(null);
    const now = new Date().toISOString().slice(0, 16);
    setForm({ donor_id: '', donation_datetime: now, material_type: 'blood', received_condition: 'good', transport_temperature_c: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (item: Donation) => {
    setEditing(item);
    setGeneratedCode(null);
    setForm({
      donor_id: item.donor_id?.toString() || '',
      donation_datetime: item.donation_datetime?.slice(0, 16) || '',
      material_type: item.material_type,
      received_condition: item.received_condition || 'good',
      transport_temperature_c: item.transport_temperature_c?.toString() || '',
      notes: item.notes || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.donor_id) {
      setError('Выберите донора');
      return;
    }
    
    setSaving(true);
    
    const payload = {
      donor_id: parseInt(form.donor_id),
      donation_datetime: form.donation_datetime,
      material_type: form.material_type,
      received_condition: form.received_condition,
      transport_temperature_c: form.transport_temperature_c ? parseFloat(form.transport_temperature_c) : null,
      notes: form.notes || null
    };
    
    if (editing) {
      await supabase.from('donations').update(payload).eq('id', editing.id);
      setModalOpen(false);
    } else {
      // Генерируем код автоматически
      const { data: codeData } = await supabase.rpc('generate_donation_code', { p_donor_id: parseInt(form.donor_id) });
      const newCode = codeData as string;
      
      const { error } = await supabase.from('donations').insert({ ...payload, donation_code: newCode });
      
      if (error) {
        setError(error.message);
      } else {
        setGeneratedCode(newCode);
      }
    }
    load();
    setSaving(false);
  };

  const handleArchive = async (item: Donation) => {
    await supabase.from('donations').update({ archived: !item.archived }).eq('id', item.id);
    load();
  };

  const getDonorName = (d: Donation) => d.donor?.full_name || d.donor?.donor_code || '-';

  return (
    <>
      <DataTable
        title="Донации"
        data={data}
        loading={loading}
        error={error}
        columns={[
          { key: 'donation_code', label: 'Код' },
          { key: 'donor', label: 'Донор', render: getDonorName },
          { key: 'donation_datetime', label: 'Дата/время', render: (i) => new Date(i.donation_datetime).toLocaleString('ru-RU') },
          { key: 'material_type', label: 'Тип материала' },
          { key: 'received_condition', label: 'Состояние' },
        ]}
        searchKeys={['donation_code', 'material_type']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактирование донации' : 'Новая донация'}>
        {generatedCode ? (
          <div className="text-center py-4">
            <div className="text-green-600 dark:text-green-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-800 dark:text-white mb-2">Донация создана</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{generatedCode}</p>
            <Button className="mt-4" onClick={() => setModalOpen(false)}>Закрыть</Button>
          </div>
        ) : (
          <>
            {editing && (
              <FormField label="Код донации">
                <Input value={editing.donation_code} disabled className="bg-gray-100 dark:bg-gray-700" />
              </FormField>
            )}
            {!editing && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                Код будет сгенерирован автоматически: <strong>DON-{'{код_донора}'}-XXX</strong>
              </p>
            )}
            <FormField label="Донор" required>
              <Select value={form.donor_id} onChange={e => setForm({ ...form, donor_id: e.target.value })} disabled={!!editing}>
                <option value="">-- Выберите донора --</option>
                {donors.map(d => <option key={d.id} value={d.id}>{d.donor_code}</option>)}
              </Select>
            </FormField>
            <FormField label="Дата и время" required>
              <Input type="datetime-local" value={form.donation_datetime} onChange={e => setForm({ ...form, donation_datetime: e.target.value })} />
            </FormField>
            <FormField label="Тип материала" required>
              <Select value={form.material_type} onChange={e => setForm({ ...form, material_type: e.target.value })}>
                {materialTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Состояние при получении">
              <Select value={form.received_condition} onChange={e => setForm({ ...form, received_condition: e.target.value })}>
                {conditions.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Температура транспортировки (°C)">
              <Input type="number" step="0.1" value={form.transport_temperature_c} onChange={e => setForm({ ...form, transport_temperature_c: e.target.value })} />
            </FormField>
            <FormField label="Примечания">
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </FormField>
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
