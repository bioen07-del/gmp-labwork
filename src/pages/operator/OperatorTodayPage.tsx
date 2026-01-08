import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, Culture, Donor } from '@/lib/supabase';
import { Loader2, Search, ChevronRight, Beaker, Users, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  'Активна': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Заморожена': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Утилизирована': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  'Отгружена': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export function OperatorTodayPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scanCode, setScanCode] = useState('');
  const [cultures, setCultures] = useState<Culture[]>([]);
  const [recentDonors, setRecentDonors] = useState<Donor[]>([]);
  const [scanResult, setScanResult] = useState<Culture | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Загрузить активные культуры
    const { data: culturesData } = await supabase
      .from('cultures')
      .select('*, donor:donors(*), container_type:container_types(*)')
      .eq('status', 'Активна')
      .eq('archived', false)
      .order('id', { ascending: false })
      .limit(20);

    // Последние доноры
    const { data: donorsData } = await supabase
      .from('donors')
      .select('*')
      .eq('archived', false)
      .order('id', { ascending: false })
      .limit(5);

    setCultures(culturesData || []);
    setRecentDonors(donorsData || []);
    setLoading(false);
  };

  const handleScan = async () => {
    if (!scanCode.trim()) return;
    
    setScanError(null);
    setScanResult(null);

    // Поиск культуры по коду
    const { data, error } = await supabase
      .from('cultures')
      .select('*, donor:donors(*), container_type:container_types(*)')
      .eq('culture_code', scanCode.trim().toUpperCase())
      .single();

    if (error || !data) {
      // Попробуем найти по коду донора
      const { data: donorData } = await supabase
        .from('donors')
        .select('id')
        .eq('donor_code', scanCode.trim().toUpperCase())
        .single();
      
      if (donorData) {
        navigate(`/cultures?donor=${donorData.id}`);
        return;
      }
      
      setScanError('Культура не найдена');
      return;
    }

    setScanResult(data);
    navigate(`/cultures/${data.id}`);
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/donors')}
          className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700 flex items-center gap-4"
        >
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Users className="text-blue-600" size={24} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-800 dark:text-white">Новый донор</p>
            <p className="text-sm text-gray-500">Зарегистрировать</p>
          </div>
        </button>
        
        <button
          onClick={() => navigate('/cultures')}
          className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700 flex items-center gap-4"
        >
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Beaker className="text-green-600" size={24} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-800 dark:text-white">Культуры</p>
            <p className="text-sm text-gray-500">Все культуры</p>
          </div>
        </button>
      </div>

      {/* Scan Input */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
          Найти культуру или донора
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={scanCode}
              onChange={e => setScanCode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите код культуры или донора..."
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
            {scanError}
          </p>
        )}
      </div>

      {/* Active Cultures */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Beaker size={22} className="text-green-500" />
          Активные культуры ({cultures.length})
        </h2>
        
        {cultures.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center text-gray-500">
            <p>Нет активных культур</p>
            <button
              onClick={() => navigate('/donations')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Создать донацию
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {cultures.map(culture => (
              <div
                key={culture.id}
                onClick={() => navigate(`/cultures/${culture.id}`)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 cursor-pointer hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-lg text-gray-800 dark:text-white">
                      {culture.culture_code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[culture.status]}`}>
                      {culture.status}
                    </span>
                    <span className="text-sm text-gray-500">P{culture.passage_number}</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Донор: {culture.donor?.donor_code}
                    {culture.donor?.full_name && ` — ${culture.donor.full_name}`}
                  </p>
                </div>
                <div className="text-right mr-2">
                  {culture.confluency && (
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {culture.confluency}%
                    </span>
                  )}
                </div>
                <ChevronRight size={24} className="text-gray-400" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Donors */}
      {recentDonors.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Users size={22} className="text-blue-500" />
            Последние доноры
          </h2>
          <div className="grid gap-2">
            {recentDonors.map(donor => (
              <div
                key={donor.id}
                onClick={() => navigate(`/donors`)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 cursor-pointer hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-gray-800 dark:text-white">{donor.donor_code}</span>
                  {donor.full_name && <span className="text-gray-500 ml-2">{donor.full_name}</span>}
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
