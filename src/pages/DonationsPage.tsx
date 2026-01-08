import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Donation, Donor } from '@/lib/supabase';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { Beaker } from 'lucide-react';
import { format } from 'date-fns';

const materialTypes = [
  { value: 'Кровь', label: 'Кровь' },
  { value: 'Костный мозг', label: 'Костный мозг' },
  { value: 'Жировая ткань', label: 'Жировая ткань' },
  { value: 'Пуповинная кровь', label: 'Пуповинная кровь' },
  { value: 'Биоптат', label: 'Биоптат' },
  { value: 'Другое', label: 'Другое' },
];

const conditions = [
  { value: 'Хорошее', label: 'Хорошее' },
  { value: 'Удовлетворительное', label: 'Удовлетворительное' },
  { value: 'Плохое', label: 'Плохое' },
];

export function DonationsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Donation[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [cultureCount, setCultureCount] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Donation | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [createdCultureCode, setCreatedCultureCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    donor_id: '',
    donation_datetime: '',
    material_type: 'Кровь',
    received_condition: 'Хорошее',
    notes: ''
  });

  const load = async () => {
    setLoading(true);
    const [don, dnr] = await Promise.all([
      supabase.from('donations').select('*, donor:donors(*)').eq('archived', false).order('id', { ascending: false }),
      supabase.from('donors').select('*').eq('archived', false).order('donor_code')
    ]);
    if (don.error) setError(don.error.message);
    else setData(don.data || []);
    setDonors(dnr.data || []);
    
    // Подсчитываем культуры для каждой донации (через donor_id)
    if (don.data) {
      const donorIds = [...new Set(don.data.map(d => d.donor_id).filter(Boolean))];
      if (donorIds.length > 0) {
        const { data: cultures } = await supabase
          .from('cultures')
          .select('donor_id')
          .in('donor_id', donorIds);
        
        const counts: Record<number, number> = {};
        cultures?.forEach(c => {
          counts[c.donor_id] = (counts[c.donor_id] || 0) + 1;
        });
        setCultureCount(counts);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setGeneratedCode(null);
    setCreatedCultureCode(null);
    const now = new Date().toISOString().slice(0, 16);
    setForm({ donor_id: '', donation_datetime: now, material_type: 'Кровь', received_condition: 'Хорошее', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (item: Donation) => {
    setEditing(item);
    setGeneratedCode(null);
    setCreatedCultureCode(null);
    setForm({
      donor_id: item.donor_id?.toString() || '',
      donation_datetime: item.donation_datetime?.slice(0, 16) || '',
      material_type: item.material_type,
      received_condition: item.received_condition || 'Хорошее',
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
      notes: form.notes || null
    };
    
    if (editing) {
      await supabase.from('donations').update(payload).eq('id', editing.id);
      setModalOpen(false);
    } else {
      // Генерируем код донации
      const { data: codeData } = await supabase.rpc('generate_donation_code', { p_donor_id: parseInt(form.donor_id) });
      const newCode = codeData as string;
      
      // Создаём донацию
      const { data: newDonation, error } = await supabase
        .from('donations')
        .insert({ ...payload, donation_code: newCode })
        .select()
        .single();
      
      if (error) {
        setError(error.message);
      } else if (newDonation) {
        // Автоматически создаём первую культуру
        const donor = donors.find(d => d.id === parseInt(form.donor_id));
        const donorCode = donor?.donor_code || 'D-0000';
        
        // Проверяем сколько культур уже есть у донора
        const { count } = await supabase
          .from('cultures')
          .select('*', { count: 'exact', head: true })
          .eq('donor_id', form.donor_id);
        
        const cultureCode = `${donorCode}-${String((count || 0) + 1).padStart(2, '0')}`;
        
        await supabase.from('cultures').insert({
          culture_code: cultureCode,
          donor_id: parseInt(form.donor_id),
          passage_number: 0,
          status: 'Активна'
        });
        
        setGeneratedCode(newCode);
        setCreatedCultureCode(cultureCode);
      }
    }
    load();
    setSaving(false);
  };

  const handleArchive = async (item: Donation) => {
    await supabase.from('donations').update({ archived: !item.archived }).eq('id', item.id);
    load();
  };

  const columns = [
    { key: 'donation_code', label: 'Код донации' },
    { 
      key: 'donor', 
      label: 'Донор', 
      render: (d: Donation) => d.donor?.donor_code || '-'
    },
    { 
      key: 'donation_datetime', 
      label: 'Дата', 
      render: (d: Donation) => d.donation_datetime ? format(new Date(d.donation_datetime), 'dd.MM.yyyy HH:mm') : '-'
    },
    { key: 'material_type', label: 'Материал' },
    { key: 'received_condition', label: 'Состояние' },
    { 
      key: 'cultures', 
      label: 'Культуры', 
      render: (d: Donation) => {
        const count = d.donor_id ? cultureCount[d.donor_id] || 0 : 0;
        if (count === 0) return <span className="text-gray-400">—</span>;
        return (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/cultures?donor=${d.donor_id}`); }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded hover:bg-blue-200"
          >
            <Beaker size={12} />
            {count}
          </button>
        );
      }
    },
  ];

  return (
    <>
      <DataTable
        title="Донации"
        data={data}
        loading={loading}
        error={error}
        columns={columns}
        searchKeys={['donation_code', 'material_type']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
        canEdit={true}
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
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-3">{generatedCode}</p>
            {createdCultureCode && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Автоматически создана культура:</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">{createdCultureCode}</p>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Закрыть</Button>
              {createdCultureCode && (
                <Button onClick={() => { setModalOpen(false); navigate('/cultures'); }}>
                  К культурам
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {editing && (
              <FormField label="Код донации">
                <Input value={editing.donation_code} disabled className="bg-gray-100 dark:bg-gray-700" />
              </FormField>
            )}
            
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
            
            <FormField label="Дата и время получения" required>
              <Input 
                type="datetime-local" 
                value={form.donation_datetime} 
                onChange={e => setForm({ ...form, donation_datetime: e.target.value })} 
              />
            </FormField>
            
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Тип материала">
                <Select value={form.material_type} onChange={e => setForm({ ...form, material_type: e.target.value })}>
                  {materialTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </FormField>
              
              <FormField label="Состояние">
                <Select value={form.received_condition} onChange={e => setForm({ ...form, received_condition: e.target.value })}>
                  {conditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </FormField>
            </div>
            
            <FormField label="Примечания">
              <textarea 
                value={form.notes} 
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={2}
              />
            </FormField>
            
            {!editing && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                <strong>Автоматически:</strong> При создании донации будет создана первая культура для работы
              </div>
            )}
            
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Сохранение...' : editing ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
