import React, { useEffect, useState } from 'react';
import { supabase, Equipment, Location } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';

const equipmentTypes = ['incubator', 'centrifuge', 'microscope', 'laminar', 'fridge', 'freezer', 'other'];
const statuses = ['active', 'maintenance', 'decommissioned'];

export function EquipmentPage() {
  const { canEdit } = useAuth();
  const [data, setData] = useState<Equipment[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [form, setForm] = useState({
    equipment_code: '', name_ru: '', equipment_type: 'incubator', status: 'active',
    valid_until: '', location_id: '', inventory_number: '', catalog_number: ''
  });

  const load = async () => {
    setLoading(true);
    const [eq, loc] = await Promise.all([
      supabase.from('equipment').select('*').order('id'),
      supabase.from('locations').select('*').eq('archived', false)
    ]);
    if (eq.error) setError(eq.error.message);
    else setData(eq.data || []);
    setLocations(loc.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ equipment_code: '', name_ru: '', equipment_type: 'incubator', status: 'active', valid_until: '', location_id: '', inventory_number: '', catalog_number: '' });
    setModalOpen(true);
  };

  const openEdit = (item: Equipment) => {
    setEditing(item);
    setForm({
      equipment_code: item.equipment_code,
      name_ru: item.name_ru,
      equipment_type: item.equipment_type,
      status: item.status,
      valid_until: item.valid_until || '',
      location_id: item.location_id?.toString() || '',
      inventory_number: item.inventory_number || '',
      catalog_number: item.catalog_number || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      equipment_code: form.equipment_code,
      name_ru: form.name_ru,
      equipment_type: form.equipment_type,
      status: form.status,
      valid_until: form.valid_until || null,
      location_id: form.location_id ? parseInt(form.location_id) : null,
      inventory_number: form.inventory_number || null,
      catalog_number: form.catalog_number || null
    };
    if (editing) {
      await supabase.from('equipment').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('equipment').insert(payload);
    }
    setModalOpen(false);
    load();
  };

  const handleArchive = async (item: Equipment) => {
    await supabase.from('equipment').update({ archived: !item.archived }).eq('id', item.id);
    load();
  };

  const getLocationName = (id: number | null) => locations.find(l => l.id === id)?.name_ru || '-';

  return (
    <>
      <DataTable
        title="Оборудование"
        data={data}
        loading={loading}
        error={error}
        columns={[
          { key: 'equipment_code', label: 'Код' },
          { key: 'name_ru', label: 'Название' },
          { key: 'equipment_type', label: 'Тип' },
          { key: 'status', label: 'Статус' },
          { key: 'location_id', label: 'Локация', render: (i) => getLocationName(i.location_id) },
        ]}
        searchKeys={['equipment_code', 'name_ru', 'equipment_type']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
        canEdit={canEdit()}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактирование' : 'Добавление'}>
        <FormField label="Код оборудования" required>
          <Input value={form.equipment_code} onChange={e => setForm({ ...form, equipment_code: e.target.value })} />
        </FormField>
        <FormField label="Название" required>
          <Input value={form.name_ru} onChange={e => setForm({ ...form, name_ru: e.target.value })} />
        </FormField>
        <FormField label="Тип" required>
          <Select value={form.equipment_type} onChange={e => setForm({ ...form, equipment_type: e.target.value })}>
            {equipmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormField>
        <FormField label="Статус" required>
          <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        <FormField label="Локация">
          <Select value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}>
            <option value="">-- Не выбрано --</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name_ru}</option>)}
          </Select>
        </FormField>
        <FormField label="Действительно до">
          <Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
        </FormField>
        <FormField label="Инвентарный номер">
          <Input value={form.inventory_number} onChange={e => setForm({ ...form, inventory_number: e.target.value })} />
        </FormField>
        <FormField label="Каталожный номер">
          <Input value={form.catalog_number} onChange={e => setForm({ ...form, catalog_number: e.target.value })} />
        </FormField>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </div>
      </Modal>
    </>
  );
}
