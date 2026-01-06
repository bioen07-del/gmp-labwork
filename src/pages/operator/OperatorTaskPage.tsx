import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Task, TaskTarget, Container } from '@/lib/supabase';
import { Loader2, ArrowLeft, Play, Save, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

type FinishMode = 'continue' | 'close' | 'cancel' | null;

export function OperatorTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [targets, setTargets] = useState<(TaskTarget & { container: Container })[]>([]);
  const [finishMode, setFinishMode] = useState<FinishMode>(null);
  const [skipReason, setSkipReason] = useState('');

  useEffect(() => {
    if (taskId) loadData();
  }, [taskId]);

  const loadData = async () => {
    setLoading(true);
    
    // Load task
    const { data: taskData } = await supabase
      .from('tasks')
      .select('*, workflow_instance:workflow_instances(*)')
      .eq('id', taskId)
      .single();

    if (taskData) {
      setTask(taskData);

      // Load targets with containers
      const { data: targetsData } = await supabase
        .from('task_targets')
        .select('*, container:containers(*, container_type:container_types(*), location:locations(*))')
        .eq('task_id', taskId)
        .order('id');

      setTargets(targetsData || []);
    }

    setLoading(false);
  };

  const startTask = async () => {
    if (!task) return;
    
    await supabase
      .from('tasks')
      .update({ status: 'InProgress' })
      .eq('id', task.id);

    setTask({ ...task, status: 'InProgress' });
  };

  const toggleTarget = async (target: TaskTarget & { container: Container }) => {
    const newStatus = target.status === 'Completed' ? 'Pending' : 'Completed';
    const now = newStatus === 'Completed' ? new Date().toISOString() : null;

    await supabase
      .from('task_targets')
      .update({ status: newStatus, completed_at: now })
      .eq('id', target.id);

    setTargets(targets.map(t => 
      t.id === target.id 
        ? { ...t, status: newStatus, completed_at: now } 
        : t
    ));
  };

  const updateTargetNotes = async (targetId: number, notes: string) => {
    await supabase
      .from('task_targets')
      .update({ notes })
      .eq('id', targetId);

    setTargets(targets.map(t => 
      t.id === targetId ? { ...t, notes } : t
    ));
  };

  const saveAndContinue = async () => {
    setSaving(true);
    // Just save current state, task stays InProgress
    setFinishMode(null);
    setSaving(false);
    navigate(-1);
  };

  const closeAndSkipRemaining = async () => {
    if (!skipReason.trim()) {
      alert('Укажите причину пропуска');
      return;
    }

    setSaving(true);

    // Mark all pending as skipped
    const pendingIds = targets.filter(t => t.status === 'Pending').map(t => t.id);
    if (pendingIds.length > 0) {
      await supabase
        .from('task_targets')
        .update({ status: 'Skipped', skipped_reason: skipReason })
        .in('id', pendingIds);
    }

    // Complete task
    await supabase
      .from('tasks')
      .update({ status: 'Completed', completed_at: new Date().toISOString() })
      .eq('id', task?.id);

    setSaving(false);
    navigate('/operator/today');
  };

  const cancelTask = async () => {
    setSaving(true);
    
    await supabase
      .from('tasks')
      .update({ status: 'Cancelled' })
      .eq('id', task?.id);

    setSaving(false);
    navigate(-1);
  };

  const completedCount = targets.filter(t => t.status === 'Completed').length;
  const pendingCount = targets.filter(t => t.status === 'Pending').length;
  const skippedCount = targets.filter(t => t.status === 'Skipped').length;
  const allDone = pendingCount === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12 text-gray-500">Задача не найдена</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {task.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {task.workflow_instance && `Run #${task.workflow_instance.id}`}
            {task.due_date && ` • До ${format(new Date(task.due_date), 'd MMM', { locale: ru })}`}
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full font-medium ${
          task.status === 'InProgress' 
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            : task.status === 'Completed'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        }`}>
          {task.status === 'InProgress' ? 'В работе' : task.status === 'Completed' ? 'Завершена' : 'Ожидает'}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">Прогресс</span>
          <span className="text-sm font-medium text-gray-800 dark:text-white">
            {completedCount} / {targets.length} контейнеров
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${targets.length ? (completedCount / targets.length) * 100 : 0}%` }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle size={16} /> {completedCount} выполнено
          </span>
          <span className="flex items-center gap-1 text-yellow-600">
            <AlertTriangle size={16} /> {pendingCount} ожидает
          </span>
          {skippedCount > 0 && (
            <span className="flex items-center gap-1 text-gray-500">
              <XCircle size={16} /> {skippedCount} пропущено
            </span>
          )}
        </div>
      </div>

      {/* Start Button */}
      {task.status === 'Pending' && (
        <button
          onClick={startTask}
          className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-lg flex items-center justify-center gap-3"
        >
          <Play size={24} />
          Начать работу
        </button>
      )}

      {/* Containers Table */}
      {task.status !== 'Pending' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-100 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 w-12"></th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Контейнер</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Тип</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">P#</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Локация</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {targets.map(target => (
                <tr 
                  key={target.id} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                    target.status === 'Completed' ? 'bg-green-50 dark:bg-green-900/10' : 
                    target.status === 'Skipped' ? 'bg-gray-50 dark:bg-gray-900/10 opacity-60' : ''
                  }`}
                  onClick={() => target.status !== 'Skipped' && toggleTarget(target)}
                >
                  <td className="px-4 py-4">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      target.status === 'Completed' 
                        ? 'bg-green-500 border-green-500 text-white'
                        : target.status === 'Skipped'
                        ? 'bg-gray-300 border-gray-300 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {target.status === 'Completed' && <CheckCircle size={16} />}
                      {target.status === 'Skipped' && <XCircle size={16} />}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-800 dark:text-white">
                    {target.container?.container_code}
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    {target.container?.container_type?.code}
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    {target.container?.passage_number ?? '—'}
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    {target.container?.location?.name_ru || '—'}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      target.status === 'Completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : target.status === 'Skipped'
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {target.status === 'Completed' ? 'Готово' : target.status === 'Skipped' ? 'Пропущен' : 'Ожидает'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Finish Actions */}
      {task.status === 'InProgress' && (
        <div className="space-y-3">
          {allDone ? (
            <button
              onClick={async () => {
                await supabase
                  .from('tasks')
                  .update({ status: 'Completed', completed_at: new Date().toISOString() })
                  .eq('id', task.id);
                navigate('/operator/today');
              }}
              className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium text-lg flex items-center justify-center gap-3"
            >
              <CheckCircle size={24} />
              Завершить задачу
            </button>
          ) : (
            <button
              onClick={() => setFinishMode('continue')}
              className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-lg flex items-center justify-center gap-3"
            >
              <Save size={24} />
              Завершить работу
            </button>
          )}
        </div>
      )}

      {/* Finish Modal */}
      {finishMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Завершение работы
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Осталось необработанных контейнеров: <strong>{pendingCount}</strong>
            </p>

            <div className="space-y-3">
              <button
                onClick={saveAndContinue}
                disabled={saving}
                className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
              >
                <Save size={20} />
                Сохранить и продолжить позже
              </button>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-sm text-gray-500 mb-2">Или закрыть задачу (необходима причина):</p>
                <input
                  type="text"
                  value={skipReason}
                  onChange={e => setSkipReason(e.target.value)}
                  placeholder="Причина пропуска оставшихся..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white mb-3"
                />
                <button
                  onClick={closeAndSkipRemaining}
                  disabled={saving || !skipReason.trim()}
                  className="w-full py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle size={20} />
                  Закрыть и пометить как пропущенные
                </button>
              </div>

              <button
                onClick={() => setFinishMode(null)}
                className="w-full py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
