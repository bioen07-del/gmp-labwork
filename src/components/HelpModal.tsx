import React, { useState } from 'react';
import { X, BookOpen, Navigation, Users, Keyboard } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sections = [
  {
    id: 'functions',
    icon: BookOpen,
    title: 'Основные функции',
    content: [
      'Управление культурами клеток',
      'Отслеживание донаций и материалов',
      'Создание и выполнение технологических процессов',
      'Формирование банков клеток (MCB/WCB)',
      'Контроль качества (QC) на всех этапах',
      'Учет реагентов, расходников и питательных сред',
      'Адресное хранение с картой локаций',
      'Регистрация и отслеживание отклонений',
      'Выдача материалов заказчикам',
      'Печать этикеток с DataMatrix кодами',
      'Сканирование штрих-кодов камерой',
    ],
  },
  {
    id: 'navigation',
    icon: Navigation,
    title: 'Навигация',
    content: [
      'Боковое меню - доступ ко всем разделам системы',
      'Дашборд - сводная информация и быстрые действия',
      'Задачи - список назначенных задач с фильтрами',
      'Культуры - реестр всех культур клеток с поиском',
      'Банки - управление MCB/WCB банками клеток',
      'Склад - реагенты, расходники, питательные среды',
      'Справочники - настройка типов и локаций',
      'Кнопка "Сканировать" - быстрый поиск по штрих-коду',
    ],
  },
  {
    id: 'roles',
    icon: Users,
    title: 'Роли и права',
    content: [
      'Admin - полный доступ ко всем функциям',
      'Operator - создание и редактирование записей',
      'Viewer - только просмотр данных',
      'QC Specialist - доступ к контролю качества',
      'Права редактирования зависят от роли пользователя',
      'Некоторые действия требуют подтверждения',
    ],
  },
  {
    id: 'hotkeys',
    icon: Keyboard,
    title: 'Горячие клавиши',
    content: [
      'Ctrl+K - быстрый поиск (в разработке)',
      'Esc - закрыть модальное окно',
      'Enter - подтвердить действие в форме',
      'Tab - переход между полями формы',
    ],
  },
];

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeSection, setActiveSection] = useState('functions');

  if (!isOpen) return null;

  const currentSection = sections.find(s => s.id === activeSection);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Справка по системе</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r dark:border-gray-700 p-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left ${
                  activeSection === section.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <section.icon size={16} />
                {section.title}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {currentSection && (
              <>
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <currentSection.icon size={20} className="text-blue-600" />
                  {currentSection.title}
                </h3>
                <ul className="space-y-2">
                  {currentSection.content.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                      <span className="text-blue-500 mt-1">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="p-4 border-t dark:border-gray-700 text-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            GMP LabWork v1.0 - Система управления лабораторией
          </span>
        </div>
      </div>
    </div>
  );
}
