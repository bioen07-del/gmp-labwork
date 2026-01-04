import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, Container, ContainerLink } from '@/lib/supabase';
import { ArrowLeft, ArrowUp, ArrowDown, Loader2, Printer } from 'lucide-react';
import { LabelPrinter } from '@/components/LabelPrinter';

const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Contaminated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Frozen: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Consumed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Disposed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Released: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export function ContainerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [container, setContainer] = useState<Container | null>(null);
  const [parents, setParents] = useState<Container[]>([]);
  const [children, setChildren] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [labelOpen, setLabelOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: cont } = await supabase
        .from('containers')
        .select('*, container_type:container_types(*), location:locations!current_location_id(*)')
        .eq('id', id)
        .single();
      
      if (cont) {
        setContainer(cont);
        
        // Load parent links
        const { data: parentLinks } = await supabase
          .from('container_links')
          .select('parent_container_id')
          .eq('child_container_id', id);
        
        if (parentLinks?.length) {
          const parentIds = parentLinks.map(l => l.parent_container_id);
          const { data: parentContainers } = await supabase
            .from('containers')
            .select('*, container_type:container_types(*)')
            .in('id', parentIds);
          setParents(parentContainers || []);
        }

        // Load child links
        const { data: childLinks } = await supabase
          .from('container_links')
          .select('child_container_id')
          .eq('parent_container_id', id);
        
        if (childLinks?.length) {
          const childIds = childLinks.map(l => l.child_container_id);
          const { data: childContainers } = await supabase
            .from('containers')
            .select('*, container_type:container_types(*)')
            .in('id', childIds);
          setChildren(childContainers || []);
        }
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }

  if (!container) {
    return <div className="text-center py-12 text-gray-500">Контейнер не найден</div>;
  }

  return (
    <div>
      <button onClick={() => navigate('/containers')} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
        <ArrowLeft size={20} /> Назад к списку
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{container.container_code}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLabelOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Printer size={16} />
              Печать этикетки
            </button>
            <span className={`px-3 py-1 rounded text-sm font-medium ${statusColors[container.status]}`}>{container.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Тип</div>
            <div className="font-medium text-gray-800 dark:text-white">{container.container_type?.code || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Пассаж</div>
            <div className="font-medium text-gray-800 dark:text-white">{container.passage_number ?? '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Локация</div>
            <div className="font-medium text-gray-800 dark:text-white">{container.location?.name_ru || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Флаг риска</div>
            <div className="font-medium text-gray-800 dark:text-white">{container.risk_flag ? 'Да' : 'Нет'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Конц. клеток/мл</div>
            <div className="font-medium text-gray-800 dark:text-white">{container.concentration_cells_ml?.toExponential(2) || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Всего клеток</div>
            <div className="font-medium text-gray-800 dark:text-white">{container.total_cells?.toExponential(2) || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Жизнеспособность</div>
            <div className="font-medium text-gray-800 dark:text-white">{container.viability_percent ? `${container.viability_percent}%` : '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Объем</div>
            <div className="font-medium text-gray-800 dark:text-white">{container.volume_ml ? `${container.volume_ml} мл` : '-'}</div>
          </div>
        </div>
      </div>

      {/* Lineage */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Происхождение</h2>
        
        {parents.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
              <ArrowUp size={16} /> Родительские контейнеры
            </div>
            <div className="flex flex-wrap gap-2">
              {parents.map(p => (
                <Link key={p.id} to={`/containers/${p.id}`} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                  <span className="font-medium text-gray-800 dark:text-white">{p.container_code}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{p.container_type?.code}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {children.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
              <ArrowDown size={16} /> Дочерние контейнеры
            </div>
            <div className="flex flex-wrap gap-2">
              {children.map(c => (
                <Link key={c.id} to={`/containers/${c.id}`} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                  <span className="font-medium text-gray-800 dark:text-white">{c.container_code}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{c.container_type?.code}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {parents.length === 0 && children.length === 0 && (
          <div className="text-gray-500 dark:text-gray-400">Нет связанных контейнеров</div>
        )}
      </div>

      {/* Label Printer */}
      <LabelPrinter
        isOpen={labelOpen}
        onClose={() => setLabelOpen(false)}
        labelType="container"
        data={{
          code: container.container_code,
          type: container.container_type?.code,
          passage: container.passage_number ?? undefined,
          cells: container.total_cells ? container.total_cells.toExponential(2) : undefined,
          volume: container.volume_ml ? `${container.volume_ml} ml` : undefined,
        }}
      />
    </div>
  );
}
