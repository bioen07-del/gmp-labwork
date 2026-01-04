import React, { useEffect, useState } from 'react';
import { supabase, Process, ProcessVersion, ProcessStep, StepTemplate } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { Plus, Loader2, ChevronDown, ChevronRight, GripVertical, Trash2, Copy, Settings } from 'lucide-react';

const versionStatuses = ['Draft', 'Active', 'Archived'];
const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Archived: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function ProcessBuilderPage() {
  const { canEdit, isAdmin } = useAuth();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [versions, setVersions] = useState<ProcessVersion[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [stepTemplates, setStepTemplates] = useState<StepTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ProcessVersion | null>(null);

  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [editingVersion, setEditingVersion] = useState<ProcessVersion | null>(null);
  const [editingStep, setEditingStep] = useState<ProcessStep | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);

  const [processForm, setProcessForm] = useState({ code: '', name_ru: '', description: '' });
  const [versionForm, setVersionForm] = useState({ version: '', status: 'Draft' });
  const [stepForm, setStepForm] = useState({ step_template_id: '', step_order: '', is_repeatable: false });

  const load = async () => {
    setLoading(true);
    const [proc, ver, stp, tmpl] = await Promise.all([
      supabase.from('processes').select('*').order('code'),
      supabase.from('process_versions').select('*, process:processes(*)').order('id', { ascending: false }),
      supabase.from('process_steps').select('*, step_template:step_templates(*)').order('step_order'),
      supabase.from('step_templates').select('*').order('code')
    ]);
    setProcesses(proc.data || []);
    setVersions(ver.data || []);
    setSteps(stp.data || []);
    setStepTemplates(tmpl.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = (id: number) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Process CRUD
  const openAddProcess = () => {
    setEditingProcess(null);
    setProcessForm({ code: '', name_ru: '', description: '' });
    setProcessModalOpen(true);
  };

  const openEditProcess = (p: Process) => {
    setEditingProcess(p);
    setProcessForm({ code: p.code, name_ru: p.name_ru, description: p.description || '' });
    setProcessModalOpen(true);
  };

  const saveProcess = async () => {
    const payload = { code: processForm.code, name_ru: processForm.name_ru, description: processForm.description || null };
    if (editingProcess) {
      await supabase.from('processes').update(payload).eq('id', editingProcess.id);
    } else {
      await supabase.from('processes').insert(payload);
    }
    setProcessModalOpen(false);
    load();
  };

  // Version CRUD
  const openAddVersion = (processId: number) => {
    setSelectedProcessId(processId);
    setEditingVersion(null);
    setVersionForm({ version: '1.0', status: 'Draft' });
    setVersionModalOpen(true);
  };

  const openEditVersion = (v: ProcessVersion) => {
    setSelectedProcessId(v.process_id);
    setEditingVersion(v);
    setVersionForm({ version: v.version, status: v.status });
    setVersionModalOpen(true);
  };

  const saveVersion = async () => {
    const payload = { process_id: selectedProcessId, version: versionForm.version, status: versionForm.status };
    if (editingVersion) {
      await supabase.from('process_versions').update(payload).eq('id', editingVersion.id);
    } else {
      await supabase.from('process_versions').insert(payload);
    }
    setVersionModalOpen(false);
    load();
  };

  // Step CRUD
  const openAddStep = (version: ProcessVersion) => {
    setSelectedVersion(version);
    setEditingStep(null);
    const versionSteps = steps.filter(s => s.process_version_id === version.id);
    const nextOrder = versionSteps.length > 0 ? Math.max(...versionSteps.map(s => s.step_order)) + 1 : 1;
    setStepForm({ step_template_id: stepTemplates[0]?.id.toString() || '', step_order: nextOrder.toString(), is_repeatable: false });
    setStepModalOpen(true);
  };

  const openEditStep = (step: ProcessStep, version: ProcessVersion) => {
    setSelectedVersion(version);
    setEditingStep(step);
    setStepForm({ 
      step_template_id: step.step_template_id.toString(), 
      step_order: step.step_order.toString(), 
      is_repeatable: step.is_repeatable 
    });
    setStepModalOpen(true);
  };

  const saveStep = async () => {
    const payload = {
      process_version_id: selectedVersion?.id,
      step_template_id: parseInt(stepForm.step_template_id),
      step_order: parseInt(stepForm.step_order),
      is_repeatable: stepForm.is_repeatable
    };
    if (editingStep) {
      await supabase.from('process_steps').update(payload).eq('id', editingStep.id);
    } else {
      await supabase.from('process_steps').insert(payload);
    }
    setStepModalOpen(false);
    load();
  };

  const deleteStep = async (stepId: number) => {
    if (confirm('Удалить шаг?')) {
      await supabase.from('process_steps').delete().eq('id', stepId);
      load();
    }
  };

  const moveStep = async (step: ProcessStep, direction: 'up' | 'down') => {
    const versionSteps = steps.filter(s => s.process_version_id === step.process_version_id).sort((a, b) => a.step_order - b.step_order);
    const idx = versionSteps.findIndex(s => s.id === step.id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === versionSteps.length - 1)) return;
    
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const swapStep = versionSteps[swapIdx];
    
    await supabase.from('process_steps').update({ step_order: swapStep.step_order }).eq('id', step.id);
    await supabase.from('process_steps').update({ step_order: step.step_order }).eq('id', swapStep.id);
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Конструктор процессов</h1>
        {isAdmin() && (
          <button onClick={openAddProcess} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus size={20} /> Новый процесс
          </button>
        )}
      </div>

      <div className="space-y-4">
        {processes.map(proc => {
          const procVersions = versions.filter(v => v.process_id === proc.id);
          const isExp = expanded.includes(proc.id);

          return (
            <div key={proc.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div 
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => toggleExpand(proc.id)}
              >
                <div className="flex items-center gap-3">
                  {isExp ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}
                  <Settings size={20} className="text-indigo-500" />
                  <div>
                    <span className="font-medium text-gray-800 dark:text-white">{proc.code}</span>
                    <span className="ml-2 text-gray-500 dark:text-gray-400">{proc.name_ru}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{procVersions.length} версий</span>
                  {isAdmin() && (
                    <button onClick={e => { e.stopPropagation(); openEditProcess(proc); }} className="text-blue-600 hover:text-blue-700 text-sm">
                      Изм.
                    </button>
                  )}
                </div>
              </div>

              {isExp && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  {proc.description && <p className="text-sm text-gray-600 dark:text-gray-400">{proc.description}</p>}
                  
                  {procVersions.map(ver => {
                    const verSteps = steps.filter(s => s.process_version_id === ver.id).sort((a, b) => a.step_order - b.step_order);
                    
                    return (
                      <div key={ver.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 dark:text-white">v{ver.version}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[ver.status]}`}>{ver.status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAdmin() && (
                              <>
                                <button onClick={() => openAddStep(ver)} className="text-green-600 hover:text-green-700 text-sm">+ Шаг</button>
                                <button onClick={() => openEditVersion(ver)} className="text-blue-600 hover:text-blue-700 text-sm">Изм.</button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {verSteps.length === 0 ? (
                            <div className="px-4 py-3 text-center text-gray-500 text-sm">Нет шагов</div>
                          ) : verSteps.map((step, idx) => (
                            <div key={step.id} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full text-xs font-medium">
                                  {step.step_order}
                                </span>
                                <div>
                                  <span className="text-sm font-medium text-gray-800 dark:text-white">{step.step_template?.code}</span>
                                  <span className="ml-2 text-sm text-gray-500">{step.step_template?.name_ru}</span>
                                </div>
                                {step.is_repeatable && (
                                  <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded text-xs">Повторяемый</span>
                                )}
                              </div>
                              {isAdmin() && ver.status === 'Draft' && (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => moveStep(step, 'up')} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                                    <ChevronDown size={16} className="rotate-180" />
                                  </button>
                                  <button onClick={() => moveStep(step, 'down')} disabled={idx === verSteps.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                                    <ChevronDown size={16} />
                                  </button>
                                  <button onClick={() => openEditStep(step, ver)} className="p-1 text-blue-600 hover:text-blue-700">
                                    <Settings size={16} />
                                  </button>
                                  <button onClick={() => deleteStep(step.id)} className="p-1 text-red-600 hover:text-red-700">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  
                  {isAdmin() && (
                    <button onClick={() => openAddVersion(proc.id)} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <Plus size={16} /> Новая версия
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Process Modal */}
      <Modal isOpen={processModalOpen} onClose={() => setProcessModalOpen(false)} title={editingProcess ? 'Редактирование процесса' : 'Новый процесс'}>
        <FormField label="Код" required>
          <Input value={processForm.code} onChange={e => setProcessForm({ ...processForm, code: e.target.value })} />
        </FormField>
        <FormField label="Название" required>
          <Input value={processForm.name_ru} onChange={e => setProcessForm({ ...processForm, name_ru: e.target.value })} />
        </FormField>
        <FormField label="Описание">
          <textarea 
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={3}
            value={processForm.description}
            onChange={e => setProcessForm({ ...processForm, description: e.target.value })}
          />
        </FormField>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setProcessModalOpen(false)}>Отмена</Button>
          <Button onClick={saveProcess}>Сохранить</Button>
        </div>
      </Modal>

      {/* Version Modal */}
      <Modal isOpen={versionModalOpen} onClose={() => setVersionModalOpen(false)} title={editingVersion ? 'Редактирование версии' : 'Новая версия'}>
        <FormField label="Версия" required>
          <Input value={versionForm.version} onChange={e => setVersionForm({ ...versionForm, version: e.target.value })} placeholder="1.0" />
        </FormField>
        <FormField label="Статус" required>
          <Select value={versionForm.status} onChange={e => setVersionForm({ ...versionForm, status: e.target.value })}>
            {versionStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setVersionModalOpen(false)}>Отмена</Button>
          <Button onClick={saveVersion}>Сохранить</Button>
        </div>
      </Modal>

      {/* Step Modal */}
      <Modal isOpen={stepModalOpen} onClose={() => setStepModalOpen(false)} title={editingStep ? 'Редактирование шага' : 'Новый шаг'}>
        <FormField label="Шаблон шага" required>
          <Select value={stepForm.step_template_id} onChange={e => setStepForm({ ...stepForm, step_template_id: e.target.value })}>
            {stepTemplates.map(t => <option key={t.id} value={t.id}>{t.code} - {t.name_ru}</option>)}
          </Select>
        </FormField>
        <FormField label="Порядковый номер" required>
          <Input type="number" value={stepForm.step_order} onChange={e => setStepForm({ ...stepForm, step_order: e.target.value })} />
        </FormField>
        <FormField label="">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={stepForm.is_repeatable} onChange={e => setStepForm({ ...stepForm, is_repeatable: e.target.checked })} />
            <span className="text-sm text-gray-700 dark:text-gray-300">Повторяемый шаг</span>
          </label>
        </FormField>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setStepModalOpen(false)}>Отмена</Button>
          <Button onClick={saveStep}>Сохранить</Button>
        </div>
      </Modal>
    </div>
  );
}
