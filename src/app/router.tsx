import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useVault } from '../features/vault/VaultContext';
import { AppLayout } from '../components/layout/AppLayout';
import { UnlockPage } from '../pages/UnlockPage';
import { MfaPage } from '../pages/MfaPage';
import { RecoveryPage } from '../pages/RecoveryPage';
import { DashboardPage } from '../pages/DashboardPage';
import { FilesPage } from '../pages/FilesPage';
import { PasswordsPage } from '../pages/PasswordsPage';
import { PasswordEntryPage } from '../pages/PasswordEntryPage';
import { NotesPage } from '../pages/NotesPage';
import { AchievementsPage } from '../pages/AchievementsPage';
import { SearchPage } from '../pages/SearchPage';
import { SettingsPage } from '../pages/SettingsPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isVaultUnlocked, isMfaRequired } = useVault();

  if (isMfaRequired) {
    return <Navigate to="/mfa" replace />;
  }

  if (!isVaultUnlocked) {
    return <Navigate to="/unlock" replace />;
  }

  return <>{children}</>;
};

export const router = createBrowserRouter([
  // Public / Vault-Locked Routes
  {
    path: '/unlock',
    element: <UnlockPage />,
  },
  {
    path: '/mfa',
    element: <MfaPage />,
  },
  {
    path: '/recovery',
    element: <RecoveryPage />,
  },

  // Private Routes Enclosed in AppLayout
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'files',
        element: <FilesPage />,
      },
      {
        path: 'files/:id',
        element: <FilesPage />,
      },
      {
        path: 'passwords',
        element: <PasswordsPage />,
      },
      {
        path: 'passwords/new',
        element: <PasswordEntryPage />,
      },
      {
        path: 'passwords/:id',
        element: <PasswordEntryPage />,
      },
      {
        path: 'notes',
        element: <NotesPage />,
      },
      {
        path: 'notes/:id',
        element: <NotesPage />,
      },
      {
        path: 'achievements',
        element: <AchievementsPage />,
      },
      {
        path: 'achievements/:id',
        element: <AchievementsPage />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'settings/security',
        element: <SettingsPage />,
      },
      {
        path: 'settings/backup',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/unlock" replace />,
  },
]);
