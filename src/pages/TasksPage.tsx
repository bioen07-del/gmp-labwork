import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, Task, Container, Profile } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { Play, X } from 'lucide-react';

const statuses = ['Pending', 'InProgress', 'Completed', 'Cancelled'];
const taskTypes = ['Observation', 'Feeding', 'Passage', 'QC', 'Other'];
const priorities = ['High', 'Medium', 'Low'];

const statusLabels: Record<string, string> = { Pending: 'Ожидает', InProgress: 'В работе', Completed: 'Завершена', Cancelled: 'Отменена' };
const typeLabels: Record<string, string> = { Observation: 'Осмотр', Feeding: 'Кормление', Passage: 'Пассаж', QC: 'Контроль качества', Other: 'Другое' };
const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  InProgress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export function TasksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const workflowFilter = searchParams.get('workflow');
  const [data, setData] = useState<Task[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', task_type: 'Observation', status: 'Pending', priority: 'Medium',
    due_date: '', container_id: '', assigned_to: ''
  });

  const load = async () => {
    setLoading(true);
    const [tasks, cont, prof] = await Promise.all([
      supabase.from('tasks').select('*, container:containers(*), assignee:profiles!assigned_to(*)').order('due_date', { ascending: true }),
      supabase.from('containers').select('*').eq('archived', false).eq('status', 'Active'),
      supabase.from('profiles').select('*').eq('is_active', true)
    ]);
    if (tasks.error) setError(tasks.error.message);
    else setData(tasks.data || []);
    setContainers(cont.data || []);
    setProfiles(prof.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = data.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (workflowFilter && t.workflow_instance_id?.toString() !== workflowFilter) return false;
    return true;
  });

  const openAdd = () => {
    setEditing(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setForm({ title: '', description: '', task_type: 'Observation', status: 'Pending', priority: 'Medium', due_date: tomorrow.toISOString().split('T')[0], container_id: '', assigned_to: user?.id || '' });
    setModalOpen(true);
  };

  const openEdit = (item: Task) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description || '',
      task_type: item.task_type,
      status: item.status,
      priority: item.priority,
      due_date: item.due_date?.split('T')[0] || '',
      container_id: item.container_id?.toString() || '',
      assigned_to: item.assigned_to || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      title: form.title,
      description: form.description || null,
      task_type: form.task_type,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
      container_id: form.container_id ? parseInt(form.container_id) : null,
      assigned_to: form.assigned_to || null
    };
    if (editing) {
      await supabase.from('tasks').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('tasks').insert(payload);
    }
    setModalOpen(false);
    load();
  };

  const handleArchive = async (item: Task) => {
    await supabase.from('tasks').update({ status: item.status === 'Cancelled' ? 'Pending' : 'Cancelled' }).eq('id', item.id);
    load();
  };

  const columns = [
    { key: 'title', label: 'Название' },
    { key: 'task_type', label: 'Тип', render: (t: Task) => typeLabels[t.task_type] || t.task_type },
    { key: 'status', label: 'Статус', render: (t: Task) => <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[t.status]}`}>{statusLabels[t.status]}</span> },
    { key: 'priority', label: 'Приоритет' },
    { key: 'due_date', label: 'Срок', render: (t: Task) => t.due_date ? new Date(t.due_date).toLocaleDateString('ru-RU') : '-' },
    { key: 'container', label: 'Контейнер', render: (t: Task) => t.container?.container_code || '-' },
    { key: 'actions', label: '', render: (t: Task) => t.status !== 'Completed' && t.status !== 'Cancelled' && (
      <button onClick={(e) => { e.stopPropagation(); navigate(`/tasks/${t.id}/execute`); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Выполнить">
        <Play size={16} className="text-green-600" />
      </button>
    )},
  ];

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Задачи</h1>
        <div className="flex gap-4 flex-wrap items-center">
          {workflowFilter && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
              <span>Workflow #{workflowFilter}</span>
              <button onClick={() => setSearchParams({})} className="hover:text-blue-900"><X size={14} /></button>
            </div>
          )}
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-40">
            <option value="">Все статусы</option>
            {statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
          </Select>
          <Select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-40">
            <option value="">Все приоритеты</option>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
      </div>

      <DataTable
        title=""
        data={filtered}
        loading={loading}
        error={error}
        columns={columns}
        searchKeys={['title']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Редактирование задачи' : 'Новая задача'}>
        <FormField label="Название" required>
          <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </FormField>
        <FormField label="Описание">
          <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </FormField>
        <FormField label="Тип задачи" required>
          <Select value={form.task_type} onChange={e => setForm({ ...form, task_type: e.target.value })}>
            {taskTypes.map(t => <option key={t} value={t}>{typeLabels[t]}</option>)}
          </Select>
        </FormField>
        <FormField label="Приоритет" required>
          <Select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
        </FormField>
        <FormField label="Срок выполнения">
          <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
        </FormField>
        <FormField label="Контейнер">
          <Select value={form.container_id} onChange={e => setForm({ ...form, container_id: e.target.value })}>
            <option value="">-- Не выбран --</option>
            {containers.map(c => <option key={c.id} value={c.id}>{c.container_code}</option>)}
          </Select>
        </FormField>
        <FormField label="Исполнитель">
          <Select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
            <option value="">-- Не назначен --</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name || p.username}</option>)}
          </Select>
        </FormField>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </div>
      </Modal>
    </>
  );
}
