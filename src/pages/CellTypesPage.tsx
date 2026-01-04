import React, { useEffect, useState } from 'react';
import { supabase, CellType } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Button } from '@/components/Modal';

export function CellTypesPage() {
  const { canEdit } = useAuth();
  const [data, setData] = useState<CellType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CellType | null>(null);
  const [form, setForm] = useState({ code: '', name_ru: '' });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('cell_types').select('*').order('id');
    if (error) setError(error.message);
    else setData(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ code: '', name_ru: '' });
    setModalOpen(true);
  };

  const openEdit = (item: CellType) => {
    setEditing(item);
    setForm({ code: item.code, name_ru: item.name_ru });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (editing) {
      await supabase.from('cell_types').update(form).eq('id', editing.id);
    } else {
      await supabase.from('cell_types').insert(form);
    }
    setModalOpen(false);
    load();
  };

  const handleArchive = async (item: CellType) => {
    await supabase.from('cell_types').update({ archived: !item.archived }).eq('id', item.id);
    load();
  };

  return (
    <>
      <DataTable
        title="Типы клеток"
        data={data}
        loading={loading}
        error={error}
        columns={[
          { key: 'code', label: 'Код' },
          { key: 'name_ru', label: 'Название' },
        ]}
        searchKeys={['code', 'name_ru']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
        canEdit={canEdit()}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактирование' : 'Добавление'}>
        <FormField label="Код" required>
          <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
        </FormField>
        <FormField label="Название" required>
          <Input value={form.name_ru} onChange={e => setForm({ ...form, name_ru: e.target.value })} />
        </FormField>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </div>
      </Modal>
    </>
  );
}
