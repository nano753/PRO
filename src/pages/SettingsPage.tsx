import React, { useEffect, useState } from 'react';
import {
  Settings,
  Building2,
  Printer,
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { backupService } from '../services/backupService';
import { databaseService } from '../services/databaseService';
import { CompanySettings } from '../types';

export const SettingsPage: React.FC = () => {
  const { companySettings, updateCompanySettings, resetToDemoData, showToast } = useApp();
  const { hasPermission } = useAuth();

  // Settings form state
  const [formData, setFormData] = useState<CompanySettings>(companySettings);
  const [storageUsage, setStorageUsage] = useState<string>('Calculando...');
  const [isSaving, setIsSaving] = useState(false);

  // Backup & Restore
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFileInput, setRestoreFileInput] = useState<HTMLInputElement | null>(null);

  // Danger modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    setFormData(companySettings);
    checkStorage();
  }, [companySettings]);

  const checkStorage = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const est = await navigator.storage.estimate();
        const usageMB = ((est.usage || 0) / (1024 * 1024)).toFixed(2);
        const quotaMB = ((est.quota || 0) / (1024 * 1024)).toFixed(0);
        setStorageUsage(`${usageMB} MB utilizados de aprox. ${quotaMB} MB disponíveis`);
      } catch (e) {
        setStorageUsage('IndexedDB ativo');
      }
    } else {
      setStorageUsage('IndexedDB suportado');
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateCompanySettings(formData);
      showToast('Configurações da empresa salvas com sucesso!', 'success');
    } catch (err) {
      showToast((err as Error).message || 'Erro ao salvar configurações.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackupExport = async () => {
    try {
      await backupService.exportFullBackup();
      showToast('Backup completo baixado com sucesso!', 'success');
    } catch (e) {
      showToast('Falha ao exportar backup.', 'error');
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirm = window.confirm(
      'ATENÇÃO: Restaurar um backup substituirá os dados atuais do sistema pelos dados contidos no arquivo. Deseja prosseguir?'
    );
    if (!confirm) {
      e.target.value = '';
      return;
    }

    try {
      setIsRestoring(true);
      const res = await backupService.importBackup(file);
      if (res.success) {
        showToast('Backup restaurado com sucesso! Recarregando sistema...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('Erro ao importar arquivo de backup.', 'error');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  const handleResetDemo = async () => {
    try {
      await resetToDemoData();
      showToast('Dados de demonstração restaurados!', 'success');
      setIsResetConfirmOpen(false);
    } catch (e) {
      showToast('Falha ao restaurar dados.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          <span>Configurações do Sistema</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Dados da empresa para o cupom fiscal/recibo, impressora térmica e gerenciamento de backup local.
        </p>
      </div>

      {/* Section 1: Company Profile Form */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Dados da Empresa / Loja</h2>
            <p className="text-xs text-slate-400">
              Esses dados serão impressos no cabeçalho e rodapé dos cupons de venda e relatórios.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveCompany} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Razão Social ou Nome Fantasia *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                CNPJ ou CPF *
              </label>
              <input
                type="text"
                required
                value={formData.document}
                onChange={e => setFormData({ ...formData, document: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Endereço Completo
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, Número, Bairro, Cidade - UF"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mensagem do Rodapé do Recibo
              </label>
              <input
                type="text"
                value={formData.receiptFooterMessage}
                onChange={e => setFormData({ ...formData, receiptFooterMessage: e.target.value })}
                placeholder="Ex: Obrigado pela preferência! Volte sempre!"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs md:text-sm shadow-md shadow-blue-600/20 transition"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações da Loja'}
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Printer Setup */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Impressora Térmica de Recibos</h2>
            <p className="text-xs text-slate-400">
              Configure o formato de saída dos comprovantes (bobina padrão 58mm ou 80mm).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Largura da Bobina Térmica
            </label>
            <select
              value={formData.receiptPaperWidth}
              onChange={e =>
                setFormData({
                  ...formData,
                  receiptPaperWidth: e.target.value as '80mm' | '58mm',
                })
              }
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden"
            >
              <option value="80mm">80mm (Bobina Larga / Padrão EPSON, Daruma, Bematech)</option>
              <option value="58mm">58mm (Bobina Compacta / Mini Impressora Bluetooth / POS)</option>
            </select>
          </div>

          <div className="flex flex-col justify-center space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={formData.autoPrintReceipt}
                onChange={e => setFormData({ ...formData, autoPrintReceipt: e.target.checked })}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span className="font-semibold text-white">
                Abrir impressão automaticamente ao finalizar venda
              </span>
            </label>
            <p className="text-[11px] text-slate-500">
              Se habilitado, a caixa de diálogo de impressão do navegador abrirá de imediato.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Backup & Restore */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Backup e Restauração de Dados</h2>
            <p className="text-xs text-slate-400">
              Salve com segurança todos os produtos, vendas, caixas e clientes em um arquivo local.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Download Backup */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-400" />
              <span>Exportar Backup Completo</span>
            </h3>
            <p className="text-xs text-slate-400">
              Gera um arquivo JSON criptografado contendo todos os registros do IndexedDB. Guarde em um pendrive ou nuvem.
            </p>
            {hasPermission('fazer_backup') && (
              <button
                onClick={handleBackupExport}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Arquivo de Backup</span>
              </button>
            )}
          </div>

          {/* Restore Backup */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Restaurar Backup Anterior</span>
            </h3>
            <p className="text-xs text-slate-400">
              Carregue um arquivo .JSON de backup salvo anteriormente para restaurar o sistema.
            </p>
            {hasPermission('restaurar_backup') && (
              <label className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700">
                <Upload className="w-4 h-4" />
                <span>{isRestoring ? 'Processando Restauração...' : 'Selecionar Arquivo de Backup'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFile}
                  disabled={isRestoring}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Section 4: Storage Diagnostics & System Reset */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Armazenamento Offline (IndexedDB)</h2>
            <p className="text-xs text-slate-400">
              Status do banco de dados local executando no navegador.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Uso de Armazenamento Local</span>
            <p className="text-sm font-bold text-white font-mono mt-0.5">{storageUsage}</p>
          </div>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Resetar para Dados Demo</span>
          </button>
        </div>
      </div>

      {/* Confirm Reset Demo Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-white">Restaurar Dados de Teste / Fábrica?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta ação irá substituir seus dados atuais e carregar o catálogo de produtos e configurações padrão do ESTOQUE PRO.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetDemo}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
              >
                Sim, Resetar Sistema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
