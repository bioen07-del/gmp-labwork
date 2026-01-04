import React, { useEffect, useState } from 'react';
import { supabase, Location, Container } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Modal, FormField, Input, Select, Button } from '@/components/Modal';
import { Loader2, Grid3X3, ChevronDown, ChevronRight, MapPin, Package } from 'lucide-react';

type ExtendedLocation = Location & {
  capacity?: number;
  rows_count?: number;
  cols_count?: number;
};

export function StorageMapPage() {
  const { canEdit } = useAuth();
  const [locations, setLocations] = useState<ExtendedLocation[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<ExtendedLocation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ rows_count: '', cols_count: '', capacity: '' });

  const load = async () => {
    setLoading(true);
    const [loc, cont] = await Promise.all([
      supabase.from('locations').select('*').eq('archived', false).order('location_code'),
      supabase.from('containers').select('*').eq('archived', false)
    ]);
    setLocations(loc.data || []);
    setContainers(cont.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = (id: number) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getChildren = (parentId: number | null) => {
    return locations.filter(l => l.parent_id === parentId);
  };

  const getContainersAtLocation = (locationId: number) => {
    return containers.filter(c => c.current_location_id === locationId);
  };

  const openStorageConfig = (loc: ExtendedLocation) => {
    setSelectedLocation(loc);
    setForm({
      rows_count: loc.rows_count?.toString() || '',
      cols_count: loc.cols_count?.toString() || '',
      capacity: loc.capacity?.toString() || ''
    });
    setModalOpen(true);
  };

  const saveConfig = async () => {
    if (!selectedLocation) return;
    await supabase.from('locations').update({
      rows_count: form.rows_count ? parseInt(form.rows_count) : null,
      cols_count: form.cols_count ? parseInt(form.cols_count) : null,
      capacity: form.capacity ? parseInt(form.capacity) : null
    }).eq('id', selectedLocation.id);
    setModalOpen(false);
    load();
  };

  const renderGrid = (loc: ExtendedLocation) => {
    if (!loc.rows_count || !loc.cols_count) return null;
    
    const locContainers = getContainersAtLocation(loc.id);
    const grid: (Container | null)[][] = [];
    
    for (let r = 0; r < loc.rows_count; r++) {
      grid[r] = [];
      for (let c = 0; c < loc.cols_count; c++) {
        grid[r][c] = null;
      }
    }
    
    // Simple placement - in reality, containers would have position data
    locContainers.forEach((cont, idx) => {
      const r = Math.floor(idx / loc.cols_count!);
      const c = idx % loc.cols_count!;
      if (r < loc.rows_count!) {
        grid[r][c] = cont;
      }
    });

    return (
      <div className="mt-3">
        <div className="inline-block border border-gray-300 dark:border-gray-600 rounded">
          {grid.map((row, rIdx) => (
            <div key={rIdx} className="flex">
              {row.map((cell, cIdx) => (
                <div
                  key={cIdx}
                  className={`w-8 h-8 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs
                    ${cell ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 cursor-pointer hover:bg-blue-200' : 'bg-gray-50 dark:bg-gray-800'}`}
                  title={cell ? `${cell.container_code}\n${cell.status}` : `${String.fromCharCode(65 + rIdx)}${cIdx + 1}`}
                >
                  {cell ? (
                    <Package size={14} />
                  ) : (
                    <span className="text-gray-400 text-[10px]">{String.fromCharCode(65 + rIdx)}{cIdx + 1}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Занято: {locContainers.length} / {loc.rows_count * loc.cols_count}
        </div>
      </div>
    );
  };

  const renderLocation = (loc: ExtendedLocation, level: number = 0) => {
    const children = getChildren(loc.id);
    const locContainers = getContainersAtLocation(loc.id);
    const isExp = expanded.includes(loc.id);
    const hasGrid = loc.rows_count && loc.cols_count;
    const isStorage = loc.type === 'cryostorage' || loc.type === 'box' || loc.type === 'shelf' || loc.type === 'rack';

    return (
      <div key={loc.id} className="border-l-2 border-gray-200 dark:border-gray-700" style={{ marginLeft: level * 16 }}>
        <div 
          className={`flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer
            ${level === 0 ? 'bg-white dark:bg-gray-800 rounded-lg shadow mb-2' : ''}`}
          onClick={() => toggleExpand(loc.id)}
        >
          <div className="flex items-center gap-2">
            {(children.length > 0 || hasGrid) ? (
              isExp ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />
            ) : (
              <span className="w-4" />
            )}
            <MapPin size={16} className={`${isStorage ? 'text-blue-500' : 'text-gray-400'}`} />
            <span className="font-medium text-gray-800 dark:text-white">{loc.location_code}</span>
            <span className="text-sm text-gray-500">{loc.name_ru}</span>
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">{loc.type}</span>
          </div>
          <div className="flex items-center gap-3">
            {locContainers.length > 0 && (
              <span className="text-sm text-gray-500">{locContainers.length} контейнеров</span>
            )}
            {isStorage && canEdit() && (
              <button 
                onClick={e => { e.stopPropagation(); openStorageConfig(loc); }}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                <Grid3X3 size={16} />
              </button>
            )}
          </div>
        </div>

        {isExp && (
          <div className="pl-4">
            {hasGrid && renderGrid(loc)}
            {children.map(child => renderLocation(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }

  const rootLocations = locations.filter(l => !l.parent_id);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Адресное хранение</h1>
      </div>

      <div className="space-y-2">
        {rootLocations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Нет локаций. Добавьте локации в справочнике.</div>
        ) : (
          rootLocations.map(loc => renderLocation(loc))
        )}
      </div>

      {/* Config Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Настройка хранения: ${selectedLocation?.location_code}`}>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Укажите размеры для визуализации сетки хранения (например, для криобокса 9x9)
        </p>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Рядов">
            <Input type="number" min="1" max="20" value={form.rows_count} onChange={e => setForm({ ...form, rows_count: e.target.value })} placeholder="9" />
          </FormField>
          <FormField label="Колонок">
            <Input type="number" min="1" max="20" value={form.cols_count} onChange={e => setForm({ ...form, cols_count: e.target.value })} placeholder="9" />
          </FormField>
        </div>
        <FormField label="Общая вместимость">
          <Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="81" />
        </FormField>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Отмена</Button>
          <Button onClick={saveConfig}>Сохранить</Button>
        </div>
      </Modal>
    </div>
  );
}
