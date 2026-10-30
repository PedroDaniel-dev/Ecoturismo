import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { TrailsProvider } from './context/TrailsContext';
import './i18n';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <TrailsProvider>
          <App />
        </TrailsProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
