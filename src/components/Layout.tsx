import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useOffline } from '@/contexts/OfflineContext';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { HelpModal } from '@/components/HelpModal';
import { UpdateNotification } from '@/components/UpdateNotification';
import { Tooltip } from '@/components/Tooltip';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, Database, FlaskConical, Box, MapPin, Wrench,
  ChevronDown, ChevronRight, LogOut, Sun, Moon, Menu, X, Users, FileText, ClipboardList, Droplet, Package, ListTodo, GitBranch, Archive, Send, TestTube, AlertTriangle, Beaker, Settings, Grid3X3, Scan, Wifi, WifiOff, HelpCircle, Play
} from 'lucide-react';

const APP_VERSION = __APP_VERSION__;

const menuItems = [
  // Основная работа
  { path: '/operator/today', icon: Play, label: 'Оператор' },
  { path: '/', icon: LayoutDashboard, label: 'Дашборд' },
  { path: '/tasks', icon: ListTodo, label: 'Задачи' },
  
  // Workflow: Донор → Донация → Контейнеры → Банки → Выдача
  {
    label: 'Производство',
    icon: GitBranch,
    children: [
      { path: '/donors', icon: Users, label: '1. Доноры' },
      { path: '/donations', icon: Droplet, label: '2. Донации' },
      { path: '/containers', icon: Package, label: '3. Контейнеры' },
      { path: '/banks', icon: Archive, label: '4. Банки (MCB/WCB)' },
      { path: '/releases', icon: Send, label: '5. Выдача' },
    ]
  },
  
  // Контроль
  { path: '/qc-results', icon: TestTube, label: 'QC' },
  { path: '/deviations', icon: AlertTriangle, label: 'Отклонения' },
  
  // Склад
  {
    label: 'Склад',
    icon: Beaker,
    children: [
      { path: '/reagents', icon: FlaskConical, label: 'Реагенты' },
      { path: '/consumables', icon: Box, label: 'Расходники' },
      { path: '/media', icon: Droplet, label: 'Среды' },
    ]
  },
  
  // Справочники
  {
    label: 'Справочники',
    icon: Database,
    children: [
      { path: '/cell-types', icon: FlaskConical, label: 'Типы клеток' },
      { path: '/container-types', icon: Box, label: 'Типы контейнеров' },
      { path: '/equipment', icon: Wrench, label: 'Оборудование' },
      { path: '/locations', icon: MapPin, label: 'Локации' },
      { path: '/storage-map', icon: Grid3X3, label: 'Адресное хранение' },
    ]
  },
  
  // Администрирование
  {
    label: 'Администрирование',
    icon: Settings,
    children: [
      { path: '/process-builder', icon: GitBranch, label: 'Конструктор процессов' },
    ]
  },
  { path: '/reports', icon: FileText, label: 'Отчеты' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isOnline, draftsCount } = useOffline();
  const { updateAvailable, applyUpdate, dismissUpdate } = useServiceWorker();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Справочники']);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleScan = async (code: string) => {
    // Search container by code
    const { data } = await supabase
      .from('containers')
      .select('id')
      .eq('container_code', code)
      .limit(1);
    
    if (data && data.length === 1) {
      navigate(`/containers/${data[0].id}`);
    } else {
      navigate(`/containers?search=${encodeURIComponent(code)}`);
    }
  };

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          {sidebarOpen && <span className="font-bold text-lg text-gray-800 dark:text-white">GMP LabWork</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            {sidebarOpen ? <X size={20} className="text-gray-600 dark:text-gray-300" /> : <Menu size={20} className="text-gray-600 dark:text-gray-300" />}
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.label}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`w-full flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${!sidebarOpen && 'justify-center'}`}
                  >
                    <item.icon size={20} />
                    {sidebarOpen && (
                      <>
                        <span className="ml-3 flex-1 text-left">{item.label}</span>
                        {expandedMenus.includes(item.label) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </>
                    )}
                  </button>
                  {sidebarOpen && expandedMenus.includes(item.label) && (
                    <div className="ml-4">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`flex items-center px-4 py-2 text-sm ${isActive(child.path) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          <child.icon size={16} />
                          <span className="ml-3">{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path!}
                  className={`flex items-center px-4 py-2 ${isActive(item.path!) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'} ${!sidebarOpen && 'justify-center'}`}
                >
                  <item.icon size={20} />
                  {sidebarOpen && <span className="ml-3">{item.label}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {sidebarOpen && (
            <>
              <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                {profile?.full_name || user?.email}
              </div>
              <div className="mb-2 text-xs text-gray-400 dark:text-gray-500">
                v{APP_VERSION}
              </div>
            </>
          )}
          <div className="flex gap-2">
            <Tooltip content="Переключить тему оформления">
              <button onClick={toggleTheme} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                {theme === 'light' ? <Moon size={20} className="text-gray-600 dark:text-gray-300" /> : <Sun size={20} className="text-gray-600 dark:text-gray-300" />}
              </button>
            </Tooltip>
            <Tooltip content="Выйти из системы">
              <button onClick={signOut} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <LogOut size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header bar with scanner and status */}
        <div className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end px-4 gap-3">
          {draftsCount > 0 && (
            <Tooltip content="Несинхронизированные черновики (офлайн)">
              <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded cursor-help">
                {draftsCount} черновиков
              </span>
            </Tooltip>
          )}
          <Tooltip content="Сканировать штрих-код камерой">
            <button
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Scan size={16} />
              Сканировать
            </button>
          </Tooltip>
          <Tooltip content="Открыть справку по системе">
            <button
              onClick={() => setHelpOpen(true)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <HelpCircle size={20} />
            </button>
          </Tooltip>
          <Tooltip content={isOnline ? 'Подключение активно' : 'Нет подключения к сети'}>
            <div className="flex items-center gap-1 cursor-help">
              {isOnline ? (
                <Wifi size={18} className="text-green-500" />
              ) : (
                <WifiOff size={18} className="text-red-500" />
              )}
            </div>
          </Tooltip>
        </div>
        <div className="flex-1 overflow-auto overscroll-contain p-4 md:p-6 -webkit-overflow-scrolling-touch">{children}</div>
      </main>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
      
      {/* Help Modal */}
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Update Notification */}
      {updateAvailable && (
        <UpdateNotification onUpdate={applyUpdate} onDismiss={dismissUpdate} />
      )}
    </div>
  );
}
