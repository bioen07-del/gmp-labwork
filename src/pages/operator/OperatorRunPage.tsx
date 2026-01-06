import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, WorkflowInstance, Container, Task, Donation } from '@/lib/supabase';
import { Loader2, ArrowLeft, Eye, Droplets, GitBranch, Snowflake, Trash2, ChevronRight, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const stageLabels: Record<string, string> = {
  Donation: 'Донация',
  Primary: 'Первичная культура',
  MCB_Creation: 'Создание MCB',
  MCB_Stored: 'MCB хранится',
  WCB_Creation: 'Создание WCB',
  WCB_Stored: 'WCB хранится',
  Released: 'Выдано',
  Disposed: 'Утилизировано',
  Closed: 'Закрыто'
};

const stageColors: Record<string, string> = {
  Donation: 'bg-blue-500',
  Primary: 'bg-purple-500',
  MCB_Creation: 'bg-orange-500',
  MCB_Stored: 'bg-green-500',
  WCB_Creation: 'bg-orange-500',
  WCB_Stored: 'bg-green-500',
  Released: 'bg-teal-500',
  Disposed: 'bg-gray-500',
  Closed: 'bg-gray-500'
};

type ActionType = 'Inspect' | 'Feed' | 'Passage' | 'Freeze' | 'Dispose';

const actionConfig: Record<ActionType, { icon: React.ReactNode; label: string; color: string }> = {
  Inspect: { icon: <Eye size={28} />, label: 'Осмотр', color: 'bg-blue-600 hover:bg-blue-700' },
  Feed: { icon: <Droplets size={28} />, label: 'Кормление', color: 'bg-green-600 hover:bg-green-700' },
  Passage: { icon: <GitBranch size={28} />, label: 'Пассаж', color: 'bg-purple-600 hover:bg-purple-700' },
  Freeze: { icon: <Snowflake size={28} />, label: 'Заморозка', color: 'bg-cyan-600 hover:bg-cyan-700' },
  Dispose: { icon: <Trash2 size={28} />, label: 'Утилизация', color: 'bg-red-600 hover:bg-red-700' }
};

export function OperatorRunPage() {
  const { id: runId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<WorkflowInstance | null>(null);
  const [donation, setDonation] = useState<Donation | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  useEffect(() => {
    if (runId) loadData();
  }, [runId]);

  const loadData = async () => {
    setLoading(true);
    
    // Load run
    const { data: runData } = await supabase
      .from('workflow_instances')
      .select('*, process_version:process_versions(*, process:processes(*))')
      .eq('id', runId)
      .single();

    if (runData) {
      setRun(runData);
      
      // Load donation via root_material
      if (runData.root_material_id) {
        const { data: materialData } = await supabase
          .from('materials')
          .select('donation_id')
          .eq('id', runData.root_material_id)
          .single();
        
        if (materialData?.donation_id) {
          const { data: donationData } = await supabase
            .from('donations')
            .select('*, donor:donors(*)')
            .eq('id', materialData.donation_id)
            .single();
          setDonation(donationData);

          // Load containers for this donation
          const { data: containerData } = await supabase
            .from('containers')
            .select('*, container_type:container_types(*), location:locations(*)')
            .eq('donation_id', materialData.donation_id)
            .order('id', { ascending: false });
          setContainers(containerData || []);
        }
      }

      // Load tasks for this run
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('workflow_instance_id', runId)
        .in('status', ['Pending', 'InProgress'])
        .order('due_date', { ascending: true });
      setTasks(tasksData || []);
    }

    setLoading(false);
  };

  const createGroupTask = async (action: ActionType) => {
    if (!run) return;
    
    const activeContainers = containers.filter(c => c.status === 'Active' && !c.archived);
    if (activeContainers.length === 0) {
      alert('Нет активных контейнеров');
      return;
    }

    // Create group task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: `${actionConfig[action].label} — Run #${run.id}`,
        task_type: action,
        status: 'Pending',
        priority: 'Medium',
        scope_type: 'Run',
        scope_id: run.id,
        is_group: true,
        workflow_instance_id: run.id,
        due_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (taskError || !task) {
      alert('Ошибка создания задачи');
      return;
    }

    // Create task targets for each active container
    const targets = activeContainers.map(c => ({
      task_id: task.id,
      container_id: c.id,
      status: 'Pending'
    }));

    await supabase.from('task_targets').insert(targets);

    // Navigate to task
    navigate(`/operator/task/${task.id}`);
  };

  const filteredContainers = showOnlyActive 
    ? containers.filter(c => c.status === 'Active' && !c.archived)
    : containers;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-12 text-gray-500">Run не найден</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/operator/today')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Run #{run.id}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {run.run_name || run.process_version?.process?.name_ru}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-full text-white font-medium ${stageColors[run.stage] || stageColors.Donation}`}>
          {stageLabels[run.stage] || run.stage}
        </div>
      </div>

      {/* Donation Info */}
      {donation && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Донация</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Код:</span>
              <span className="ml-2 font-medium text-gray-800 dark:text-white">{donation.donation_code}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Тип:</span>
              <span className="ml-2 font-medium text-gray-800 dark:text-white">{donation.material_type}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Донор:</span>
              <span className="ml-2 font-medium text-gray-800 dark:text-white">{donation.donor?.donor_code || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Дата:</span>
              <span className="ml-2 font-medium text-gray-800 dark:text-white">
                {format(new Date(donation.donation_datetime), 'd MMM yyyy', { locale: ru })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Действия</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.keys(actionConfig) as ActionType[]).map(action => (
            <button
              key={action}
              onClick={() => createGroupTask(action)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl text-white ${actionConfig[action].color} transition-colors`}
            >
              {actionConfig[action].icon}
              <span className="mt-2 font-medium text-sm">{actionConfig[action].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Tasks */}
      {tasks.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Активные задачи</h3>
          <div className="space-y-2">
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => navigate(`/operator/task/${task.id}`)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-md flex items-center justify-between border border-gray-100 dark:border-gray-700"
              >
                <div>
                  <span className="font-medium text-gray-800 dark:text-white">{task.title}</span>
                  <span className={`ml-3 px-2 py-0.5 rounded text-xs font-medium ${
                    task.status === 'InProgress' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {task.status === 'InProgress' ? 'В работе' : 'Ожидает'}
                  </span>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Containers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-white">
            Контейнеры ({filteredContainers.length})
          </h3>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={showOnlyActive}
              onChange={e => setShowOnlyActive(e.target.checked)}
              className="rounded"
            />
            Только активные
          </label>
        </div>
        
        {filteredContainers.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center text-gray-500">
            Нет контейнеров
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-100 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Код</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Тип</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">P#</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Статус</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Локация</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredContainers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{c.container_code}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.container_type?.code}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.passage_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        c.status === 'Active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.location?.name_ru || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
