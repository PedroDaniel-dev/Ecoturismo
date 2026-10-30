import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { TrailsProvider } from './context/TrailsContext';
import { InvitesProvider } from './context/InvitesContext';
import './i18n';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <TrailsProvider>
          <InvitesProvider>
            <App />
          </InvitesProvider>
        </TrailsProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
