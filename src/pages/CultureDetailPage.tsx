import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Culture, Manipulation, Profile } from '@/lib/supabase';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { ArrowLeft, Plus, Beaker, History, TestTube, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

const manipulationTypes = ['Посев', 'Пассаж', 'СменаСреды', 'Заморозка', 'Разморозка', 'Подсчёт', 'QC', 'Утилизация', 'Отгрузка', 'Иное'];

const typeColors: Record<string, string> = {
  'Посев': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Пассаж': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'СменаСреды': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Заморозка': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Разморозка': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'Подсчёт': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'QC': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Утилизация': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'Отгрузка': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Иное': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
};

export function CultureDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [culture, setCulture] = useState<Culture | null>(null);
  const [manipulations, setManipulations] = useState<Manipulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'qc'>('info');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    type: 'Иное',
    notes: '',
    // Параметры для разных типов манипуляций
    new_passage: '',
    new_confluency: '',
    new_viability: '',
    new_concentration: '',
    new_total_cells: '',
    new_volume: ''
  });

  const load = async () => {
    setLoading(true);
    
    const [cultureRes, manipRes] = await Promise.all([
      supabase
        .from('cultures')
        .select('*, donor:donors(*), container_type:container_types(*), equipment:equipment!current_equipment_id(*)')
        .eq('id', id)
        .single(),
      supabase
        .from('manipulations')
        .select('*, operator:profiles(*)')
        .eq('culture_id', id)
        .order('performed_at', { ascending: false })
    ]);
    
    if (cultureRes.data) setCulture(cultureRes.data);
    if (manipRes.data) setManipulations(manipRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleAddManipulation = async () => {
    if (!culture || !user) return;
    setSaving(true);
    
    const parameters: Record<string, unknown> = {};
    
    // Собираем параметры в зависимости от типа
    if (form.new_passage) parameters.new_passage = parseInt(form.new_passage);
    if (form.new_confluency) parameters.new_confluency = parseInt(form.new_confluency);
    if (form.new_viability) parameters.new_viability = parseFloat(form.new_viability);
    if (form.new_concentration) parameters.new_concentration = parseFloat(form.new_concentration);
    if (form.new_total_cells) parameters.new_total_cells = parseFloat(form.new_total_cells);
    if (form.new_volume) parameters.new_volume = parseFloat(form.new_volume);
    
    // Создаём манипуляцию
    const { error } = await supabase.from('manipulations').insert({
      culture_id: culture.id,
      type: form.type,
      operator_id: user.id,
      performed_at: new Date().toISOString(),
      parameters: Object.keys(parameters).length > 0 ? parameters : null,
      notes: form.notes || null
    });
    
    if (!error) {
      // Обновляем культуру если есть новые значения
      const updates: Record<string, unknown> = {};
      if (form.new_passage) updates.passage_number = parseInt(form.new_passage);
      if (form.new_confluency) updates.confluency = parseInt(form.new_confluency);
      if (form.new_viability) updates.viability_percent = parseFloat(form.new_viability);
      if (form.new_concentration) updates.concentration_cells_ml = parseFloat(form.new_concentration);
      if (form.new_total_cells) updates.total_cells = parseFloat(form.new_total_cells);
      if (form.new_volume) updates.volume_ml = parseFloat(form.new_volume);
      
      // Специальная логика для типов
      if (form.type === 'Заморозка') updates.status = 'Заморожена';
      if (form.type === 'Разморозка') updates.status = 'Активна';
      if (form.type === 'Утилизация') updates.status = 'Утилизирована';
      if (form.type === 'Отгрузка') updates.status = 'Отгружена';
      
      if (Object.keys(updates).length > 0) {
        await supabase.from('cultures').update(updates).eq('id', culture.id);
      }
    }
    
    setModalOpen(false);
    setForm({ type: 'Иное', notes: '', new_passage: '', new_confluency: '', new_viability: '', new_concentration: '', new_total_cells: '', new_volume: '' });
    load();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!culture) {
    return <div className="text-center text-gray-500 py-12">Культура не найдена</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/cultures')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Beaker className="text-blue-600" />
            {culture.culture_code}
          </h1>
          <p className="text-gray-500">Донор: {culture.donor?.donor_code} {culture.donor?.full_name && `- ${culture.donor.full_name}`}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          culture.status === 'Активна' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
          culture.status === 'Заморожена' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          {culture.status}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'info', label: 'Информация', icon: Beaker },
          { key: 'history', label: 'История манипуляций', icon: History },
          { key: 'qc', label: 'QC', icon: TestTube },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.key 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Пассаж</h3>
              <p className="text-lg font-medium text-gray-800 dark:text-white">P{culture.passage_number}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Конфлюентность</h3>
              <p className="text-lg font-medium text-gray-800 dark:text-white">{culture.confluency ? `${culture.confluency}%` : '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Жизнеспособность</h3>
              <p className="text-lg font-medium text-gray-800 dark:text-white">{culture.viability_percent ? `${culture.viability_percent}%` : '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Концентрация</h3>
              <p className="text-lg font-medium text-gray-800 dark:text-white">{culture.concentration_cells_ml ? `${culture.concentration_cells_ml.toExponential(2)} кл/мл` : '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Объём</h3>
              <p className="text-lg font-medium text-gray-800 dark:text-white">{culture.volume_ml ? `${culture.volume_ml} мл` : '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Сосуд</h3>
              <p className="text-lg font-medium text-gray-800 dark:text-white">{culture.container_type?.code || '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Оборудование</h3>
              <p className="text-lg font-medium text-gray-800 dark:text-white">{culture.equipment?.name_ru || '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Создана</h3>
              <p className="text-lg font-medium text-gray-800 dark:text-white">
                {format(new Date(culture.created_at), 'dd.MM.yyyy HH:mm')}
              </p>
            </div>
          </div>
          {culture.notes && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Примечания</h3>
              <p className="text-gray-800 dark:text-white">{culture.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800 dark:text-white">История манипуляций</h2>
            <Button onClick={() => setModalOpen(true)} className="flex items-center gap-1">
              <Plus size={16} />
              Добавить
            </Button>
          </div>
          
          {manipulations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Манипуляции не зарегистрированы
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {manipulations.map(m => (
                <div key={m.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[m.type] || typeColors['Иное']}`}>
                        {m.type}
                      </span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(m.performed_at), 'dd.MM.yyyy HH:mm')}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{m.operator?.full_name || m.operator?.username || '-'}</span>
                  </div>
                  {m.parameters && Object.keys(m.parameters).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(m.parameters).map(([key, val]) => (
                        <span key={key} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {key}: {String(val)}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.notes && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{m.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'qc' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500">
          <TestTube size={48} className="mx-auto mb-4 opacity-30" />
          <p>QC-тесты будут отображаться здесь</p>
          <p className="text-sm mt-2">Привязка к существующей системе QC Results</p>
        </div>
      )}

      {/* Add Manipulation Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Добавить манипуляцию">
        <div className="space-y-4">
          <FormField label="Тип манипуляции" required>
            <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {manipulationTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormField>

          {/* Контекстные поля */}
          {(form.type === 'Пассаж' || form.type === 'Посев') && (
            <FormField label="Новый номер пассажа">
              <Input 
                type="number" 
                value={form.new_passage} 
                onChange={e => setForm({ ...form, new_passage: e.target.value })}
                placeholder={`Текущий: P${culture.passage_number}`}
              />
            </FormField>
          )}

          {(form.type === 'Подсчёт' || form.type === 'Пассаж') && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Конфлюентность %">
                <Input type="number" min="0" max="100" value={form.new_confluency} onChange={e => setForm({ ...form, new_confluency: e.target.value })} />
              </FormField>
              <FormField label="Жизнеспособность %">
                <Input type="number" min="0" max="100" value={form.new_viability} onChange={e => setForm({ ...form, new_viability: e.target.value })} />
              </FormField>
              <FormField label="Концентрация кл/мл">
                <Input type="number" value={form.new_concentration} onChange={e => setForm({ ...form, new_concentration: e.target.value })} />
              </FormField>
              <FormField label="Всего клеток">
                <Input type="number" value={form.new_total_cells} onChange={e => setForm({ ...form, new_total_cells: e.target.value })} />
              </FormField>
            </div>
          )}

          {form.type === 'СменаСреды' && (
            <FormField label="Новый объём (мл)">
              <Input type="number" value={form.new_volume} onChange={e => setForm({ ...form, new_volume: e.target.value })} />
            </FormField>
          )}

          <FormField label="Примечания">
            <textarea 
              value={form.notes} 
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
            />
          </FormField>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
            <Button onClick={handleAddManipulation} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
