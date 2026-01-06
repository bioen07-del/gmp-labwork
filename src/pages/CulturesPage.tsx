import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Culture, Donor, ContainerType, Equipment } from '@/lib/supabase';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { Eye, Beaker } from 'lucide-react';

const statusOptions = ['Активна', 'Заморожена', 'Утилизирована', 'Отгружена'];

const statusColors: Record<string, string> = {
  'Активна': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Заморожена': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Утилизирована': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  'Отгружена': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export function CulturesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Culture[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [containerTypes, setContainerTypes] = useState<ContainerType[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Culture | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const [form, setForm] = useState({
    donor_id: '',
    container_type_id: '',
    passage_number: '0',
    confluency: '',
    status: 'Активна',
    current_equipment_id: '',
    concentration_cells_ml: '',
    total_cells: '',
    viability_percent: '',
    volume_ml: '',
    notes: ''
  });

  const load = async () => {
    setLoading(true);
    const [cultRes, donRes, typesRes, eqRes] = await Promise.all([
      supabase.from('cultures').select('*, donor:donors(*), container_type:container_types(*), equipment:equipment!current_equipment_id(*)').order('id', { ascending: false }),
      supabase.from('donors').select('*').eq('archived', false).order('donor_code'),
      supabase.from('container_types').select('*').eq('archived', false),
      supabase.from('equipment').select('*').eq('archived', false).eq('status', 'Активно')
    ]);
    
    if (cultRes.error) setError(cultRes.error.message);
    else setData(cultRes.data || []);
    
    setDonors(donRes.data || []);
    setContainerTypes(typesRes.data || []);
    setEquipment(eqRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredData = data.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (c.archived) return false;
    return true;
  });

  const resetForm = () => {
    setForm({
      donor_id: '',
      container_type_id: '',
      passage_number: '0',
      confluency: '',
      status: 'Активна',
      current_equipment_id: '',
      concentration_cells_ml: '',
      total_cells: '',
      viability_percent: '',
      volume_ml: '',
      notes: ''
    });
  };

  const openAdd = () => {
    setEditing(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item: Culture) => {
    setEditing(item);
    setForm({
      donor_id: item.donor_id.toString(),
      container_type_id: item.container_type_id?.toString() || '',
      passage_number: item.passage_number.toString(),
      confluency: item.confluency?.toString() || '',
      status: item.status,
      current_equipment_id: item.current_equipment_id?.toString() || '',
      concentration_cells_ml: item.concentration_cells_ml?.toString() || '',
      total_cells: item.total_cells?.toString() || '',
      viability_percent: item.viability_percent?.toString() || '',
      volume_ml: item.volume_ml?.toString() || '',
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
      container_type_id: form.container_type_id ? parseInt(form.container_type_id) : null,
      passage_number: parseInt(form.passage_number) || 0,
      confluency: form.confluency ? parseInt(form.confluency) : null,
      status: form.status,
      current_equipment_id: form.current_equipment_id ? parseInt(form.current_equipment_id) : null,
      concentration_cells_ml: form.concentration_cells_ml ? parseFloat(form.concentration_cells_ml) : null,
      total_cells: form.total_cells ? parseFloat(form.total_cells) : null,
      viability_percent: form.viability_percent ? parseFloat(form.viability_percent) : null,
      volume_ml: form.volume_ml ? parseFloat(form.volume_ml) : null,
      notes: form.notes || null
    };
    
    if (editing) {
      const { error } = await supabase.from('cultures').update(payload).eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      // Generate culture code: CUL-{donor_code}-XXX
      const donor = donors.find(d => d.id === parseInt(form.donor_id));
      const donorCode = donor?.donor_code || 'UNK';
      
      const { count } = await supabase
        .from('cultures')
        .select('*', { count: 'exact', head: true })
        .eq('donor_id', form.donor_id);
      
      const cultureCode = `${donorCode}-${String((count || 0) + 1).padStart(2, '0')}`;
      
      const { error } = await supabase.from('cultures').insert({ ...payload, culture_code: cultureCode });
      if (error) setError(error.message);
    }
    
    setModalOpen(false);
    load();
    setSaving(false);
  };

  const handleArchive = async (item: Culture) => {
    await supabase.from('cultures').update({ archived: !item.archived }).eq('id', item.id);
    load();
  };

  const columns = [
    { key: 'culture_code', label: 'Код культуры' },
    { key: 'donor', label: 'Донор', render: (c: Culture) => c.donor?.donor_code || '-' },
    { key: 'status', label: 'Статус', render: (c: Culture) => (
      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[c.status] || ''}`}>{c.status}</span>
    )},
    { key: 'passage_number', label: 'Пассаж', render: (c: Culture) => `P${c.passage_number}` },
    { key: 'confluency', label: 'Конфлюент', render: (c: Culture) => c.confluency ? `${c.confluency}%` : '-' },
    { key: 'container_type', label: 'Сосуд', render: (c: Culture) => c.container_type?.code || '-' },
    { key: 'equipment', label: 'Оборудование', render: (c: Culture) => c.equipment?.name_ru || '-' },
    { key: 'viability_percent', label: 'Жизн. %', render: (c: Culture) => c.viability_percent ? `${c.viability_percent}%` : '-' },
    { key: 'actions', label: '', render: (c: Culture) => (
      <button 
        onClick={(e) => { e.stopPropagation(); navigate(`/cultures/${c.id}`); }} 
        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
        title="Открыть карточку"
      >
        <Eye size={16} className="text-blue-600" />
      </button>
    )},
  ];

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-4">
          <Beaker className="text-blue-600" size={28} />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Культуры</h1>
        </div>
        <div className="flex gap-4 flex-wrap">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-40">
            <option value="">Все статусы</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>

      <DataTable
        title=""
        data={filteredData}
        loading={loading}
        error={error}
        columns={columns}
        searchKeys={['culture_code']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
        canEdit={true}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Культура ${editing.culture_code}` : 'Новая культура'}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Привязка к донору */}
          <FormField label="Донор" required>
            <Select 
              value={form.donor_id} 
              onChange={e => setForm({ ...form, donor_id: e.target.value })}
              disabled={!!editing}
            >
              <option value="">-- Выберите донора --</option>
              {donors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.donor_code} {d.full_name ? `- ${d.full_name}` : ''}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Параметры культуры */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Статус">
              <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="Номер пассажа">
              <Input 
                type="number" 
                min="0"
                value={form.passage_number} 
                onChange={e => setForm({ ...form, passage_number: e.target.value })} 
              />
            </FormField>
            <FormField label="Конфлюентность %">
              <Input 
                type="number" 
                min="0" 
                max="100"
                value={form.confluency} 
                onChange={e => setForm({ ...form, confluency: e.target.value })} 
              />
            </FormField>
            <FormField label="Тип сосуда">
              <Select value={form.container_type_id} onChange={e => setForm({ ...form, container_type_id: e.target.value })}>
                <option value="">-- Выберите --</option>
                {containerTypes.map(t => <option key={t.id} value={t.id}>{t.code} - {t.category}</option>)}
              </Select>
            </FormField>
          </div>

          {/* Расположение */}
          <FormField label="Оборудование (локация)">
            <Select value={form.current_equipment_id} onChange={e => setForm({ ...form, current_equipment_id: e.target.value })}>
              <option value="">-- Не указано --</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.name_ru} {eq.room ? `(${eq.room})` : ''}
                </option>
              ))}
            </Select>
          </FormField>

          {/* Количественные параметры */}
          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Количественные данные</h3>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Конц. клеток/мл">
                <Input type="number" value={form.concentration_cells_ml} onChange={e => setForm({ ...form, concentration_cells_ml: e.target.value })} />
              </FormField>
              <FormField label="Всего клеток">
                <Input type="number" value={form.total_cells} onChange={e => setForm({ ...form, total_cells: e.target.value })} />
              </FormField>
              <FormField label="Жизнеспособность %">
                <Input type="number" min="0" max="100" value={form.viability_percent} onChange={e => setForm({ ...form, viability_percent: e.target.value })} />
              </FormField>
              <FormField label="Объём (мл)">
                <Input type="number" value={form.volume_ml} onChange={e => setForm({ ...form, volume_ml: e.target.value })} />
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
