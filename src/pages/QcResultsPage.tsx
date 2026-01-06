import React, { useEffect, useState } from 'react';
import { supabase, QcResult, QcTestDefinition, BankBatch, Release } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { Plus, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

const entityTypes = [
  { value: 'bank_batch', label: 'Банк клеток' },
  { value: 'release', label: 'Выдача' },
];
const resultStatuses = ['Pending', 'Pass', 'Fail'];
const resultStatusLabels: Record<string, string> = {
  Pending: 'Ожидает', Pass: 'Пройден', Fail: 'Не пройден'
};

export function QcResultsPage() {
  const { canEdit } = useAuth();
  const [results, setResults] = useState<QcResult[]>([]);
  const [testDefs, setTestDefs] = useState<QcTestDefinition[]>([]);
  const [banks, setBanks] = useState<BankBatch[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QcResult | null>(null);
  const [filterEntity, setFilterEntity] = useState('');
  const [form, setForm] = useState({
    test_definition_id: '', entity_type: 'bank_batch', entity_id: '', status: 'Pending', numeric_value: ''
  });

  const load = async () => {
    setLoading(true);
    const [qc, defs, bnk, rel] = await Promise.all([
      supabase.from('qc_results').select('*, test_definition:qc_test_definitions(*)').order('id', { ascending: false }),
      supabase.from('qc_test_definitions').select('*'),
      supabase.from('bank_batches').select('*'),
      supabase.from('releases').select('*')
    ]);
    setResults(qc.data || []);
    setTestDefs(defs.data || []);
    setBanks(bnk.data || []);
    setReleases(rel.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filterEntity ? results.filter(r => r.entity_type === filterEntity) : results;

  const openAdd = () => {
    setEditing(null);
    setForm({ test_definition_id: testDefs[0]?.id.toString() || '', entity_type: 'bank_batch', entity_id: '', status: 'Pending', numeric_value: '' });
    setModalOpen(true);
  };

  const openEdit = (item: QcResult) => {
    setEditing(item);
    setForm({
      test_definition_id: item.test_definition_id.toString(),
      entity_type: item.entity_type,
      entity_id: item.entity_id.toString(),
      status: item.status,
      numeric_value: item.numeric_value?.toString() || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      test_definition_id: parseInt(form.test_definition_id),
      entity_type: form.entity_type,
      entity_id: parseInt(form.entity_id),
      status: form.status,
      numeric_value: form.numeric_value ? parseFloat(form.numeric_value) : null
    };
    if (editing) {
      await supabase.from('qc_results').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('qc_results').insert(payload);
    }
    setModalOpen(false);
    load();
  };

  const getEntityName = (type: string, id: number) => {
    if (type === 'bank_batch') return banks.find(b => b.id === id)?.bank_code || `Bank #${id}`;
    if (type === 'release') return releases.find(r => r.id === id)?.release_code || `Release #${id}`;
    return `#${id}`;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Pass') return <CheckCircle size={18} className="text-green-600" />;
    if (status === 'Fail') return <XCircle size={18} className="text-red-600" />;
    return <Clock size={18} className="text-yellow-600" />;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Результаты QC</h1>
        {canEdit() && (
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} /> Добавить
          </button>
        )}
      </div>

      <div className="mb-4">
        <Select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="w-48">
          <option value="">Все сущности</option>
          {entityTypes.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Нет результатов QC</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Тест</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Сущность</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Статус</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Значение</th>
                {canEdit() && <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Действия</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                    <span className="font-medium">{r.test_definition?.code}</span>
                    <span className="text-gray-500 ml-2">{r.test_definition?.name_ru}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                    {entityTypes.find(e => e.value === r.entity_type)?.label}: {getEntityName(r.entity_type, r.entity_id)}
                  </td>
                  <td className="px-4 py-3">{getStatusIcon(r.status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{r.numeric_value ?? '-'}</td>
                  {canEdit() && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-700 text-sm">Изменить</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактирование результата' : 'Новый результат QC'}>
        <FormField label="Тест" required>
          <Select value={form.test_definition_id} onChange={e => setForm({ ...form, test_definition_id: e.target.value })}>
            {testDefs.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name_ru}</option>)}
          </Select>
        </FormField>
        <FormField label="Тип сущности" required>
          <Select value={form.entity_type} onChange={e => setForm({ ...form, entity_type: e.target.value, entity_id: '' })}>
            {entityTypes.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </Select>
        </FormField>
        <FormField label="Сущность" required>
          <Select value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })}>
            <option value="">-- Выберите --</option>
            {form.entity_type === 'bank_batch' && banks.map(b => <option key={b.id} value={b.id}>{b.bank_code}</option>)}
            {form.entity_type === 'release' && releases.map(r => <option key={r.id} value={r.id}>{r.release_code}</option>)}
          </Select>
        </FormField>
        <FormField label="Статус" required>
          <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            {resultStatuses.map(s => <option key={s} value={s}>{resultStatusLabels[s]}</option>)}
          </Select>
        </FormField>
        <FormField label="Числовое значение">
          <Input type="number" value={form.numeric_value} onChange={e => setForm({ ...form, numeric_value: e.target.value })} placeholder="Для NUMERIC тестов" />
        </FormField>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </div>
      </Modal>
    </div>
  );
}
