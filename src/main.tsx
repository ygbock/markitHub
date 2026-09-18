import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './design-system/ThemeContext';
import { ToastProvider } from './components/ui/ToastContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <CurrencyProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </CurrencyProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);
