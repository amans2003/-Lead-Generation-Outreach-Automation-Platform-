import React from 'react';
import AppRouter from './router/AppRouter.jsx';
import { Toaster } from './components/common/Toaster.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
