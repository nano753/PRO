import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  CreditCard,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { reportService, BestSellingProduct, DailySalesData, PaymentDistribution } from '../services/reportService';
import { databaseService } from '../services/databaseService';
import { backupService } from '../services/backupService';
import { Sale, Product, Movement, CashRegister } from '../types';
import { useApp } from '../contexts/AppContext';

export const ReportsPage: React.FC = () => {
  const { formatCurrency, showToast } = useApp();

  const [periodPreset, setPeriodPreset] = useState<'today' | '7days' | '30days' | 'custom'>('7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [dailySales, setDailySales] = useState<DailySalesData[]>([]);
  const [bestSellers, setBestSellers] = useState<BestSellingProduct[]>([]);
  const [paymentDist, setPaymentDist] = useState<PaymentDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const [allSales, allProds, allMovs, allCash, daily, best, payments] = await Promise.all([
        databaseService.getAll<Sale>('sales'),
        databaseService.getAll<Product>('products'),
        databaseService.getAll<Movement>('movements'),
        databaseService.getAll<CashRegister>('cashRegisters'),
        reportService.getDailySales(7),
        reportService.getBestSellingProducts(10),
        reportService.getPaymentDistribution(),
      ]);

      setSales(allSales);
      setProducts(allProds);
      setMovements(allMovs);
      setCashRegisters(allCash);
      setDailySales(daily);
      setBestSellers(best);
      setPaymentDist(payments);
    } catch (e) {
      console.error('Error loading report data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Filter sales based on period
  const completedSales = sales.filter(s => {
    if (s.status !== 'concluida') return false;
    const todayStr = new Date().toISOString().split('T')[0];

    if (periodPreset === 'today') {
      return s.date === todayStr;
    } else if (periodPreset === '7days') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 7);
      return s.date >= d7.toISOString().split('T')[0];
    } else if (periodPreset === '30days') {
      const d30 = new Date();
      d30.setDate(d30.getDate() - 30);
      return s.date >= d30.toISOString().split('T')[0];
    } else if (periodPreset === 'custom') {
      if (startDate && s.date < startDate) return false;
      if (endDate && s.date > endDate) return false;
      return true;
    }
    return true;
  });

  const totalSalesRevenue = completedSales.reduce((acc, s) => acc + s.total, 0);
  const totalSalesCount = completedSales.length;
  const averageTicket = totalSalesCount > 0 ? totalSalesRevenue / totalSalesCount : 0;
  const totalDiscountGiven = completedSales.reduce((acc, s) => acc + s.discountAmount, 0);

  // Stock Totals
  const totalStockCost = products.reduce((acc, p) => acc + p.currentStock * p.costPrice, 0);
  const totalStockSale = products.reduce((acc, p) => acc + p.currentStock * p.salePrice, 0);
  const totalPotentialProfit = totalStockSale - totalStockCost;

  // Movements totals
  const totalInValue = movements
    .filter(m => m.type === 'ENTRADA')
    .reduce((acc, m) => acc + m.totalValue, 0);
  const totalOutValue = movements
    .filter(m => m.type === 'SAIDA')
    .reduce((acc, m) => acc + m.totalValue, 0);

  const handleExportFullCSV = () => {
    const headers = [
      'Data',
      'Nº Venda',
      'Operador',
      'Itens Qtd',
      'Subtotal',
      'Desconto',
      'Total',
      'Forma Pagamento',
    ];

    const rows = completedSales.map(s => [
      s.date,
      s.saleNumber,
      s.user,
      s.items.reduce((acc, i) => acc + i.quantity, 0),
      s.subtotal.toFixed(2),
      s.discountAmount.toFixed(2),
      s.total.toFixed(2),
      s.paymentMethod.toUpperCase(),
    ]);

    backupService.exportCSV('relatorio_gerencial_vendas.csv', [headers, ...rows]);
    showToast('Relatório gerencial exportado com sucesso!', 'success');
  };

  return (
    <div className="space-y-6 print:p-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <span>Relatórios & Inteligência de Negócio</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Análises aprofundadas de vendas, estoque, meios de pagamento e lucratividade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs md:text-sm font-medium border border-slate-700 transition"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Imprimir</span>
          </button>

          <button
            onClick={handleExportFullCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-semibold shadow-md shadow-blue-600/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between print:hidden">
        <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold w-full md:w-auto">
          <button
            onClick={() => setPeriodPreset('today')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition ${
              periodPreset === 'today' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriodPreset('7days')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition ${
              periodPreset === '7days' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Últimos 7 Dias
          </button>
          <button
            onClick={() => setPeriodPreset('30days')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition ${
              periodPreset === '30days' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Últimos 30 Dias
          </button>
          <button
            onClick={() => setPeriodPreset('custom')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition ${
              periodPreset === 'custom' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Personalizado
          </button>
        </div>

        {periodPreset === 'custom' && (
          <div className="flex items-center gap-2">
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
        )}
      </div>

      {/* KPI Cards: Sales for Selected Period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Faturamento no Período</span>
          <p className="text-2xl font-black text-white font-mono mt-1">
            {formatCurrency(totalSalesRevenue)}
          </p>
          <span className="text-[11px] text-slate-500">Vendas aprovadas</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Vendas Realizadas</span>
          <p className="text-2xl font-black text-blue-400 font-mono mt-1">{totalSalesCount}</p>
          <span className="text-[11px] text-slate-500">Cupons emitidos</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Ticket Médio</span>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {formatCurrency(averageTicket)}
          </p>
          <span className="text-[11px] text-slate-500">Por cliente / venda</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Descontos Concedidos</span>
          <p className="text-2xl font-black text-amber-400 font-mono mt-1">
            {formatCurrency(totalDiscountGiven)}
          </p>
          <span className="text-[11px] text-slate-500">Total em promoções</span>
        </div>
      </div>

      {/* Detailed Stock Valuation Panel */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              <span>Valoração Geral do Estoque</span>
            </h2>
            <p className="text-xs text-slate-400">
              Patrimônio imobilizado em mercadorias e projeção de margem bruta
            </p>
          </div>
          <span className="text-xs font-mono text-slate-300 font-bold bg-slate-800 px-3 py-1 rounded-lg">
            {products.length} Itens no Catálogo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400">Patrimônio em Custo</span>
            <p className="text-xl font-bold text-slate-200 font-mono mt-1">
              {formatCurrency(totalStockCost)}
            </p>
            <span className="text-[10px] text-slate-500">Investimento pago em mercadorias</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400">Potencial de Venda</span>
            <p className="text-xl font-bold text-blue-400 font-mono mt-1">
              {formatCurrency(totalStockSale)}
            </p>
            <span className="text-[10px] text-slate-500">Faturamento bruto ao esgotar estoque</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400">Lucro Bruto Projetado</span>
            <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
              {formatCurrency(totalPotentialProfit)}
            </p>
            <span className="text-[10px] text-slate-500">
              Margem média:{' '}
              {totalStockCost > 0
                ? `${((totalPotentialProfit / totalStockCost) * 100).toFixed(1)}%`
                : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Ranking & Payment Methods Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Best Sellers Ranking */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Ranking: Produtos Mais Vendidos</h3>
            <p className="text-xs text-slate-400">Itens com maior saída de estoque</p>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-72">
            {bestSellers.length > 0 ? (
              bestSellers.map((item, idx) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        idx === 0
                          ? 'bg-amber-500 text-black font-black'
                          : idx === 1
                          ? 'bg-slate-300 text-black font-black'
                          : idx === 2
                          ? 'bg-amber-700 text-white font-black'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {idx + 1}º
                    </span>
                    <div className="truncate">
                      <p className="font-semibold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-emerald-400 font-mono">
                      {item.quantitySold} un
                    </span>
                    <p className="text-[11px] font-mono text-slate-400">
                      {formatCurrency(item.totalRevenue)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-8">
                Nenhum dado de vendas computado.
              </p>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Participação por Meio de Pagamento</h3>
            <p className="text-xs text-slate-400">Como os clientes preferem pagar</p>
          </div>

          <div className="space-y-4 flex-1">
            {paymentDist.map(p => (
              <div key={p.method} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-200">{p.label}</span>
                  <span className="font-mono font-bold text-white">
                    {formatCurrency(p.amount)} ({p.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    style={{ width: `${p.percentage}%` }}
                    className={`h-full rounded-full ${
                      p.method === 'dinheiro'
                        ? 'bg-emerald-500'
                        : p.method === 'pix'
                        ? 'bg-teal-400'
                        : p.method === 'credito'
                        ? 'bg-blue-500'
                        : 'bg-indigo-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
