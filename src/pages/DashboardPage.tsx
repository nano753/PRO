import React, { useEffect, useState } from 'react';
import {
  Package,
  AlertTriangle,
  XCircle,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { reportService, DashboardMetrics, DailySalesData, BestSellingProduct, PaymentDistribution } from '../services/reportService';
import { useApp } from '../contexts/AppContext';
import { PageId } from '../layouts/MainLayout';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { formatCurrency, activeCashRegister } = useApp();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [dailySales, setDailySales] = useState<DailySalesData[]>([]);
  const [bestSellers, setBestSellers] = useState<BestSellingProduct[]>([]);
  const [paymentsDist, setPaymentsDist] = useState<PaymentDistribution[]>([]);
  const [movementsSummary, setMovementsSummary] = useState<{ totalIn: number; totalOut: number; countIn: number; countOut: number }>({
    totalIn: 0,
    totalOut: 0,
    countIn: 0,
    countOut: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [m, daily, best, payments, movs] = await Promise.all([
        reportService.getDashboardMetrics(),
        reportService.getDailySales(7),
        reportService.getBestSellingProducts(5),
        reportService.getPaymentDistribution(),
        reportService.getMovementsSummary(),
      ]);
      setMetrics(m);
      setDailySales(daily);
      setBestSellers(best);
      setPaymentsDist(payments);
      setMovementsSummary(movs);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleDataChange = () => loadData();
    window.addEventListener('estoque_data_changed', handleDataChange);
    return () => window.removeEventListener('estoque_data_changed', handleDataChange);
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Carregando dados do painel...
      </div>
    );
  }

  const maxDailySale = Math.max(...dailySales.map(d => d.total), 100);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Painel de Controle</h1>
          <p className="text-xs md:text-sm text-slate-400">
            Visão geral em tempo real do seu estoque, vendas e fluxo de caixa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('pdv')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-semibold shadow-md shadow-blue-600/20 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Abrir PDV (Vendas)</span>
          </button>
          <button
            onClick={() => onNavigate('produtos')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs md:text-sm font-medium border border-slate-700 transition"
          >
            <Package className="w-4 h-4 text-blue-400" />
            <span>Gerenciar Produtos</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Products */}
        <div
          onClick={() => onNavigate('produtos')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total de Produtos</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white mt-2">{metrics.totalProducts}</p>
          <span className="text-[11px] text-slate-400">Itens cadastrados</span>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => onNavigate('estoque_baixo')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Estoque Baixo</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-amber-400 mt-2">{metrics.lowStockProducts}</p>
          <span className="text-[11px] text-slate-400">Abaixo do estoque mínimo</span>
        </div>

        {/* Out of stock */}
        <div
          onClick={() => onNavigate('estoque_baixo')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Sem Estoque</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-rose-400 mt-2">{metrics.outOfStockProducts}</p>
          <span className="text-[11px] text-slate-400">Produtos zerados</span>
        </div>

        {/* Current Cash */}
        <div
          onClick={() => onNavigate('caixa')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Caixa Atual</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-emerald-400 mt-2 font-mono">
            {metrics.activeCashAmount !== null ? formatCurrency(metrics.activeCashAmount) : 'Fechado'}
          </p>
          <span className="text-[11px] text-slate-400">
            {activeCashRegister ? 'Dinheiro em gaveta' : 'Nenhum caixa aberto'}
          </span>
        </div>

        {/* Today's Sales Amount */}
        <div
          onClick={() => onNavigate('vendas')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Vendas do Dia</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white mt-2 font-mono">
            {formatCurrency(metrics.todaySalesAmount)}
          </p>
          <span className="text-[11px] text-slate-400">{metrics.todaySalesCount} vendas hoje</span>
        </div>

        {/* Stock Cost Valuation */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Custo do Estoque</span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-slate-200 mt-2 font-mono">
            {formatCurrency(metrics.stockCostValue)}
          </p>
          <span className="text-[11px] text-slate-400">Investimento atual</span>
        </div>

        {/* Stock Sale Valuation */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Valor de Venda do Estoque</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-blue-400 mt-2 font-mono">
            {formatCurrency(metrics.stockSaleValue)}
          </p>
          <span className="text-[11px] text-slate-400">Faturamento potencial</span>
        </div>

        {/* Estimated Profit */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Lucro Estimado</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-bold text-emerald-400 mt-2 font-mono">
            {formatCurrency(metrics.estimatedProfit)}
          </p>
          <span className="text-[11px] text-slate-400">Margem em estoque</span>
        </div>
      </div>

      {/* Visual Charts & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Day (Last 7 Days) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Vendas por Dia (Últimos 7 dias)</h2>
              <p className="text-xs text-slate-400">Evolução do faturamento diário</p>
            </div>
            <span className="text-xs font-mono text-blue-400 font-medium">
              Total: {formatCurrency(dailySales.reduce((acc, d) => acc + d.total, 0))}
            </span>
          </div>

          <div className="flex-1 flex items-end justify-between gap-2 h-44 pt-4 border-b border-slate-800">
            {dailySales.map(day => {
              const heightPercent = Math.max(8, (day.total / maxDailySale) * 100);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-blue-400 transition">
                    {day.total > 0 ? formatCurrency(day.total).replace('R$', '').trim() : '-'}
                  </span>
                  <div className="w-full max-w-[36px] bg-slate-800 rounded-t-lg relative flex items-end overflow-hidden h-32">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-linear-to-t from-blue-600 to-indigo-500 group-hover:brightness-110 transition-all rounded-t-lg"
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{day.formattedDate}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Best Selling Products */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Produtos Mais Vendidos</h2>
              <p className="text-xs text-slate-400">Ranking por quantidade de unidades</p>
            </div>
            <button
              onClick={() => onNavigate('relatorios')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Ver todos
            </button>
          </div>

          {bestSellers.length > 0 ? (
            <div className="space-y-3 flex-1 overflow-y-auto">
              {bestSellers.map((item, idx) => (
                <div key={item.productId} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-semibold text-slate-100 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-white">{item.quantitySold} un</span>
                    <p className="text-[11px] font-mono text-slate-400">{formatCurrency(item.totalRevenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs py-8">
              <ShoppingBag className="w-8 h-8 mb-2 opacity-40" />
              <span>Nenhuma venda registrada ainda.</span>
            </div>
          )}
        </div>

        {/* Payment Methods Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <h2 className="text-sm font-semibold text-white mb-1">Formas de Pagamento</h2>
          <p className="text-xs text-slate-400 mb-4">Distribuição de receita por meio de pagamento</p>

          <div className="space-y-3">
            {paymentsDist.map(p => (
              <div key={p.method} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-300">{p.label}</span>
                  <span className="font-mono text-slate-200">
                    {formatCurrency(p.amount)} ({p.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${p.percentage}%` }}
                    className={`h-full rounded-full ${
                      p.method === 'dinheiro'
                        ? 'bg-emerald-500'
                        : p.method === 'pix'
                        ? 'bg-teal-400'
                        : p.method === 'credito'
                        ? 'bg-blue-500'
                        : 'bg-purple-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Movements Summary (Entradas x Saídas) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white">Entradas x Saídas de Estoque</h2>
            <button
              onClick={() => onNavigate('movimentacoes')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Ver histórico
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4">Fluxo total de movimentações registradas</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                <ArrowDownRight className="w-4 h-4" />
                <span>ENTRADAS</span>
              </div>
              <p className="text-lg font-bold text-white mt-1 font-mono">
                {formatCurrency(movementsSummary.totalIn)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{movementsSummary.countIn} movimentações</p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                <ArrowUpRight className="w-4 h-4" />
                <span>SAÍDAS</span>
              </div>
              <p className="text-lg font-bold text-white mt-1 font-mono">
                {formatCurrency(movementsSummary.totalOut)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{movementsSummary.countOut} movimentações</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
