import React, { useEffect, useState } from 'react';
import { supabase, Location } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';

const locationTypes = ['building', 'room', 'zone', 'storage', 'shelf'];

export function LocationsPage() {
  const { canEdit } = useAuth();
  const [data, setData] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState({ location_code: '', name_ru: '', type: 'room', parent_id: '' });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('locations').select('*').order('id');
    if (error) setError(error.message);
    else setData(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ location_code: '', name_ru: '', type: 'room', parent_id: '' });
    setModalOpen(true);
  };

  const openEdit = (item: Location) => {
    setEditing(item);
    setForm({
      location_code: item.location_code,
      name_ru: item.name_ru,
      type: item.type,
      parent_id: item.parent_id?.toString() || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      location_code: form.location_code,
      name_ru: form.name_ru,
      type: form.type,
      parent_id: form.parent_id ? parseInt(form.parent_id) : null
    };
    if (editing) {
      await supabase.from('locations').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('locations').insert(payload);
    }
    setModalOpen(false);
    load();
  };

  const handleArchive = async (item: Location) => {
    await supabase.from('locations').update({ archived: !item.archived }).eq('id', item.id);
    load();
  };

  const getParentName = (id: number | null) => data.find(l => l.id === id)?.name_ru || '-';

  return (
    <>
      <DataTable
        title="Локации"
        data={data}
        loading={loading}
        error={error}
        columns={[
          { key: 'location_code', label: 'Код' },
          { key: 'name_ru', label: 'Название' },
          { key: 'type', label: 'Тип' },
          { key: 'parent_id', label: 'Родительская', render: (i) => getParentName(i.parent_id) },
        ]}
        searchKeys={['location_code', 'name_ru', 'type']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
        canEdit={canEdit()}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактирование' : 'Добавление'}>
        <FormField label="Код локации" required>
          <Input value={form.location_code} onChange={e => setForm({ ...form, location_code: e.target.value })} />
        </FormField>
        <FormField label="Название" required>
          <Input value={form.name_ru} onChange={e => setForm({ ...form, name_ru: e.target.value })} />
        </FormField>
        <FormField label="Тип" required>
          <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            {locationTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormField>
        <FormField label="Родительская локация">
          <Select value={form.parent_id} onChange={e => setForm({ ...form, parent_id: e.target.value })}>
            <option value="">-- Нет --</option>
            {data.filter(l => !l.archived && l.id !== editing?.id).map(l => (
              <option key={l.id} value={l.id}>{l.name_ru}</option>
            ))}
          </Select>
        </FormField>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </div>
      </Modal>
    </>
  );
}
