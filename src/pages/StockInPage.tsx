import React, { useEffect, useState } from 'react';
import { PlusCircle, Barcode, Search, CheckCircle, Package } from 'lucide-react';
import { productService } from '../services/productService';
import { Product } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { PageId } from '../layouts/MainLayout';

interface StockInPageProps {
  onNavigate: (page: PageId) => void;
}

export const StockInPage: React.FC<StockInPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { formatCurrency, showToast } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [reason, setReason] = useState<string>('Compra');
  const [supplier, setSupplier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    productService.getProducts().then(prods => {
      setProducts(prods);
      if (prods.length > 0) {
        setSelectedProduct(prods[0]);
        setUnitPrice(prods[0].costPrice);
      }
    });
  }, []);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setUnitPrice(product.costPrice);
  };

  const filteredProducts = products.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q)
    );
  });

  const totalValue = Number((quantity * unitPrice).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast('Selecione um produto para dar entrada.', 'error');
      return;
    }
    if (quantity <= 0) {
      showToast('A quantidade deve ser maior que zero.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await productService.registerMovement({
        productId: selectedProduct.id,
        type: 'ENTRADA',
        quantity,
        unitPrice,
        reason,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
        user: user?.name || user?.username || 'operador',
      });

      showToast(
        `Entrada de ${quantity} ${selectedProduct.unit} de "${selectedProduct.name}" registrada!`,
        'success'
      );
      window.dispatchEvent(new CustomEvent('estoque_data_changed'));
      onNavigate('movimentacoes');
    } catch (err) {
      showToast((err as Error).message || 'Erro ao registrar entrada.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-emerald-400" />
          <span>Registrar Entrada de Estoque</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Adicione novas mercadorias adquiridas, devoluções ou ajustes de inventário.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        {/* Product Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Selecione o Produto *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, SKU ou código..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Quick list / dropdown */}
          <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/80">
            {filteredProducts.slice(0, 15).map(p => (
              <div
                key={p.id}
                onClick={() => handleSelectProduct(p)}
                className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition ${
                  selectedProduct?.id === p.id
                    ? 'bg-blue-600/20 text-blue-300 border-l-4 border-blue-500'
                    : 'hover:bg-slate-900 text-slate-300'
                }`}
              >
                <div>
                  <span className="font-semibold text-white">{p.name}</span>
                  <span className="text-slate-500 ml-2 font-mono">SKU: {p.sku}</span>
                </div>
                <div className="font-mono text-slate-400">
                  Estoque atual: <strong className="text-slate-200">{p.currentStock} {p.unit}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedProduct && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{selectedProduct.name}</h4>
                <p className="text-xs text-slate-400">
                  Estoque Atual: <strong className="text-emerald-400">{selectedProduct.currentStock} {selectedProduct.unit}</strong> | SKU: {selectedProduct.sku}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Novo Estoque Previsto</p>
              <p className="text-base font-bold text-emerald-400 font-mono">
                {selectedProduct.currentStock + (quantity || 0)} {selectedProduct.unit}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quantidade a Adicionar *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity || ''}
                onChange={e => setQuantity(parseInt(e.target.value) || 0)}
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
                value={unitPrice || ''}
                onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-base font-bold font-mono text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Motivo da Entrada
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="Compra">Compra / Reposição</option>
                <option value="Devolução">Devolução de Cliente</option>
                <option value="Ajuste de Estoque">Ajuste de Estoque / Inventário</option>
                <option value="Produção">Produção Própria</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fornecedor (Opcional)
              </label>
              <input
                type="text"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                placeholder="Ex: Distribuidora Brasil Ltda"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observações Adicionais
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Número de nota fiscal, lote, detalhes da remessa..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Total Summary */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase">
              Custo Total da Entrada:
            </span>
            <span className="text-xl font-bold text-white font-mono">
              {formatCurrency(totalValue)}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('produtos')}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedProduct}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Gravando Entrada...' : 'Confirmar Entrada no Estoque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
