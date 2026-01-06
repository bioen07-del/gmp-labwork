import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/DataTable';
import { Modal, FormField, Input, Button } from '@/components/Modal';
import { format } from 'date-fns';

interface Donor {
  id: number;
  donor_code: string;
  archived: boolean;
  created_at: string;
  created_by: string | null;
}

export function DonorsPage() {
  const { canEdit, user } = useAuth();
  const [data, setData] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Donor | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: donors, error } = await supabase
      .from('donors')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) setError(error.message);
    else setData(donors || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setGeneratedCode(null);
    setModalOpen(true);
  };

  const openEdit = (item: Donor) => {
    setEditing(item);
    setGeneratedCode(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    
    if (editing) {
      // Код не меняется при редактировании
      setModalOpen(false);
    } else {
      // Генерируем код автоматически
      const { data: codeData } = await supabase.rpc('generate_donor_code');
      const newCode = codeData as string;
      
      const { data: newDonor, error } = await supabase
        .from('donors')
        .insert({ donor_code: newCode, created_by: user?.id || null })
        .select()
        .single();
      
      if (error) {
        setError(error.message);
      } else {
        setGeneratedCode(newCode);
        load();
      }
    }
    setSaving(false);
  };

  const handleArchive = async (item: Donor) => {
    await supabase.from('donors').update({ archived: !item.archived }).eq('id', item.id);
    load();
  };

  const columns = [
    { key: 'donor_code', label: 'Код донора' },
    { 
      key: 'created_at', 
      label: 'Дата создания', 
      render: (d: Donor) => d.created_at ? format(new Date(d.created_at), 'dd.MM.yyyy HH:mm') : '-' 
    },
    { 
      key: 'archived', 
      label: 'Статус', 
      render: (d: Donor) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${d.archived 
          ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' 
          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
          {d.archived ? 'Архив' : 'Активен'}
        </span>
      )
    },
  ];

  return (
    <>
      <DataTable
        title="Доноры"
        data={data.filter(d => !d.archived)}
        loading={loading}
        error={error}
        columns={columns}
        searchKeys={['donor_code']}
        onAdd={openAdd}
        onEdit={openEdit}
        onArchive={handleArchive}
        canEdit={true}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Донор' : 'Создание донора'}>
        {editing ? (
          <div className="space-y-4">
            <FormField label="Код донора">
              <Input value={editing.donor_code} disabled className="bg-gray-100 dark:bg-gray-700" />
            </FormField>
            <p className="text-sm text-gray-500">Код донора не может быть изменён</p>
          </div>
        ) : generatedCode ? (
          <div className="text-center py-4">
            <div className="text-green-600 dark:text-green-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-800 dark:text-white mb-2">Донор создан</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{generatedCode}</p>
            <Button className="mt-4" onClick={() => setModalOpen(false)}>Закрыть</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Код донора будет сгенерирован автоматически в формате <strong>D-XXXX</strong>
            </p>
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Создание...' : 'Создать донора'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
