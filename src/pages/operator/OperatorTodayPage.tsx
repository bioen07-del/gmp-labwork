import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, WorkflowInstance, Task, Container } from '@/lib/supabase';
import { Loader2, Play, Search, ChevronRight, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  Donation: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Primary: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  MCB_Creation: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  MCB_Stored: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  WCB_Creation: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  WCB_Stored: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Released: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  Disposed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  Closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
};

export function OperatorTodayPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scanCode, setScanCode] = useState('');
  const [runs, setRuns] = useState<WorkflowInstance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scanResult, setScanResult] = useState<Container | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Load active runs (not Closed/Disposed/Released)
    const { data: runsData } = await supabase
      .from('workflow_instances')
      .select('*, process_version:process_versions(*, process:processes(*))')
      .not('stage', 'in', '(Closed,Disposed,Released)')
      .order('id', { ascending: false })
      .limit(20);

    // Load pending/in-progress group tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*, container:containers(*), workflow_instance:workflow_instances(*)')
      .in('status', ['Pending', 'InProgress'])
      .eq('is_group', true)
      .order('due_date', { ascending: true })
      .limit(20);

    setRuns(runsData || []);
    setTasks(tasksData || []);
    setLoading(false);
  };

  const handleScan = async () => {
    if (!scanCode.trim()) return;
    
    setScanError(null);
    setScanResult(null);

    const { data, error } = await supabase
      .from('containers')
      .select('*, container_type:container_types(*), location:locations(*), donation:donations(*)')
      .eq('container_code', scanCode.trim().toUpperCase())
      .single();

    if (error || !data) {
      setScanError('Контейнер не найден');
      return;
    }

    setScanResult(data);
    // Navigate to run if container has donation with workflow
    if (data.donation_id) {
      // Find workflow instance for this donation
      const { data: workflow } = await supabase
        .from('workflow_instances')
        .select('id')
        .eq('root_material_id', data.material_id)
        .single();
      
      if (workflow) {
        navigate(`/operator/runs/${workflow.id}`);
        return;
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleScan();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Рабочий день</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          {format(new Date(), 'd MMMM yyyy, EEEE', { locale: ru })}
        </p>
      </div>

      {/* Scan Input */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
          Сканировать контейнер
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={scanCode}
              onChange={e => setScanCode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите или отсканируйте код..."
              className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <button
            onClick={handleScan}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-lg transition-colors"
          >
            Найти
          </button>
        </div>
        {scanError && (
          <p className="mt-3 text-red-500 flex items-center gap-2">
            <AlertCircle size={18} /> {scanError}
          </p>
        )}
        {scanResult && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-green-700 dark:text-green-400 font-medium">
              Найден: {scanResult.container_code} — {scanResult.container_type?.code}
            </p>
          </div>
        )}
      </div>

      {/* Active Runs */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Play size={22} className="text-blue-500" />
          Активные Run ({runs.length})
        </h2>
        
        {runs.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center text-gray-500">
            Нет активных Run
          </div>
        ) : (
          <div className="grid gap-4">
            {runs.map(run => (
              <div
                key={run.id}
                onClick={() => navigate(`/operator/runs/${run.id}`)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 cursor-pointer hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-lg text-gray-800 dark:text-white">
                      Run #{run.id}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${stageColors[run.stage] || stageColors.Donation}`}>
                      {stageLabels[run.stage] || run.stage}
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {run.run_name || run.process_version?.process?.name_ru || 'Процесс'}
                  </p>
                </div>
                <ChevronRight size={24} className="text-gray-400" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group Tasks */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Clock size={22} className="text-orange-500" />
          Мои задачи ({tasks.length})
        </h2>
        
        {tasks.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center text-gray-500">
            Нет активных задач
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => navigate(`/operator/tasks/${task.id}`)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 cursor-pointer hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-gray-800 dark:text-white">{task.title}</span>
                      {task.status === 'InProgress' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">
                          В работе
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {task.workflow_instance ? `Run #${task.workflow_instance.id}` : ''}
                      {task.due_date && ` • До ${format(new Date(task.due_date), 'd MMM', { locale: ru })}`}
                    </p>
                  </div>
                  <ChevronRight size={24} className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
