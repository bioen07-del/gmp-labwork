import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CellTypesPage } from '@/pages/CellTypesPage';
import { ContainerTypesPage } from '@/pages/ContainerTypesPage';
import { EquipmentPage } from '@/pages/EquipmentPage';
import { LocationsPage } from '@/pages/LocationsPage';
import { DonationsPage } from '@/pages/DonationsPage';
import { ContainersPage } from '@/pages/ContainersPage';
import { ContainerDetailPage } from '@/pages/ContainerDetailPage';
import { TasksPage } from '@/pages/TasksPage';
import { TaskExecutePage } from '@/pages/TaskExecutePage';
import { ProcessesPage } from '@/pages/ProcessesPage';
import { BanksPage } from '@/pages/BanksPage';
import { ReleasesPage } from '@/pages/ReleasesPage';
import { QcResultsPage } from '@/pages/QcResultsPage';
import { DeviationsPage } from '@/pages/DeviationsPage';
import { ReagentsPage } from '@/pages/ReagentsPage';
import { ConsumablesPage } from '@/pages/ConsumablesPage';
import { ProcessBuilderPage } from '@/pages/ProcessBuilderPage';
import { StorageMapPage } from '@/pages/StorageMapPage';
import { MediaPage } from '@/pages/MediaPage';
import { DonorsPage } from '@/pages/DonorsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { OfflineProvider } from '@/contexts/OfflineContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/cell-types" element={<ProtectedRoute><CellTypesPage /></ProtectedRoute>} />
      <Route path="/container-types" element={<ProtectedRoute><ContainerTypesPage /></ProtectedRoute>} />
      <Route path="/equipment" element={<ProtectedRoute><EquipmentPage /></ProtectedRoute>} />
      <Route path="/locations" element={<ProtectedRoute><LocationsPage /></ProtectedRoute>} />
      <Route path="/donations" element={<ProtectedRoute><DonationsPage /></ProtectedRoute>} />
      <Route path="/containers" element={<ProtectedRoute><ContainersPage /></ProtectedRoute>} />
      <Route path="/containers/:id" element={<ProtectedRoute><ContainerDetailPage /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
      <Route path="/tasks/:id" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
      <Route path="/tasks/:id/execute" element={<ProtectedRoute><TaskExecutePage /></ProtectedRoute>} />
      <Route path="/processes" element={<ProtectedRoute><ProcessesPage /></ProtectedRoute>} />
      <Route path="/banks" element={<ProtectedRoute><BanksPage /></ProtectedRoute>} />
      <Route path="/releases" element={<ProtectedRoute><ReleasesPage /></ProtectedRoute>} />
      <Route path="/qc-results" element={<ProtectedRoute><QcResultsPage /></ProtectedRoute>} />
      <Route path="/deviations" element={<ProtectedRoute><DeviationsPage /></ProtectedRoute>} />
      <Route path="/reagents" element={<ProtectedRoute><ReagentsPage /></ProtectedRoute>} />
      <Route path="/consumables" element={<ProtectedRoute><ConsumablesPage /></ProtectedRoute>} />
      <Route path="/process-builder" element={<ProtectedRoute><ProcessBuilderPage /></ProtectedRoute>} />
      <Route path="/storage-map" element={<ProtectedRoute><StorageMapPage /></ProtectedRoute>} />
      <Route path="/media" element={<ProtectedRoute><MediaPage /></ProtectedRoute>} />
      <Route path="/donors" element={<ProtectedRoute><DonorsPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OfflineProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </OfflineProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
// test 1767517199
