import React, { createContext, useContext, useEffect, useState } from 'react';
import { databaseService } from '../services/databaseService';
import { cashService } from '../services/cashService';
import { CashRegister, CompanySettings } from '../types';
import { DEFAULT_SETTINGS } from '../database/initialData';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface AppContextType {
  settings: CompanySettings;
  companySettings: CompanySettings;
  updateSettings: (newSettings: Partial<CompanySettings>) => Promise<void>;
  updateCompanySettings: (newSettings: Partial<CompanySettings>) => Promise<void>;
  activeCashRegister: CashRegister | null;
  refreshCashRegister: () => Promise<void>;
  showDemoPrompt: boolean;
  setShowDemoPrompt: (show: boolean) => void;
  loadDemoData: () => Promise<void>;
  skipDemoData: () => Promise<void>;
  resetToDemoData: () => Promise<void>;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
  playBeep: () => void;
  formatCurrency: (value: number) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [activeCashRegister, setActiveCashRegister] = useState<CashRegister | null>(null);
  const [showDemoPrompt, setShowDemoPrompt] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Load initial settings and verify if first-run check needed
  const reloadSettings = async () => {
    try {
      const savedSettings = await databaseService.getById<CompanySettings>('settings', 'main');
      if (savedSettings) {
        // Ensure name and companyName are in sync
        const synced = {
          ...savedSettings,
          name: savedSettings.companyName || savedSettings.name || 'ESTOQUE PRO',
          companyName: savedSettings.companyName || savedSettings.name || 'ESTOQUE PRO',
        };
        setSettings(synced);
        if (synced.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (err) {
      console.error('Error reloading settings:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await reloadSettings();

        // Check active cash
        const active = await cashService.getActiveRegister();
        setActiveCashRegister(active || null);

        // Check if demo prompt should appear (if 0 products and not dismissed)
        const productCount = await databaseService.count('products');
        const demoPromptDismissed = localStorage.getItem('estoque_pro_demo_dismissed');
        if (productCount === 0 && !demoPromptDismissed) {
          setShowDemoPrompt(true);
        }
      } catch (err) {
        console.error('Error during AppContext initialization:', err);
      }
    };
    init();

    const handleDataChanged = () => {
      reloadSettings();
      refreshCashRegister();
    };

    window.addEventListener('estoque_data_changed', handleDataChanged);
    return () => window.removeEventListener('estoque_data_changed', handleDataChanged);
  }, []);

  const refreshCashRegister = async () => {
    try {
      const active = await cashService.getActiveRegister();
      setActiveCashRegister(active || null);
    } catch (e) {
      console.error('Error refreshing cash register:', e);
    }
  };

  const updateSettings = async (newSettings: Partial<CompanySettings>) => {
    const cleanName = newSettings.companyName || newSettings.name || settings.companyName || settings.name || '';
    const updated: CompanySettings = {
      ...settings,
      ...newSettings,
      name: cleanName,
      companyName: cleanName,
      pdv: {
        ...settings.pdv,
        ...(newSettings.pdv || {}),
      },
    };
    await databaseService.save<CompanySettings>('settings', updated);
    setSettings(updated);

    if (updated.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    showToast('Configurações atualizadas com sucesso!', 'success');
  };

  const loadDemoData = async () => {
    try {
      await databaseService.seedDemoData('admin');
      localStorage.setItem('estoque_pro_demo_dismissed', 'true');
      setShowDemoPrompt(false);
      await refreshCashRegister();
      showToast('Dados de demonstração carregados com sucesso!', 'success');
      // Trigger full page state refresh
      window.dispatchEvent(new CustomEvent('estoque_data_changed'));
    } catch (e) {
      showToast('Erro ao carregar dados de demonstração: ' + String(e), 'error');
    }
  };

  const skipDemoData = async () => {
    localStorage.setItem('estoque_pro_demo_dismissed', 'true');
    setShowDemoPrompt(false);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const playBeep = () => {
    if (!settings.pdv?.barcodeAudioBeep) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {
      // Audio context might be restricted before gesture
    }
  };

  const formatCurrency = (value: number): string => {
    const curr = settings.currency || 'R$';
    return `${curr} ${(value || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        companySettings: settings,
        updateSettings,
        updateCompanySettings: updateSettings,
        activeCashRegister,
        refreshCashRegister,
        showDemoPrompt,
        setShowDemoPrompt,
        loadDemoData,
        skipDemoData,
        resetToDemoData: loadDemoData,
        toasts,
        showToast,
        removeToast,
        playBeep,
        formatCurrency,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
