import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, Task } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Clock, AlertTriangle, Package, ListTodo, Loader2, Droplet, Archive, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

type Stats = {
  activeTasks: number;
  overdueTasks: number;
  activeContainers: number;
  donations: number;
  banks: number;
};

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats>({ activeTasks: 0, overdueTasks: 0, activeContainers: 0, donations: 0, banks: 0 });
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [tasksRes, overdueCount, containersCount, donationsCount, banksCount] = await Promise.all([
        supabase.from('tasks')
          .select('*, container:containers(*)')
          .in('status', ['Pending', 'InProgress'])
          .order('due_date', { ascending: true }),
        supabase.from('tasks')
          .select('id', { count: 'exact', head: true })
          .in('status', ['Pending', 'InProgress'])
          .lt('due_date', today),
        supabase.from('containers')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Active')
          .eq('archived', false),
        supabase.from('donations')
          .select('id', { count: 'exact', head: true })
          .eq('archived', false),
        supabase.from('bank_batches')
          .select('id', { count: 'exact', head: true })
      ]);

      setTasks(tasksRes.data || []);
      setStats({
        activeTasks: tasksRes.data?.length || 0,
        overdueTasks: overdueCount.count || 0,
        activeContainers: containersCount.count || 0,
        donations: donationsCount.count || 0,
        banks: banksCount.count || 0
      });
      setLoading(false);
    };
    load();
  }, [user]);

  const priorityColors: Record<string, string> = {
    High: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400',
    Medium: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400',
    Low: 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400',
  };

  const statusColors: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    InProgress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  // Календарь
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    
    // Пустые ячейки до первого дня
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Понедельник = 0
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    
    // Дни месяца
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(t => t.due_date?.startsWith(dateStr));
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const today = new Date().toISOString().split('T')[0];

  const selectedTasks = selectedDate ? tasks.filter(t => t.due_date?.startsWith(selectedDate)) : [];

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Дашборд</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Link to="/tasks" className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <ListTodo className="text-blue-600" size={24} />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Активные задачи</div>
              <div className="text-xl font-bold text-gray-800 dark:text-white">{stats.activeTasks}</div>
            </div>
          </div>
        </Link>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600" size={24} />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Просрочено</div>
              <div className="text-xl font-bold text-red-600">{stats.overdueTasks}</div>
            </div>
          </div>
        </div>
        <Link to="/containers" className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <Package className="text-green-600" size={24} />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Культуры</div>
              <div className="text-xl font-bold text-gray-800 dark:text-white">{stats.activeContainers}</div>
            </div>
          </div>
        </Link>
        <Link to="/donations" className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <Droplet className="text-purple-600" size={24} />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Донации</div>
              <div className="text-xl font-bold text-gray-800 dark:text-white">{stats.donations}</div>
            </div>
          </div>
        </Link>
        <Link to="/banks" className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <Archive className="text-orange-600" size={24} />
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Банки</div>
              <div className="text-xl font-bold text-gray-800 dark:text-white">{stats.banks}</div>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Активные задачи */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <ListTodo size={20} /> Активные задачи
            </h2>
            <Link to="/tasks" className="text-blue-600 hover:text-blue-700 text-sm">Все →</Link>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-2 opacity-50" />
              Нет активных задач
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {tasks.slice(0, 10).map(task => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/tasks/${task.id}/execute`)}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-800 dark:text-white truncate">{task.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${statusColors[task.status]}`}>
                      {task.status === 'Pending' ? 'Ожидает' : 'В работе'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : 'Без срока'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[task.priority]}`}>{task.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Календарь */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Calendar size={20} /> Календарь задач
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32 text-center">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <ChevronRight size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {/* Дни недели */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Дни месяца */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr = day.toISOString().split('T')[0];
              const dayTasks = getTasksForDate(day);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const hasOverdue = dayTasks.some(t => t.due_date && t.due_date < today);
              
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`aspect-square rounded text-sm relative flex flex-col items-center justify-center transition
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                    ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                    ${!isSelected && 'text-gray-700 dark:text-gray-300'}
                  `}
                >
                  {day.getDate()}
                  {dayTasks.length > 0 && (
                    <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${hasOverdue ? 'bg-red-500' : isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Задачи выбранного дня */}
          {selectedDate && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </h3>
              {selectedTasks.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Нет задач</p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedTasks.map(t => (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/tasks/${t.id}/execute`)}
                      className="text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {t.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
