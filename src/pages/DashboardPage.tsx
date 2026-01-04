import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Task, Container } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Clock, AlertTriangle, Package, ListTodo, Loader2 } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [activeContainers, setActiveContainers] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [tasksRes, overdueRes, containersRes] = await Promise.all([
        supabase.from('tasks')
          .select('*, container:containers(*)')
          .in('status', ['Pending', 'InProgress'])
          .or(`assigned_to.eq.${user?.id},assigned_to.is.null`)
          .lte('due_date', today + 'T23:59:59')
          .order('due_date'),
        supabase.from('tasks')
          .select('*, container:containers(*)')
          .in('status', ['Pending', 'InProgress'])
          .lt('due_date', today)
          .order('due_date'),
        supabase.from('containers')
          .select('id', { count: 'exact' })
          .eq('status', 'Active')
          .eq('archived', false)
      ]);

      setMyTasks(tasksRes.data || []);
      setOverdueTasks(overdueRes.data || []);
      setActiveContainers(containersRes.count || 0);
      setLoading(false);
    };
    load();
  }, [user]);

  const priorityColors: Record<string, string> = {
    High: 'text-red-600 bg-red-50 dark:bg-red-900/30',
    Medium: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',
    Low: 'text-green-600 bg-green-50 dark:bg-green-900/30',
  };

  const taskTypeLabels: Record<string, string> = {
    Observation: 'Осмотр',
    Feeding: 'Кормление',
    Passage: 'Пассаж',
    QC: 'Контроль качества',
    Other: 'Другое',
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Дашборд</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <ListTodo className="text-blue-600" size={24} />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Мои задачи сегодня</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{myTasks.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600" size={24} />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Просрочено</div>
              <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <Package className="text-green-600" size={24} />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Активные контейнеры</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{activeContainers}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle size={20} /> Просроченные задачи
          </h2>
          <div className="space-y-2">
            {overdueTasks.slice(0, 5).map(task => (
              <Link key={task.id} to={`/tasks/${task.id}`} className="block p-3 bg-white dark:bg-gray-800 rounded hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-800 dark:text-white">{task.title}</span>
                    {task.container && <span className="ml-2 text-sm text-gray-500">({task.container.container_code})</span>}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">{taskTypeLabels[task.task_type]} - до {new Date(task.due_date!).toLocaleDateString('ru-RU')}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Today's Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Clock size={20} /> Задачи на сегодня
          </h2>
          <Link to="/tasks" className="text-blue-600 hover:text-blue-700 text-sm">Все задачи</Link>
        </div>

        {myTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CheckCircle size={48} className="mx-auto mb-2 opacity-50" />
            Нет задач на сегодня
          </div>
        ) : (
          <div className="space-y-2">
            {myTasks.slice(0, 10).map(task => (
              <Link key={task.id} to={`/tasks/${task.id}`} className="block p-3 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-800 dark:text-white">{task.title}</span>
                    {task.container && <span className="ml-2 text-sm text-gray-500">({task.container.container_code})</span>}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{taskTypeLabels[task.task_type]}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
