import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Archive, RotateCcw, Loader2 } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: number | string; archived?: boolean }> {
  title: string;
  data: T[];
  columns: Column<T>[];
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onEdit: (item: T) => void;
  onArchive: (item: T) => void;
  searchKeys?: (keyof T)[];
  canEdit?: boolean;
}

export function DataTable<T extends { id: number | string; archived?: boolean }>({
  title, data, columns, loading, error, onAdd, onEdit, onArchive, searchKeys = [], canEdit = true
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    let result = data.filter(item => showArchived ? item.archived : !item.archived);
    if (search && searchKeys.length > 0) {
      const q = search.toLowerCase();
      result = result.filter(item =>
        searchKeys.some(key => String(item[key]).toLowerCase().includes(q))
      );
    }
    return result;
  }, [data, search, showArchived, searchKeys]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
        {canEdit && (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            Добавить
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={e => setShowArchived(e.target.checked)}
            className="rounded"
          />
          Показать архивные
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Нет данных для отображения
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {columns.map(col => (
                  <th key={String(col.key)} className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                    {col.label}
                  </th>
                ))}
                {canEdit && <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Действия</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map(item => (
                <tr key={String(item.id)} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${item.archived ? 'opacity-60' : ''}`}>
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key as string] ?? '')}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => onEdit(item)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded mr-2">
                        <Edit2 size={16} className="text-gray-600 dark:text-gray-300" />
                      </button>
                      <button onClick={() => onArchive(item)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                        {item.archived ? <RotateCcw size={16} className="text-green-600" /> : <Archive size={16} className="text-orange-600" />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
