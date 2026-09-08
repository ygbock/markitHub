import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { subscribeSettings, saveSettingsToDB, DEFAULT_SETTINGS } from '../services/dbService';

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  exchangeRate: number; // relative to base (SLE = 1.0)
  symbolPosition: 'prefix' | 'suffix';
  spaceBetween: boolean;
  decimalPlaces: number;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  {
    code: 'SLE',
    name: 'Sierra Leonean Leone',
    symbol: 'Le',
    flag: '🇸🇱',
    exchangeRate: 1.0,
    symbolPosition: 'prefix',
    spaceBetween: true,
    decimalPlaces: 2
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    exchangeRate: 0.044,
    symbolPosition: 'prefix',
    spaceBetween: false,
    decimalPlaces: 2
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    exchangeRate: 0.041,
    symbolPosition: 'prefix',
    spaceBetween: false,
    decimalPlaces: 2
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    exchangeRate: 0.035,
    symbolPosition: 'prefix',
    spaceBetween: false,
    decimalPlaces: 2
  },
  {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    flag: '🇳🇬',
    exchangeRate: 65.5,
    symbolPosition: 'prefix',
    spaceBetween: false,
    decimalPlaces: 2
  },
  {
    code: 'GHS',
    name: 'Ghanaian Cedi',
    symbol: 'GH₵',
    flag: '🇬🇭',
    exchangeRate: 0.68,
    symbolPosition: 'prefix',
    spaceBetween: true,
    decimalPlaces: 2
  },
  {
    code: 'KES',
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    flag: '🇰🇪',
    exchangeRate: 5.7,
    symbolPosition: 'prefix',
    spaceBetween: true,
    decimalPlaces: 2
  },
  {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    flag: '🇿🇦',
    exchangeRate: 0.82,
    symbolPosition: 'prefix',
    spaceBetween: true,
    decimalPlaces: 2
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'CA$',
    flag: '🇨🇦',
    exchangeRate: 0.061,
    symbolPosition: 'prefix',
    spaceBetween: false,
    decimalPlaces: 2
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    flag: '🇦🇺',
    exchangeRate: 0.068,
    symbolPosition: 'prefix',
    spaceBetween: false,
    decimalPlaces: 2
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    flag: '🇯🇵',
    exchangeRate: 6.8,
    symbolPosition: 'prefix',
    spaceBetween: false,
    decimalPlaces: 0
  },
  {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'AED',
    flag: '🇦🇪',
    exchangeRate: 0.16,
    symbolPosition: 'prefix',
    spaceBetween: true,
    decimalPlaces: 2
  },
  {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    flag: '🇨🇳',
    exchangeRate: 0.32,
    symbolPosition: 'prefix',
    spaceBetween: false,
    decimalPlaces: 2
  },
  {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    flag: '🇮🇳',
    exchangeRate: 3.8,
    symbolPosition: 'prefix',
    spaceBetween: false,
    decimalPlaces: 2
  }
];

interface CurrencyContextType {
  currentCurrency: CurrencyConfig;
  setCurrencyByCode: (code: string) => Promise<void>;
  formatAmount: (amount: number, options?: { showCode?: boolean; compact?: boolean; applyConversion?: boolean }) => string;
  currencySymbol: string;
  currencyCode: string;
  conversionEnabled: boolean;
  setConversionEnabled: (enabled: boolean) => void;
  availableCurrencies: CurrencyConfig[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Default to SLE (Sierra Leonean Leone)
  const defaultCurrency = SUPPORTED_CURRENCIES.find(c => c.code === 'SLE') || SUPPORTED_CURRENCIES[0];
  
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyConfig>(() => {
    const saved = localStorage.getItem('nexus_currency_code');
    if (saved) {
      const match = SUPPORTED_CURRENCIES.find(c => c.code === saved);
      if (match) return match;
    }
    return defaultCurrency;
  });

  const [conversionEnabled, setConversionEnabled] = useState<boolean>(() => {
    return localStorage.getItem('nexus_currency_conversion') === 'true';
  });

  // Sync settings with Firestore in real-time
  useEffect(() => {
    const unsubscribe = subscribeSettings((settings) => {
      if (settings.currency) {
        const match = SUPPORTED_CURRENCIES.find(c => c.code === settings.currency);
        if (match && match.code !== currentCurrency.code) {
          setCurrentCurrency(match);
          localStorage.setItem('nexus_currency_code', match.code);
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const setCurrencyByCode = async (code: string) => {
    const target = SUPPORTED_CURRENCIES.find(c => c.code === code);
    if (!target) return;
    setCurrentCurrency(target);
    localStorage.setItem('nexus_currency_code', target.code);

    try {
      await saveSettingsToDB({ currency: target.code });
    } catch (e) {
      console.warn('Could not persist currency setting to Firestore:', e);
    }
  };

  const toggleConversion = (enabled: boolean) => {
    setConversionEnabled(enabled);
    localStorage.setItem('nexus_currency_conversion', String(enabled));
  };

  /**
   * Format money amount according to current currency settings
   */
  const formatAmount = (
    amount: number, 
    options?: { showCode?: boolean; compact?: boolean; applyConversion?: boolean }
  ): string => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      amount = 0;
    }

    // If conversion is applied and target is not SLE
    let finalAmount = amount;
    if ((options?.applyConversion ?? conversionEnabled) && currentCurrency.code !== 'SLE') {
      finalAmount = amount * currentCurrency.exchangeRate;
    }

    const decimals = currentCurrency.decimalPlaces;
    
    // Compact formatting (e.g. 1.2k)
    if (options?.compact && Math.abs(finalAmount) >= 10000) {
      const formattedNum = (finalAmount / 1000).toFixed(1) + 'k';
      const sep = currentCurrency.spaceBetween ? ' ' : '';
      return `${currentCurrency.symbol}${sep}${formattedNum}`;
    }

    const formattedNum = finalAmount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    const sep = currentCurrency.spaceBetween ? ' ' : '';
    let result = '';

    if (currentCurrency.symbolPosition === 'prefix') {
      result = `${currentCurrency.symbol}${sep}${formattedNum}`;
    } else {
      result = `${formattedNum}${sep}${currentCurrency.symbol}`;
    }

    if (options?.showCode) {
      result = `${result} (${currentCurrency.code})`;
    }

    return result;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currentCurrency,
        setCurrencyByCode,
        formatAmount,
        currencySymbol: currentCurrency.symbol,
        currencyCode: currentCurrency.code,
        conversionEnabled,
        setConversionEnabled: toggleConversion,
        availableCurrencies: SUPPORTED_CURRENCIES,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
