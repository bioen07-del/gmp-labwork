import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Task, Container, StepTemplate } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

const morphologyOptions = ['Normal', 'Elongated', 'Rounded', 'Mixed', 'Abnormal'];
const sterilityOptions = ['Clear', 'Suspicious', 'Contaminated'];

export function TaskExecutePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [stepTemplates, setStepTemplates] = useState<StepTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [selectedContainer, setSelectedContainer] = useState('');
  const [selectedStep, setSelectedStep] = useState('');
  const [formData, setFormData] = useState({
    confluency_percent: '',
    morphology: 'Normal',
    sterility: 'Clear',
    notes: ''
  });

  useEffect(() => {
    const load = async () => {
      const [taskRes, contRes, stepsRes] = await Promise.all([
        supabase.from('tasks').select('*, container:containers(*)').eq('id', id).single(),
        supabase.from('containers').select('*').eq('archived', false).eq('status', 'Active'),
        supabase.from('step_templates').select('*')
      ]);
      
      if (taskRes.data) {
        setTask(taskRes.data);
        if (taskRes.data.container_id) {
          setSelectedContainer(taskRes.data.container_id.toString());
        }
        // Auto-select step template based on task type
        const typeToStep: Record<string, string> = { Observation: 'OBSERVE', Feeding: 'FEED', Passage: 'PASSAGE' };
        const stepCode = typeToStep[taskRes.data.task_type];
        const step = stepsRes.data?.find(s => s.code === stepCode);
        if (step) setSelectedStep(step.id.toString());
      }
      setContainers(contRes.data || []);
      setStepTemplates(stepsRes.data || []);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleExecute = async () => {
    if (!selectedContainer || !selectedStep) return;
    
    setSaving(true);
    
    // Create executed_step record
    const { data: execStep, error: stepError } = await supabase.from('executed_steps').insert({
      workflow_instance_id: task?.workflow_instance_id || null,
      step_template_id: parseInt(selectedStep),
      is_adhoc: !task?.workflow_instance_id,
      status: 'Completed',
      performed_by: user?.id,
      performed_at: new Date().toISOString(),
      data_json: {
        confluency_percent: formData.confluency_percent ? parseFloat(formData.confluency_percent) : null,
        morphology: formData.morphology,
        sterility: formData.sterility,
        notes: formData.notes
      }
    }).select().single();

    if (execStep) {
      // Link container to executed step
      await supabase.from('executed_step_containers').insert({
        executed_step_id: execStep.id,
        container_id: parseInt(selectedContainer),
        is_input: true
      });

      // Update task status
      await supabase.from('tasks').update({
        status: 'Completed',
        completed_at: new Date().toISOString()
      }).eq('id', id);
    }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => navigate('/tasks'), 1500);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }

  if (!task) {
    return <div className="text-center py-12 text-gray-500">Задача не найдена</div>;
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Шаг выполнен успешно</h2>
        <p className="text-gray-500 mt-2">Перенаправление...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/tasks')} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
        <ArrowLeft size={20} /> Назад к задачам
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{task.title}</h1>
        {task.description && <p className="text-gray-500 dark:text-gray-400 mb-6">{task.description}</p>}

        <FormField label="Контейнер" required>
          <Select value={selectedContainer} onChange={e => setSelectedContainer(e.target.value)}>
            <option value="">-- Выберите контейнер --</option>
            {containers.map(c => <option key={c.id} value={c.id}>{c.container_code}</option>)}
          </Select>
        </FormField>

        <FormField label="Шаблон шага" required>
          <Select value={selectedStep} onChange={e => setSelectedStep(e.target.value)}>
            <option value="">-- Выберите шаг --</option>
            {stepTemplates.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name_ru}</option>)}
          </Select>
        </FormField>

        <div className="border-t border-gray-200 dark:border-gray-700 my-6 pt-6">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Данные осмотра</h3>

          <FormField label="Конфлюентность (%)">
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.confluency_percent}
              onChange={e => setFormData({ ...formData, confluency_percent: e.target.value })}
              placeholder="0-100"
            />
          </FormField>

          <FormField label="Морфология">
            <Select value={formData.morphology} onChange={e => setFormData({ ...formData, morphology: e.target.value })}>
              {morphologyOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
          </FormField>

          <FormField label="Стерильность">
            <Select value={formData.sterility} onChange={e => setFormData({ ...formData, sterility: e.target.value })}>
              {sterilityOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>

          <FormField label="Примечания">
            <Input
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Дополнительные наблюдения..."
            />
          </FormField>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => navigate('/tasks')}>Отмена</Button>
          <Button onClick={handleExecute} disabled={!selectedContainer || !selectedStep || saving}>
            {saving ? <Loader2 className="animate-spin" size={20} /> : 'Выполнить шаг'}
          </Button>
        </div>
      </div>
    </div>
  );
}
