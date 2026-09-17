import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './design-system/ThemeContext';
import { ToastProvider } from './components/ui/ToastContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <CurrencyProvider>
          <App />
        </CurrencyProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);
