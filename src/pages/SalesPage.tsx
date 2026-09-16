import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Search,
  Eye,
  XCircle,
  Download,
  Filter,
  Calendar,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { salesService } from '../services/salesService';
import { backupService } from '../services/backupService';
import { Sale } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { ReceiptModal } from '../components/common/ReceiptModal';

export const SalesPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { formatCurrency, showToast, refreshCashRegister } = useApp();

  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'concluida' | 'cancelada'>('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected sale for receipt reprint
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);

  // Cancel sale modal
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('Cancelamento a pedido do cliente');
  const [isCancelling, setIsCancelling] = useState(false);

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await databaseService.getAll<Sale>('sales');
      data.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
      setSales(data);
    } catch (e) {
      console.error('Error loading sales:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handleCancelSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToCancel) return;

    try {
      setIsCancelling(true);
      await salesService.cancelSale(
        saleToCancel.id,
        cancelReason,
        user?.name || user?.username || 'operador'
      );
      showToast(`Venda #${saleToCancel.saleNumber} cancelada. Estoque estornado!`, 'success');
      setSaleToCancel(null);
      await loadSales();
      await refreshCashRegister();
      window.dispatchEvent(new CustomEvent('estoque_data_changed'));
    } catch (err) {
      showToast((err as Error).message || 'Erro ao cancelar venda.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredSales = sales.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (paymentFilter !== 'all' && s.paymentMethod !== paymentFilter) return false;
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(s.saleNumber).includes(q) ||
      s.user.toLowerCase().includes(q) ||
      s.items.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    );
  });

  const handleExportCSV = () => {
    const headers = [
      'Nº Venda',
      'Data',
      'Hora',
      'Operador',
      'Itens Qtd',
      'Subtotal',
      'Desconto',
      'Total',
      'Forma de Pagamento',
      'Status',
      'Motivo Cancelamento',
    ];

    const rows = filteredSales.map(s => [
      s.saleNumber,
      s.date,
      s.time,
      s.user,
      s.items.reduce((acc, i) => acc + i.quantity, 0),
      s.subtotal.toFixed(2),
      s.discountAmount.toFixed(2),
      s.total.toFixed(2),
      s.paymentMethod.toUpperCase(),
      s.status.toUpperCase(),
      s.cancelReason || '',
    ]);

    backupService.exportCSV('vendas_estoque_pro.csv', [headers, ...rows]);
    showToast('Relatório de vendas exportado em CSV!', 'success');
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-400" />
            <span>Histórico de Vendas</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Acompanhe todas as vendas realizadas, reimprima comprovantes e efetue cancelamentos.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs md:text-sm font-medium border border-slate-700 transition self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-blue-400" />
          <span>Exportar Vendas (CSV)</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nº da venda, item ou operador..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap w-full md:w-auto items-center gap-2.5">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | 'concluida' | 'cancelada')}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white"
          >
            <option value="all">Todos os Status</option>
            <option value="concluida">Concluídas</option>
            <option value="cancelada">Canceladas</option>
          </select>

          {/* Payment */}
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white"
          >
            <option value="all">Todas as Formas</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="credito">Crédito</option>
            <option value="debito">Débito</option>
            <option value="pix">Pix</option>
            <option value="misto">Misto</option>
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
            />
            <span className="text-slate-500 text-xs">até</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
            />
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Nº / Data</th>
                <th className="px-4 py-3.5">Operador</th>
                <th className="px-4 py-3.5">Itens</th>
                <th className="px-4 py-3.5 text-right">Subtotal</th>
                <th className="px-4 py-3.5 text-right">Desconto</th>
                <th className="px-4 py-3.5 text-right">Total</th>
                <th className="px-4 py-3.5">Pagamento</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSales.length > 0 ? (
                filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono">
                      <div className="font-bold text-white">#{sale.saleNumber}</div>
                      <div className="text-[10px] text-slate-500">
                        {sale.date} {sale.time}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-medium">{sale.user}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200">
                        {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-xs">
                        {sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      {formatCurrency(sale.subtotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400">
                      {sale.discountAmount > 0 ? `-${formatCurrency(sale.discountAmount)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize font-medium text-slate-300">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.status === 'concluida'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {sale.status === 'concluida' ? 'CONCLUÍDA' : 'CANCELADA'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSaleForReceipt(sale)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                          title="Reimprimir Cupom"
                        >
                          <Printer className="w-4 h-4 text-blue-400" />
                        </button>

                        {sale.status === 'concluida' && hasPermission('cancelar_venda') && (
                          <button
                            onClick={() => setSaleToCancel(sale)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Cancelar Venda e Estornar Estoque"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500 text-xs">
                    Nenhuma venda encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Sale Modal */}
      {saleToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>Cancelar Venda #{saleToCancel.saleNumber}</span>
              </h3>
              <button
                onClick={() => setSaleToCancel(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <p className="text-slate-300">
                <strong>Valor total:</strong> {formatCurrency(saleToCancel.total)}
              </p>
              <p className="text-slate-400">
                Ao cancelar esta venda, todas as quantidades serão devolvidas automaticamente ao
                estoque e a movimentação será registrada.
              </p>
            </div>

            <form onSubmit={handleCancelSale} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motivo do Cancelamento *
                </label>
                <textarea
                  rows={2}
                  required
                  autoFocus
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSaleToCancel(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {isCancelling ? 'Estornando...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reprint Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedSaleForReceipt}
        sale={selectedSaleForReceipt}
        onClose={() => setSelectedSaleForReceipt(null)}
        onNewSale={() => setSelectedSaleForReceipt(null)}
      />
    </div>
  );
};
