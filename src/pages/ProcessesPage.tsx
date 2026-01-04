import React, { useEffect, useState } from 'react';
import { supabase, Process, ProcessVersion, ProcessStep } from '@/lib/supabase';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';

export function ProcessesPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [versions, setVersions] = useState<Record<number, ProcessVersion[]>>({});
  const [steps, setSteps] = useState<Record<number, ProcessStep[]>>({});
  const [expanded, setExpanded] = useState<number[]>([]);
  const [expandedVersions, setExpandedVersions] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: proc } = await supabase.from('processes').select('*').order('code');
      setProcesses(proc || []);
      setLoading(false);
    };
    load();
  }, []);

  const toggleProcess = async (processId: number) => {
    if (expanded.includes(processId)) {
      setExpanded(expanded.filter(id => id !== processId));
    } else {
      setExpanded([...expanded, processId]);
      if (!versions[processId]) {
        const { data } = await supabase.from('process_versions').select('*').eq('process_id', processId).order('version', { ascending: false });
        setVersions({ ...versions, [processId]: data || [] });
      }
    }
  };

  const toggleVersion = async (versionId: number) => {
    if (expandedVersions.includes(versionId)) {
      setExpandedVersions(expandedVersions.filter(id => id !== versionId));
    } else {
      setExpandedVersions([...expandedVersions, versionId]);
      if (!steps[versionId]) {
        const { data } = await supabase.from('process_steps').select('*, step_template:step_templates(*)').eq('process_version_id', versionId).order('step_order');
        setSteps({ ...steps, [versionId]: data || [] });
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Процессы</h1>

      {processes.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Нет процессов</div>
      ) : (
        <div className="space-y-2">
          {processes.map(proc => (
            <div key={proc.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <button
                onClick={() => toggleProcess(proc.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-800 dark:text-white">{proc.code}</span>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">{proc.name_ru}</span>
                </div>
                {expanded.includes(proc.id) ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
              </button>

              {expanded.includes(proc.id) && (
                <div className="px-4 pb-4">
                  {proc.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{proc.description}</p>}
                  
                  {versions[proc.id]?.length === 0 ? (
                    <div className="text-sm text-gray-500">Нет версий</div>
                  ) : (
                    <div className="space-y-2 ml-4">
                      {versions[proc.id]?.map(ver => (
                        <div key={ver.id} className="border border-gray-200 dark:border-gray-700 rounded">
                          <button
                            onClick={() => toggleVersion(ver.id)}
                            className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">v{ver.version}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${ver.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                                {ver.status}
                              </span>
                            </div>
                            {expandedVersions.includes(ver.id) ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                          </button>

                          {expandedVersions.includes(ver.id) && steps[ver.id] && (
                            <div className="p-3 pt-0 border-t border-gray-200 dark:border-gray-700">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Шаги процесса:</div>
                              <div className="space-y-1">
                                {steps[ver.id].map((step, idx) => (
                                  <div key={step.id} className="flex items-center gap-2 text-sm">
                                    <span className="w-6 h-6 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full text-xs">{idx + 1}</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{step.step_template?.code}</span>
                                    <span className="text-gray-500 dark:text-gray-400">{step.step_template?.name_ru}</span>
                                    {step.is_repeatable && <span className="text-xs text-blue-500">(повторяемый)</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
