import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Container, ContainerType, Location, Donation } from '@/lib/supabase';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { Eye } from 'lucide-react';

const statuses = ['Active', 'Hold', 'Blocked', 'Contaminated', 'Frozen', 'Consumed', 'Disposed', 'Released'];

const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Contaminated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Frozen: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Consumed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  Disposed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  Released: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export function ContainersPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Container[]>([]);
  const [containerTypes, setContainerTypes] = useState<ContainerType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Container | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState({
    donation_id: '', container_type_id: '', passage_number: '', status: 'Active',
    current_location_id: '', concentration_cells_ml: '', total_cells: '', viability_percent: '', volume_ml: '', risk_flag: false
  });

  const load = async () => {
    setLoading(true);
    const [cont, types, locs, dons] = await Promise.all([
      supabase.from('containers').select('*, container_type:container_types(*), location:locations!current_location_id(*), donation:donations(*)').order('id', { ascending: false }),
      supabase.from('container_types').select('*').eq('archived', false),
      supabase.from('locations').select('*').eq('archived', false),
      supabase.from('donations').select('*').eq('archived', false).order('id', { ascending: false })
    ]);
    if (cont.error) setError(cont.error.message);
    else setData(cont.data || []);
    setContainerTypes(types.data || []);
    setLocations(locs.data || []);
    setDonations(dons.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredData = data.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (typeFilter && c.container_type_id?.toString() !== typeFilter) return false;
    return true;
  });

  const openAdd = () => {
    setEditing(null);
    setGeneratedCode(null);
    setForm({ donation_id: '', container_type_id: '', passage_number: '', status: 'Active', current_location_id: '', concentration_cells_ml: '', total_cells: '', viability_percent: '', volume_ml: '', risk_flag: false });
    setModalOpen(true);
  };

  const openEdit = (item: Container) => {
    setEditing(item);
    setGeneratedCode(null);
    setForm({
      donation_id: item.donation_id?.toString() || '',
      container_type_id: item.container_type_id?.toString() || '',
      passage_number: item.passage_number?.toString() || '',
      status: item.status,
      current_location_id: item.current_location_id?.toString() || '',
      concentration_cells_ml: item.concentration_cells_ml?.toString() || '',
      total_cells: item.total_cells?.toString() || '',
      viability_percent: item.viability_percent?.toString() || '',
      volume_ml: item.volume_ml?.toString() || '',
      risk_flag: item.risk_flag
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const payload = {
      donation_id: form.donation_id ? parseInt(form.donation_id) : null,
      container_type_id: form.container_type_id ? parseInt(form.container_type_id) : null,
      passage_number: form.passage_number ? parseInt(form.passage_number) : null,
      status: form.status,
      current_location_id: form.current_location_id ? parseInt(form.current_location_id) : null,
      concentration_cells_ml: form.concentration_cells_ml ? parseFloat(form.concentration_cells_ml) : null,
      total_cells: form.total_cells ? parseFloat(form.total_cells) : null,
      viability_percent: form.viability_percent ? parseFloat(form.viability_percent) : null,
      volume_ml: form.volume_ml ? parseFloat(form.volume_ml) : null,
      risk_flag: form.risk_flag
    };
    
    if (editing) {
      await supabase.from('containers').update(payload).eq('id', editing.id);
      setModalOpen(false);
    } else {
      // Генерируем код автоматически
      let newCode: string;
      if (form.donation_id) {
        const { data: codeData } = await supabase.rpc('generate_container_code', { p_donation_id: parseInt(form.donation_id) });
        newCode = codeData as string;
      } else {
        // Если нет донации, генерируем простой код
        const { count } = await supabase.from('containers').select('*', { count: 'exact', head: true });
        newCode = 'C-' + String((count || 0) + 1).padStart(6, '0');
      }
      
      const { error } = await supabase.from('containers').insert({ ...payload, container_code: newCode });
      
      if (error) {
        setError(error.message);
      } else {
        setGeneratedCode(newCode);
      }
    }
    load();
    setSaving(false);
  };

  const handleArchive = async (item: Container) => {
    await supabase.from('containers').update({ archived: !item.archived }).eq('id', item.id);
    load();
  };

  const columns = [
    { key: 'container_code', label: 'Код' },
    { key: 'donation', label: 'Донация', render: (c: Container) => c.donation?.donation_code || '-' },
    { key: 'container_type', label: 'Тип', render: (c: Container) => c.container_type?.code || '-' },
    { key: 'status', label: 'Статус', render: (c: Container) => (
      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[c.status] || ''}`}>{c.status}</span>
    )},
    { key: 'passage_number', label: 'Пассаж', render: (c: Container) => c.passage_number ?? '-' },
    { key: 'location', label: 'Локация', render: (c: Container) => c.location?.name_ru || '-' },
    { key: 'viability_percent', label: 'Жизн. %', render: (c: Container) => c.viability_percent ? `${c.viability_percent}%` : '-' },
    { key: 'actions', label: '', render: (c: Container) => (
      <button onClick={(e) => { e.stopPropagation(); navigate(`/containers/${c.id}`); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
        <Eye size={16} className="text-blue-600" />
      </button>
    )},
  ];

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Культуры</h1>
        <div className="flex gap-4 flex-wrap">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-40">
            <option value="">Все статусы</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-40">
            <option value="">Все типы</option>
            {containerTypes.map(t => <option key={t.id} value={t.id}>{t.code}</option>)}
          </Select>
        </div>
      </div>

      <DataTable
        title=""
        data={filteredData}
        loading={loading}
        error={error}
        columns={columns}
        searchKeys={['container_code']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактирование контейнера' : 'Новый контейнер'}>
        {generatedCode ? (
          <div className="text-center py-4">
            <div className="text-green-600 dark:text-green-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-800 dark:text-white mb-2">Контейнер создан</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{generatedCode}</p>
            <Button className="mt-4" onClick={() => setModalOpen(false)}>Закрыть</Button>
          </div>
        ) : (
          <>
            {editing && (
              <FormField label="Код контейнера">
                <Input value={editing.container_code} disabled className="bg-gray-100 dark:bg-gray-700" />
              </FormField>
            )}
            {!editing && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                Код будет сгенерирован автоматически: <strong>C-{'{код_донации}'}-XX</strong>
              </p>
            )}
            <FormField label="Донация">
              <Select value={form.donation_id} onChange={e => setForm({ ...form, donation_id: e.target.value })} disabled={!!editing}>
                <option value="">-- Без донации --</option>
                {donations.map(d => <option key={d.id} value={d.id}>{d.donation_code}</option>)}
              </Select>
            </FormField>
            <FormField label="Тип контейнера">
              <Select value={form.container_type_id} onChange={e => setForm({ ...form, container_type_id: e.target.value })}>
                <option value="">-- Выберите --</option>
                {containerTypes.map(t => <option key={t.id} value={t.id}>{t.code}</option>)}
              </Select>
            </FormField>
            <FormField label="Статус" required>
              <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="Номер пассажа">
              <Input type="number" value={form.passage_number} onChange={e => setForm({ ...form, passage_number: e.target.value })} />
            </FormField>
            <FormField label="Локация">
              <Select value={form.current_location_id} onChange={e => setForm({ ...form, current_location_id: e.target.value })}>
                <option value="">-- Выберите --</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name_ru}</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Конц. клеток/мл">
                <Input type="number" value={form.concentration_cells_ml} onChange={e => setForm({ ...form, concentration_cells_ml: e.target.value })} />
              </FormField>
              <FormField label="Всего клеток">
                <Input type="number" value={form.total_cells} onChange={e => setForm({ ...form, total_cells: e.target.value })} />
              </FormField>
              <FormField label="Жизнеспособность %">
                <Input type="number" min="0" max="100" value={form.viability_percent} onChange={e => setForm({ ...form, viability_percent: e.target.value })} />
              </FormField>
              <FormField label="Объем (мл)">
                <Input type="number" value={form.volume_ml} onChange={e => setForm({ ...form, volume_ml: e.target.value })} />
              </FormField>
            </div>
            <FormField label="">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.risk_flag} onChange={e => setForm({ ...form, risk_flag: e.target.checked })} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Флаг риска</span>
              </label>
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
