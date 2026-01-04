import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { LabelPrinter } from '@/components/LabelPrinter';
import { Plus, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';

interface MediaComponent {
  id: number;
  name_ru: string;
  manufacturer: string | null;
  catalog_number: string | null;
  archived: boolean;
}

interface MediaRecipe {
  id: number;
  recipe_code: string;
  name_ru: string;
  version: string;
  status: string;
  archived: boolean;
  items?: { component: MediaComponent; amount: number; unit: string }[];
}

interface MediaBatch {
  id: number;
  batch_code: string;
  recipe_id: number | null;
  prepared_by: string | null;
  prepared_at: string;
  expiry_at: string;
  status: string;
  qty_prepared: number;
  unit: string;
  notes: string | null;
  archived: boolean;
  recipe?: MediaRecipe;
}

const statuses = ['Active', 'Expired', 'Quarantine', 'Blocked', 'Depleted'];
const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Quarantine: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Depleted: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export function MediaPage() {
  const { canEdit } = useAuth();
  const [batches, setBatches] = useState<MediaBatch[]>([]);
  const [recipes, setRecipes] = useState<MediaRecipe[]>([]);
  const [components, setComponents] = useState<MediaComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MediaBatch | null>(null);
  const [form, setForm] = useState({
    batch_code: '', recipe_id: '', expiry_at: '', status: 'Active', qty_prepared: '', unit: 'ml', notes: ''
  });
  const [expandedRecipes, setExpandedRecipes] = useState<number[]>([]);
  const [recipeItems, setRecipeItems] = useState<Record<number, { component: MediaComponent | null; amount: number; unit: string }[]>>({});
  const [activeTab, setActiveTab] = useState<'batches' | 'recipes' | 'components'>('batches');
  
  // Label printer state
  const [labelOpen, setLabelOpen] = useState(false);
  const [labelData, setLabelData] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const [batchRes, recipeRes, compRes] = await Promise.all([
      supabase.from('media_batches').select('*, recipe:media_recipes(*)').order('expiry_at', { ascending: true }),
      supabase.from('media_recipes').select('*').eq('archived', false),
      supabase.from('media_components').select('*').eq('archived', false),
    ]);
    
    if (batchRes.error) setError(batchRes.error.message);
    else setBatches(batchRes.data || []);
    
    setRecipes(recipeRes.data || []);
    setComponents(compRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ batch_code: '', recipe_id: '', expiry_at: '', status: 'Active', qty_prepared: '', unit: 'ml', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (item: MediaBatch) => {
    setEditing(item);
    setForm({
      batch_code: item.batch_code,
      recipe_id: item.recipe_id?.toString() || '',
      expiry_at: item.expiry_at?.split('T')[0] || '',
      status: item.status,
      qty_prepared: item.qty_prepared?.toString() || '',
      unit: item.unit || 'ml',
      notes: item.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      batch_code: form.batch_code,
      recipe_id: form.recipe_id ? parseInt(form.recipe_id) : null,
      expiry_at: form.expiry_at,
      status: form.status,
      qty_prepared: form.qty_prepared ? parseFloat(form.qty_prepared) : null,
      unit: form.unit,
      notes: form.notes || null,
    };

    if (editing) {
      await supabase.from('media_batches').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('media_batches').insert(payload);
    }
    setModalOpen(false);
    load();
  };

  const handleArchive = async (item: MediaBatch) => {
    await supabase.from('media_batches').update({ archived: !item.archived }).eq('id', item.id);
    load();
  };

  const printLabel = (batch: MediaBatch) => {
    setLabelData({
      code: batch.batch_code,
      type: batch.recipe?.name_ru || 'Среда',
      date: batch.expiry_at ? format(parseISO(batch.expiry_at), 'dd.MM.yyyy') : '',
      info: `${batch.qty_prepared} ${batch.unit}`,
    });
    setLabelOpen(true);
  };

  const isExpiringSoon = (date: string) => {
    const expiry = parseISO(date);
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return isBefore(expiry, weekLater);
  };

  // FEFO sorted batches
  const sortedBatches = [...batches]
    .filter(b => !b.archived)
    .sort((a, b) => new Date(a.expiry_at).getTime() - new Date(b.expiry_at).getTime());

  const columns = [
    { key: 'batch_code', label: 'Код партии' },
    { key: 'recipe', label: 'Рецепт', render: (b: MediaBatch) => b.recipe?.name_ru || '-' },
    { key: 'status', label: 'Статус', render: (b: MediaBatch) => (
      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[b.status]}`}>{b.status}</span>
    )},
    { key: 'qty_prepared', label: 'Количество', render: (b: MediaBatch) => `${b.qty_prepared} ${b.unit}` },
    { key: 'expiry_at', label: 'Годен до', render: (b: MediaBatch) => {
      const formatted = b.expiry_at ? format(parseISO(b.expiry_at), 'dd.MM.yyyy') : '-';
      const expiring = b.expiry_at && isExpiringSoon(b.expiry_at);
      return <span className={expiring ? 'text-red-600 font-medium' : ''}>{formatted}</span>;
    }},
    { key: 'print', label: '', render: (b: MediaBatch) => (
      <button onClick={(e) => { e.stopPropagation(); printLabel(b); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Печать этикетки">
        <Printer size={16} className="text-blue-600" />
      </button>
    )},
  ];

  const toggleRecipe = async (id: number) => {
    if (expandedRecipes.includes(id)) {
      setExpandedRecipes(prev => prev.filter(r => r !== id));
    } else {
      setExpandedRecipes(prev => [...prev, id]);
      // Load recipe items if not loaded
      if (!recipeItems[id]) {
        const { data } = await supabase
          .from('media_recipe_items')
          .select('*, component:media_components(*)')
          .eq('recipe_id', id);
        setRecipeItems(prev => ({ ...prev, [id]: data || [] }));
      }
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'batches', label: 'Партии сред' },
          { key: 'recipes', label: 'Рецепты' },
          { key: 'components', label: 'Компоненты' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-2 px-1 border-b-2 transition ${activeTab === tab.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'batches' && (
        <DataTable
          title="Партии сред (FEFO)"
          data={sortedBatches}
          loading={loading}
          error={error}
          columns={columns}
          searchKeys={['batch_code']}
          onAdd={openAdd}
          onEdit={openEdit}
          onArchive={handleArchive}
          canEdit={canEdit()}
        />
      )}

      {activeTab === 'recipes' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Рецепты сред</h2>
          </div>
          <div className="divide-y dark:divide-gray-700">
            {recipes.map(recipe => (
              <div key={recipe.id}>
                <button
                  onClick={() => toggleRecipe(recipe.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    {expandedRecipes.includes(recipe.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className="font-medium text-gray-800 dark:text-white">{recipe.recipe_code}</span>
                    <span className="text-gray-500">{recipe.name_ru}</span>
                  </div>
                  <span className="text-sm text-gray-400">v{recipe.version}</span>
                </button>
                {expandedRecipes.includes(recipe.id) && (
                  <div className="px-8 pb-4">
                    {recipeItems[recipe.id] ? (
                      recipeItems[recipe.id].length > 0 ? (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500 dark:text-gray-400">
                              <th className="pb-2">Компонент</th>
                              <th className="pb-2">Количество</th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-700 dark:text-gray-300">
                            {recipeItems[recipe.id].map((item, idx) => (
                              <tr key={idx}>
                                <td className="py-1">{item.component?.name_ru || 'Неизвестный компонент'}</td>
                                <td className="py-1">{item.amount} {item.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-gray-500">Нет компонентов в рецепте</div>
                      )
                    ) : (
                      <div className="text-gray-400">Загрузка...</div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {recipes.length === 0 && (
              <div className="p-8 text-center text-gray-500">Нет рецептов</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'components' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Компоненты сред</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-gray-600 dark:text-gray-300">Название</th>
                <th className="text-left p-3 text-sm font-medium text-gray-600 dark:text-gray-300">Производитель</th>
                <th className="text-left p-3 text-sm font-medium text-gray-600 dark:text-gray-300">Каталожный номер</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {components.map(comp => (
                <tr key={comp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="p-3 text-gray-800 dark:text-white">{comp.name_ru}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">{comp.manufacturer || '-'}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">{comp.catalog_number || '-'}</td>
                </tr>
              ))}
              {components.length === 0 && (
                <tr><td colSpan={3} className="p-8 text-center text-gray-500">Нет компонентов</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактирование партии' : 'Создание партии'}>
        <FormField label="Код партии" required>
          <Input value={form.batch_code} onChange={e => setForm({ ...form, batch_code: e.target.value })} placeholder="MED-2024-001" />
        </FormField>
        <FormField label="Рецепт">
          <Select value={form.recipe_id} onChange={e => setForm({ ...form, recipe_id: e.target.value })}>
            <option value="">-- Выберите --</option>
            {recipes.map(r => <option key={r.id} value={r.id}>{r.recipe_code} - {r.name_ru}</option>)}
          </Select>
        </FormField>
        <FormField label="Годен до" required>
          <Input type="date" value={form.expiry_at} onChange={e => setForm({ ...form, expiry_at: e.target.value })} />
        </FormField>
        <FormField label="Статус">
          <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Количество">
            <Input type="number" value={form.qty_prepared} onChange={e => setForm({ ...form, qty_prepared: e.target.value })} />
          </FormField>
          <FormField label="Ед. изм.">
            <Select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
              <option value="ml">мл</option>
              <option value="L">л</option>
            </Select>
          </FormField>
        </div>
        <FormField label="Примечания">
          <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </FormField>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </div>
      </Modal>

      {/* Label Printer */}
      <LabelPrinter
        isOpen={labelOpen}
        onClose={() => setLabelOpen(false)}
        labelType="container"
        data={labelData || { code: '' }}
      />
    </div>
  );
}
