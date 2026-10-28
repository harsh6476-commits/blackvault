import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { VaultProvider } from '../features/vault/VaultContext';
import { router } from './router';

export const App: React.FC = () => {
  return (
    <VaultProvider>
      <RouterProvider router={router} />
    </VaultProvider>
  );
};

export default App;
