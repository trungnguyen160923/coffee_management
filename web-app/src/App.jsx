import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppContent from './components/AppContent';

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent pageTitle="Smart Cafe | Delicious Taste" />
      </AuthProvider>
    </Router>
  );
}

export default App;
