import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  XCircle,
  PlusCircle,
  Download,
  Package,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { productService } from '../services/productService';
import { backupService } from '../services/backupService';
import { Category, Product } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { PageId } from '../layouts/MainLayout';

interface LowStockPageProps {
  onNavigate: (page: PageId) => void;
}

export const LowStockPage: React.FC<LowStockPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { formatCurrency, showToast } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Restock Modal
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQuantity, setRestockQuantity] = useState<number>(10);
  const [restockCost, setRestockCost] = useState<number>(0);

  const loadAlertProducts = async () => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([
        productService.getProducts(),
        productService.getCategories(),
      ]);
      const alertProds = prods.filter(p => p.status === 'ativo' && p.currentStock <= p.minStock);
      // Sort out-of-stock first, then lowest stock
      alertProds.sort((a, b) => a.currentStock - b.currentStock);
      setProducts(alertProds);
      setCategories(cats);
    } catch (e) {
      console.error('Error loading low stock items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlertProducts();
  }, []);

  const openRestock = (product: Product) => {
    setRestockProduct(product);
    const suggested = Math.max(5, product.minStock * 2 - product.currentStock);
    setRestockQuantity(suggested);
    setRestockCost(product.costPrice);
  };

  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;

    try {
      await productService.registerMovement({
        productId: restockProduct.id,
        type: 'ENTRADA',
        quantity: restockQuantity,
        unitPrice: restockCost,
        reason: 'Reposição Emergencial',
        notes: 'Entrada rápida via tela de Alertas de Estoque Baixo',
        user: user?.name || user?.username || 'operador',
      });

      showToast(`Reposição de ${restockQuantity} ${restockProduct.unit} concluída!`, 'success');
      setRestockProduct(null);
      await loadAlertProducts();
      window.dispatchEvent(new CustomEvent('estoque_data_changed'));
    } catch (err) {
      showToast((err as Error).message || 'Erro ao repor estoque.', 'error');
    }
  };

  const handleExportOrderList = () => {
    const headers = [
      'Produto',
      'SKU',
      'Categoria',
      'Estoque Atual',
      'Estoque Mínimo',
      'Sugestão de Compra',
      'Custo Unitário',
      'Custo Total Estimado',
      'Status',
    ];

    const rows = products.map(p => {
      const cat = categories.find(c => c.id === p.categoryId)?.name || '-';
      const suggested = Math.max(1, p.minStock * 2 - p.currentStock);
      const totalCost = suggested * p.costPrice;
      const statusLabel = p.currentStock <= 0 ? 'ZERADO' : 'CRÍTICO';

      return [
        p.name,
        p.sku,
        cat,
        p.currentStock,
        p.minStock,
        suggested,
        p.costPrice.toFixed(2),
        totalCost.toFixed(2),
        statusLabel,
      ];
    });

    backupService.exportCSV('pedido_de_compra_reposicao.csv', [headers, ...rows]);
    showToast('Lista de compras para reposição exportada em CSV!', 'success');
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <span>Alertas de Estoque Baixo & Reposição</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Produtos que atingiram o limite mínimo ou estão completamente esgotados.
          </p>
        </div>

        {products.length > 0 && (
          <button
            onClick={handleExportOrderList}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs md:text-sm font-medium border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Gerar Pedido de Compra (CSV)</span>
          </button>
        )}
      </div>

      {/* Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Itens em Alerta</span>
            <p className="text-2xl font-bold text-white mt-1">{products.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Completamente Esgotados</span>
            <p className="text-2xl font-bold text-rose-400 mt-1">
              {products.filter(p => p.currentStock <= 0).length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Estoque Crítico (Baixo)</span>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {products.filter(p => p.currentStock > 0 && p.currentStock <= p.minStock).length}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Products Alert List Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Produto / SKU</th>
                <th className="px-4 py-3.5">Categoria</th>
                <th className="px-4 py-3.5 text-center">Nível Atual</th>
                <th className="px-4 py-3.5 text-center">Mínimo</th>
                <th className="px-4 py-3.5 text-center">Sugestão de Reposição</th>
                <th className="px-4 py-3.5 text-right">Custo Estimado</th>
                <th className="px-4 py-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {products.length > 0 ? (
                products.map(product => {
                  const cat = categories.find(c => c.id === product.categoryId)?.name || '-';
                  const isZero = product.currentStock <= 0;
                  const suggested = Math.max(5, product.minStock * 2 - product.currentStock);
                  const totalEst = suggested * product.costPrice;

                  return (
                    <tr key={product.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{product.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          SKU: {product.sku} | Barcode: {product.barcode}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{cat}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-mono font-bold px-2.5 py-0.5 rounded-full text-xs ${
                            isZero
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {product.currentStock} {product.unit}
                          {isZero ? ' (Zerado)' : ' (Crítico)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-400">
                        {product.minStock} {product.unit}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-blue-400">
                        +{suggested} {product.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-200">
                        {formatCurrency(totalEst)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openRestock(product)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Repor Estoque</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                    🎉 Parabéns! Todos os produtos estão com estoque regular acima do limite mínimo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Restock Modal */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-400" />
                <span>Reposição Rápida de Estoque</span>
              </h3>
              <button
                onClick={() => setRestockProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <p className="font-semibold text-white">{restockProduct.name}</p>
              <p className="text-slate-400">
                Estoque atual: <strong className="text-rose-400">{restockProduct.currentStock} {restockProduct.unit}</strong> | Mínimo: {restockProduct.minStock} {restockProduct.unit}
              </p>
            </div>

            <form onSubmit={handleConfirmRestock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantidade a Adicionar ({restockProduct.unit}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  autoFocus
                  value={restockQuantity || ''}
                  onChange={e => setRestockQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-base font-bold font-mono text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Preço de Custo Unitário (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={restockCost || ''}
                  onChange={e => setRestockCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-base font-bold font-mono text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 flex justify-between items-center text-xs">
                <span className="text-slate-400">Novo Estoque Resultante:</span>
                <span className="text-emerald-400 font-bold font-mono text-sm">
                  {restockProduct.currentStock + (restockQuantity || 0)} {restockProduct.unit}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                >
                  Confirmar Reposição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
