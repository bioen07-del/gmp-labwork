import React, { useEffect, useState } from 'react';
import { supabase, Donor, CellType } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Button, Select } from '@/components/Modal';
import { format } from 'date-fns';

export function DonorsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Donor[]>([]);
  const [cellTypes, setCellTypes] = useState<CellType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Donor | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    full_name: '',
    birth_date: '',
    gender: '',
    blood_type: '',
    diagnosis: '',
    customer_name: '',
    receipt_date: '',
    material_type: '',
    cell_type_id: '',
    notes: ''
  });

  const load = async () => {
    setLoading(true);
    const [donorsRes, cellTypesRes] = await Promise.all([
      supabase.from('donors').select('*, cell_type:cell_types(*)').order('id', { ascending: false }),
      supabase.from('cell_types').select('*').eq('archived', false)
    ]);
    
    if (donorsRes.error) setError(donorsRes.error.message);
    else setData(donorsRes.data || []);
    
    if (cellTypesRes.data) setCellTypes(cellTypesRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({
      full_name: '',
      birth_date: '',
      gender: '',
      blood_type: '',
      diagnosis: '',
      customer_name: '',
      receipt_date: '',
      material_type: '',
      cell_type_id: '',
      notes: ''
    });
  };

  const openAdd = () => {
    setEditing(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item: Donor) => {
    setEditing(item);
    setForm({
      full_name: item.full_name || '',
      birth_date: item.birth_date || '',
      gender: item.gender || '',
      blood_type: item.blood_type || '',
      diagnosis: item.diagnosis || '',
      customer_name: item.customer_name || '',
      receipt_date: item.receipt_date || '',
      material_type: item.material_type || '',
      cell_type_id: item.cell_type_id?.toString() || '',
      notes: item.notes || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const payload = {
      full_name: form.full_name || null,
      birth_date: form.birth_date || null,
      gender: form.gender || null,
      blood_type: form.blood_type || null,
      diagnosis: form.diagnosis || null,
      customer_name: form.customer_name || null,
      receipt_date: form.receipt_date || null,
      material_type: form.material_type || null,
      cell_type_id: form.cell_type_id ? parseInt(form.cell_type_id) : null,
      notes: form.notes || null
    };
    
    if (editing) {
      const { error } = await supabase
        .from('donors')
        .update(payload)
        .eq('id', editing.id);
      
      if (error) setError(error.message);
    } else {
      const { data: codeData } = await supabase.rpc('generate_donor_code');
      const newCode = codeData as string;
      
      const { error } = await supabase
        .from('donors')
        .insert({ ...payload, donor_code: newCode, created_by: user?.id || null });
      
      if (error) setError(error.message);
    }
    
    setModalOpen(false);
    load();
    setSaving(false);
  };

  const handleArchive = async (item: Donor) => {
    await supabase.from('donors').update({ archived: !item.archived }).eq('id', item.id);
    load();
  };

  const columns = [
    { key: 'donor_code', label: 'Код' },
    { key: 'full_name', label: 'ФИО', render: (d: Donor) => d.full_name || '-' },
    { key: 'customer_name', label: 'Заказчик', render: (d: Donor) => d.customer_name || '-' },
    { key: 'diagnosis', label: 'Диагноз', render: (d: Donor) => d.diagnosis || '-' },
    { 
      key: 'cell_type', 
      label: 'Тип клеток', 
      render: (d: Donor) => d.cell_type?.name_ru || '-' 
    },
    { 
      key: 'receipt_date', 
      label: 'Дата получения', 
      render: (d: Donor) => d.receipt_date ? format(new Date(d.receipt_date), 'dd.MM.yyyy') : '-' 
    },
    { 
      key: 'archived', 
      label: 'Статус', 
      render: (d: Donor) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${d.archived 
          ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' 
          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
          {d.archived ? 'Архив' : 'Активен'}
        </span>
      )
    },
  ];

  const genderOptions = [
    { value: '', label: '-- Выберите --' },
    { value: 'М', label: 'Мужской' },
    { value: 'Ж', label: 'Женский' }
  ];

  const bloodTypeOptions = [
    { value: '', label: '-- Выберите --' },
    { value: 'O+', label: 'O(I) Rh+' },
    { value: 'O-', label: 'O(I) Rh-' },
    { value: 'A+', label: 'A(II) Rh+' },
    { value: 'A-', label: 'A(II) Rh-' },
    { value: 'B+', label: 'B(III) Rh+' },
    { value: 'B-', label: 'B(III) Rh-' },
    { value: 'AB+', label: 'AB(IV) Rh+' },
    { value: 'AB-', label: 'AB(IV) Rh-' }
  ];

  const materialTypeOptions = [
    { value: '', label: '-- Выберите --' },
    { value: 'Кровь', label: 'Кровь' },
    { value: 'Костный мозг', label: 'Костный мозг' },
    { value: 'Жировая ткань', label: 'Жировая ткань' },
    { value: 'Пуповинная кровь', label: 'Пуповинная кровь' },
    { value: 'Биоптат', label: 'Биоптат' },
    { value: 'Другое', label: 'Другое' }
  ];

  return (
    <>
      <DataTable
        title="Доноры"
        data={data.filter(d => !d.archived)}
        loading={loading}
        error={error}
        columns={columns}
        searchKeys={['donor_code', 'full_name', 'customer_name', 'diagnosis']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
        canEdit={true}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Донор ${editing.donor_code}` : 'Новый донор'}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Основная информация */}
          <div className="border-b pb-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Информация о доноре</h3>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="ФИО">
                <Input 
                  value={form.full_name} 
                  onChange={e => setForm({...form, full_name: e.target.value})}
                  placeholder="Иванов Иван Иванович"
                />
              </FormField>
              <FormField label="Дата рождения">
                <Input 
                  type="date"
                  value={form.birth_date} 
                  onChange={e => setForm({...form, birth_date: e.target.value})}
                />
              </FormField>
              <FormField label="Пол">
                <Select 
                  value={form.gender}
                  onChange={e => setForm({...form, gender: e.target.value})}
                  options={genderOptions}
                />
              </FormField>
              <FormField label="Группа крови">
                <Select 
                  value={form.blood_type}
                  onChange={e => setForm({...form, blood_type: e.target.value})}
                  options={bloodTypeOptions}
                />
              </FormField>
            </div>
            <FormField label="Диагноз" className="mt-3">
              <Input 
                value={form.diagnosis} 
                onChange={e => setForm({...form, diagnosis: e.target.value})}
                placeholder="Основной диагноз"
              />
            </FormField>
          </div>

          {/* Информация о материале */}
          <div className="border-b pb-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Материал</h3>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Тип материала">
                <Select 
                  value={form.material_type}
                  onChange={e => setForm({...form, material_type: e.target.value})}
                  options={materialTypeOptions}
                />
              </FormField>
              <FormField label="Тип клеток">
                <Select 
                  value={form.cell_type_id}
                  onChange={e => setForm({...form, cell_type_id: e.target.value})}
                  options={[
                    { value: '', label: '-- Выберите --' },
                    ...cellTypes.map(ct => ({ value: ct.id.toString(), label: ct.name_ru }))
                  ]}
                />
              </FormField>
              <FormField label="Дата получения">
                <Input 
                  type="date"
                  value={form.receipt_date} 
                  onChange={e => setForm({...form, receipt_date: e.target.value})}
                />
              </FormField>
              <FormField label="Заказчик">
                <Input 
                  value={form.customer_name} 
                  onChange={e => setForm({...form, customer_name: e.target.value})}
                  placeholder="Название организации"
                />
              </FormField>
            </div>
          </div>

          {/* Примечания */}
          <FormField label="Примечания">
            <textarea 
              value={form.notes} 
              onChange={e => setForm({...form, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder="Дополнительная информация"
            />
          </FormField>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : editing ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
