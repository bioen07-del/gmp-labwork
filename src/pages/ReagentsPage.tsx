import React, { useEffect, useState } from 'react';
import { supabase, ReagentDefinition, ReagentBatch } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { Plus, Loader2, Package, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

const batchStatuses = ['Active', 'Expired', 'Quarantine', 'Blocked', 'Depleted'];
const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Quarantine: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Blocked: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Depleted: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
};

export function ReagentsPage() {
  const { canEdit, user } = useAuth();
  const [definitions, setDefinitions] = useState<ReagentDefinition[]>([]);
  const [batches, setBatches] = useState<ReagentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [defModalOpen, setDefModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<ReagentDefinition | null>(null);
  const [editingBatch, setEditingBatch] = useState<ReagentBatch | null>(null);
  const [selectedDefId, setSelectedDefId] = useState<number | null>(null);
  const [defForm, setDefForm] = useState({ code: '', name_ru: '', manufacturer: '', default_unit: 'ml' });
  const [batchForm, setBatchForm] = useState({ batch_code: '', lot: '', expiry_at: '', status: 'Active', qty_received: '', unit: 'ml' });

  const load = async () => {
    setLoading(true);
    const [defs, btch] = await Promise.all([
      supabase.from('reagent_definitions').select('*').order('code'),
      supabase.from('reagent_batches').select('*, reagent_definition:reagent_definitions(*)').order('expiry_at', { ascending: true })
    ]);
    setDefinitions(defs.data || []);
    setBatches(btch.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = (id: number) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const openAddDef = () => {
    setEditingDef(null);
    setDefForm({ code: '', name_ru: '', manufacturer: '', default_unit: 'ml' });
    setDefModalOpen(true);
  };

  const openEditDef = (def: ReagentDefinition) => {
    setEditingDef(def);
    setDefForm({ code: def.code, name_ru: def.name_ru, manufacturer: def.manufacturer || '', default_unit: def.default_unit });
    setDefModalOpen(true);
  };

  const saveDef = async () => {
    const payload = { code: defForm.code, name_ru: defForm.name_ru, manufacturer: defForm.manufacturer || null, default_unit: defForm.default_unit };
    if (editingDef) {
      await supabase.from('reagent_definitions').update(payload).eq('id', editingDef.id);
    } else {
      await supabase.from('reagent_definitions').insert(payload);
    }
    setDefModalOpen(false);
    load();
  };

  const openAddBatch = (defId: number) => {
    setSelectedDefId(defId);
    setEditingBatch(null);
    const def = definitions.find(d => d.id === defId);
    setBatchForm({ batch_code: '', lot: '', expiry_at: '', status: 'Active', qty_received: '', unit: def?.default_unit || 'ml' });
    setBatchModalOpen(true);
  };

  const openEditBatch = (batch: ReagentBatch) => {
    setSelectedDefId(batch.reagent_definition_id);
    setEditingBatch(batch);
    setBatchForm({
      batch_code: batch.batch_code,
      lot: batch.lot || '',
      expiry_at: batch.expiry_at?.slice(0, 10) || '',
      status: batch.status,
      qty_received: batch.qty_received.toString(),
      unit: batch.unit
    });
    setBatchModalOpen(true);
  };

  const saveBatch = async () => {
    const qty = parseFloat(batchForm.qty_received) || 0;
    const payload = {
      reagent_definition_id: selectedDefId,
      batch_code: batchForm.batch_code,
      lot: batchForm.lot || null,
      expiry_at: batchForm.expiry_at || null,
      status: batchForm.status,
      qty_received: qty,
      qty_on_hand: editingBatch ? editingBatch.qty_on_hand : qty,
      unit: batchForm.unit
    };
    if (editingBatch) {
      await supabase.from('reagent_batches').update(payload).eq('id', editingBatch.id);
    } else {
      await supabase.from('reagent_batches').insert(payload);
      // Log receive transaction
      await supabase.from('inventory_transactions').insert({
        item_type: 'reagent_batch',
        item_id: 0, // Will be updated after insert
        tx_type: 'RECEIVE',
        qty,
        unit: batchForm.unit,
        performed_by: user?.id
      });
    }
    setBatchModalOpen(false);
    load();
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expiry = new Date(date);
    const now = new Date();
    const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff > 0;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Склад реагентов</h1>
        {canEdit() && (
          <button onClick={openAddDef} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} /> Новый реагент
          </button>
        )}
      </div>

      <div className="space-y-2">
        {definitions.map(def => {
          const defBatches = batches.filter(b => b.reagent_definition_id === def.id);
          const totalOnHand = defBatches.reduce((sum, b) => sum + (b.status === 'Active' ? b.qty_on_hand : 0), 0);
          const isExp = expanded.includes(def.id);

          return (
            <div key={def.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div 
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => toggleExpand(def.id)}
              >
                <div className="flex items-center gap-3">
                  {isExp ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}
                  <Package size={20} className="text-blue-500" />
                  <div>
                    <span className="font-medium text-gray-800 dark:text-white">{def.code}</span>
                    <span className="ml-2 text-gray-500 dark:text-gray-400">{def.name_ru}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{def.manufacturer}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Остаток: {totalOnHand} {def.default_unit}
                  </span>
                  {canEdit() && (
                    <button onClick={e => { e.stopPropagation(); openEditDef(def); }} className="text-blue-600 hover:text-blue-700 text-sm">
                      Изм.
                    </button>
                  )}
                </div>
              </div>

              {isExp && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Партия</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Лот</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Годен до</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Статус</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Остаток</th>
                        {canEdit() && <th className="px-4 py-2"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {defBatches.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-3 text-center text-gray-500 text-sm">Нет партий</td></tr>
                      ) : defBatches.map(batch => (
                        <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{batch.batch_code}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{batch.lot || '-'}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`${isExpired(batch.expiry_at) ? 'text-red-600' : isExpiringSoon(batch.expiry_at) ? 'text-orange-500' : 'text-gray-600 dark:text-gray-400'}`}>
                              {batch.expiry_at ? new Date(batch.expiry_at).toLocaleDateString('ru-RU') : '-'}
                            </span>
                            {isExpiringSoon(batch.expiry_at) && <AlertTriangle size={14} className="inline ml-1 text-orange-500" />}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[batch.status]}`}>{batch.status}</span>
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-medium text-gray-800 dark:text-gray-200">
                            {batch.qty_on_hand} {batch.unit}
                          </td>
                          {canEdit() && (
                            <td className="px-4 py-2 text-right">
                              <button onClick={() => openEditBatch(batch)} className="text-blue-600 hover:text-blue-700 text-sm">Изм.</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {canEdit() && (
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={() => openAddBatch(def.id)} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <Plus size={16} /> Приёмка партии
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Definition Modal */}
      <Modal isOpen={defModalOpen} onClose={() => setDefModalOpen(false)} title={editingDef ? 'Редактирование реагента' : 'Новый реагент'}>
        <FormField label="Код" required>
          <Input value={defForm.code} onChange={e => setDefForm({ ...defForm, code: e.target.value })} />
        </FormField>
        <FormField label="Название" required>
          <Input value={defForm.name_ru} onChange={e => setDefForm({ ...defForm, name_ru: e.target.value })} />
        </FormField>
        <FormField label="Производитель">
          <Input value={defForm.manufacturer} onChange={e => setDefForm({ ...defForm, manufacturer: e.target.value })} />
        </FormField>
        <FormField label="Ед. измерения">
          <Input value={defForm.default_unit} onChange={e => setDefForm({ ...defForm, default_unit: e.target.value })} />
        </FormField>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setDefModalOpen(false)}>Отмена</Button>
          <Button onClick={saveDef}>Сохранить</Button>
        </div>
      </Modal>

      {/* Batch Modal */}
      <Modal isOpen={batchModalOpen} onClose={() => setBatchModalOpen(false)} title={editingBatch ? 'Редактирование партии' : 'Приёмка партии'}>
        <FormField label="Код партии" required>
          <Input value={batchForm.batch_code} onChange={e => setBatchForm({ ...batchForm, batch_code: e.target.value })} />
        </FormField>
        <FormField label="Лот производителя">
          <Input value={batchForm.lot} onChange={e => setBatchForm({ ...batchForm, lot: e.target.value })} />
        </FormField>
        <FormField label="Годен до">
          <Input type="date" value={batchForm.expiry_at} onChange={e => setBatchForm({ ...batchForm, expiry_at: e.target.value })} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Количество" required>
            <Input type="number" value={batchForm.qty_received} onChange={e => setBatchForm({ ...batchForm, qty_received: e.target.value })} />
          </FormField>
          <FormField label="Ед. изм.">
            <Input value={batchForm.unit} onChange={e => setBatchForm({ ...batchForm, unit: e.target.value })} />
          </FormField>
        </div>
        <FormField label="Статус">
          <Select value={batchForm.status} onChange={e => setBatchForm({ ...batchForm, status: e.target.value })}>
            {batchStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setBatchModalOpen(false)}>Отмена</Button>
          <Button onClick={saveBatch}>Сохранить</Button>
        </div>
      </Modal>
    </div>
  );
}
