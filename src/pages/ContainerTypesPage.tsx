import React, { useEffect, useState } from 'react';
import { supabase, ContainerType } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';

const categories = ['flask', 'plate', 'bag', 'bottle', 'tube', 'other'];

export function ContainerTypesPage() {
  const { canEdit } = useAuth();
  const [data, setData] = useState<ContainerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContainerType | null>(null);
  const [form, setForm] = useState({
    code: '', category: 'flask', growth_area_cm2: '', working_volume_min_ml: '', working_volume_max_ml: '', notes: ''
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('container_types').select('*').order('id');
    if (error) setError(error.message);
    else setData(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ code: '', category: 'flask', growth_area_cm2: '', working_volume_min_ml: '', working_volume_max_ml: '', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (item: ContainerType) => {
    setEditing(item);
    setForm({
      code: item.code,
      category: item.category,
      growth_area_cm2: item.growth_area_cm2?.toString() || '',
      working_volume_min_ml: item.working_volume_min_ml?.toString() || '',
      working_volume_max_ml: item.working_volume_max_ml?.toString() || '',
      notes: item.notes || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      code: form.code,
      category: form.category,
      growth_area_cm2: form.growth_area_cm2 ? parseFloat(form.growth_area_cm2) : null,
      working_volume_min_ml: form.working_volume_min_ml ? parseFloat(form.working_volume_min_ml) : null,
      working_volume_max_ml: form.working_volume_max_ml ? parseFloat(form.working_volume_max_ml) : null,
      notes: form.notes || null
    };
    if (editing) {
      await supabase.from('container_types').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('container_types').insert(payload);
    }
    setModalOpen(false);
    load();
  };

  const handleArchive = async (item: ContainerType) => {
    await supabase.from('container_types').update({ archived: !item.archived }).eq('id', item.id);
    load();
  };

  return (
    <>
      <DataTable
        title="Типы контейнеров"
        data={data}
        loading={loading}
        error={error}
        columns={[
          { key: 'code', label: 'Код' },
          { key: 'category', label: 'Категория' },
          { key: 'growth_area_cm2', label: 'Площадь (см2)' },
          { key: 'working_volume_min_ml', label: 'Объем мин (мл)', render: (i) => i.working_volume_min_ml ?? '-' },
          { key: 'working_volume_max_ml', label: 'Объем макс (мл)', render: (i) => i.working_volume_max_ml ?? '-' },
        ]}
        searchKeys={['code', 'category']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
        canEdit={canEdit()}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактирование' : 'Добавление'}>
        <FormField label="Код" required>
          <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
        </FormField>
        <FormField label="Категория" required>
          <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </FormField>
        <FormField label="Площадь роста (см2)">
          <Input type="number" value={form.growth_area_cm2} onChange={e => setForm({ ...form, growth_area_cm2: e.target.value })} />
        </FormField>
        <FormField label="Рабочий объем мин (мл)">
          <Input type="number" value={form.working_volume_min_ml} onChange={e => setForm({ ...form, working_volume_min_ml: e.target.value })} />
        </FormField>
        <FormField label="Рабочий объем макс (мл)">
          <Input type="number" value={form.working_volume_max_ml} onChange={e => setForm({ ...form, working_volume_max_ml: e.target.value })} />
        </FormField>
        <FormField label="Примечания">
          <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </FormField>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </div>
      </Modal>
    </>
  );
}
