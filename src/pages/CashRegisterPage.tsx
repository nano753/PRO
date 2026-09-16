import React, { useEffect, useState } from 'react';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  History,
  FileText,
  Printer,
  DollarSign,
  CreditCard,
  QrCode,
  X,
} from 'lucide-react';
import { cashService } from '../services/cashService';
import { CashMovement, CashRegister } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

export const CashRegisterPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { formatCurrency, activeCashRegister, refreshCashRegister, showToast } = useApp();

  const [activeMovements, setActiveMovements] = useState<CashMovement[]>([]);
  const [closedRegisters, setClosedRegisters] = useState<CashRegister[]>([]);
  const [selectedRegisterToView, setSelectedRegisterToView] = useState<CashRegister | null>(null);

  // Modals
  const [isOpenCashModalOpen, setIsOpenCashModalOpen] = useState(false);
  const [isCloseCashModalOpen, setIsCloseCashModalOpen] = useState(false);
  const [isSuprimentoModalOpen, setIsSuprimentoModalOpen] = useState(false);
  const [isSangriaModalOpen, setIsSangriaModalOpen] = useState(false);

  // Form states
  const [initialCash, setInitialCash] = useState<number>(100);
  const [openingNotes, setOpeningNotes] = useState<string>('Fundo de troco inicial');
  const [actualCashCounted, setActualCashCounted] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementReason, setMovementReason] = useState<string>('');

  const loadData = async () => {
    try {
      await refreshCashRegister();
      if (activeCashRegister) {
        const movs = await cashService.getMovementsForRegister(activeCashRegister.id);
        setActiveMovements(movs);
      } else {
        setActiveMovements([]);
      }
      const allRegisters = await cashService.getAllRegisters();
      setClosedRegisters(allRegisters.filter(r => r.status === 'fechado'));
    } catch (e) {
      console.error('Error loading cash register data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCashRegister?.id]);

  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await cashService.openRegister({
        initialCash: initialCash || 0,
        notes: openingNotes,
        user: user?.name || user?.username || 'operador',
      });
      showToast('Caixa aberto com sucesso!', 'success');
      setIsOpenCashModalOpen(false);
      await loadData();
      window.dispatchEvent(new CustomEvent('estoque_data_changed'));
    } catch (err) {
      showToast((err as Error).message || 'Erro ao abrir caixa.', 'error');
    }
  };

  const handleSuprimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (movementAmount <= 0) {
      showToast('Informe um valor válido.', 'error');
      return;
    }
    if (!movementReason.trim()) {
      showToast('Informe o motivo do suprimento.', 'error');
      return;
    }

    try {
      await cashService.registerCashMovement({
        type: 'SUPRIMENTO',
        amount: movementAmount,
        reason: movementReason.trim(),
        user: user?.name || user?.username || 'operador',
      });
      showToast('Suprimento registrado com sucesso!', 'success');
      setIsSuprimentoModalOpen(false);
      setMovementAmount(0);
      setMovementReason('');
      await loadData();
      window.dispatchEvent(new CustomEvent('estoque_data_changed'));
    } catch (err) {
      showToast((err as Error).message || 'Erro ao registrar suprimento.', 'error');
    }
  };

  const handleSangria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (movementAmount <= 0) {
      showToast('Informe um valor válido.', 'error');
      return;
    }
    if (!movementReason.trim()) {
      showToast('Informe o motivo da sangria.', 'error');
      return;
    }

    try {
      await cashService.registerCashMovement({
        type: 'SANGRIA',
        amount: movementAmount,
        reason: movementReason.trim(),
        user: user?.name || user?.username || 'operador',
      });
      showToast('Sangria registrada com sucesso!', 'success');
      setIsSangriaModalOpen(false);
      setMovementAmount(0);
      setMovementReason('');
      await loadData();
      window.dispatchEvent(new CustomEvent('estoque_data_changed'));
    } catch (err) {
      showToast((err as Error).message || 'Erro ao registrar sangria.', 'error');
    }
  };

  const handleCloseCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCashRegister) return;

    try {
      const closed = await cashService.closeRegister({
        registerId: activeCashRegister.id,
        actualCash: actualCashCounted,
        notes: closingNotes,
      });
      showToast('Caixa fechado com sucesso!', 'success');
      setIsCloseCashModalOpen(false);
      setSelectedRegisterToView(closed);
      await loadData();
      window.dispatchEvent(new CustomEvent('estoque_data_changed'));
    } catch (err) {
      showToast((err as Error).message || 'Erro ao fechar o caixa.', 'error');
    }
  };

  const cashDifference =
    activeCashRegister ? Number((actualCashCounted - activeCashRegister.expectedCash).toFixed(2)) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-400" />
            <span>Controle de Caixa & Turno</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Gerencie abertura, fechamento, troco em gaveta, sangrias e suprimentos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeCashRegister ? (
            <>
              {hasPermission('fazer_suprimento') && (
                <button
                  onClick={() => setIsSuprimentoModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs md:text-sm font-medium border border-slate-700 transition"
                >
                  <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                  <span>+ Suprimento</span>
                </button>
              )}

              {hasPermission('fazer_sangria') && (
                <button
                  onClick={() => setIsSangriaModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs md:text-sm font-medium border border-slate-700 transition"
                >
                  <ArrowUpCircle className="w-4 h-4 text-rose-400" />
                  <span>- Sangria</span>
                </button>
              )}

              {hasPermission('fechar_caixa') && (
                <button
                  onClick={() => {
                    setActualCashCounted(activeCashRegister.expectedCash);
                    setIsCloseCashModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs md:text-sm font-bold shadow-md shadow-rose-600/20 transition"
                >
                  <Lock className="w-4 h-4" />
                  <span>Fechar Caixa</span>
                </button>
              )}
            </>
          ) : (
            hasPermission('abrir_caixa') && (
              <button
                onClick={() => setIsOpenCashModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-bold shadow-md shadow-emerald-600/20 transition"
              >
                <Unlock className="w-4 h-4" />
                <span>Abrir Novo Caixa</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Active Cash Dashboard or Closed Warning */}
      {activeCashRegister ? (
        <div className="space-y-4">
          {/* Main Status Bar */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Caixa Aberto em Operação</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                    TURNO ATIVO
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Operador: <strong className="text-slate-200">{activeCashRegister.user}</strong> • Aberto em:{' '}
                  {activeCashRegister.openedDate} às {activeCashRegister.openedTime}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">Dinheiro Atual na Gaveta</span>
              <p className="text-3xl font-black text-emerald-400 font-mono">
                {formatCurrency(activeCashRegister.expectedCash)}
              </p>
            </div>
          </div>

          {/* Breakdown KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Initial cash */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">Fundo de Troco</span>
              <p className="text-lg font-bold text-white font-mono mt-1">
                {formatCurrency(activeCashRegister.initialCash)}
              </p>
              <span className="text-[10px] text-slate-500">Valor inicial</span>
            </div>

            {/* Total Dinheiro Sales */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Vendas em Dinheiro</span>
              </span>
              <p className="text-lg font-bold text-emerald-400 font-mono mt-1">
                {formatCurrency(activeCashRegister.totalCashSales)}
              </p>
              <span className="text-[10px] text-slate-500">Entrou na gaveta</span>
            </div>

            {/* Card Sales */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-blue-400 font-medium flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Vendas em Cartão</span>
              </span>
              <p className="text-lg font-bold text-blue-400 font-mono mt-1">
                {formatCurrency(activeCashRegister.totalCardSales)}
              </p>
              <span className="text-[10px] text-slate-500">Crédito & Débito (POS)</span>
            </div>

            {/* Pix Sales */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-teal-400 font-medium flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" />
                <span>Vendas via Pix</span>
              </span>
              <p className="text-lg font-bold text-teal-400 font-mono mt-1">
                {formatCurrency(activeCashRegister.totalPixSales)}
              </p>
              <span className="text-[10px] text-slate-500">Conta corrente</span>
            </div>

            {/* Suprimentos */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span>Total de Suprimentos</span>
              </span>
              <p className="text-lg font-bold text-white font-mono mt-1">
                {formatCurrency(activeCashRegister.totalSuprimentos)}
              </p>
              <span className="text-[10px] text-slate-500">Adições avulsas</span>
            </div>

            {/* Sangrias */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-rose-400 font-medium flex items-center gap-1">
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span>Total de Sangrias</span>
              </span>
              <p className="text-lg font-bold text-rose-400 font-mono mt-1">
                {formatCurrency(activeCashRegister.totalSangrias)}
              </p>
              <span className="text-[10px] text-slate-500">Retiradas de cofre</span>
            </div>

            {/* Total General Sales */}
            <div className="col-span-2 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold">Total Faturado no Turno</span>
                <p className="text-2xl font-black text-white font-mono mt-1">
                  {formatCurrency(
                    activeCashRegister.totalCashSales +
                      activeCashRegister.totalCardSales +
                      activeCashRegister.totalPixSales
                  )}
                </p>
              </div>
              <span className="text-xs text-blue-400 font-semibold bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
                Todas as Formas
              </span>
            </div>
          </div>

          {/* Current Session Cash Movements Table */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white">Movimentações de Caixa deste Turno</h3>
            {activeMovements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2">Hora</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Motivo</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                      <th className="px-3 py-2">Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {activeMovements.map(m => (
                      <tr key={m.id}>
                        <td className="px-3 py-2 font-mono text-slate-400">{m.time}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.type === 'SUPRIMENTO'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : m.type === 'SANGRIA'
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-blue-500/10 text-blue-400'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-300">{m.reason}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-white">
                          {formatCurrency(m.amount)}
                        </td>
                        <td className="px-3 py-2 text-slate-400">{m.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">
                Nenhum suprimento ou sangria avulsa registrada neste turno ainda.
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Caixa Fechado Banner */
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">O Caixa Está Fechado</h3>
            <p className="text-xs text-slate-400 mt-1">
              Para realizar vendas no PDV e registrar movimentações em dinheiro, abra o caixa com o valor de fundo de troco inicial.
            </p>
          </div>
          {hasPermission('abrir_caixa') && (
            <button
              onClick={() => setIsOpenCashModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition"
            >
              Abrir Caixa Agora
            </button>
          )}
        </div>
      )}

      {/* Closed Registers History Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <span>Histórico de Fechamentos de Caixa Anteriores</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Abertura / Fechamento</th>
                <th className="px-4 py-3">Operador</th>
                <th className="px-4 py-3 text-right">Inicial</th>
                <th className="px-4 py-3 text-right">Dinheiro Esperado</th>
                <th className="px-4 py-3 text-right">Dinheiro Contado</th>
                <th className="px-4 py-3 text-right">Diferença</th>
                <th className="px-4 py-3 text-center">Cupom</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {closedRegisters.length > 0 ? (
                closedRegisters.map(reg => {
                  const diff = reg.difference || 0;
                  return (
                    <tr key={reg.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono">
                        <div className="font-semibold text-white">
                          {reg.openedDate} {reg.openedTime}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Fechado: {reg.closedDate} {reg.closedTime}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-medium">{reg.user}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">
                        {formatCurrency(reg.initialCash)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-200">
                        {formatCurrency(reg.expectedCash)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-white">
                        {formatCurrency(reg.actualCash || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            diff === 0
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : diff > 0
                              ? 'text-blue-400 bg-blue-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {diff > 0 ? `+${formatCurrency(diff)} (Sobra)` : diff < 0 ? `${formatCurrency(diff)} (Falta)` : 'R$ 0,00'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedRegisterToView(reg)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                          title="Visualizar Relatório de Fechamento"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                    Nenhum turno anterior arquivado no sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Open Cash */}
      {isOpenCashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Unlock className="w-5 h-5 text-emerald-400" />
                <span>Abertura de Caixa</span>
              </h3>
              <button
                onClick={() => setIsOpenCashModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOpenCash} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Fundo de Troco Inicial (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  autoFocus
                  value={initialCash || ''}
                  onChange={e => setInitialCash(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xl font-bold font-mono text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações de Abertura
                </label>
                <input
                  type="text"
                  value={openingNotes}
                  onChange={e => setOpeningNotes(e.target.value)}
                  placeholder="Ex: Turno da manhã, notas miúdas..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenCashModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md"
                >
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Close Cash */}
      {isCloseCashModalOpen && activeCashRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-400" />
                <span>Fechamento de Caixa</span>
              </h3>
              <button
                onClick={() => setIsCloseCashModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Fundo Inicial:</span>
                <span className="font-mono">{formatCurrency(activeCashRegister.initialCash)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Vendas em Dinheiro (+):</span>
                <span className="font-mono text-emerald-400">
                  +{formatCurrency(activeCashRegister.totalCashSales)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Suprimentos (+):</span>
                <span className="font-mono text-emerald-400">
                  +{formatCurrency(activeCashRegister.totalSuprimentos)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Sangrias (-):</span>
                <span className="font-mono text-rose-400">
                  -{formatCurrency(activeCashRegister.totalSangrias)}
                </span>
              </div>
              <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-800 text-sm">
                <span>Dinheiro Esperado na Gaveta:</span>
                <span className="font-mono text-emerald-400">
                  {formatCurrency(activeCashRegister.expectedCash)}
                </span>
              </div>
            </div>

            <form onSubmit={handleCloseCash} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor Contado Fisicamente na Gaveta (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  autoFocus
                  value={actualCashCounted || ''}
                  onChange={e => setActualCashCounted(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xl font-bold font-mono text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Difference badge */}
              <div className="p-3 rounded-xl bg-slate-950 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Diferença de Caixa:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    cashDifference === 0
                      ? 'text-emerald-400'
                      : cashDifference > 0
                      ? 'text-blue-400'
                      : 'text-rose-400'
                  }`}
                >
                  {cashDifference === 0
                    ? 'Exato (Sem diferença)'
                    : cashDifference > 0
                    ? `+ ${formatCurrency(cashDifference)} (Sobra)`
                    : `${formatCurrency(cashDifference)} (Falta)`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações de Fechamento
                </label>
                <input
                  type="text"
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                  placeholder="Justificativa de divergência ou notas..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCloseCashModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md"
                >
                  Confirmar e Encerrar Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Suprimento */}
      {isSuprimentoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-emerald-400" />
                <span>Registrar Suprimento (Entrada em Gaveta)</span>
              </h3>
              <button
                onClick={() => setIsSuprimentoModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSuprimento} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor a Inserir (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  value={movementAmount || ''}
                  onChange={e => setMovementAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xl font-bold font-mono text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Motivo *</label>
                <input
                  type="text"
                  required
                  value={movementReason}
                  onChange={e => setMovementReason(e.target.value)}
                  placeholder="Ex: Troco adicional, reforço de caixa..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSuprimentoModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
                >
                  Salvar Suprimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sangria */}
      {isSangriaModalOpen && activeCashRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-rose-400" />
                <span>Registrar Sangria (Retirada da Gaveta)</span>
              </h3>
              <button
                onClick={() => setIsSangriaModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 text-xs text-slate-400 flex justify-between">
              <span>Disponível em Dinheiro:</span>
              <strong className="text-white font-mono">{formatCurrency(activeCashRegister.expectedCash)}</strong>
            </div>

            <form onSubmit={handleSangria} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor a Retirar (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={activeCashRegister.expectedCash}
                  required
                  autoFocus
                  value={movementAmount || ''}
                  onChange={e => setMovementAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xl font-bold font-mono text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Motivo *</label>
                <input
                  type="text"
                  required
                  value={movementReason}
                  onChange={e => setMovementReason(e.target.value)}
                  placeholder="Ex: Pagamento de fornecedor, depósito bancário..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSangriaModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm"
                >
                  Salvar Sangria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Closed Register Report Ticket */}
      {selectedRegisterToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>Resumo de Fechamento de Caixa</span>
              </h3>
              <button
                onClick={() => setSelectedRegisterToView(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-white text-slate-900 p-5 rounded-xl font-mono text-xs space-y-2 shadow-inner">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h4 className="font-bold text-sm">RELATÓRIO DE FECHAMENTO</h4>
                <p>Operador: {selectedRegisterToView.user}</p>
                <p>Abertura: {selectedRegisterToView.openedDate} {selectedRegisterToView.openedTime}</p>
                <p>Fechamento: {selectedRegisterToView.closedDate} {selectedRegisterToView.closedTime}</p>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-slate-400">
                <div className="flex justify-between">
                  <span>Fundo Inicial:</span>
                  <span>{formatCurrency(selectedRegisterToView.initialCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas Dinheiro:</span>
                  <span>{formatCurrency(selectedRegisterToView.totalCashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas Cartão:</span>
                  <span>{formatCurrency(selectedRegisterToView.totalCardSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vendas Pix:</span>
                  <span>{formatCurrency(selectedRegisterToView.totalPixSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Suprimentos:</span>
                  <span>+{formatCurrency(selectedRegisterToView.totalSuprimentos)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sangrias:</span>
                  <span>-{formatCurrency(selectedRegisterToView.totalSangrias)}</span>
                </div>
              </div>

              <div className="space-y-1 font-bold pt-1">
                <div className="flex justify-between">
                  <span>Dinheiro Esperado:</span>
                  <span>{formatCurrency(selectedRegisterToView.expectedCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dinheiro Contado:</span>
                  <span>{formatCurrency(selectedRegisterToView.actualCash || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-950">
                  <span>Diferença:</span>
                  <span>{formatCurrency(selectedRegisterToView.difference || 0)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-blue-400" />
                <span>Imprimir</span>
              </button>
              <button
                onClick={() => setSelectedRegisterToView(null)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
